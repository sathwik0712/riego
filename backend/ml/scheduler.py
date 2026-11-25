"""Irrigation scheduler and planner for Riego.

Converts ML irrigation predictions into actionable, time-slotted irrigation plans
aligned with agronomic best practices:
- Preferred hours (cool mornings and evenings to minimize evaporation loss)
- Session length caps (to prevent soil saturation and water runoff)
- Forecast-aware skipping (suppresses slots on heavy rain days)
- Same-pump deconfliction across a farmer's multiple fields
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

# Add backend directory so crop_targets can be imported
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from crop_targets import get_target_range

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
    Checks daily_forecast first, then falls back to rain_next_24h_mm or rain_mm.
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

    # 2. Check 24h summary forecast / rain fields
    rain_val = prediction.get("rain_next_24h_mm")
    if rain_val is None:
        rain_val = prediction.get("rain_mm")
    if rain_val is None:
        rain_val = prediction.get("rain")
    if rain_val is None and "raw_row" in prediction and isinstance(prediction["raw_row"], dict):
        rain_val = (
            prediction["raw_row"].get("rain_next_24h_mm")
            or prediction["raw_row"].get("rain_mm")
            or prediction["raw_row"].get("rain")
        )
    if rain_val is not None:
        return float(rain_val)

    return 0.0


def is_soil_very_dry(prediction: Dict[str, Any]) -> bool:
    """
    Check if the latest soil moisture reading is below the crop's dry limit.
    Uses get_target_range(crop, stage)[0] from crop_targets.py.
    Returns False if:
      - water source is Rain-fed (rain-fed fields unchanged)
      - no soil moisture reading is present
      - soil moisture >= dry limit
    """
    water_source = prediction.get("water_source")
    if water_source is None and "raw_row" in prediction and isinstance(prediction["raw_row"], dict):
        water_source = prediction["raw_row"].get("water_source")
    if water_source and str(water_source).strip().lower() == "rain-fed":
        return False

    latest_moisture = prediction.get("latest_moisture_pct")
    if latest_moisture is None:
        latest_moisture = prediction.get("soil_moisture_pct")
    if latest_moisture is None:
        latest_moisture = prediction.get("moisture")
    if latest_moisture is None and "raw_row" in prediction and isinstance(prediction["raw_row"], dict):
        latest_moisture = (
            prediction["raw_row"].get("soil_moisture_pct")
            or prediction["raw_row"].get("latest_moisture_pct")
        )

    if latest_moisture is None:
        return False

    try:
        val = float(latest_moisture)
    except (ValueError, TypeError):
        return False

    # Check for NaN
    if val != val:
        return False

    crop = prediction.get("crop")
    if crop is None and "raw_row" in prediction and isinstance(prediction["raw_row"], dict):
        crop = prediction["raw_row"].get("crop")

    stage = prediction.get("growth_stage") or prediction.get("stage")
    if stage is None and "raw_row" in prediction and isinstance(prediction["raw_row"], dict):
        stage = prediction["raw_row"].get("growth_stage")

    dry_limit, _ = get_target_range(crop, stage)
    return val < dry_limit


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

    very_dry = is_soil_very_dry(prediction)

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
            if very_dry:
                # Soil is very dry: do not block. Give one short session:
                # half the normal duration, at most 20 minutes.
                short_dur = max(1, int(min(round(total_duration / 2.0), 20)))
                slots.append({
                    "start": slot_dt.isoformat(),
                    "duration_minutes": short_dur,
                    "reason": "Soil is very dry. Rain may come, but water a little today.",
                    "is_rain_dry": True,
                    "recommendation_id": None,
                    "done": False,
                    "done_at": None,
                })
                return slots
            else:
                slots.append({
                    "start": slot_dt.isoformat(),
                    "duration_minutes": 0,
                    "reason": (
                        f"Skipped irrigation on {slot_dt.strftime('%d %b')} because "
                        f"heavy rain ({rain_mm:.1f} mm) is forecast."
                    ),
                    "recommendation_id": None,
                    "done": False,
                    "done_at": None,
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
                "done": False,
                "done_at": None,
            })

    return slots


def slots_from_recommendation(rec: Any, db: Optional[Session] = None) -> List[Dict[str, Any]]:
    """
    Rebuild the session list deterministically from a saved recommendation's
    water_at (first session start) and duration_minutes, using the same rules
    as build_plan (preferred hours, capped at MAX_SESSION_MINUTES, same reasons).
    The same input always gives the identical slots without invoking ML models.
    If db is provided, matches irrigation logs strictly after rec.created_at
    to mark sessions as done (by order: log 1 -> session 1, log 2 -> session 2).
    """
    water_at = getattr(rec, "water_at", None)
    duration_minutes = getattr(rec, "duration_minutes", None)

    if water_at is None or duration_minutes is None:
        return []

    total_duration = int(duration_minutes or 0)
    if total_duration <= 0:
        return []

    first_dt = _to_ist(water_at)

    # Split duration into chunks up to MAX_SESSION_MINUTES
    session_durations: List[int] = []
    remaining = total_duration
    while remaining > 0:
        chunk = min(remaining, MAX_SESSION_MINUTES)
        session_durations.append(chunk)
        remaining -= chunk

    # Generate candidate datetimes starting with first_dt, then subsequent preferred hours
    candidates: List[datetime] = [first_dt]
    current_dt = first_dt

    while len(candidates) < len(session_durations):
        # Find next preferred hour strictly after current_dt
        day = current_dt.date()
        next_dt: Optional[datetime] = None
        for day_offset in range(4):
            d = day + timedelta(days=day_offset)
            for h in sorted(PREFERRED_START_HOURS_IST):
                cand = datetime(d.year, d.month, d.day, h, 0, 0, tzinfo=IST)
                if cand > current_dt:
                    next_dt = cand
                    break
            if next_dt:
                break
        if not next_dt:
            break
        candidates.append(next_dt)
        current_dt = next_dt

    # If db is provided, fetch irrigation logs for this field after recommendation's created_at
    logs = []
    field_id = getattr(rec, "field_id", None)
    created_at = getattr(rec, "created_at", None)
    if db is not None and field_id is not None and created_at is not None:
        import models
        logs = (
            db.query(models.IrrigationLog)
            .filter(
                models.IrrigationLog.field_id == field_id,
                models.IrrigationLog.irrigated_at > created_at,
            )
            .order_by(models.IrrigationLog.irrigated_at.asc(), models.IrrigationLog.id.asc())
            .all()
        )

    slots: List[Dict[str, Any]] = []
    num_sessions = len(session_durations)

    for idx, dur in enumerate(session_durations):
        if idx >= len(candidates):
            break

        slot_dt = candidates[idx]
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

        is_done = idx < len(logs)
        done_at_str = None
        if is_done and logs[idx].irrigated_at:
            val = logs[idx].irrigated_at
            done_at_str = val.isoformat() if hasattr(val, "isoformat") else str(val)

        slots.append({
            "start": slot_dt.isoformat(),
            "duration_minutes": dur,
            "reason": reason,
            "recommendation_id": getattr(rec, "id", None),
            "done": is_done,
            "done_at": done_at_str,
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
        # Pending wins: if a field has both a pending and a done recommendation, the plan uses
        # the pending one. A done one is shown only when no pending one exists and it was created in the last 24 hours.
        rec_24h_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        active_rec = (
            db.query(models.Recommendation)
            .filter(
                models.Recommendation.field_id == field.id,
                models.Recommendation.status == "pending",
            )
            .order_by(models.Recommendation.created_at.desc())
            .first()
        )
        if not active_rec:
            active_rec = (
                db.query(models.Recommendation)
                .filter(
                    models.Recommendation.field_id == field.id,
                    models.Recommendation.status == "done",
                    models.Recommendation.created_at >= rec_24h_cutoff,
                )
                .order_by(models.Recommendation.created_at.desc())
                .first()
            )

        if active_rec:
            rec_slots = slots_from_recommendation(active_rec, db=db)
            for slot in rec_slots:
                enriched_slot = dict(slot)
                enriched_slot["field_id"] = field.id
                enriched_slot["field_nickname"] = field.nickname or f"Field {field.id}"
                enriched_slot["recommendation_id"] = active_rec.id
                enriched_slot["recommendation_status"] = active_rec.status
                all_slots.append(enriched_slot)
            continue

        # NOTE: This GET endpoint can now write a recommendation row when no active recommendation exists.
        # Call ensure_recommendation to either create a new one or determine why we should not.
        try:
            from services.auto_recommend import ensure_recommendation
            ens_result = ensure_recommendation(db, field.id)
        except Exception:
            ens_result = {"result": "error"}

        ens_result_key = ens_result.get("result", "")

        if ens_result_key in ("created", "already_open"):
            # Re-query the pending recommendation that was just created or found
            new_active_rec = (
                db.query(models.Recommendation)
                .filter(
                    models.Recommendation.field_id == field.id,
                    models.Recommendation.status == "pending",
                )
                .order_by(models.Recommendation.created_at.desc())
                .first()
            )
            if new_active_rec:
                rec_slots = slots_from_recommendation(new_active_rec, db=db)
                for slot in rec_slots:
                    enriched_slot = dict(slot)
                    enriched_slot["field_id"] = field.id
                    enriched_slot["field_nickname"] = field.nickname or f"Field {field.id}"
                    enriched_slot["recommendation_id"] = new_active_rec.id
                    enriched_slot["recommendation_status"] = new_active_rec.status
                    all_slots.append(enriched_slot)
                continue
            # If re-query somehow missed it, fall through to fresh prediction below
        elif ens_result_key == "paused_after_irrigation":
            # Field watered recently — no new sessions to show for this field
            continue

        # Only when ensure_recommendation says not_needed / not_enough_data / stale / error
        # fall back to a fresh prediction with recommendation_id null
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

        for slot in field_slots:
            enriched_slot = dict(slot)
            enriched_slot["field_id"] = field.id
            enriched_slot["field_nickname"] = field.nickname or f"Field {field.id}"
            enriched_slot["recommendation_id"] = None
            enriched_slot["recommendation_status"] = None
            enriched_slot["done"] = False
            enriched_slot["done_at"] = None
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

    # Rain forecast >= 5 mm with very dry soil
    if any(s.get("is_rain_dry") or "water a little today" in s.get("reason", "").lower() for s in active_slots):
        return "Soil is very dry. Rain may come, but water a little today."

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
