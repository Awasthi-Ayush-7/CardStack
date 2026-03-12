"""
Integration tests for recommendation routes.
"""
import pytest
from app.models import UserCard


class TestGetRecommendations:
    def test_recommendations_require_auth(self, client, seed_cards):
        response = client.get("/api/recommendations?category=Dining")
        assert response.status_code == 401

    def test_returns_recommendations_for_valid_category(self, client, db, seed_cards, regular_user, user_token):
        # Give user a card
        cards = seed_cards["cards"]
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["sapphire"].id))
        db.flush()

        response = client.get(
            "/api/recommendations?category=Travel",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "Travel"
        assert len(data["recommendations"]) == 1
        assert data["recommendations"][0]["multiplier"] == 5.0
        assert data["recommendations"][0]["annual_fee"] == 95.0

    def test_returns_404_for_unknown_category(self, client, seed_cards, user_token):
        response = client.get(
            "/api/recommendations?category=NonExistentCategory",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 404

    def test_best_overall_not_owned_flag(self, client, db, seed_cards, regular_user, user_token):
        """best_overall.user_owns is False when user doesn't have the best card."""
        cards = seed_cards["cards"]
        # User has Freedom (3x dining) but not Gold (4x dining)
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id))
        db.flush()

        response = client.get(
            "/api/recommendations?category=Dining",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["best_overall"]["user_owns"] is False
        assert data["best_overall"]["card"] == "Gold"


class TestPortfolioRecommendations:
    def test_portfolio_requires_auth(self, client, seed_cards):
        response = client.post("/api/recommendations/portfolio", json={
            "spending": [{"category": "Dining", "monthly_amount": 500}]
        })
        assert response.status_code == 401

    def test_portfolio_returns_results(self, client, db, seed_cards, regular_user, user_token):
        cards = seed_cards["cards"]
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id))
        db.flush()

        response = client.post(
            "/api/recommendations/portfolio",
            json={"spending": [{"category": "Dining", "monthly_amount": 300}]},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "per_category" in data
        assert "total_estimated_rewards" in data
        assert "total_net_value" in data
        assert "suggested_additions" in data
        assert len(data["per_category"]) == 1
        assert data["per_category"][0]["category"] == "Dining"
        assert data["per_category"][0]["annual_rewards"] == pytest.approx(300 * 3.0 * 12)

    def test_portfolio_unknown_category_is_skipped(self, client, db, seed_cards, regular_user, user_token):
        """Unknown categories are silently skipped, not an error."""
        cards = seed_cards["cards"]
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id))
        db.flush()

        response = client.post(
            "/api/recommendations/portfolio",
            json={"spending": [
                {"category": "Dining", "monthly_amount": 200},
                {"category": "DoesNotExist", "monthly_amount": 100},
            ]},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        # Only the valid Dining category should appear
        assert len(data["per_category"]) == 1
        assert data["per_category"][0]["category"] == "Dining"

    def test_portfolio_suggests_better_catalog_card(self, client, db, seed_cards, regular_user, user_token):
        """Gold (not in wallet) should appear in suggested_additions for Dining."""
        cards = seed_cards["cards"]
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id))
        db.flush()

        response = client.post(
            "/api/recommendations/portfolio",
            json={"spending": [{"category": "Dining", "monthly_amount": 1000}]},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        card_names = [s["card_name"] for s in data["suggested_additions"]]
        assert "Gold" in card_names
