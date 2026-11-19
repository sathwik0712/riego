from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import FieldCreate, FieldOut, ManualReadingCreate, ManualReadingOut
from services.sensor import get_field_latest_sensor_reading, STALE_AFTER_MINUTES
from services.conditions import get_field_conditions
from pump import resolve_pump_flow
from ml.predict import predict_for_field
from routers.auth import get_current_farmer

# APIRouter for field-related endpoints
router = APIRouter(prefix="/fields", tags=["Fields"])

# Create a new field
@router.post("", response_model=FieldOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=FieldOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_field(
    field_in: FieldCreate,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    # Check if device_id is already assigned to an existing field
    if field_in.device_id:
        existing_device = db.query(models.Field).filter(models.Field.device_id == field_in.device_id).first()
        if existing_device:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device ID '{field_in.device_id}' is already in use by another field."
            )

    # Resolve pump flow rate and source based on typed flow or horsepower
    flow_lph, flow_source = resolve_pump_flow(field_in.pump_flow_rate, field_in.pump_hp)

    # Instantiate the new field with logged-in farmer_id
    new_field = models.Field(
        farmer_id=current_farmer.farmer_id,
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
        pump_flow_rate=flow_lph,
        pump_hp=field_in.pump_hp,
        pump_flow_source=flow_source,
        has_sensor=field_in.has_sensor,
        device_id=field_in.device_id if field_in.device_id else None,
    )

    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field

# List all fields for the logged-in farmer, ordered newest first
@router.get("", response_model=List[FieldOut])
@router.get("/", response_model=List[FieldOut], include_in_schema=False)
def get_fields(
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    fields = (
        db.query(models.Field)
        .filter(models.Field.farmer_id == current_farmer.farmer_id)
        .order_by(models.Field.registered_at.desc(), models.Field.id.desc())
        .all()
    )
    return fields

# Get a single field by ID
@router.get("/{field_id}", response_model=FieldOut)
def get_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found."
        )
    return field

# Get the latest sensor reading status for a field
@router.get("/{field_id}/latest-reading")
def get_latest_reading(
    field_id: int,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    # 404 if the field does not exist or belongs to another farmer
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found."
        )

    reading = get_field_latest_sensor_reading(db, field)
    return {
        "field_id": field_id,
        "status": reading["status"],
        "message": reading["message"],
        "moisture_percent": reading["moisture_percent"],
        "time": reading["time"],
        "age_minutes": reading["age_minutes"],
        "source": reading.get("source"),
    }

# Get combined conditions (soil moisture, weather, crop, notes) for a field
@router.get("/{field_id}/conditions")
def get_field_conditions_endpoint(
    field_id: int,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    """
    Get aggregated field telemetry and current conditions:
    soil moisture, weather snapshot, days since sowing, and notices.
    """
    # 404 if the field does not exist or belongs to another farmer
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    try:
        return get_field_conditions(db, field)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while gathering field conditions."
        )


# Record a manual soil moisture reading for a field
@router.post("/{field_id}/manual-reading", response_model=ManualReadingOut, status_code=status.HTTP_201_CREATED)
@router.post("/{field_id}/manual-reading/", response_model=ManualReadingOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_manual_reading(
    field_id: int,
    reading_in: ManualReadingCreate,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    """
    Record a manual soil moisture reading (0 to 100%) for a field.
    Flows through the same pipeline as sensor readings so history and conditions reflect it.
    """
    # 404 if the field does not exist or belongs to another farmer
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    now_utc = datetime.now(timezone.utc)
    # Manual readings have no real raw sensor value, so raw_value stores the typed moisture percent rounded to a whole number
    rounded_raw = int(round(reading_in.moisture_percent))
    device_id = f"manual-{field.id}"

    new_reading = models.SensorReading(
        time=now_utc,
        device_id=device_id,
        field_id=field.id,
        raw_value=rounded_raw,
        moisture_percent=reading_in.moisture_percent,
        source="manual",
    )

    try:
        db.add(new_reading)
        db.commit()
        db.refresh(new_reading)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save manual reading."
        )

    return {
        "field_id": field.id,
        "moisture_percent": reading_in.moisture_percent,
        "time": new_reading.time,
        "source": "manual",
    }


# GET /fields/{field_id}/prediction — ML irrigation prediction for one field
@router.get("/{field_id}/prediction")
def get_field_prediction(
    field_id: int,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
) -> Dict[str, Any]:
    """
    Return an ML-based irrigation prediction for a single field.

    - 404 if the field does not exist or belongs to another farmer.
    - Does not write to the database.
    - status "ok": full prediction result.
    - status "not_enough_data": no moisture reading or field not sown.
    - status "error": model files missing or other failure.
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found.",
        )
    return predict_for_field(db, field_id)
