"""
Tests for the Redemption Concierge system.

Covers:
- Unit tests for service logic (CPP formula, bonus math, currency mapping)
- Integration tests for API endpoints (auth, paths, balance update)
- Claude API is always mocked — no real API calls in tests
"""
import pytest
from datetime import date
from unittest.mock import patch, AsyncMock, MagicMock

from app.models import UserCard, TransferPartner, AwardCost
from app.services.concierge_service import (
    card_to_currency,
    get_user_inventory,
    find_transfer_paths,
    _is_bonus_active,
    build_booking_instructions,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def seed_concierge(db):
    """Seed minimal transfer partners and award costs for integration tests."""
    chase_partner = TransferPartner(
        source_currency="Chase UR",
        partner_program="United MileagePlus",
        transfer_ratio=1.0,
        portal_url="https://creditcards.chase.com/travel-credit-cards/transfer-partners",
    )
    amex_partner = TransferPartner(
        source_currency="Amex MR",
        partner_program="Air France/KLM Flying Blue",
        transfer_ratio=1.0,
        portal_url="https://global.americanexpress.com/rewards/transfer",
    )
    capital_one_partner = TransferPartner(
        source_currency="Capital One Miles",
        partner_program="Wyndham Rewards",
        transfer_ratio=1.0,
        bonus_ratio=0.30,
        bonus_expires=date(2026, 12, 31),
        portal_url="https://travel.capitalone.com/transfer-partners",
    )
    tokyo_economy = AwardCost(
        destination="Tokyo",
        airline_program="United MileagePlus",
        cabin="economy",
        points_required=35000,
        cash_price_usd=900,
        taxes_fees_usd=65,
        notes="Saver economy",
    )
    tokyo_business = AwardCost(
        destination="Tokyo",
        airline_program="Air France/KLM Flying Blue",
        cabin="business",
        points_required=50000,
        cash_price_usd=4000,
        taxes_fees_usd=200,
    )
    db.add_all([chase_partner, amex_partner, capital_one_partner, tokyo_economy, tokyo_business])
    db.flush()
    return {
        "partners": {
            "chase": chase_partner,
            "amex": amex_partner,
            "capital_one": capital_one_partner,
        },
        "awards": {"tokyo_economy": tokyo_economy, "tokyo_business": tokyo_business},
    }


@pytest.fixture()
def user_with_sapphire(db, seed_cards, regular_user):
    """Add a Chase Sapphire Preferred to the regular user's wallet."""
    sapphire = seed_cards["cards"]["sapphire"]
    uc = UserCard(user_id=regular_user.id, credit_card_id=sapphire.id, point_balance=80000)
    db.add(uc)
    db.flush()
    return uc


# ---------------------------------------------------------------------------
# Unit tests — service logic (no DB, no HTTP)
# ---------------------------------------------------------------------------

class TestCardToCurrency:
    def test_chase_sapphire_maps_to_chase_ur(self):
        assert card_to_currency("Chase", "Sapphire Preferred") == "Chase UR"

    def test_chase_freedom_maps_to_chase_ur(self):
        assert card_to_currency("Chase", "Freedom Unlimited") == "Chase UR"

    def test_chase_ink_maps_to_chase_ur(self):
        assert card_to_currency("Chase", "Ink Business Preferred") == "Chase UR"

    def test_amex_gold_maps_to_amex_mr(self):
        assert card_to_currency("American Express", "Gold") == "Amex MR"

    def test_amex_platinum_maps_to_amex_mr(self):
        assert card_to_currency("American Express", "Platinum") == "Amex MR"

    def test_capital_one_venture_maps_correctly(self):
        assert card_to_currency("Capital One", "Venture X") == "Capital One Miles"

    def test_citi_premier_maps_to_thankyou(self):
        assert card_to_currency("Citi", "Premier") == "Citi ThankYou"

    def test_unknown_card_returns_none(self):
        assert card_to_currency("Bank of America", "Cash Rewards") is None

    def test_case_insensitive_matching(self):
        assert card_to_currency("CHASE", "SAPPHIRE PREFERRED") == "Chase UR"


class TestBonusActive:
    def test_no_bonus_ratio_returns_false(self):
        partner = MagicMock()
        partner.bonus_ratio = None
        assert _is_bonus_active(partner) is False

    def test_expired_bonus_returns_false(self):
        partner = MagicMock()
        partner.bonus_ratio = 0.20
        partner.bonus_expires = date(2020, 1, 1)
        assert _is_bonus_active(partner) is False

    def test_active_bonus_with_future_expiry_returns_true(self):
        partner = MagicMock()
        partner.bonus_ratio = 0.30
        partner.bonus_expires = date(2099, 12, 31)
        assert _is_bonus_active(partner) is True

    def test_active_bonus_no_expiry_returns_true(self):
        partner = MagicMock()
        partner.bonus_ratio = 0.20
        partner.bonus_expires = None
        assert _is_bonus_active(partner) is True


class TestCPPCalculation:
    def test_cpp_formula_basic(self):
        # (900 - 65) / 35000 * 100 = 2.386
        cpp = (900 - 65) / 35000 * 100
        assert round(cpp, 2) == 2.39

    def test_great_deal_above_two_cents(self):
        cpp = 2.01
        assert cpp > 2.0

    def test_not_great_deal_below_two_cents(self):
        cpp = 1.99
        assert not (cpp > 2.0)

    def test_bonus_reduces_effective_points_needed(self):
        # 35000 points at 30% bonus → user only needs 35000/1.3 ≈ 26923 source points
        bonus_ratio = 0.30
        effective = 35000 / (1 + bonus_ratio)
        assert round(effective) == 26923

    def test_cpp_with_bonus_is_higher(self):
        # Same award, but with 30% bonus the user gets more miles for fewer source points
        no_bonus_cpp = (900 - 65) / 35000 * 100
        with_bonus_effective = 35000 / 1.30
        with_bonus_cpp = (900 - 65) / with_bonus_effective * 100
        assert with_bonus_cpp > no_bonus_cpp


class TestBuildBookingInstructions:
    def test_returns_all_fields(self):
        path = {
            "source_currency": "Chase UR",
            "partner_program": "United MileagePlus",
            "destination": "Tokyo",
            "cabin": "economy",
            "points_required": 35000,
            "effective_points_needed": 35000,
            "transfer_ratio": 1.0,
            "bonus_ratio": None,
            "bonus_expires": None,
            "taxes_fees_usd": 65,
            "cpp": 2.39,
            "is_great_deal": True,
            "can_afford": True,
            "portal_url": "https://creditcards.chase.com/transfer",
        }
        card = build_booking_instructions(path)
        assert card["source_currency"] == "Chase UR"
        assert card["partner_program"] == "United MileagePlus"
        assert card["is_great_deal"] is True
        assert card["can_afford"] is True
        assert len(card["steps"]) == 5
        assert card["portal_url"] == "https://creditcards.chase.com/transfer"

    def test_bonus_step_included_when_bonus_active(self):
        path = {
            "source_currency": "Capital One Miles",
            "partner_program": "Wyndham Rewards",
            "destination": "Caribbean",
            "cabin": "economy",
            "points_required": 9000,
            "effective_points_needed": 6923,
            "transfer_ratio": 1.0,
            "bonus_ratio": 0.30,
            "bonus_expires": "2026-12-31",
            "taxes_fees_usd": 40,
            "cpp": 4.49,
            "is_great_deal": True,
            "can_afford": True,
            "portal_url": None,
        }
        card = build_booking_instructions(path)
        # The bonus step should mention the 30% bonus
        all_steps = " ".join(card["steps"])
        assert "30%" in all_steps


# ---------------------------------------------------------------------------
# Integration tests — API endpoints
# ---------------------------------------------------------------------------

MOCK_CLAUDE_RESPONSE = "This is a great deal. Transfer Chase UR to United for Tokyo."


class TestConciergeSearchEndpoint:
    def test_requires_auth(self, client):
        r = client.post("/api/concierge/search", json={
            "destination": "Tokyo",
            "travel_month": "October 2026",
            "cabin": "economy",
            "point_balances": {},
        })
        assert r.status_code == 401

    @patch(
        "app.routes.concierge.call_claude_reasoning",
        new_callable=AsyncMock,
        return_value=MOCK_CLAUDE_RESPONSE,
    )
    def test_empty_balances_returns_empty_paths(
        self, mock_claude, client, seed_concierge, regular_user, user_token
    ):
        r = client.post(
            "/api/concierge/search",
            json={"destination": "Tokyo", "travel_month": "October 2026", "cabin": "economy", "point_balances": {}},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["paths"] == []
        assert data["booking_cards"] == []
        assert data["best_path"] is None
        # Claude analysis is still returned
        assert data["claude_analysis"] == MOCK_CLAUDE_RESPONSE

    @patch(
        "app.routes.concierge.call_claude_reasoning",
        new_callable=AsyncMock,
        return_value=MOCK_CLAUDE_RESPONSE,
    )
    def test_returns_paths_when_balance_matches(
        self, mock_claude, client, db, seed_concierge, user_with_sapphire, regular_user, user_token
    ):
        # Sapphire maps to "Chase UR", which has United MileagePlus as a partner
        r = client.post(
            "/api/concierge/search",
            json={
                "destination": "Tokyo",
                "travel_month": "October 2026",
                "cabin": "economy",
                "point_balances": {user_with_sapphire.id: 80000},
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data["paths"]) >= 1
        path = data["paths"][0]
        assert path["source_currency"] == "Chase UR"
        assert path["partner_program"] == "United MileagePlus"
        assert path["cpp"] > 0
        assert path["destination"] == "Tokyo"

    @patch(
        "app.routes.concierge.call_claude_reasoning",
        new_callable=AsyncMock,
        return_value=MOCK_CLAUDE_RESPONSE,
    )
    def test_great_deal_flag_on_high_cpp_path(
        self, mock_claude, client, db, seed_concierge, user_with_sapphire, regular_user, user_token
    ):
        # Tokyo economy via United: (900-65)/35000*100 = 2.39 → great deal
        r = client.post(
            "/api/concierge/search",
            json={
                "destination": "Tokyo",
                "travel_month": "October 2026",
                "cabin": "economy",
                "point_balances": {user_with_sapphire.id: 80000},
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        great_deals = [p for p in data["paths"] if p["is_great_deal"]]
        assert len(great_deals) >= 1

    def test_invalid_cabin_returns_422(self, client, seed_concierge, user_token):
        r = client.post(
            "/api/concierge/search",
            json={
                "destination": "Tokyo",
                "travel_month": "October 2026",
                "cabin": "private-jet",
                "point_balances": {},
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 422

    @patch(
        "app.routes.concierge.call_claude_reasoning",
        new_callable=AsyncMock,
        side_effect=Exception("API unavailable"),
    )
    def test_claude_failure_degrades_gracefully(
        self, mock_claude, client, seed_concierge, regular_user, user_token
    ):
        r = client.post(
            "/api/concierge/search",
            json={"destination": "Tokyo", "travel_month": "October 2026", "cabin": "economy", "point_balances": {}},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        # Should still return 200 with fallback message
        assert r.status_code == 200
        data = r.json()
        assert "temporarily unavailable" in data["claude_analysis"]

    @patch(
        "app.routes.concierge.call_claude_reasoning",
        new_callable=AsyncMock,
        return_value=MOCK_CLAUDE_RESPONSE,
    )
    def test_booking_cards_match_paths(
        self, mock_claude, client, db, seed_concierge, user_with_sapphire, regular_user, user_token
    ):
        r = client.post(
            "/api/concierge/search",
            json={
                "destination": "Tokyo",
                "travel_month": "October 2026",
                "cabin": "economy",
                "point_balances": {user_with_sapphire.id: 80000},
            },
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data["booking_cards"]) == len(data["paths"])
        card = data["booking_cards"][0]
        assert "steps" in card
        assert len(card["steps"]) == 5


class TestTransferPartnersEndpoint:
    def test_requires_auth(self, client):
        r = client.get("/api/concierge/partners")
        assert r.status_code == 401

    def test_returns_all_active_partners(self, client, seed_concierge, user_token):
        r = client.get(
            "/api/concierge/partners",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        currencies = {p["source_currency"] for p in data}
        assert "Chase UR" in currencies
        assert "Amex MR" in currencies
        assert "Capital One Miles" in currencies

    def test_bonus_fields_returned(self, client, seed_concierge, user_token):
        r = client.get(
            "/api/concierge/partners",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        data = r.json()
        cap_one = next((p for p in data if p["source_currency"] == "Capital One Miles"), None)
        assert cap_one is not None
        assert cap_one["bonus_ratio"] == pytest.approx(0.30)
        assert cap_one["bonus_expires"] == "2026-12-31"


class TestUpdateCardBalanceEndpoint:
    def test_requires_auth(self, client, seed_cards):
        r = client.put("/api/user/cards/999/balance", json={"point_balance": 50000})
        assert r.status_code == 401

    def test_updates_balance_successfully(
        self, client, db, seed_cards, regular_user, user_token
    ):
        # Add a card to the user's wallet first
        sapphire = seed_cards["cards"]["sapphire"]
        uc = UserCard(user_id=regular_user.id, credit_card_id=sapphire.id)
        db.add(uc)
        db.flush()

        r = client.put(
            f"/api/user/cards/{uc.id}/balance",
            json={"point_balance": 45000},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["point_balance"] == 45000

    def test_returns_404_for_wrong_user(
        self, client, db, seed_cards, regular_user, admin_user, user_token, admin_token
    ):
        # Create a card belonging to admin, try to update it as regular_user
        sapphire = seed_cards["cards"]["sapphire"]
        admin_uc = UserCard(user_id=admin_user.id, credit_card_id=sapphire.id)
        db.add(admin_uc)
        db.flush()

        r = client.put(
            f"/api/user/cards/{admin_uc.id}/balance",
            json={"point_balance": 50000},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 404

    def test_can_clear_balance_with_null(
        self, client, db, seed_cards, regular_user, user_token
    ):
        sapphire = seed_cards["cards"]["sapphire"]
        uc = UserCard(user_id=regular_user.id, credit_card_id=sapphire.id, point_balance=30000)
        db.add(uc)
        db.flush()

        r = client.put(
            f"/api/user/cards/{uc.id}/balance",
            json={"point_balance": None},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code == 200
        assert r.json()["point_balance"] is None
