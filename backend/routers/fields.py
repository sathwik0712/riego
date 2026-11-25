import hashlib
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import FieldCreate, FieldOut, ManualReadingCreate, ManualReadingOut, FieldLocationUpdate
from services.sensor import get_field_latest_sensor_reading, STALE_AFTER_MINUTES
from services.conditions import get_field_conditions
from pump import resolve_pump_flow
from ml.predict import predict_for_field
from routers.auth import get_current_farmer


def _generate_device_key() -> tuple[str, str]:
    """Return (plain_key, sha256_hex_hash). The plain key is a 32-byte URL-safe token."""
    plain = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(plain.encode()).hexdigest()
    return plain, hashed


def _jsonable(obj):
    """Recursively convert non-JSON-serializable types to strings."""
    if isinstance(obj, dict):
        return {k: _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_jsonable(i) for i in obj]
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    try:
        from datetime import date
        if isinstance(obj, date):
            return obj.isoformat()
    except Exception:
        pass
    return obj


# APIRouter for field-related endpoints
router = APIRouter(prefix="/fields", tags=["Fields"])

# Create a new field
@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
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

    # Generate device key when has_sensor is true (returned once, only hash stored)
    plain_key: Optional[str] = None
    key_hash: Optional[str] = None
    if field_in.has_sensor:
        plain_key, key_hash = _generate_device_key()

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
        device_key_hash=key_hash,
    )

    db.add(new_field)
    db.commit()
    db.refresh(new_field)

    # Build response from FieldOut, then inject device_key once if sensor field
    out = FieldOut.model_validate(new_field) if hasattr(FieldOut, "model_validate") else FieldOut.from_orm(new_field)
    response_data = out.model_dump() if hasattr(out, "model_dump") else out.dict()
    if plain_key is not None:
        response_data["device_key"] = plain_key
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=_jsonable(response_data))


# POST /fields/{field_id}/device-key — farmer owner only, make or rotate the device key
@router.post("/{field_id}/device-key", status_code=status.HTTP_201_CREATED)
def rotate_device_key(
    field_id: int,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    """
    Issue or rotate the device key for a sensor field.
    - 404 if the field does not exist or belongs to another farmer.
    - 400 if has_sensor is False or the field has no device_id.
    - Returns device_key once; only the hash is stored.
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found.",
        )
    if not field.has_sensor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This field has no sensor. Device key requires has_sensor=true.",
        )
    if not field.device_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This field has no device_id set. Assign a device_id before issuing a key.",
        )

    plain_key, key_hash = _generate_device_key()
    field.device_key_hash = key_hash
    db.commit()

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={"field_id": field_id, "device_id": field.device_id, "device_key": plain_key},
    )

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

    # Save a recommendation immediately after a manual reading so the plan is always backed by a saved row.
    # The reading must always succeed; ignore any failure here.
    try:
        from services.auto_recommend import ensure_recommendation
        ensure_recommendation(db, field.id)
    except Exception:
        pass

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


# Update field location (latitude and longitude)
@router.patch("/{field_id}/location", response_model=FieldOut)
def update_field_location(
    field_id: int,
    loc_in: FieldLocationUpdate,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    """
    Update the latitude and longitude of an existing field.
    Only the field's owner can update its location (returns 404 for another farmer's field).
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found."
        )

    field.latitude = loc_in.latitude
    field.longitude = loc_in.longitude
    db.commit()
    db.refresh(field)
    return field

