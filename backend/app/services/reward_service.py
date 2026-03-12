"""
Reward resolution engine service.
Handles the core business logic for determining the best credit card
for a given spending category based on active reward rules.
"""
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional
from ..models import RewardRule, UserCard, RewardCategory, CreditCard, CardIssuer
from ..schemas import RecommendationItem, BestOverallItem, PortfolioCategoryResult, SuggestedCard, PortfolioResponse, SpendingEntry


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
                annual_fee=card.annual_fee,
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
            annual_fee=card.annual_fee,
            user_owns=card.id in user_card_ids,
        )

    @staticmethod
    def optimize_portfolio(
        db: Session, user_id: int, spending: List[SpendingEntry]
    ) -> PortfolioResponse:
        """
        Given a spending profile, determine the optimal card per category from
        the user's wallet, compute estimated annual rewards, and suggest up to 3
        catalog cards (not yet in the wallet) that would improve the total.
        """
        today = date.today()

        # Load user's cards
        user_cards = db.query(UserCard).filter(UserCard.user_id == user_id).all()
        user_card_ids = {uc.credit_card_id for uc in user_cards}

        general_category = db.query(RewardCategory).filter(
            RewardCategory.name == "General"
        ).first()

        def _best_multiplier_for_card(card_id: int, category_id: int, general_id: Optional[int]) -> float:
            """Return the best active multiplier for a given card+category (with General fallback)."""
            rules = _active_rules_for_card_category(db, card_id, category_id, today)
            if not rules and general_id:
                rules = _active_rules_for_card_category(db, card_id, general_id, today)
            if not rules:
                return 0.0
            return max(r.multiplier for r in rules)

        per_category: List[PortfolioCategoryResult] = []
        # Track which user cards are used and how many categories each covers
        card_usage: dict[int, int] = {}  # card_id -> number of categories it wins

        # First pass: find best card per category from user's wallet
        category_winners: list[dict] = []  # {entry, best_card_id, multiplier, annual_rewards}
        for entry in spending:
            if entry.monthly_amount <= 0:
                continue
            cat = db.query(RewardCategory).filter(RewardCategory.name == entry.category).first()
            if not cat:
                continue

            best_card_id = None
            best_multiplier = 0.0
            general_id = general_category.id if general_category else None

            for uc in user_cards:
                m = _best_multiplier_for_card(uc.credit_card_id, cat.id, general_id)
                if m > best_multiplier:
                    best_multiplier = m
                    best_card_id = uc.credit_card_id

            annual_rewards = best_multiplier * entry.monthly_amount * 12

            if best_card_id is not None:
                card_usage[best_card_id] = card_usage.get(best_card_id, 0) + 1

            category_winners.append({
                "entry": entry,
                "category_name": entry.category,
                "best_card_id": best_card_id,
                "multiplier": best_multiplier,
                "annual_rewards": annual_rewards,
            })

        # Second pass: build per_category results with prorated annual fees
        for w in category_winners:
            best_card_id = w["best_card_id"]
            annual_fee = 0.0
            best_card_name = None

            if best_card_id is not None:
                card_obj = db.query(CreditCard).filter(CreditCard.id == best_card_id).first()
                if card_obj:
                    best_card_name = card_obj.name
                    usage_count = card_usage.get(best_card_id, 1)
                    annual_fee = card_obj.annual_fee / usage_count

            net_annual_value = w["annual_rewards"] - annual_fee

            per_category.append(PortfolioCategoryResult(
                category=w["category_name"],
                monthly_amount=w["entry"].monthly_amount,
                best_card=best_card_name,
                multiplier=w["multiplier"],
                annual_rewards=round(w["annual_rewards"], 2),
                annual_fee=round(annual_fee, 2),
                net_annual_value=round(net_annual_value, 2),
            ))

        total_estimated_rewards = round(sum(r.annual_rewards for r in per_category), 2)

        # Count each card's full fee once for net value calculation
        cards_used = set()
        for w in category_winners:
            if w["best_card_id"] is not None:
                cards_used.add(w["best_card_id"])
        total_fees = 0.0
        for card_id in cards_used:
            card_obj = db.query(CreditCard).filter(CreditCard.id == card_id).first()
            if card_obj:
                total_fees += card_obj.annual_fee
        total_net_value = round(total_estimated_rewards - total_fees, 2)

        # Find suggested additions: catalog cards not in wallet
        all_catalog_cards = db.query(CreditCard).all()
        candidate_improvements: dict[int, float] = {}  # card_id -> total improvement

        for w in category_winners:
            cat = db.query(RewardCategory).filter(RewardCategory.name == w["category_name"]).first()
            if not cat:
                continue
            general_id = general_category.id if general_category else None
            current_rewards = w["annual_rewards"]

            for card in all_catalog_cards:
                if card.id in user_card_ids:
                    continue
                m = _best_multiplier_for_card(card.id, cat.id, general_id)
                candidate_rewards = m * w["entry"].monthly_amount * 12
                improvement = candidate_rewards - current_rewards
                if improvement > 0:
                    candidate_improvements[card.id] = candidate_improvements.get(card.id, 0) + improvement

        # Subtract annual fee from improvement to get true net improvement
        suggestions: List[SuggestedCard] = []
        for card_id, gross_improvement in candidate_improvements.items():
            card_obj = db.query(CreditCard).filter(CreditCard.id == card_id).first()
            if not card_obj:
                continue
            net_improvement = gross_improvement - card_obj.annual_fee
            if net_improvement > 0:
                issuer = db.query(CardIssuer).filter(CardIssuer.id == card_obj.issuer_id).first()
                suggestions.append(SuggestedCard(
                    card_name=card_obj.name,
                    issuer=issuer.name if issuer else "Unknown",
                    annual_fee=card_obj.annual_fee,
                    improvement=round(net_improvement, 2),
                ))

        suggestions.sort(key=lambda s: s.improvement, reverse=True)

        return PortfolioResponse(
            per_category=per_category,
            total_estimated_rewards=total_estimated_rewards,
            total_net_value=total_net_value,
            suggested_additions=suggestions[:3],
        )
