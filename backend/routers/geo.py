from typing import Any, Dict, List, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
import models
from routers.auth import get_current_farmer
from services.geocode import search_places, reverse_place, GeocodeUnavailable

# APIRouter for geocoding endpoints
router = APIRouter(prefix="/geo", tags=["Geo"])


# Search places by name query
@router.get("/search")
def geo_search(
    q: str = Query(..., description="Place name query (2 to 80 characters)"),
    current_farmer: models.Farmer = Depends(get_current_farmer),
) -> List[Dict[str, Any]]:
    """
    Search places by name using OpenWeatherMap direct geocoding API.
    Returns up to 5 matching places with name, state, country, lat, lon.
    """
    clean_q = q.strip() if q else ""
    if len(clean_q) < 2 or len(clean_q) > 80:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Search query must be between 2 and 80 characters.",
        )

    try:
        return search_places(clean_q)
    except GeocodeUnavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service is not available right now",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service is not available right now",
        )


# Reverse geocode coordinates to place details
@router.get("/reverse")
def geo_reverse(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180"),
    current_farmer: models.Farmer = Depends(get_current_farmer),
) -> Any:
    """
    Reverse geocode coordinates to a place (name, state, country).
    Returns place dictionary or empty list if nothing found.
    """
    try:
        result = reverse_place(lat, lon)
        if not result:
            return []
        return result
    except GeocodeUnavailable:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service is not available right now",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service is not available right now",
        )
