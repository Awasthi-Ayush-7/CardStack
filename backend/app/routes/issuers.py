"""
Routes for card issuer management.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import CardIssuer, CreditCard
from ..schemas import CardIssuer as CardIssuerSchema, CreditCard as CreditCardSchema

router = APIRouter(prefix="/issuers", tags=["issuers"])


@router.get("", response_model=List[CardIssuerSchema])
def get_issuers(db: Session = Depends(get_db)):
    """
    Get all card issuers.
    """
    issuers = db.query(CardIssuer).all()
    return issuers


@router.get("/{issuer_id}/cards", response_model=List[CreditCardSchema])
def get_issuer_cards(issuer_id: int, db: Session = Depends(get_db)):
    """
    Get all credit cards for a specific issuer.
    """
    cards = db.query(CreditCard).filter(
        CreditCard.issuer_id == issuer_id
    ).all()
    return cards
