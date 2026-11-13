from datetime import datetime, timezone
from calibration import DRY_RAW, WET_RAW


def raw_to_moisture_percent(raw_value: int) -> float:
    """
    Convert a raw capacitive sensor ADC value to a moisture percentage (0-100%).
    Higher raw values indicate drier soil; lower raw values indicate wetter soil.
    Result is clamped to [0.0, 100.0] and rounded to 1 decimal place.
    """
    # Linear interpolation: WET_RAW (1500) -> 100%, DRY_RAW (3500) -> 0%
    percent = ((DRY_RAW - raw_value) / (DRY_RAW - WET_RAW)) * 100.0

    # Clamp within 0.0% to 100.0%
    clamped = max(0.0, min(100.0, percent))

    return round(clamped, 1)


def to_utc(dt: datetime) -> datetime:
    """
    Convert a datetime to UTC.
    If the datetime is naive (no timezone info), treat it as UTC.
    If it is timezone-aware, convert it to UTC.
    """
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

