from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database import get_db
import models
from schemas import RecommendationCreate, RecommendationOut
from normalize import to_utc

# APIRouter for recommendation endpoints
router = APIRouter(tags=["Recommendations"])


# Create a new recommendation for a field
@router.post("/recommendations", response_model=RecommendationOut, status_code=status.HTTP_201_CREATED)
@router.post("/recommendations/", response_model=RecommendationOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_recommendation(rec_in: RecommendationCreate, db: Session = Depends(get_db)):
    # 404 if the field does not exist
    field = db.query(models.Field).filter(models.Field.id == rec_in.field_id).first()
    if not field:
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
    db: Session = Depends(get_db)
):
    # 404 if the field does not exist
    field = db.query(models.Field).filter(models.Field.id == field_id).first()
    if not field:
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
