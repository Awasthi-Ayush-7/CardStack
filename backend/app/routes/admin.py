"""
Admin routes — card data management, suggestion review, and user management.
All routes require the admin role.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..auth import require_admin
from ..models import User, CardSuggestion
from ..schemas import (
    AdminUser,
    CardSuggestion as CardSuggestionSchema,
    CardSuggestionStatusUpdate,
)
from ..services.card_sync_service import sync_from_file, sync_from_url

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_STATUSES = {"pending", "reviewed", "added", "declined"}
VALID_ROLES = {"admin", "user", "test"}


@router.post("/sync-cards")
def sync_cards(
    url: str = None,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Re-sync card data from card_data.json (or a remote URL if provided).
    Requires admin role.

    Optional query param:
      ?url=https://raw.githubusercontent.com/.../card_data.json
    """
    if url:
        result = sync_from_url(db, url)
    else:
        result = sync_from_file(db)

    return {
        "message": "Sync complete",
        **result,
    }


# ---------------------------------------------------------------------------
# Suggestions management
# ---------------------------------------------------------------------------

@router.get("/suggestions", response_model=List[CardSuggestionSchema])
def list_suggestions(
    status: Optional[str] = None,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    List all card suggestions. Optionally filter by status.
    status: pending | reviewed | added | declined
    """
    query = db.query(CardSuggestion)
    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")
        query = query.filter(CardSuggestion.status == status)
    suggestions = query.order_by(CardSuggestion.created_at.desc()).all()

    result = []
    for s in suggestions:
        item = CardSuggestionSchema.model_validate(s)
        item.user_email = s.user.email if s.user else None
        result.append(item)
    return result


@router.patch("/suggestions/{suggestion_id}", response_model=CardSuggestionSchema)
def update_suggestion_status(
    suggestion_id: int,
    data: CardSuggestionStatusUpdate,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update the status and/or admin notes of a card suggestion."""
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")

    suggestion = db.query(CardSuggestion).filter(CardSuggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    suggestion.status = data.status
    if data.admin_notes is not None:
        suggestion.admin_notes = data.admin_notes
    db.commit()
    db.refresh(suggestion)

    item = CardSuggestionSchema.model_validate(suggestion)
    item.user_email = suggestion.user.email if suggestion.user else None
    return item


# ---------------------------------------------------------------------------
# User management
# ---------------------------------------------------------------------------

@router.get("/users", response_model=List[AdminUser])
def list_users(
    role: Optional[str] = None,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    List all users, optionally filtered by role.
    role: admin | user | test
    """
    query = db.query(User)
    if role:
        if role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()


@router.patch("/users/{user_id}/role", response_model=AdminUser)
def update_user_role(
    user_id: int,
    role: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a user's role. Admins cannot change their own role."""
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")

    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.role = role
    db.commit()
    db.refresh(target)
    return target
