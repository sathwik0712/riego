from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_db
import models
from schemas import SensorReadingCreate, SensorReadingOut
from normalize import raw_to_moisture_percent, to_utc

# APIRouter for sensor readings
router = APIRouter(prefix="/sensor-readings", tags=["Sensor"])

# Record a new sensor reading
@router.post("", response_model=SensorReadingOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SensorReadingOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_sensor_reading(reading_in: SensorReadingCreate, db: Session = Depends(get_db)):
    # Verify that a field exists with this device_id
    field = db.query(models.Field).filter(models.Field.device_id == reading_in.device_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No field found with device ID '{reading_in.device_id}'."
        )

    # Normalize reading timestamp to UTC
    reading_time = to_utc(reading_in.time)

    # Convert raw ADC reading to moisture percentage
    moisture_percent = raw_to_moisture_percent(reading_in.raw_value)

    # Check if a reading with the same device_id and timestamp already exists
    existing_reading = (
        db.query(models.SensorReading)
        .filter(
            models.SensorReading.device_id == reading_in.device_id,
            models.SensorReading.time == reading_time,
        )
        .first()
    )
    if existing_reading:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A reading for device '{reading_in.device_id}' at this timestamp already exists."
        )

    # Save the reading to the database with normalized moisture percentage
    new_reading = models.SensorReading(
        time=reading_time,
        device_id=reading_in.device_id,
        field_id=field.id,
        raw_value=reading_in.raw_value,
        moisture_percent=moisture_percent,
        source="sensor",
    )

    try:
        db.add(new_reading)
        db.commit()
        db.refresh(new_reading)
    except IntegrityError:
        # Rollback and return 409 in case of duplicate key race condition
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A reading for device '{reading_in.device_id}' at this timestamp already exists."
        )

    return new_reading

# Retrieve historical sensor readings for a field over the last N hours, oldest first
@router.get("/{field_id}/history")
def get_field_sensor_history(
    field_id: int,
    hours: int = Query(default=24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    """
    Get saved historical sensor readings for a field over the last N hours (oldest first).
    """
    # 404 if the field does not exist
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    # Fetch readings within the last N hours, ordered oldest first
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    readings = (
        db.query(models.SensorReading)
        .filter(
            models.SensorReading.field_id == field.id,
            models.SensorReading.time >= cutoff
        )
        .order_by(models.SensorReading.time.asc())
        .all()
    )

    items = [
        {
            "time": r.time,
            "moisture_percent": r.moisture_percent,
            "raw_value": r.raw_value,
            "device_id": r.device_id,
            "source": r.source if r.source else ("manual" if str(r.device_id or "").startswith("manual-") else "sensor"),
        }
        for r in readings
    ]

    return {
        "field_id": field.id,
        "hours": hours,
        "count": len(items),
        "readings": items,
    }

# Retrieve the latest 20 readings for a device, ordered newest first
@router.get("/{device_id}", response_model=List[SensorReadingOut])
def get_sensor_readings(device_id: str, db: Session = Depends(get_db)):
    readings = (
        db.query(models.SensorReading)
        .filter(models.SensorReading.device_id == device_id)
        .order_by(models.SensorReading.time.desc())
        .limit(20)
        .all()
    )
    return readings
