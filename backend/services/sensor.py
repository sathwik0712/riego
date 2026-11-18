"""Sensor service helpers for field readings."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
import models

# Readings older than this many minutes are considered stale
STALE_AFTER_MINUTES = 15


def get_field_latest_sensor_reading(db: Session, field: models.Field) -> Dict[str, Any]:
    """
    Retrieve and evaluate the latest sensor reading for a field.
    Returns status ('ok', 'stale', 'no_data', 'no_sensor') and reading metrics.
    Finds readings by field_id so both hardware and manual readings are supported.
    """
    # Fetch the most recent reading for this field (hardware sensor or manual)
    latest = (
        db.query(models.SensorReading)
        .filter(models.SensorReading.field_id == field.id)
        .order_by(models.SensorReading.time.desc())
        .first()
    )

    # If no reading exists at all, determine whether sensor is missing or waiting for data
    if latest is None:
        if not field.has_sensor:
            return {
                "status": "no_sensor",
                "message": "This field has no sensor installed.",
                "moisture_percent": None,
                "measured_at": None,
                "time": None,
                "device_id": None,
                "age_minutes": None,
                "source": None,
            }
        return {
            "status": "no_data",
            "message": "Sensor is registered but no readings have been received yet.",
            "moisture_percent": None,
            "measured_at": None,
            "time": None,
            "device_id": field.device_id,
            "age_minutes": None,
            "source": None,
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

    source = latest.source if latest.source else ("manual" if str(latest.device_id or "").startswith("manual-") else "sensor")

    return {
        "status": reading_status,
        "message": message,
        "moisture_percent": latest.moisture_percent,
        "measured_at": reading_time,
        "time": reading_time,
        "device_id": latest.device_id,
        "age_minutes": age_minutes,
        "source": source,
    }
