"""Service for automatic irrigation recommendation generation and lifecycle management.

Handles creation, 6-hour deduplication, expiration when conditions change or slots
pass, and lifecycle synchronization with irrigation logs.
"""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
import models
from normalize import to_utc
from ml.predict import predict_for_field
from ml.scheduler import (
    build_plan,
    format_advice_sentence,
    PREFERRED_START_HOURS_IST,
    MAX_SESSION_MINUTES,
)

IST = ZoneInfo("Asia/Kolkata")
PAUSE_AFTER_DONE_HOURS = 6


def are_slots_all_in_past(
    water_at: Optional[datetime],
    duration_minutes: Optional[int],
    now_utc: Optional[datetime] = None,
) -> bool:
    """
    Check if all planned irrigation slots for a recommendation are strictly in the past.
    Single-session plans end at water_at + duration.
    Multi-session plans end after the final scheduled preferred hour session.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    if water_at is None:
        return True

    if water_at.tzinfo is None:
        water_at = water_at.replace(tzinfo=timezone.utc)

    dur = duration_minutes or 0
    if dur <= MAX_SESSION_MINUTES:
        slot_end = water_at + timedelta(minutes=dur)
        return slot_end <= now_utc

    # Multi-session: project future preferred hours to find the end time of the last session
    current_dt = water_at.astimezone(IST)
    remaining = dur - MAX_SESSION_MINUTES

    while remaining > 0:
        day = current_dt.date()
        next_dt = None
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
        current_dt = next_dt
        chunk = min(remaining, MAX_SESSION_MINUTES)
        remaining -= chunk

    last_session_dur = min(dur, MAX_SESSION_MINUTES)
    last_slot_end = current_dt + timedelta(minutes=last_session_dur)
    return last_slot_end.astimezone(timezone.utc) <= now_utc


def _rec_to_dict(rec: models.Recommendation) -> Dict[str, Any]:
    """Serialize a Recommendation model to dict matching existing API shape."""
    return {
        "id": rec.id,
        "field_id": rec.field_id,
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
        "advice_text": rec.advice_text,
        "action": rec.action,
        "water_at": rec.water_at.isoformat() if rec.water_at else None,
        "duration_minutes": rec.duration_minutes,
        "source": rec.source,
        "status": rec.status,
    }


def ensure_recommendation(
    db: Session,
    field_id: int,
    now_utc: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Ensure an up-to-date recommendation exists for the field if needed.

    Rules:
    - Save nothing unless status is ok and at least one slot has a duration above 0.
    - No second open recommendation for a field within 6 hours.
    - If an open one exists but the new prediction says no watering is needed, mark the old one expired.
    - Also expire open ones whose slots are all in the past.
    - Never touch recommendations that are done.

    Returns:
        Dict matching POST /fields/{field_id}/recommendation/generate output, with a "result"
        field indicating: "created" | "already_open" | "not_needed" | "not_enough_data" | "stale"
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found.",
        )

    # 1. Expire open recommendations whose slots are all in the past
    open_recs = (
        db.query(models.Recommendation)
        .filter(
            models.Recommendation.field_id == field_id,
            models.Recommendation.status == "pending",
        )
        .all()
    )
    for rec in open_recs:
        if are_slots_all_in_past(rec.water_at, rec.duration_minutes, now_utc):
            rec.status = "expired"
    db.commit()

    # 2. Compute fresh prediction
    pred = predict_for_field(db, field_id)
    pred_status = pred.get("status")

    if pred_status == "not_enough_data":
        return {
            "saved": False,
            "status": "not_enough_data",
            "should_irrigate": False,
            "result": "not_enough_data",
            "message": pred.get("message", "Not enough data; nothing saved."),
        }

    if pred_status == "stale_reading":
        return {
            "saved": False,
            "status": "stale_reading",
            "should_irrigate": False,
            "result": "stale",
            "message": pred.get("message", "Reading is stale; nothing saved."),
        }

    if pred_status != "ok":
        return {
            "saved": False,
            "status": pred_status,
            "should_irrigate": False,
            "result": "error",
            "message": pred.get("message", "Prediction status not ok; nothing saved."),
        }

    # 3. Check if watering is needed according to prediction
    should_irrigate = bool(pred.get("should_irrigate"))

    snap = (
        db.query(models.ForecastSnapshot)
        .filter(models.ForecastSnapshot.field_id == field_id)
        .order_by(models.ForecastSnapshot.fetched_at.desc())
        .first()
    )
    daily_forecast = snap.daily_summary if snap else None
    slots = build_plan(pred, daily_forecast=daily_forecast)
    active_slots = [s for s in slots if s.get("duration_minutes", 0) > 0]

    watering_needed = should_irrigate and len(active_slots) > 0

    if not watering_needed:
        # Rule: If an open one exists but the new prediction says no watering is needed, mark it expired
        # UNLESS an irrigation log for that field was saved after the recommendation was created.
        still_open = (
            db.query(models.Recommendation)
            .filter(
                models.Recommendation.field_id == field_id,
                models.Recommendation.status == "pending",
            )
            .all()
        )
        for r in still_open:
            rec_created = r.created_at
            if rec_created and rec_created.tzinfo is None:
                rec_created = rec_created.replace(tzinfo=timezone.utc)

            # Check if any irrigation log was saved after the recommendation was created
            log_after_rec = (
                db.query(models.IrrigationLog)
                .filter(
                    models.IrrigationLog.field_id == field_id,
                    models.IrrigationLog.created_at > rec_created,
                )
                .first()
            )
            if not log_after_rec:
                r.status = "expired"
        db.commit()

        msg = (
            "All irrigation sessions skipped due to rain; nothing saved."
            if should_irrigate and not active_slots
            else "No irrigation recommendation needed or data not ready; nothing saved."
        )
        return {
            "saved": False,
            "status": "ok",
            "should_irrigate": False,
            "result": "not_needed",
            "message": msg,
        }

    # 4. Watering IS needed: never create a second pending recommendation for a field
    existing_open = (
        db.query(models.Recommendation)
        .filter(
            models.Recommendation.field_id == field_id,
            models.Recommendation.status == "pending",
        )
        .order_by(models.Recommendation.created_at.desc())
        .first()
    )
    if existing_open:
        res = _rec_to_dict(existing_open)
        res["saved"] = False
        res["result"] = "already_open"
        return res

    # 4b. No repeat after Done: create nothing if the field has an irrigation log newer than PAUSE_AFTER_DONE_HOURS
    pause_cutoff = now_utc - timedelta(hours=PAUSE_AFTER_DONE_HOURS)
    recent_log = (
        db.query(models.IrrigationLog)
        .filter(
            models.IrrigationLog.field_id == field_id,
            or_(
                models.IrrigationLog.irrigated_at >= pause_cutoff,
                models.IrrigationLog.created_at >= pause_cutoff,
            ),
        )
        .order_by(models.IrrigationLog.id.desc())
        .first()
    )
    if recent_log:
        return {
            "saved": False,
            "status": "paused_after_irrigation",
            "should_irrigate": False,
            "result": "paused_after_irrigation",
            "message": "You watered recently.",
        }

    # 5. Save the new recommendation
    # Lock the field row to ensure concurrent calls serialize and never create a duplicate pending row
    try:
        db.query(models.Field).filter(models.Field.id == field_id).with_for_update().first()
    except Exception:
        pass

    double_check_open = (
        db.query(models.Recommendation)
        .filter(
            models.Recommendation.field_id == field_id,
            models.Recommendation.status == "pending",
        )
        .order_by(models.Recommendation.created_at.desc())
        .first()
    )
    if double_check_open:
        res = _rec_to_dict(double_check_open)
        res["saved"] = False
        res["result"] = "already_open"
        return res

    field_name = field.nickname or f"Field {field.id}"
    advice = format_advice_sentence(field_name, slots, True)
    first_start_dt = datetime.fromisoformat(active_slots[0]["start"])

    new_rec = models.Recommendation(
        field_id=field.id,
        advice_text=advice,
        action="water",
        water_at=to_utc(first_start_dt),
        duration_minutes=pred.get("duration_minutes"),
        source="ml",
        status="pending",
    )
    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)

    res = _rec_to_dict(new_rec)
    res["saved"] = True
    res["result"] = "created"
    return res
