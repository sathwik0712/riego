"""Weather service client for OpenWeatherMap API."""

import os
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Tuple
import httpx
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import models

# Resolve path to backend/.env
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# OpenWeatherMap API endpoints
CURRENT_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
REQUEST_TIMEOUT_SECONDS = 10.0


class WeatherUnavailable(Exception):
    """Raised when the weather service is unreachable, unauthorized, or fails."""
    pass


def _get_api_key() -> str:
    """Retrieve the OpenWeatherMap API key from environment without exposing it."""
    load_dotenv(dotenv_path=ENV_PATH)
    key = os.getenv("OPENWEATHER_API_KEY")
    if not key or not key.strip():
        raise WeatherUnavailable("Weather service is not available right now")
    return key.strip()


def get_current_weather(lat: float, lon: float) -> Dict[str, Any]:
    """
    Fetch current weather metrics for given latitude and longitude.

    Returns:
        dict: temperature_c, humidity_percent, wind_speed_ms,
              rain_mm_last_hour (0 if none), is_raining (bool),
              description, fetched_at (UTC ISO timestamp).
    """
    api_key = _get_api_key()
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.get(CURRENT_WEATHER_URL, params=params)

        if response.status_code != 200:
            raise WeatherUnavailable("Weather service is not available right now")

        data = response.json()
    except (httpx.TimeoutException, httpx.RequestError):
        raise WeatherUnavailable("Weather service is not available right now")
    except WeatherUnavailable:
        raise
    except Exception:
        raise WeatherUnavailable("Weather service is not available right now")

    # Safely extract weather metrics with defaults
    main_data = data.get("main") if isinstance(data.get("main"), dict) else {}
    wind_data = data.get("wind") if isinstance(data.get("wind"), dict) else {}
    rain_data = data.get("rain") if isinstance(data.get("rain"), dict) else {}
    weather_list = data.get("weather") if isinstance(data.get("weather"), list) else []

    temp_val = main_data.get("temp")
    temperature_c = round(float(temp_val), 1) if temp_val is not None else 0.0

    humidity_val = main_data.get("humidity")
    humidity_percent = int(humidity_val) if humidity_val is not None else 0

    wind_val = wind_data.get("speed")
    wind_speed_ms = round(float(wind_val), 1) if wind_val is not None else 0.0

    rain_1h = rain_data.get("1h", 0.0)
    rain_mm_last_hour = round(float(rain_1h), 2) if rain_1h is not None else 0.0

    description = ""
    weather_main = ""
    if weather_list and isinstance(weather_list[0], dict):
        description = str(weather_list[0].get("description", "") or "")
        weather_main = str(weather_list[0].get("main", "") or "")

    is_raining = (
        rain_mm_last_hour > 0.0
        or "rain" in description.lower()
        or "rain" in weather_main.lower()
        or "drizzle" in description.lower()
        or "drizzle" in weather_main.lower()
    )

    fetched_at = datetime.now(timezone.utc).isoformat()

    return {
        "temperature_c": temperature_c,
        "humidity_percent": humidity_percent,
        "wind_speed_ms": wind_speed_ms,
        "rain_mm_last_hour": rain_mm_last_hour,
        "is_raining": is_raining,
        "description": description,
        "fetched_at": fetched_at,
    }


