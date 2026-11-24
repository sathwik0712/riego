from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import RecommendationCreate, RecommendationOut
from normalize import to_utc
from ml.predict import predict_for_field
from ml.scheduler import (
    build_plan,
    build_farmer_plan,
    format_advice_sentence,
    slots_from_recommendation,
)
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

    field_name = field.nickname or f"Field {field.id}"

    # Pending wins: if a field has both a pending and a done recommendation, the plan uses
    # the pending one. A done one is shown only when no pending one exists and it was created in the last 24 hours.
    rec_24h_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    active_rec = (
        db.query(models.Recommendation)
        .filter(
            models.Recommendation.field_id == field_id,
            models.Recommendation.status == "pending",
        )
        .order_by(models.Recommendation.created_at.desc())
        .first()
    )
    if not active_rec:
        active_rec = (
            db.query(models.Recommendation)
            .filter(
                models.Recommendation.field_id == field_id,
                models.Recommendation.status == "done",
                models.Recommendation.created_at >= rec_24h_cutoff,
            )
            .order_by(models.Recommendation.created_at.desc())
            .first()
        )

    if active_rec:
        rec_slots = slots_from_recommendation(active_rec, db=db)
        for s in rec_slots:
            s["recommendation_id"] = active_rec.id
            s["recommendation_status"] = active_rec.status

        return {
            "status": "ok",
            "field_id": field_id,
            "field_nickname": field.nickname,
            "should_irrigate": (active_rec.duration_minutes or 0) > 0,
            "duration_minutes": active_rec.duration_minutes,
            "action": active_rec.action or ("water" if (active_rec.duration_minutes or 0) > 0 else "wait"),
            "advice_text": active_rec.advice_text or format_advice_sentence(field_name, rec_slots, True),
            "slots": rec_slots,
        }

    # NOTE: This GET endpoint can now write a recommendation row when no active recommendation exists.
    # Call ensure_recommendation to either create a new one or determine why we should not.
    try:
        ens_result = ensure_recommendation(db, field_id)
    except Exception:
        ens_result = {"result": "error"}

    ens_result_key = ens_result.get("result", "")

    if ens_result_key in ("created", "already_open"):
        # Re-query the pending recommendation that was just created or found
        new_active_rec = (
            db.query(models.Recommendation)
            .filter(
                models.Recommendation.field_id == field_id,
                models.Recommendation.status == "pending",
            )
            .order_by(models.Recommendation.created_at.desc())
            .first()
        )
        if new_active_rec:
            rec_slots = slots_from_recommendation(new_active_rec, db=db)
            for s in rec_slots:
                s["recommendation_id"] = new_active_rec.id
                s["recommendation_status"] = new_active_rec.status
            return {
                "status": "ok",
                "field_id": field_id,
                "field_nickname": field.nickname,
                "should_irrigate": (new_active_rec.duration_minutes or 0) > 0,
                "duration_minutes": new_active_rec.duration_minutes,
                "action": new_active_rec.action or ("water" if (new_active_rec.duration_minutes or 0) > 0 else "wait"),
                "advice_text": new_active_rec.advice_text or format_advice_sentence(field_name, rec_slots, True),
                "slots": rec_slots,
            }
        # If re-query somehow missed it, fall through to fresh prediction below

    elif ens_result_key == "paused_after_irrigation":
        # Field watered recently — return paused status with no watering slots
        return {
            "status": "paused_after_irrigation",
            "field_id": field_id,
            "field_nickname": field.nickname,
            "should_irrigate": False,
            "duration_minutes": 0,
            "action": "wait",
            "advice_text": "You watered recently.",
            "slots": [],
        }

    # Only when ensure_recommendation says not_needed / not_enough_data / stale / error,
    # fall back to a fresh prediction with recommendation_id null
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
    advice = format_advice_sentence(field_name, slots, pred.get("should_irrigate", False))

    for s in slots:
        s["recommendation_id"] = None
        s["recommendation_status"] = None
        s["done"] = False
        s["done_at"] = None

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
