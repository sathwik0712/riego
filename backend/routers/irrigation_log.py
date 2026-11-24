from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import IrrigationLogCreate, IrrigationLogOut, IrrigationLogHistoryOut, DetectedIrrigationEvent
from normalize import to_utc
from services.irrigation_detection import detect_irrigation_events
from routers.auth import get_current_farmer
from ml.scheduler import slots_from_recommendation

# APIRouter for irrigation log endpoints
router = APIRouter(tags=["Irrigation Log"])


# Record a new irrigation log entry
@router.post("/irrigation-log", response_model=IrrigationLogOut, status_code=status.HTTP_201_CREATED)
@router.post("/irrigation-log/", response_model=IrrigationLogOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_irrigation_log(
    log_in: IrrigationLogCreate,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    # 404 if the field does not exist or belongs to another farmer
    field = db.query(models.Field).filter(models.Field.id == log_in.field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    # Validate recommendation if provided
    rec = None
    if log_in.recommendation_id is not None:
        rec = db.query(models.Recommendation).filter(models.Recommendation.id == log_in.recommendation_id).first()
        if not rec:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recommendation with ID {log_in.recommendation_id} not found"
            )
        if rec.field_id != log_in.field_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recommendation does not belong to this field"
            )

    now_utc = datetime.now(timezone.utc)

    # Duplicate check: return existing log (no new row) if the same field already has
    # a log with the same duration_minutes in the last 2 minutes (created_at or irrigated_at >= now - 2min)
    cutoff_2min = now_utc - timedelta(minutes=2)
    recent_duplicate = (
        db.query(models.IrrigationLog)
        .filter(
            models.IrrigationLog.field_id == log_in.field_id,
            models.IrrigationLog.duration_minutes == log_in.duration_minutes,
            or_(
                models.IrrigationLog.created_at >= cutoff_2min,
                models.IrrigationLog.irrigated_at >= cutoff_2min,
            ),
        )
        .order_by(models.IrrigationLog.id.desc())
        .first()
    )
    if recent_duplicate:
        return recent_duplicate

    if rec is not None:
        rec.status = "done"

    # Normalize start time and irrigated time to UTC (defaults to current time if omitted)
    started_at = to_utc(log_in.started_at) if log_in.started_at else now_utc
    event_source = log_in.event_source if log_in.event_source else "farmer_tap"
    irrigated_at = to_utc(log_in.irrigated_at) if log_in.irrigated_at else now_utc

    # Instantiate and save the new irrigation log
    new_log = models.IrrigationLog(
        field_id=log_in.field_id,
        started_at=started_at,
        duration_minutes=log_in.duration_minutes,
        water_liters=log_in.water_liters,
        source=log_in.source if log_in.source else "farmer",
        event_source=event_source,
        irrigated_at=irrigated_at,
        recommendation_id=log_in.recommendation_id,
    )

    db.add(new_log)
    db.flush()

    # Closing: a pending recommendation becomes done when the number of such logs is at least
    # its number of sessions, or when a log linked to it by recommendation_id is saved (as now).
    pending_recs = (
        db.query(models.Recommendation)
        .filter(
            models.Recommendation.field_id == log_in.field_id,
            models.Recommendation.status == "pending",
        )
        .all()
    )
    for p_rec in pending_recs:
        such_logs_count = (
            db.query(models.IrrigationLog)
            .filter(
                models.IrrigationLog.field_id == log_in.field_id,
                models.IrrigationLog.irrigated_at > p_rec.created_at,
            )
            .count()
        )
        num_sessions = len(slots_from_recommendation(p_rec))
        if num_sessions > 0 and such_logs_count >= num_sessions:
            p_rec.status = "done"

    db.commit()
    db.refresh(new_log)
    return new_log


# Retrieve irrigation logs for a field over the last N days, oldest first
@router.get("/fields/{field_id}/irrigation-log", response_model=IrrigationLogHistoryOut)
@router.get("/fields/{field_id}/irrigation-log/", response_model=IrrigationLogHistoryOut, include_in_schema=False)
def get_field_irrigation_logs(
    field_id: int,
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    # 404 if the field does not exist or belongs to another farmer
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    # Fetch logs within the last N days, ordered oldest first
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    logs = (
        db.query(models.IrrigationLog)
        .filter(
            models.IrrigationLog.field_id == field_id,
            models.IrrigationLog.started_at >= cutoff,
        )
        .order_by(models.IrrigationLog.started_at.asc(), models.IrrigationLog.id.asc())
        .all()
    )

    return {
        "field_id": field_id,
        "days": days,
        "count": len(logs),
        "logs": logs,
    }


# Detect potential irrigation events based on significant soil moisture jumps
@router.get("/fields/{field_id}/detected-irrigation", response_model=List[DetectedIrrigationEvent])
@router.get("/fields/{field_id}/detected-irrigation/", response_model=List[DetectedIrrigationEvent], include_in_schema=False)
def get_detected_irrigation(
    field_id: int,
    hours: int = Query(default=168, ge=1, le=720),
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    """
    Scan soil moisture readings and return detected irrigation events where moisture
    jumped by at least 10% within 60 minutes.
    Does NOT write to irrigation_logs. Returns 404 for an unknown field or another farmer's field, empty list if none found.
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    return detect_irrigation_events(db, field_id=field_id, hours=hours)
