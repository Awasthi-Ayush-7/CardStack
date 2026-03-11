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
  is_general_fallback: boolean;
}

export interface BestOverallItem {
  card: string;
  issuer: string;
  multiplier: number;
  explanation: string;
  card_id: number;
  user_owns: boolean;
}

export interface RecommendationResponse {
  category: string;
  recommendations: RecommendationItem[];
  best_overall: BestOverallItem | null;
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
