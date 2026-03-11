"""
Routes for user card management (add/remove cards).
All routes require authentication.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..auth import get_current_user_db
from ..models import UserCard, CreditCard, User
from ..schemas import UserCard as UserCardSchema, UserCardCreate

router = APIRouter(prefix="/user/cards", tags=["user-cards"])


@router.get("", response_model=List[UserCardSchema])
def get_user_cards(
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db)
):
    """
    Get all credit cards for the current authenticated user.
    """
    user_cards = db.query(UserCard).filter(
        UserCard.user_id == current_user.id
    ).all()
    return user_cards


@router.post("", response_model=UserCardSchema, status_code=201)
def add_user_card(
    card_data: UserCardCreate,
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db)
):
    """
    Add a credit card to the current user's collection by credit_card_id.
    """
    # Verify card exists
    card = db.query(CreditCard).filter(CreditCard.id == card_data.credit_card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Credit card not found")

    # Check if already added for this user
    existing = db.query(UserCard).filter(
        UserCard.user_id == current_user.id,
        UserCard.credit_card_id == card_data.credit_card_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Card already added")

    # Create user card
    user_card = UserCard(
        user_id=current_user.id,
        credit_card_id=card_data.credit_card_id
    )
    db.add(user_card)
    db.commit()
    db.refresh(user_card)
    return user_card


@router.delete("/{user_card_id}", status_code=204)
def remove_user_card(
    user_card_id: int,
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db)
):
    """
    Remove a credit card from the current user's collection.
    """
    user_card = db.query(UserCard).filter(
        UserCard.id == user_card_id,
        UserCard.user_id == current_user.id  # Ensure user owns this card
    ).first()
    if not user_card:
        raise HTTPException(status_code=404, detail="User card not found")

    db.delete(user_card)
    db.commit()
    return None
