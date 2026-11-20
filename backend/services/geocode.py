"""Geocoding service client for OpenWeatherMap Geo API."""

import time
from typing import Any, Dict, List, Optional, Tuple
import httpx
from services.weather import _get_api_key, WeatherUnavailable


class GeocodeUnavailable(Exception):
    """Raised when the geocoding service is unreachable, unauthorized, or fails."""
    pass


GEO_DIRECT_URL = "https://api.openweathermap.org/geo/1.0/direct"
GEO_REVERSE_URL = "https://api.openweathermap.org/geo/1.0/reverse"
REQUEST_TIMEOUT_SECONDS = 10.0
CACHE_TTL_SECONDS = 3600  # 1 hour

# In-memory caches:
# _search_cache: query (normalized lower) -> (timestamp, list_of_places)
# _reverse_cache: (lat_round, lon_round) -> (timestamp, place_dict_or_none)
_search_cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}
_reverse_cache: Dict[Tuple[float, float], Tuple[float, Optional[Dict[str, Any]]]] = {}


def search_places(query: str) -> List[Dict[str, Any]]:
    """
    Search places by name using OpenWeatherMap direct geocoding API.
    Returns up to 5 results with name, state, country, lat, lon.
    Caches results for 1 hour.
    """
    clean_query = query.strip()
    cache_key = clean_query.lower()
    now = time.time()

    if cache_key in _search_cache:
        cached_time, cached_data = _search_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    try:
        api_key = _get_api_key()
    except WeatherUnavailable:
        raise GeocodeUnavailable("Geocoding service is not available right now")

    params = {
        "q": clean_query,
        "limit": 5,
        "appid": api_key,
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.get(GEO_DIRECT_URL, params=params)

        if response.status_code != 200:
            raise GeocodeUnavailable("Geocoding service is not available right now")

        data = response.json()
    except (httpx.TimeoutException, httpx.RequestError):
        raise GeocodeUnavailable("Geocoding service is not available right now")
    except GeocodeUnavailable:
        raise
    except Exception:
        raise GeocodeUnavailable("Geocoding service is not available right now")

    results: List[Dict[str, Any]] = []
    if isinstance(data, list):
        for item in data[:5]:
            if isinstance(item, dict):
                results.append({
                    "name": str(item.get("name") or ""),
                    "state": str(item.get("state") or ""),
                    "country": str(item.get("country") or ""),
                    "lat": float(item.get("lat", 0.0)),
                    "lon": float(item.get("lon", 0.0)),
                })

    _search_cache[cache_key] = (now, results)
    return results


def reverse_place(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """
    Reverse geocode coordinates to find a place name, state, country.
    Returns a dict with name, state, country, or None if not found.
    Caches results for 1 hour.
    """
    cache_key = (round(lat, 4), round(lon, 4))
    now = time.time()

    if cache_key in _reverse_cache:
        cached_time, cached_data = _reverse_cache[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    try:
        api_key = _get_api_key()
    except WeatherUnavailable:
        raise GeocodeUnavailable("Geocoding service is not available right now")

    params = {
        "lat": lat,
        "lon": lon,
        "limit": 1,
        "appid": api_key,
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = client.get(GEO_REVERSE_URL, params=params)

        if response.status_code != 200:
            raise GeocodeUnavailable("Geocoding service is not available right now")

        data = response.json()
    except (httpx.TimeoutException, httpx.RequestError):
        raise GeocodeUnavailable("Geocoding service is not available right now")
    except GeocodeUnavailable:
        raise
    except Exception:
        raise GeocodeUnavailable("Geocoding service is not available right now")

    result: Optional[Dict[str, Any]] = None
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
        first = data[0]
        result = {
            "name": str(first.get("name") or ""),
            "state": str(first.get("state") or ""),
            "country": str(first.get("country") or ""),
        }

    _reverse_cache[cache_key] = (now, result)
    return result
