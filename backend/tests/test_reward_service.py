"""
Unit tests for RewardService — reward resolution and portfolio optimization.
"""
import pytest
from datetime import date
from app.models import UserCard
from app.services.reward_service import RewardService
from app.schemas import SpendingEntry


class TestGetBestCardsForCategory:
    def test_returns_best_card_for_category(self, db, seed_cards, regular_user):
        """User's card with highest multiplier for the category is ranked first."""
        cards = seed_cards["cards"]
        # Give user both Freedom (3x dining) and Sapphire (3x dining)
        db.add_all([
            UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id),
            UserCard(user_id=regular_user.id, credit_card_id=cards["sapphire"].id),
        ])
        db.flush()

        results = RewardService.get_best_cards_for_category(db, "Dining", regular_user.id)
        assert len(results) == 2
        assert results[0].multiplier == 3.0
        assert results[0].is_general_fallback is False

    def test_falls_back_to_general_rate(self, db, seed_cards, regular_user):
        """When no specific rule exists, falls back to General rate with flag set."""
        cards = seed_cards["cards"]
        # Freedom has no Groceries rule, but has General 1.5x
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id))
        db.flush()

        results = RewardService.get_best_cards_for_category(db, "Groceries", regular_user.id)
        assert len(results) == 1
        assert results[0].is_general_fallback is True
        assert results[0].multiplier == 1.5

    def test_returns_empty_for_unknown_category(self, db, seed_cards, regular_user):
        """Unknown category returns empty list."""
        results = RewardService.get_best_cards_for_category(db, "NonExistentCategory", regular_user.id)
        assert results == []

    def test_returns_empty_when_no_user_cards(self, db, seed_cards, regular_user):
        """User with no cards gets empty list."""
        results = RewardService.get_best_cards_for_category(db, "Dining", regular_user.id)
        assert results == []

    def test_annual_fee_included_in_result(self, db, seed_cards, regular_user):
        """annual_fee is included in each recommendation item."""
        cards = seed_cards["cards"]
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["sapphire"].id))
        db.flush()

        results = RewardService.get_best_cards_for_category(db, "Travel", regular_user.id)
        assert len(results) == 1
        assert results[0].annual_fee == 95.0


class TestGetBestOverallForCategory:
    def test_returns_best_catalog_card(self, db, seed_cards, regular_user):
        """Returns the card with highest multiplier across the entire catalog."""
        # Gold has 4x on Dining, which is the best
        result = RewardService.get_best_overall_for_category(db, "Dining", [])
        assert result is not None
        assert result.card == "Gold"
        assert result.multiplier == 4.0

    def test_user_owns_flag_true(self, db, seed_cards, regular_user):
        """user_owns is True when user has the best overall card."""
        cards = seed_cards["cards"]
        result = RewardService.get_best_overall_for_category(
            db, "Dining", [cards["gold"].id]
        )
        assert result is not None
        assert result.user_owns is True

    def test_user_owns_flag_false(self, db, seed_cards):
        """user_owns is False when user does not have the best overall card."""
        result = RewardService.get_best_overall_for_category(db, "Dining", [])
        assert result is not None
        assert result.user_owns is False

    def test_returns_none_for_unknown_category(self, db, seed_cards):
        """Returns None for a category with no rules."""
        result = RewardService.get_best_overall_for_category(db, "NonExistent", [])
        assert result is None

    def test_annual_fee_included(self, db, seed_cards):
        """annual_fee is populated on the BestOverallItem."""
        result = RewardService.get_best_overall_for_category(db, "Dining", [])
        assert result is not None
        assert result.annual_fee == 325.0  # Gold's annual fee


class TestOptimizePortfolio:
    def test_selects_best_card_per_category(self, db, seed_cards, regular_user):
        """For Dining: Sapphire (3x) should be chosen over Freedom (3x, tie goes to first found),
        but when Gold (4x) is in wallet it wins."""
        cards = seed_cards["cards"]
        # User has Freedom (3x dining) and Gold (4x dining)
        db.add_all([
            UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id),
            UserCard(user_id=regular_user.id, credit_card_id=cards["gold"].id),
        ])
        db.flush()

        spending = [SpendingEntry(category="Dining", monthly_amount=500)]
        result = RewardService.optimize_portfolio(db, regular_user.id, spending)

        assert len(result.per_category) == 1
        row = result.per_category[0]
        assert row.best_card == "Gold"
        assert row.multiplier == 4.0
        assert row.annual_rewards == pytest.approx(500 * 4.0 * 12)

    def test_total_rewards_calculation(self, db, seed_cards, regular_user):
        """total_estimated_rewards is the sum of annual_rewards across categories."""
        cards = seed_cards["cards"]
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id))
        db.flush()

        spending = [
            SpendingEntry(category="Dining",   monthly_amount=200),  # 3x → 200*3*12=7200
            SpendingEntry(category="Groceries", monthly_amount=100), # 1.5x general → 100*1.5*12=1800
        ]
        result = RewardService.optimize_portfolio(db, regular_user.id, spending)
        assert result.total_estimated_rewards == pytest.approx(7200 + 1800)

    def test_suggested_additions_returned(self, db, seed_cards, regular_user):
        """Gold (4x dining, not in wallet) should appear in suggested_additions for dining spend."""
        cards = seed_cards["cards"]
        # User only has Freedom (3x dining)
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id))
        db.flush()

        spending = [SpendingEntry(category="Dining", monthly_amount=500)]
        result = RewardService.optimize_portfolio(db, regular_user.id, spending)

        # Gold earns 500*4*12=24000 vs Freedom 500*3*12=18000 → improvement=6000-325=5675
        card_names = [s.card_name for s in result.suggested_additions]
        assert "Gold" in card_names

    def test_no_suggestions_when_wallet_is_optimal(self, db, seed_cards, regular_user):
        """When user has all catalog cards, no suggestions needed."""
        cards = seed_cards["cards"]
        db.add_all([
            UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id),
            UserCard(user_id=regular_user.id, credit_card_id=cards["sapphire"].id),
            UserCard(user_id=regular_user.id, credit_card_id=cards["gold"].id),
        ])
        db.flush()

        spending = [SpendingEntry(category="Dining", monthly_amount=100)]
        result = RewardService.optimize_portfolio(db, regular_user.id, spending)
        assert result.suggested_additions == []

    def test_skips_zero_spend_entries(self, db, seed_cards, regular_user):
        """Entries with monthly_amount <= 0 are excluded from results."""
        cards = seed_cards["cards"]
        db.add(UserCard(user_id=regular_user.id, credit_card_id=cards["freedom"].id))
        db.flush()

        spending = [
            SpendingEntry(category="Dining",  monthly_amount=0),
            SpendingEntry(category="Travel",  monthly_amount=-10),
            SpendingEntry(category="Groceries", monthly_amount=100),
        ]
        result = RewardService.optimize_portfolio(db, regular_user.id, spending)
        assert len(result.per_category) == 1
        assert result.per_category[0].category == "Groceries"
