"""Irrigation scheduler and planner for Riego.

Converts ML irrigation predictions into actionable, time-slotted irrigation plans
aligned with agronomic best practices:
- Preferred hours (cool mornings and evenings to minimize evaporation loss)
- Session length caps (to prevent soil saturation and water runoff)
- Forecast-aware skipping (suppresses slots on heavy rain days)
- Same-pump deconfliction across a farmer's multiple fields
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# CONSTANTS (approximate values, mentor to confirm)
# ---------------------------------------------------------------------------
PREFERRED_START_HOURS_IST = [6, 18]   # 6 AM and 6 PM (cool hours, low evaporation)
MAX_SESSION_MINUTES = 60              # Cap per session to avoid runoff / saturation
GAP_BETWEEN_FIELDS_MINUTES = 10       # Buffer between fields sharing a pump
MAX_PLAN_HORIZON_HOURS = 48           # Plan covers at most the next 48 hours
HEAVY_RAIN_THRESHOLD_MM = 5.0         # 5 mm or more cancels irrigation

IST = ZoneInfo("Asia/Kolkata")


def _to_ist(dt: Optional[datetime]) -> datetime:
    """Ensure datetime is timezone-aware in Asia/Kolkata."""
    if dt is None:
        return datetime.now(IST)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=IST)
    return dt.astimezone(IST)


def _get_day_rain_mm(
    slot_dt: datetime,
    prediction: Dict[str, Any],
    daily_forecast: Optional[List[Dict[str, Any]]] = None,
) -> float:
    """
    Extract forecasted rainfall in mm for the day of slot_dt.
    Checks daily_forecast first, then falls back to rain_next_24h_mm.
    """
    slot_date_str = slot_dt.strftime("%Y-%m-%d")

    # 1. Check daily_forecast list (from ForecastSnapshot.daily_summary)
    df_list = daily_forecast or prediction.get("daily_forecast") or prediction.get("forecast")
    if isinstance(df_list, list):
        for entry in df_list:
            if isinstance(entry, dict) and entry.get("date") == slot_date_str:
                rain_val = entry.get("total_rain_mm") or entry.get("rain_mm")
                if rain_val is not None:
                    return float(rain_val)

    # 2. Check 24h summary forecast
    rain_24h = prediction.get("rain_next_24h_mm")
    if rain_24h is None and "raw_row" in prediction:
        rain_24h = prediction["raw_row"].get("rain_next_24h_mm")
    if rain_24h is not None:
        return float(rain_24h)

    return 0.0


def build_plan(
    prediction: Dict[str, Any],
    now_ist: Optional[datetime] = None,
    daily_forecast: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Convert an ML prediction dict into a list of time-slotted irrigation sessions.

    Rules:
    - No slots if should_irrigate is False or status is not 'ok'.
    - Start at the next preferred hour that is still in the future.
    - If duration > MAX_SESSION_MINUTES, split into sessions on next preferred hours,
      each up to MAX_SESSION_MINUTES.
    - Plan covers at most the next 48 hours.
    - Skip a slot if the stored forecast shows heavy rain (>= 5 mm) for that day;
      say why in reason.
    - Reason is one plain sentence a farmer understands.

    Returns:
        List of dicts: [{"start": str (IST ISO), "duration_minutes": int, "reason": str}]
    """
    now = _to_ist(now_ist)

    # Rule: No slots if should_irrigate is false
    if not prediction.get("should_irrigate") or prediction.get("status") != "ok":
        return []

    total_duration = int(prediction.get("duration_minutes") or 0)
    if total_duration <= 0:
        return []

    # Generate candidate preferred-hour datetimes in the next 48 hours
    candidates: List[datetime] = []
    horizon_end = now + timedelta(hours=MAX_PLAN_HORIZON_HOURS)
    start_date = now.date()

    for day_offset in range(4):  # covers today through day+3
        day = start_date + timedelta(days=day_offset)
        for hour in sorted(PREFERRED_START_HOURS_IST):
            candidate_dt = datetime(day.year, day.month, day.day, hour, 0, 0, tzinfo=IST)
            if candidate_dt > now and candidate_dt <= horizon_end:
                candidates.append(candidate_dt)
    candidates.sort()

    if not candidates:
        return []

    # Split duration into chunks up to MAX_SESSION_MINUTES
    session_durations: List[int] = []
    remaining = total_duration
    while remaining > 0:
        chunk = min(remaining, MAX_SESSION_MINUTES)
        session_durations.append(chunk)
        remaining -= chunk

    slots: List[Dict[str, Any]] = []
    num_sessions = len(session_durations)

    for idx, dur in enumerate(session_durations):
        if idx >= len(candidates):
            break  # cannot exceed 48-hour horizon

        slot_dt = candidates[idx]
        rain_mm = _get_day_rain_mm(slot_dt, prediction, daily_forecast=daily_forecast)

        # Check heavy rain rule (>= 5 mm)
        if rain_mm >= HEAVY_RAIN_THRESHOLD_MM:
            slots.append({
                "start": slot_dt.isoformat(),
                "duration_minutes": 0,
                "reason": (
                    f"Skipped irrigation on {slot_dt.strftime('%d %b')} because "
                    f"heavy rain ({rain_mm:.1f} mm) is forecast."
                ),
                "recommendation_id": None,
            })
        else:
            time_desc = "morning" if slot_dt.hour < 12 else "evening"
            if num_sessions == 1:
                reason = (
                    f"Water during cool {time_desc} hours for {dur} minutes "
                    f"to reduce evaporation and keep soil moist."
                )
            else:
                reason = (
                    f"Session {idx + 1} of {num_sessions} ({dur} minutes) during cool "
                    f"{time_desc} hours to prevent water runoff and root waterlogging."
                )

            slots.append({
                "start": slot_dt.isoformat(),
                "duration_minutes": dur,
                "reason": reason,
                "recommendation_id": None,
            })

    return slots


