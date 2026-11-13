from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import FieldCreate, FieldOut

# APIRouter for field-related endpoints
router = APIRouter(prefix="/fields", tags=["Fields"])

# Readings older than this many minutes are considered stale
STALE_AFTER_MINUTES = 15

# Create a new field
@router.post("", response_model=FieldOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FieldOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_field(field_in: FieldCreate, db: Session = Depends(get_db)):
    # Check if device_id is already assigned to an existing field
    if field_in.device_id:
        existing_device = db.query(models.Field).filter(models.Field.device_id == field_in.device_id).first()
        if existing_device:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device ID '{field_in.device_id}' is already in use by another field."
            )

    # Instantiate the new field with fixed farmer_id "farmer_001"
    new_field = models.Field(
        farmer_id="farmer_001",
        nickname=field_in.nickname,
        latitude=field_in.latitude,
        longitude=field_in.longitude,
        area=field_in.area,
        area_unit=field_in.area_unit,
        crop=field_in.crop,
        sowing_date=field_in.sowing_date,
        soil_type=field_in.soil_type,
        water_source=field_in.water_source,
        irrigation_method=field_in.irrigation_method,
        pump_flow_rate=field_in.pump_flow_rate,
        has_sensor=field_in.has_sensor,
        device_id=field_in.device_id if field_in.device_id else None,
    )

    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field

# List all fields, ordered newest first
@router.get("", response_model=List[FieldOut])
@router.get("/", response_model=List[FieldOut], include_in_schema=False)
def get_fields(db: Session = Depends(get_db)):
    fields = db.query(models.Field).order_by(models.Field.registered_at.desc(), models.Field.id.desc()).all()
    return fields

# Get a single field by ID
@router.get("/{field_id}", response_model=FieldOut)
def get_field(field_id: int, db: Session = Depends(get_db)):
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found."
        )
    return field

# Get the latest sensor reading status for a field
@router.get("/{field_id}/latest-reading")
def get_latest_reading(field_id: int, db: Session = Depends(get_db)):
    # 404 if the field does not exist
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found."
        )

    # No sensor registered on this field
    if not field.has_sensor:
        return {
            "field_id": field_id,
            "status": "no_sensor",
            "message": "This field has no sensor installed.",
            "moisture_percent": None,
            "time": None,
            "age_minutes": None,
        }

    # Fetch the most recent reading for this field's device
    latest = (
        db.query(models.SensorReading)
        .filter(models.SensorReading.device_id == field.device_id)
        .order_by(models.SensorReading.time.desc())
        .first()
    )

    # Sensor exists but no readings recorded yet
    if latest is None:
        return {
            "field_id": field_id,
            "status": "no_data",
            "message": "Sensor is registered but no readings have been received yet.",
            "moisture_percent": None,
            "time": None,
            "age_minutes": None,
        }

    # Calculate how old the latest reading is
    now = datetime.now(timezone.utc)
    reading_time = latest.time if latest.time.tzinfo else latest.time.replace(tzinfo=timezone.utc)
    age_minutes = round((now - reading_time).total_seconds() / 60, 1)

    reading_status = "stale" if age_minutes > STALE_AFTER_MINUTES else "ok"
    message = (
        f"Last reading is {age_minutes} minutes old and may not reflect current conditions."
        if reading_status == "stale"
        else "Sensor is active and reporting current readings."
    )

    return {
        "field_id": field_id,
        "status": reading_status,
        "message": message,
        "moisture_percent": latest.moisture_percent,
        "time": reading_time,
        "age_minutes": age_minutes,
    }
