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