# ASSUMPTION (Same-Pump Rule):
# Fields belonging to the same farmer are assumed to share a single water pump or source.
# Therefore, irrigation sessions cannot run simultaneously. When multiple fields have
# overlapping scheduled slots, later fields are shifted to start after the earlier field
# finishes, plus GAP_BETWEEN_FIELDS_MINUTES (10 minutes) buffer to allow line decompression
# and pump transition.
def build_farmer_plan(
    db: Session,
    farmer_id: str,
    now_ist: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """
    Build unified, non-overlapping irrigation schedule for all fields of a farmer.
    Shifts later fields to start after earlier ones plus GAP_BETWEEN_FIELDS_MINUTES.
    """
    import models
    from ml.predict import predict_for_field

    now = _to_ist(now_ist)

    fields = (
        db.query(models.Field)
        .filter(models.Field.farmer_id == farmer_id)
        .order_by(models.Field.id)
        .all()
    )

    all_slots: List[Dict[str, Any]] = []

    for field in fields:
        pred = predict_for_field(db, field.id)

        # Retrieve stored forecast snapshot if available
        snap = (
            db.query(models.ForecastSnapshot)
            .filter(models.ForecastSnapshot.field_id == field.id)
            .order_by(models.ForecastSnapshot.fetched_at.desc())
            .first()
        )
        daily_forecast = snap.daily_summary if snap else None

        field_slots = build_plan(pred, now_ist=now, daily_forecast=daily_forecast)

        # Match saved open recommendation for this field (null when none)
        open_rec = (
            db.query(models.Recommendation)
            .filter(
                models.Recommendation.field_id == field.id,
                models.Recommendation.status == "pending",
            )
            .order_by(models.Recommendation.created_at.desc())
            .first()
        )
        rec_id = open_rec.id if open_rec else None

        for slot in field_slots:
            enriched_slot = dict(slot)
            enriched_slot["field_id"] = field.id
            enriched_slot["field_nickname"] = field.nickname or f"Field {field.id}"
            enriched_slot["recommendation_id"] = rec_id
            all_slots.append(enriched_slot)

    if not all_slots:
        return []

    # Sort slots chronologically by initial start
    all_slots.sort(key=lambda s: datetime.fromisoformat(s["start"]))

    # Deconflict overlapping active sessions using the same-pump rule
    pump_available_at: Optional[datetime] = None

    for slot in all_slots:
        dur = slot["duration_minutes"]
        if dur <= 0:
            continue  # skipped slots do not occupy the pump

        start_dt = datetime.fromisoformat(slot["start"])
        if pump_available_at is not None and start_dt < pump_available_at:
            # Overlap detected: shift slot to start after earlier field finishes + gap
            start_dt = pump_available_at
            slot["start"] = start_dt.isoformat()
            slot["reason"] += " (Shifted to prevent pump conflict with another field)."

        end_dt = start_dt + timedelta(minutes=dur)
        pump_available_at = end_dt + timedelta(minutes=GAP_BETWEEN_FIELDS_MINUTES)

    # Return all slots sorted by start
    all_slots.sort(key=lambda s: datetime.fromisoformat(s["start"]))
    return all_slots


def format_advice_sentence(
    field_name: str,
    slots: List[Dict[str, Any]],
    should_irrigate: bool,
) -> str:
    """
    Generate a concise, farmer-friendly one-line advice sentence.
    E.g.: 'Water Field 1 at 6 AM for 30 minutes.'
    """
    if not should_irrigate or not slots:
        return f"Soil moisture for {field_name} is adequate. No irrigation needed."

    active_slots = [s for s in slots if s.get("duration_minutes", 0) > 0]
    if not active_slots:
        return f"Heavy rain forecast for {field_name}; skip irrigation today."

    if len(active_slots) == 1:
        first = active_slots[0]
        dt = datetime.fromisoformat(first["start"])
        time_str = dt.strftime("%-I %p")
        dur = first["duration_minutes"]
        return f"Water {field_name} at {time_str} for {dur} minutes."

    # Multiple sessions
    total_dur = sum(s["duration_minutes"] for s in active_slots)
    first_dt = datetime.fromisoformat(active_slots[0]["start"])
    time_str = first_dt.strftime("%-I %p")
    return (
        f"Water {field_name} starting at {time_str} "
        f"({total_dur} minutes total across {len(active_slots)} sessions)."
    )
