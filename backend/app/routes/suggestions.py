"""
Card suggestion routes — authenticated users submit and view their own suggestions.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..auth import get_current_user_db
from ..models import User, CardSuggestion
from ..schemas import CardSuggestionCreate, CardSuggestion as CardSuggestionSchema

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


@router.post("", response_model=CardSuggestionSchema, status_code=201)
def submit_suggestion(
    data: CardSuggestionCreate,
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db),
):
    """Submit a suggestion for a credit card that's missing from the system."""
    if not data.card_name.strip():
        raise HTTPException(status_code=400, detail="Card name is required")
    if not data.issuer_name.strip():
        raise HTTPException(status_code=400, detail="Issuer name is required")

    suggestion = CardSuggestion(
        user_id=current_user.id,
        card_name=data.card_name.strip(),
        issuer_name=data.issuer_name.strip(),
        network=data.network.strip() if data.network else None,
        notes=data.notes.strip() if data.notes else None,
        status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)

    item = CardSuggestionSchema.model_validate(suggestion)
    item.user_email = current_user.email
    return item


@router.get("/my", response_model=List[CardSuggestionSchema])
def get_my_suggestions(
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db),
):
    """Get all suggestions submitted by the current user."""
    suggestions = (
        db.query(CardSuggestion)
        .filter(CardSuggestion.user_id == current_user.id)
        .order_by(CardSuggestion.created_at.desc())
        .all()
    )
    result = []
    for s in suggestions:
        item = CardSuggestionSchema.model_validate(s)
        item.user_email = current_user.email
        result.append(item)
    return result