def get_forecast(lat: float, lon: float) -> List[Dict[str, Any]]:
    """
    Fetch 5-day forecast (3-hour intervals) grouped by date for given coordinates.

    Returns:
        list of up to 5 daily dicts: date, temp_min_c, temp_max_c,
        avg_humidity_percent, total_rain_mm, max_rain_chance_percent,
        rain_expected.
    """
    api_key = _get_api_key()
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric",
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.get(FORECAST_URL, params=params)

        if response.status_code != 200:
            raise WeatherUnavailable("Weather service is not available right now")

        data = response.json()
    except (httpx.TimeoutException, httpx.RequestError):
        raise WeatherUnavailable("Weather service is not available right now")
    except WeatherUnavailable:
        raise
    except Exception:
        raise WeatherUnavailable("Weather service is not available right now")

    list_entries = data.get("list") if isinstance(data.get("list"), list) else []

    # Group 3-hour forecasts by date (YYYY-MM-DD)
    daily_groups: Dict[str, List[Dict[str, Any]]] = {}
    for entry in list_entries:
        if not isinstance(entry, dict):
            continue

        date_str = ""
        dt_txt = entry.get("dt_txt")
        if isinstance(dt_txt, str) and dt_txt.strip():
            date_str = dt_txt.strip().split(" ")[0]
        elif entry.get("dt") is not None:
            try:
                date_str = datetime.fromtimestamp(entry["dt"], timezone.utc).strftime("%Y-%m-%d")
            except (ValueError, OSError):
                continue

        if not date_str:
            continue

        if date_str not in daily_groups:
            daily_groups[date_str] = []
        daily_groups[date_str].append(entry)

    # Build up to 5 daily summaries
    forecast_results: List[Dict[str, Any]] = []
    for date, entries in list(daily_groups.items())[:5]:
        temp_mins: List[float] = []
        temp_maxs: List[float] = []
        humidities: List[float] = []
        rain_values: List[float] = []
        pop_values: List[float] = []

        for item in entries:
            if not isinstance(item, dict):
                continue

            main = item.get("main") if isinstance(item.get("main"), dict) else {}

            t_min = main.get("temp_min", main.get("temp"))
            if t_min is not None:
                try:
                    temp_mins.append(float(t_min))
                except (ValueError, TypeError):
                    pass

            t_max = main.get("temp_max", main.get("temp"))
            if t_max is not None:
                try:
                    temp_maxs.append(float(t_max))
                except (ValueError, TypeError):
                    pass

            hum = main.get("humidity")
            if hum is not None:
                try:
                    humidities.append(float(hum))
                except (ValueError, TypeError):
                    pass

            rain_dict = item.get("rain") if isinstance(item.get("rain"), dict) else {}
            r_3h = rain_dict.get("3h", 0.0) if isinstance(rain_dict, dict) else 0.0
            if r_3h is not None:
                try:
                    rain_values.append(float(r_3h))
                except (ValueError, TypeError):
                    rain_values.append(0.0)
            else:
                rain_values.append(0.0)

            pop = item.get("pop", 0.0)
            if pop is not None:
                try:
                    pop_values.append(float(pop))
                except (ValueError, TypeError):
                    pop_values.append(0.0)
            else:
                pop_values.append(0.0)

        day_temp_min = round(min(temp_mins), 1) if temp_mins else 0.0
        day_temp_max = round(max(temp_maxs), 1) if temp_maxs else 0.0
        day_avg_humidity = round(sum(humidities) / len(humidities), 1) if humidities else 0.0
        day_total_rain = round(sum(rain_values), 2) if rain_values else 0.0
        day_max_rain_chance = round(max(pop_values) * 100.0, 1) if pop_values else 0.0
        day_max_rain_chance = max(0.0, min(100.0, day_max_rain_chance))

        # Rain expected: total rain > 1mm or rain chance >= 60%
        rain_expected = (day_total_rain > 1.0) or (day_max_rain_chance >= 60.0)

        forecast_results.append({
            "date": date,
            "temp_min_c": day_temp_min,
            "temp_max_c": day_temp_max,
            "avg_humidity_percent": day_avg_humidity,
            "total_rain_mm": day_total_rain,
            "max_rain_chance_percent": day_max_rain_chance,
            "rain_expected": rain_expected,
        })

    return forecast_results


# In-memory cache for weather results: (lat_round, lon_round) -> (timestamp, data)
# Note: This cache sits in front of the weather_readings history table and preserves the 5-day forecast (which is not stored in the database).
CACHE_TTL_SECONDS = 600  # 10 minutes
_weather_cache: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}


def fetch_field_weather(db: Session, field: Any) -> Dict[str, Any]:
    """
    Get current weather and 5-day forecast for a field with 10-minute in-memory cache
    and history persistence to weather_readings on fresh fetches.
    Raises WeatherUnavailable if the external API call fails on a cache miss.
    """
    cache_key = (round(field.latitude, 2), round(field.longitude, 2))
    now = time.time()

    if cache_key in _weather_cache:
        cached_time, cached_data = _weather_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return {
                "current": cached_data["current"],
                "forecast": cached_data["forecast"],
            }

    # Cache miss: fetch fresh weather from OpenWeatherMap
    current = get_current_weather(field.latitude, field.longitude)
    forecast = get_forecast(field.latitude, field.longitude)

    # Save to in-memory cache
    _weather_cache[cache_key] = (now, {"current": current, "forecast": forecast})

    # Save current weather reading to history if not recently recorded (< 10 min)
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
        "current": current,
        "forecast": forecast,
    }

