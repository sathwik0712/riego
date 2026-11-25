"""Service for aggregating comprehensive field telemetry and conditions."""

from datetime import datetime, timezone
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
import models
import services.sensor as sensor_service
import services.weather as weather_service

# Add backend directory so crop_targets and growth can be imported
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from crop_targets import _LOWER_CROP_TARGETS, get_target_range
from growth import get_growth_stage

# Default fallback soil moisture thresholds when crop or stage is unknown
CONDITIONS_FALLBACK = (30.0, 60.0)
MOISTURE_DRY_THRESHOLD = CONDITIONS_FALLBACK[0]
MOISTURE_GOOD_THRESHOLD = CONDITIONS_FALLBACK[1]


def _compute_moisture_level(
    moisture_percent: Optional[float],
    crop: Optional[str] = None,
    stage: Optional[str] = None,
) -> Optional[str]:
    """Compute rule-based moisture level ('dry', 'okay', 'good') or None if missing.
    Uses crop_targets for known crop & stage to match ML scheduler limits.
    Falls back to CONDITIONS_FALLBACK (30.0, 60.0) if crop or stage is unknown.
    """
    if moisture_percent is None:
        return None

    clean_crop = crop.strip().lower() if isinstance(crop, str) else ""
    clean_stage = stage.strip().lower() if isinstance(stage, str) else ""
    crop_dict = _LOWER_CROP_TARGETS.get(clean_crop)
    if crop_dict is not None and clean_stage in crop_dict:
        dry_limit, good_limit = crop_dict[clean_stage]
    else:
        dry_limit, good_limit = CONDITIONS_FALLBACK

    if moisture_percent < dry_limit:
        return "dry"
    if moisture_percent < good_limit:
        return "okay"
    return "good"


compute_moisture_level = _compute_moisture_level


def get_field_conditions(db: Session, field: models.Field) -> Dict[str, Any]:
    """
    Gather everything known about one field into a unified snapshot:
    - Basic metadata: field_id, nickname, crop, days_since_sowing
    - Soil moisture telemetry: status, moisture_percent, level, measured_at, device_id
    - Weather telemetry: availability, current weather, 5-day forecast, rain_expected_soon, rain_total_mm_next_2_days
    - Notes: alerts or notices for missing, stale, offline, or upcoming rain conditions

    Fails gracefully: outages or missing data in one component never block the other.
    """
    # 1. Calculate days since sowing and growth stage
    days_since_sowing: Optional[int] = None
    if field.sowing_date is not None:
        today_utc = datetime.now(timezone.utc).date()
        diff_days = (today_utc - field.sowing_date).days
        if diff_days >= 0:
            days_since_sowing = diff_days

    growth_stage = get_growth_stage(field.sowing_date, field.crop)

    # 2. Retrieve latest soil moisture reading, status, and rule-based level
    try:
        sensor_info = sensor_service.get_field_latest_sensor_reading(db, field)
    except Exception as e:
        sensor_info = {
            "status": "no_data",
            "message": "Unable to determine sensor status.",
            "moisture_percent": None,
            "measured_at": None,
            "device_id": getattr(field, "device_id", None),
        }

    moisture_level = _compute_moisture_level(
        sensor_info.get("moisture_percent"),
        crop=field.crop,
        stage=growth_stage,
    )

    device_id = sensor_info.get("device_id")
    source = sensor_info.get("source")
    if not source and device_id:
        source = "manual" if str(device_id).startswith("manual-") else "sensor"
    elif not source:
        source = None

    soil_moisture = {
        "status": sensor_info.get("status", "no_data"),
        "message": sensor_info.get("message", ""),
        "moisture_percent": sensor_info.get("moisture_percent"),
        "level": moisture_level,
        "measured_at": sensor_info.get("measured_at"),
        "device_id": device_id,
        "source": source,
    }

    # 3. Retrieve weather with in-memory caching, history saving, and 2-day rain outlook
    try:
        weather_data = weather_service.fetch_field_weather(db, field)
        forecast = weather_data.get("forecast") or []

        # Check rain expected today or tomorrow (first two forecast entries)
        next_2_days = forecast[:2] if isinstance(forecast, list) else []
        rain_expected_soon = any(bool(day.get("rain_expected")) for day in next_2_days)
        rain_total_mm = sum(float(day.get("total_rain_mm", 0.0) or 0.0) for day in next_2_days)
        rain_total_mm_next_2_days = round(rain_total_mm, 1)

        weather = {
            "available": True,
            "current": weather_data.get("current"),
            "forecast": forecast,
            "rain_expected_soon": rain_expected_soon,
            "rain_total_mm_next_2_days": rain_total_mm_next_2_days,
            "message": None,
        }
    except (weather_service.WeatherUnavailable, Exception):
        weather = {
            "available": False,
            "current": None,
            "forecast": None,
            "rain_expected_soon": None,
            "rain_total_mm_next_2_days": None,
            "message": "Weather service is not available right now",
        }

    # 4. Generate user-facing notices for stale, missing, or critical conditions
    notes: List[str] = []

    sensor_status = soil_moisture.get("status")
    if sensor_status == "no_data":
        notes.append("No sensor reading yet")
    elif sensor_status == "stale":
        notes.append("Sensor reading is old")
    elif sensor_status == "no_sensor":
        notes.append("No sensor installed")

    if not weather.get("available"):
        notes.append("Weather is not available right now")

    # Flag when soil is dry but rain is expected soon
    if moisture_level == "dry" and weather.get("rain_expected_soon") is True:
        notes.append("Soil is dry but rain is expected soon")

    return {
        "field_id": field.id,
        "nickname": field.nickname,
        "crop": field.crop,
        "days_since_sowing": days_since_sowing,
        "soil_moisture": soil_moisture,
        "weather": weather,
        "notes": notes,
    }
