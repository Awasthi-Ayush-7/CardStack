"""
Routes for credit card management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import CreditCard
from ..schemas import CreditCard as CreditCardSchema

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("", response_model=List[CreditCardSchema])
def get_cards(db: Session = Depends(get_db)):
    """
    Get all supported credit cards.
    """
    cards = db.query(CreditCard).all()
    return cards
