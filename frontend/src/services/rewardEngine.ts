/**
 * TypeScript port of backend/app/services/reward_service.py
 * Calculates reward recommendations client-side (no backend needed).
 */
import { CARD_DATA, StaticRule } from '../data/cardData';
import { RecommendationItem, BestOverallItem, RecommendationResponse } from '../types';

/** Compare dates as YYYY-MM-DD strings (timezone-safe for date-only comparisons). */
function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isRuleActive(rule: StaticRule): boolean {
  const today = getToday();
  return rule.start_date <= today && (rule.end_date === null || rule.end_date >= today);
}

function buildExplanation(rule: StaticRule, categoryName: string, isFallback: boolean): string {
  let explanation: string;
  if (isFallback) {
    explanation = `${rule.multiplier}x on all purchases (general rate — no specific ${categoryName} reward)`;
  } else {
    explanation = `${rule.multiplier}x points on ${categoryName}`;
    if (rule.is_rotating) explanation += ' (rotating category)';
  }
  if (rule.cap_amount) {
    const period = rule.cap_period ? rule.cap_period.toLowerCase() : 'total';
    explanation += ` (up to $${rule.cap_amount.toLocaleString()} per ${period})`;
  }
  if (rule.notes && !isFallback) {
    explanation += ` — ${rule.notes}`;
  }
  return explanation;
}

/**
 * Get reward recommendations for a spending category.
 * Mirrors RewardService.get_best_cards_for_category() and
 * RewardService.get_best_overall_for_category() from the Python backend.
 *
 * @param categoryName  - The spending category to look up (e.g. 'Dining')
 * @param userCardIds   - IDs of cards the user owns (from localStore)
 */
export function getRecommendations(
  categoryName: string,
  userCardIds: number[]
): RecommendationResponse {
  const { cards, rules, issuers, categories } = CARD_DATA;

  const category = categories.find((c) => c.name === categoryName);
  if (!category) {
    return { category: categoryName, recommendations: [], best_overall: null };
  }

  const generalCategory = categories.find((c) => c.name === 'General');
  const recommendations: RecommendationItem[] = [];

  for (const cardId of userCardIds) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) continue;

    // Try specific category rules first
    let activeRules = rules.filter(
      (r) => r.credit_card_id === cardId && r.category_id === category.id && isRuleActive(r)
    );
    let isFallback = false;

    // Fall back to General rate if no specific rules found
    if (activeRules.length === 0 && generalCategory) {
      activeRules = rules.filter(
        (r) =>
          r.credit_card_id === cardId &&
          r.category_id === generalCategory.id &&
          isRuleActive(r)
      );
      isFallback = activeRules.length > 0;
    }

    if (activeRules.length === 0) continue;

    const bestRule = activeRules.reduce((max, r) =>
      r.multiplier > max.multiplier ? r : max
    );

    recommendations.push({
      card: card.name,
      multiplier: bestRule.multiplier,
      explanation: buildExplanation(bestRule, categoryName, isFallback),
      card_id: card.id,
      annual_fee: card.annual_fee,
      is_general_fallback: isFallback,
    });
  }

  recommendations.sort((a, b) => b.multiplier - a.multiplier);

  // Find best overall card in entire catalog for this category
  const allActiveRules = rules.filter(
    (r) => r.category_id === category.id && isRuleActive(r)
  );

  let best_overall: BestOverallItem | null = null;
  if (allActiveRules.length > 0) {
    const bestRule = allActiveRules.reduce((max, r) =>
      r.multiplier > max.multiplier ? r : max
    );
    const card = cards.find((c) => c.id === bestRule.credit_card_id);
    if (card) {
      const issuer = issuers.find((i) => i.id === card.issuer_id);
      best_overall = {
        card: card.name,
        issuer: issuer?.name ?? 'Unknown',
        multiplier: bestRule.multiplier,
        explanation: buildExplanation(bestRule, categoryName, false),
        card_id: card.id,
        annual_fee: card.annual_fee,
        user_owns: userCardIds.includes(card.id),
      };
    }
  }

  return { category: categoryName, recommendations, best_overall };
}
