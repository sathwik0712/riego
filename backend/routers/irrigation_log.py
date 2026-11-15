from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import IrrigationLogCreate, IrrigationLogOut, IrrigationLogHistoryOut
from normalize import to_utc

# APIRouter for irrigation log endpoints
router = APIRouter(tags=["Irrigation Log"])


# Record a new irrigation log entry
@router.post("/irrigation-log", response_model=IrrigationLogOut, status_code=status.HTTP_201_CREATED)
@router.post("/irrigation-log/", response_model=IrrigationLogOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_irrigation_log(log_in: IrrigationLogCreate, db: Session = Depends(get_db)):
    # 404 if the field does not exist
    field = db.query(models.Field).filter(models.Field.id == log_in.field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    # Validate recommendation if provided
    if log_in.recommendation_id is not None:
        rec = db.query(models.Recommendation).filter(models.Recommendation.id == log_in.recommendation_id).first()
        if not rec or rec.field_id != log_in.field_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recommendation does not belong to this field"
            )
        rec.status = "done"

    # Normalize start time to UTC (defaults to current time if omitted)
    started_at = to_utc(log_in.started_at) if log_in.started_at else datetime.now(timezone.utc)

    # Instantiate and save the new irrigation log
    new_log = models.IrrigationLog(
        field_id=log_in.field_id,
        started_at=started_at,
        duration_minutes=log_in.duration_minutes,
        water_liters=log_in.water_liters,
        source=log_in.source if log_in.source else "farmer",
        recommendation_id=log_in.recommendation_id,
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log


# Retrieve irrigation logs for a field over the last N days, oldest first
@router.get("/fields/{field_id}/irrigation-log", response_model=IrrigationLogHistoryOut)
@router.get("/fields/{field_id}/irrigation-log/", response_model=IrrigationLogHistoryOut, include_in_schema=False)
def get_field_irrigation_logs(
    field_id: int,
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    # 404 if the field does not exist
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
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
