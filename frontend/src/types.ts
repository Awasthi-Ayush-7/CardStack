/**
 * TypeScript type definitions for the application.
 */

export interface User {
  id: number;
  email: string;
  created_at: string;
  role: 'admin' | 'user' | 'test';
}

export interface CardIssuer {
  id: number;
  name: string;
}

export interface CreditCard {
  id: number;
  name: string;
  issuer_id: number;
  network: string;
  annual_fee: number;
  issuer?: CardIssuer;
}

export interface RewardCategory {
  id: number;
  name: string;
}

export interface UserCard {
  id: number;
  user_id: number;
  credit_card_id: number;
  credit_card: CreditCard;
}

export interface RecommendationItem {
  card: string;
  multiplier: number;
  explanation: string;
  card_id: number;
  annual_fee: number;
  is_general_fallback: boolean;
}

export interface BestOverallItem {
  card: string;
  issuer: string;
  multiplier: number;
  explanation: string;
  card_id: number;
  annual_fee: number;
  user_owns: boolean;
}

export interface RecommendationResponse {
  category: string;
  recommendations: RecommendationItem[];
  best_overall: BestOverallItem | null;
}

// Portfolio Optimizer Types
export interface SpendingEntry {
  category: string;
  monthly_amount: number;
}

export interface PortfolioCategoryResult {
  category: string;
  monthly_amount: number;
  best_card: string | null;
  multiplier: number;
  annual_rewards: number;
  annual_fee: number;
  net_annual_value: number;
}

export interface SuggestedCard {
  card_name: string;
  issuer: string;
  annual_fee: number;
  improvement: number;
}

export interface PortfolioResponse {
  per_category: PortfolioCategoryResult[];
  total_estimated_rewards: number;
  total_net_value: number;
  suggested_additions: SuggestedCard[];
}

export interface CardSuggestion {
  id: number;
  user_id: number;
  card_name: string;
  issuer_name: string;
  network: string | null;
  notes: string | null;
  status: 'pending' | 'reviewed' | 'added' | 'declined';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_email: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  role: 'admin' | 'user' | 'test';
  created_at: string;
}

// Redemption Concierge Types

export interface TransferPath {
  source_currency: string;
  partner_program: string;
  destination: string;
  cabin: string;
  points_required: number;
  effective_points_needed: number;
  user_balance: number;
  points_available_after_transfer: number;
  can_afford: boolean;
  cash_price_usd: number;
  taxes_fees_usd: number;
  cpp: number;
  is_great_deal: boolean;
  transfer_ratio: number;
  bonus_ratio: number | null;
  bonus_expires: string | null;
  portal_url: string | null;
  award_search_url: string | null;
  award_notes: string | null;
  is_estimated: boolean;
  live_cash_price: number | null;
}

export interface BookingInstructionCard {
  source_currency: string;
  partner_program: string;
  cabin: string;
  cpp: number;
  is_great_deal: boolean;
  can_afford: boolean;
  steps: string[];
  portal_url: string | null;
}

export interface ConciergeSearchResponse {
  destination: string;
  travel_month: string;
  cabin: string;
  paths: TransferPath[];
  booking_cards: BookingInstructionCard[];
  claude_analysis: string;
  best_path: TransferPath | null;
}

export interface TransferPartner {
  id: number;
  source_currency: string;
  partner_program: string;
  transfer_ratio: number;
  bonus_ratio: number | null;
  bonus_expires: string | null;
  is_active: boolean;
  portal_url: string | null;
}

export interface UserCardWithBalance extends UserCard {
  point_balance: number | null;
}
