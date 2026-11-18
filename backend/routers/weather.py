from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import ForecastSnapshotOut
from services.weather import fetch_field_weather, WeatherUnavailable

# APIRouter for weather-related endpoints
router = APIRouter(prefix="/weather", tags=["Weather"])


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


# Retrieve historical forecast snapshots for a field over the last N hours, oldest first
@router.get("/{field_id}/forecast-history", response_model=List[ForecastSnapshotOut])
@router.get("/{field_id}/forecast-history/", response_model=List[ForecastSnapshotOut], include_in_schema=False)
def get_field_forecast_history(
    field_id: int,
    hours: int = Query(default=72, ge=1, le=720),
    db: Session = Depends(get_db)
):
    """
    Get saved historical forecast snapshots for a field over the last N hours (oldest first).
    """
    # 404 if the field does not exist
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    # Fetch snapshots within the last N hours, ordered oldest first
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    snapshots = (
        db.query(models.ForecastSnapshot)
        .filter(
            models.ForecastSnapshot.field_id == field.id,
            models.ForecastSnapshot.fetched_at >= cutoff
        )
        .order_by(models.ForecastSnapshot.fetched_at.asc(), models.ForecastSnapshot.id.asc())
        .all()
    )

    return snapshots



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

    # Fetch weather data via shared service (handles cache and history persistence)
    try:
        weather_data = fetch_field_weather(db, field)
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

    return {
        "field_id": field.id,
        "current": weather_data["current"],
        "forecast": weather_data["forecast"],
    }
