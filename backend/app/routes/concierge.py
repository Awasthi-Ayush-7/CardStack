"""
Redemption Concierge routes.

POST /api/concierge/search   — find transfer paths + Claude analysis
GET  /api/concierge/partners — list all active transfer partners
PUT  /api/user/cards/{id}/balance — update point balance for a user card
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user_db
from ..models import TransferPartner, UserCard, User
from ..schemas import (
    ConciergeSearchRequest,
    ConciergeSearchResponse,
    TransferPartnerOut,
    UserCardBalanceUpdate,
    UserCardWithBalance,
)
from ..services.concierge_service import (
    get_user_inventory,
    find_transfer_paths,
    build_claude_prompt,
    call_llm_reasoning,
    build_booking_instructions,
)
from ..services.aviationstack_service import get_iata_code
from ..services.serpapi_service import get_flight_data

router = APIRouter(tags=["concierge"])

# Month name → zero-padded month number
_MONTH_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
}


def _parse_travel_month(travel_month: str) -> Optional[str]:
    """Convert 'October 2026' → '2026-10', returns None on failure."""
    parts = travel_month.strip().split()
    if len(parts) == 2:
        month_num = _MONTH_MAP.get(parts[0].lower())
        if month_num and parts[1].isdigit():
            return f"{parts[1]}-{month_num}"
    return None


@router.post("/concierge/search", response_model=ConciergeSearchResponse)
async def concierge_search(
    request: ConciergeSearchRequest,
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db),
):
    """
    Main concierge endpoint:
    1. Build points inventory from user's cards + submitted balances
    2. Find all matching transfer paths for destination + cabin
    3. Fetch live cash price via SerpAPI Google Flights (degrades gracefully)
    4. Call Gemini/Claude for AI reasoning (degrades gracefully on failure)
    5. Return ranked paths with booking instruction cards
    """
    destination = request.destination.strip().title()
    cabin = request.cabin.lower()
    if cabin not in ("economy", "business", "first"):
        raise HTTPException(
            status_code=422,
            detail="cabin must be one of: economy, business, first",
        )

    origin = request.origin.strip().title()
    inventory = get_user_inventory(current_user.id, request.point_balances, db)
    paths = find_transfer_paths(inventory, destination, cabin, db)

    # Fetch live flight data from Google Flights via SerpAPI (degrades gracefully)
    origin_iata = get_iata_code(origin)
    dest_iata = get_iata_code(destination)
    year_month = _parse_travel_month(request.travel_month)
    live_price: Optional[float] = None
    real_airlines: list[tuple[str, float]] = []
    if origin_iata and dest_iata and year_month:
        flight_data = await get_flight_data(origin_iata, dest_iata, year_month)
        live_price = flight_data.lowest_price
        real_airlines = flight_data.airlines

    if live_price is not None:
        for path in paths:
            path["live_cash_price"] = live_price
            # Recalculate CPP using live fare instead of seeded cash_price_usd
            effective_pts = path["effective_points_needed"]
            if effective_pts > 0:
                new_cpp = (live_price - path["taxes_fees_usd"]) / effective_pts * 100
                path["cpp"] = round(new_cpp, 2)
                path["is_great_deal"] = new_cpp > 2.0
        paths.sort(key=lambda x: x["cpp"], reverse=True)

    prompt = build_claude_prompt(
        inventory, paths, origin, destination, request.travel_month, cabin, real_airlines
    )
    claude_analysis = await call_llm_reasoning(
        prompt, inventory, paths, origin, destination, request.travel_month, cabin
    )

    booking_cards = [build_booking_instructions(p) for p in paths]
    best_path = paths[0] if paths else None

    return ConciergeSearchResponse(
        destination=destination,
        travel_month=request.travel_month,
        cabin=cabin,
        paths=paths,
        booking_cards=booking_cards,
        claude_analysis=claude_analysis,
        best_path=best_path,
    )


@router.get("/concierge/partners", response_model=List[TransferPartnerOut])
def get_transfer_partners(
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db),
):
    """List all active transfer partners including current bonuses."""
    return db.query(TransferPartner).filter(TransferPartner.is_active == True).all()


@router.put("/user/cards/{user_card_id}/balance", response_model=UserCardWithBalance)
def update_card_balance(
    user_card_id: int,
    body: UserCardBalanceUpdate,
    current_user: User = Depends(get_current_user_db),
    db: Session = Depends(get_db),
):
    """Update the stored point balance for one of the user's cards."""
    user_card = (
        db.query(UserCard)
        .filter(UserCard.id == user_card_id, UserCard.user_id == current_user.id)
        .first()
    )
    if not user_card:
        raise HTTPException(status_code=404, detail="User card not found")

    user_card.point_balance = body.point_balance
    db.commit()
    db.refresh(user_card)
    return user_card
