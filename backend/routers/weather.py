import time
from typing import Any, Dict, Tuple
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
from services.weather import get_current_weather, get_forecast, WeatherUnavailable

# APIRouter for weather-related endpoints
router = APIRouter(prefix="/weather", tags=["Weather"])

# In-memory cache for weather results: (lat_round, lon_round) -> (timestamp, data)
# Note: This in-memory cache will later be replaced by the weather history table.
CACHE_TTL_SECONDS = 600  # 10 minutes
_weather_cache: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}


@router.get("/{field_id}")
def get_field_weather(field_id: int, db: Session = Depends(get_db)):
    """
    Get current weather and 5-day forecast for a field by its ID.
    Reuses in-memory cached results for matching coordinates within 10 minutes.
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

    # Save to cache
    _weather_cache[cache_key] = (now, {"current": current, "forecast": forecast})

    return {
        "field_id": field.id,
        "current": current,
        "forecast": forecast,
    }
