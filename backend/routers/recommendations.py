from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import RecommendationCreate, RecommendationOut
from normalize import to_utc
from ml.predict import predict_for_field
from ml.scheduler import build_plan, build_farmer_plan, format_advice_sentence
from services.auto_recommend import ensure_recommendation, _rec_to_dict
from routers.auth import get_current_farmer

# APIRouter for recommendation endpoints
router = APIRouter(tags=["Recommendations"])


# Create a new recommendation for a field
@router.post("/recommendations", response_model=RecommendationOut, status_code=status.HTTP_201_CREATED)
@router.post("/recommendations/", response_model=RecommendationOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_recommendation(
    rec_in: RecommendationCreate,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    # 404 if the field does not exist or belongs to another farmer
    field = db.query(models.Field).filter(models.Field.id == rec_in.field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    # Instantiate and save the new recommendation
    new_rec = models.Recommendation(
        field_id=rec_in.field_id,
        advice_text=rec_in.advice_text,
        action=rec_in.action,
        water_at=to_utc(rec_in.water_at) if rec_in.water_at else None,
        duration_minutes=rec_in.duration_minutes,
        source=rec_in.source if rec_in.source else "rule",
        status=rec_in.status if rec_in.status else "pending",
    )

    db.add(new_rec)
    db.commit()
    db.refresh(new_rec)
    return new_rec


# List recommendations for a field, newest first
@router.get("/fields/{field_id}/recommendations", response_model=List[RecommendationOut])
@router.get("/fields/{field_id}/recommendations/", response_model=List[RecommendationOut], include_in_schema=False)
def get_field_recommendations(
    field_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
):
    # 404 if the field does not exist or belongs to another farmer
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )

    # Fetch recommendations ordered newest first
    recs = (
        db.query(models.Recommendation)
        .filter(models.Recommendation.field_id == field_id)
        .order_by(models.Recommendation.created_at.desc(), models.Recommendation.id.desc())
        .limit(limit)
        .all()
    )
    return recs


# Get irrigation prediction and time-slotted plan for a field
@router.get("/fields/{field_id}/recommendation")
def get_field_recommendation(
    field_id: int,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
) -> Dict[str, Any]:
    """
    Return ML prediction, time-slotted plan, and farmer-facing advice sentence for a field.
    Does not write to database. 404 for unknown field or field belonging to another farmer.
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found."
        )

    pred = predict_for_field(db, field_id)

    # Retrieve stored forecast snapshot if available
    snap = (
        db.query(models.ForecastSnapshot)
        .filter(models.ForecastSnapshot.field_id == field_id)
        .order_by(models.ForecastSnapshot.fetched_at.desc())
        .first()
    )
    daily_forecast = snap.daily_summary if snap else None

    slots = build_plan(pred, daily_forecast=daily_forecast)
    field_name = field.nickname or f"Field {field.id}"
    advice = format_advice_sentence(field_name, slots, pred.get("should_irrigate", False))

    # Match saved open recommendation for this field (null when none)
    open_rec = (
        db.query(models.Recommendation)
        .filter(
            models.Recommendation.field_id == field_id,
            models.Recommendation.status == "pending",
        )
        .order_by(models.Recommendation.created_at.desc())
        .first()
    )
    rec_id = open_rec.id if open_rec else None
    for s in slots:
        s["recommendation_id"] = rec_id

    result = dict(pred)
    result["field_nickname"] = field.nickname
    result["action"] = "water" if pred.get("should_irrigate") else "wait"
    result["advice_text"] = advice
    result["slots"] = slots
    return result


# Get time-ordered daily plan across all fields for the authenticated farmer (same-pump deconfliction)
@router.get("/plan/today")
def get_today_plan(
    farmer_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
) -> List[Dict[str, Any]]:
    """
    Return all scheduled irrigation slots across all fields belonging to authenticated farmer,
    ordered chronologically and shifted to eliminate pump conflicts.
    Ignores optional farmer_id query parameter and uses token identity.
    Does not write to database.
    """
    return build_farmer_plan(db, farmer_id=current_farmer.farmer_id)


# Save ML-generated plan into recommendations table on request
@router.post("/fields/{field_id}/recommendation/generate")
def generate_field_recommendation(
    field_id: int,
    db: Session = Depends(get_db),
    current_farmer: models.Farmer = Depends(get_current_farmer),
) -> Any:
    """
    Save the ML plan into the recommendations table using existing columns.
    If an open (not done) recommendation exists from the last 6 hours, returns it without duplicating.
    Nothing is saved when should_irrigate is False or status is not 'ok'.
    404 for unknown field or field belonging to another farmer.
    """
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field or field.farmer_id != current_farmer.farmer_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Field with ID {field_id} not found."
        )
    return ensure_recommendation(db, field_id)
