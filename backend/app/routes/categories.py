"""
Routes for reward category management.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import RewardCategory
from ..schemas import RewardCategory as RewardCategorySchema

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=List[RewardCategorySchema])
def get_categories(db: Session = Depends(get_db)):
    """
    Get all reward categories.
    """
    categories = db.query(RewardCategory).all()
    return categories
