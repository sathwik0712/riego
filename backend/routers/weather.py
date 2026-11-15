from datetime import datetime, timezone, timedelta
import time
from typing import Any, Dict, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database import get_db
import models
from services.weather import get_current_weather, get_forecast, WeatherUnavailable

# APIRouter for weather-related endpoints
router = APIRouter(prefix="/weather", tags=["Weather"])

# In-memory cache for weather results: (lat_round, lon_round) -> (timestamp, data)
# Note: This cache sits in front of the weather_readings history table and preserves the 5-day forecast (which is not stored in the database).
CACHE_TTL_SECONDS = 600  # 10 minutes
_weather_cache: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}


# Retrieve historical weather readings for a field over the last N hours, oldest first
@router.get("/{field_id}/history")
def get_field_weather_history(
    field_id: int,
    hours: int = Query(default=24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    """
    Get saved historical weather readings for a field over the last N hours (oldest first).
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
        db.query(models.WeatherReading)
        .filter(
            models.WeatherReading.field_id == field.id,
            models.WeatherReading.recorded_at >= cutoff
        )
        .order_by(models.WeatherReading.recorded_at.asc())
        .all()
    )

    items = [
        {
            "recorded_at": r.recorded_at,
            "temperature_c": r.temperature_c,
            "humidity_percent": r.humidity_percent,
            "wind_speed_ms": r.wind_speed_ms,
            "rain_mm_last_hour": r.rain_mm_last_hour,
            "is_raining": r.is_raining,
            "description": r.description,
        }
        for r in readings
    ]

    return {
        "field_id": field.id,
        "hours": hours,
        "count": len(items),
        "readings": items,
    }


@router.get("/{field_id}")
def get_field_weather(field_id: int, db: Session = Depends(get_db)):
    """
    Get current weather and 5-day forecast for a field by its ID.
    Reuses in-memory cached results for matching coordinates within 10 minutes,
    and records fresh current weather into weather_readings history.
    """
    # Look up the field by its ID
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    # Check cache for rounded coordinates (lat/lon rounded to 2 decimals)
    cache_key = (round(field.latitude, 2), round(field.longitude, 2))
    now = time.time()

    if cache_key in _weather_cache:
        cached_time, cached_data = _weather_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return {
                "field_id": field.id,
                "current": cached_data["current"],
                "forecast": cached_data["forecast"],
            }

    # Fetch weather data from the weather service
    try:
        current = get_current_weather(field.latitude, field.longitude)
        forecast = get_forecast(field.latitude, field.longitude)
    except WeatherUnavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is not available right now"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is not available right now"
        )

    # Save to in-memory cache
    _weather_cache[cache_key] = (now, {"current": current, "forecast": forecast})

    # Save current weather reading to history if not recently recorded
    try:
        now_utc = datetime.now(timezone.utc)
        latest_reading = (
            db.query(models.WeatherReading)
            .filter(models.WeatherReading.field_id == field.id)
            .order_by(models.WeatherReading.recorded_at.desc())
            .first()
        )

        should_save = True
        if latest_reading and latest_reading.recorded_at:
            recorded_at = latest_reading.recorded_at
            if recorded_at.tzinfo is None:
                recorded_at = recorded_at.replace(tzinfo=timezone.utc)
            if (now_utc - recorded_at) < timedelta(minutes=10):
                should_save = False

        if should_save:
            weather_entry = models.WeatherReading(
                field_id=field.id,
                recorded_at=now_utc,
                temperature_c=float(current.get("temperature_c", 0.0)),
                humidity_percent=float(current.get("humidity_percent", 0.0)),
                wind_speed_ms=float(current.get("wind_speed_ms", 0.0)),
                rain_mm_last_hour=float(current.get("rain_mm_last_hour", 0.0)),
                is_raining=bool(current.get("is_raining", False)),
                description=str(current.get("description", "")),
            )
            db.add(weather_entry)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Notice: Failed to persist weather reading to history: {e}")

    return {
        "field_id": field.id,
        "current": current,
        "forecast": forecast,
    }
