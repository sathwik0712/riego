"""Irrigation detection service for identifying likely watering events from moisture jumps."""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List
from sqlalchemy.orm import Session
import models

# Approximate values for now
JUMP_PERCENT = 10  # Moisture points
WINDOW_MINUTES = 60  # Time window in minutes within which moisture jump must occur


def detect_irrigation_events(db: Session, field_id: int, hours: int = 168) -> List[Dict[str, Any]]:
    """
    Scans soil moisture readings (sensor and manual) oldest to newest and returns a list
    of {time, moisture_before, moisture_after, jump} wherever moisture rises by at least
    JUMP_PERCENT within WINDOW_MINUTES. Skip pairs with missing values. Do not invent data.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    # Scans soil moisture readings (sensor and manual) oldest to newest
    readings = (
        db.query(models.SensorReading)
        .filter(
            models.SensorReading.field_id == field_id,
            models.SensorReading.time >= cutoff,
        )
        .order_by(models.SensorReading.time.asc())
        .all()
    )

    # Skip pairs with missing values
    valid_readings = [
        r for r in readings
        if r.time is not None and r.moisture_percent is not None
    ]

    events: List[Dict[str, Any]] = []

    for i in range(len(valid_readings) - 1):
        r_before = valid_readings[i]
        r_after = valid_readings[i + 1]

        time_before = r_before.time if r_before.time.tzinfo else r_before.time.replace(tzinfo=timezone.utc)
        time_after = r_after.time if r_after.time.tzinfo else r_after.time.replace(tzinfo=timezone.utc)

        delta_seconds = (time_after - time_before).total_seconds()
        if delta_seconds < 0:
            continue

        delta_minutes = delta_seconds / 60.0

        if delta_minutes <= WINDOW_MINUTES:
            jump = r_after.moisture_percent - r_before.moisture_percent
            if jump >= JUMP_PERCENT:
                events.append({
                    "time": time_after,
                    "moisture_before": r_before.moisture_percent,
                    "moisture_after": r_after.moisture_percent,
                    "jump": round(jump, 2),
                })

    return events
