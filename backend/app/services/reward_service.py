"""
Reward resolution engine service.
Handles the core business logic for determining the best credit card
for a given spending category based on active reward rules.
"""
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional
from ..models import RewardRule, UserCard, RewardCategory, CreditCard, CardIssuer
from ..schemas import RecommendationItem, BestOverallItem


def _active_rules_for_card_category(
    db: Session, card_id: int, category_id: int, today: date
) -> List[RewardRule]:
    """Return active reward rules for a given card + category."""
    rules = db.query(RewardRule).filter(
        RewardRule.credit_card_id == card_id,
        RewardRule.category_id == category_id,
    ).all()
    return [
        r for r in rules
        if r.start_date <= today and (r.end_date is None or r.end_date >= today)
    ]


def _build_explanation(rule: RewardRule, category_name: str, is_fallback: bool) -> str:
    if is_fallback:
        explanation = f"{rule.multiplier}x on all purchases (general rate — no specific {category_name} reward)"
    else:
        explanation = f"{rule.multiplier}x points on {category_name}"
        if rule.is_rotating:
            explanation += " (rotating category)"
    if rule.cap_amount:
        cap_period_str = rule.cap_period.value if rule.cap_period else "total"
        explanation += f" (up to ${rule.cap_amount:,.0f} per {cap_period_str})"
    if rule.notes and not is_fallback:
        explanation += f" — {rule.notes}"
    return explanation


class RewardService:
    """Service for resolving reward recommendations."""

    @staticmethod
    def get_best_cards_for_category(
        db: Session, category_name: str, user_id: int
    ) -> List[RecommendationItem]:
        """
        Get the best credit cards for a spending category for a specific user.

        For each of the user's cards:
        - If an active rule exists for the requested category → use it.
        - Else if an active General rule exists → use it as a fallback
          (marked with is_general_fallback=True).
        - Otherwise → skip the card.

        Returns sorted by multiplier (descending).
        """
        category = db.query(RewardCategory).filter(
            RewardCategory.name == category_name
        ).first()
        if not category:
            return []

        general_category = db.query(RewardCategory).filter(
            RewardCategory.name == "General"
        ).first()

        user_cards = db.query(UserCard).filter(UserCard.user_id == user_id).all()
        if not user_cards:
            return []

        today = date.today()
        recommendations: List[RecommendationItem] = []

        for user_card in user_cards:
            card_id = user_card.credit_card_id
            card = user_card.credit_card

            # Try specific category first
            active_rules = _active_rules_for_card_category(db, card_id, category.id, today)
            is_fallback = False

            if not active_rules and general_category:
                # Fall back to General rate
                active_rules = _active_rules_for_card_category(
                    db, card_id, general_category.id, today
                )
                is_fallback = bool(active_rules)

            if not active_rules:
                continue

            best_rule = max(active_rules, key=lambda r: r.multiplier)
            explanation = _build_explanation(best_rule, category_name, is_fallback)

            recommendations.append(RecommendationItem(
                card=card.name,
                multiplier=best_rule.multiplier,
                explanation=explanation,
                card_id=card.id,
                is_general_fallback=is_fallback,
            ))

        recommendations.sort(key=lambda x: x.multiplier, reverse=True)
        return recommendations

    @staticmethod
    def get_best_overall_for_category(
        db: Session, category_name: str, user_card_ids: List[int]
    ) -> Optional[BestOverallItem]:
        """
        Find the single best card in the entire catalog for the given category.
        Returns None if no active rules exist for that category.

        user_card_ids: list of credit_card.id values the user already owns,
                       used to set the user_owns flag.
        """
        category = db.query(RewardCategory).filter(
            RewardCategory.name == category_name
        ).first()
        if not category:
            return None

        today = date.today()

        all_rules = db.query(RewardRule).filter(
            RewardRule.category_id == category.id,
            RewardRule.start_date <= today,
        ).all()

        active_rules = [
            r for r in all_rules
            if r.end_date is None or r.end_date >= today
        ]

        if not active_rules:
            return None

        best_rule = max(active_rules, key=lambda r: r.multiplier)
        card = db.query(CreditCard).filter(CreditCard.id == best_rule.credit_card_id).first()
        if not card:
            return None

        issuer = db.query(CardIssuer).filter(CardIssuer.id == card.issuer_id).first()
        issuer_name = issuer.name if issuer else "Unknown"

        explanation = _build_explanation(best_rule, category_name, False)

        return BestOverallItem(
            card=card.name,
            issuer=issuer_name,
            multiplier=best_rule.multiplier,
            explanation=explanation,
            card_id=card.id,
            user_owns=card.id in user_card_ids,
        )
