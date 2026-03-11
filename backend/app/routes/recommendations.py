"""
Routes for getting credit card recommendations.
Requires authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user_db
from ..models import RewardCategory, UserCard, User
from ..schemas import RecommendationResponse
from ..services.reward_service import RewardService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("", response_model=RecommendationResponse)
def get_recommendations(
    category: str = Query(..., description="Spending category (e.g., Dining, Travel)"),
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db)
):
    """
    Get the best credit card recommendation for a given spending category.
    Returns:
    - recommendations: user's cards ranked by rate for this category
      (falls back to General rate if no specific rule exists)
    - best_overall: the best card in the entire catalog for this category
      (includes user_owns flag)
    """
    category_obj = db.query(RewardCategory).filter(
        RewardCategory.name == category
    ).first()
    if not category_obj:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    recommendations = RewardService.get_best_cards_for_category(
        db, category, current_user.id
    )

    # Collect the user's card IDs for ownership check
    user_card_ids = [
        uc.credit_card_id
        for uc in db.query(UserCard).filter(UserCard.user_id == current_user.id).all()
    ]

    best_overall = RewardService.get_best_overall_for_category(
        db, category, user_card_ids
    )

    return RecommendationResponse(
        category=category,
        recommendations=recommendations,
        best_overall=best_overall,
    )
