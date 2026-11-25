import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database import get_db
import models
from schemas import SensorReadingCreate, SensorReadingOut
from normalize import raw_to_moisture_percent, to_utc
from routers.auth import get_current_farmer

# APIRouter for sensor readings
router = APIRouter(prefix="/sensor-readings", tags=["Sensor"])

_DEVICE_KEY_ERR = "Device key missing or wrong"


def _check_device_key(field: models.Field, x_device_key: Optional[str]) -> None:
    """Raise 401 with a uniform message for any device-key failure."""
    if not x_device_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_DEVICE_KEY_ERR)
    if not field.device_key_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_DEVICE_KEY_ERR)
    supplied_hash = hashlib.sha256(x_device_key.encode()).hexdigest()
    if not _constant_time_equal(supplied_hash, field.device_key_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_DEVICE_KEY_ERR)


def _constant_time_equal(a: str, b: str) -> bool:
    """Compare two hex strings in constant time (same length guaranteed for SHA-256)."""
    import hmac
    return hmac.compare_digest(a, b)


# Record a new sensor reading — requires X-Device-Key header
@router.post("", response_model=SensorReadingOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SensorReadingOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_sensor_reading(
    reading_in: SensorReadingCreate,
    db: Session = Depends(get_db),
    x_device_key: Optional[str] = Header(default=None),
):
    # Verify that a field exists with this device_id
    field = db.query(models.Field).filter(models.Field.device_id == reading_in.device_id).first()
    if not field:
        # Unknown device — same 401 (do not reveal whether device exists)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_DEVICE_KEY_ERR)

    # Validate device key
    _check_device_key(field, x_device_key)

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

# Retrieve historical sensor readings for a field over the last N hours, oldest first (protected)
@router.get("/{field_id}/history")
def get_field_sensor_history(
    field_id: int,
    hours: int = Query(default=24, ge=1, le=720),
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    """
    Get saved historical sensor readings for a field over the last N hours (oldest first).
    """
    # 404 if the field does not exist or belongs to another farmer
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
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

# Retrieve the latest 20 readings for a device — farmer token + owner only
@router.get("/{device_id}", response_model=List[SensorReadingOut])
def get_sensor_readings(
    device_id: str,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    """
    Return the latest 20 readings for a device_id.
    Requires a farmer bearer token; returns 404 if the device belongs to another farmer.
    """
    # Look up the field that owns this device
    field = db.query(models.Field).filter(models.Field.device_id == device_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found.",
        )
    readings = (
        db.query(models.SensorReading)
        .filter(models.SensorReading.device_id == device_id)
        .order_by(models.SensorReading.time.desc())
        .limit(20)
        .all()
    )
    return readings
