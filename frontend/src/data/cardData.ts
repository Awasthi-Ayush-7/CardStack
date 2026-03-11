/**
 * Static card data bundled into the frontend for GitHub Pages (no-backend) mode.
 * Mirrors the structure of backend/card_data.json with stable numeric IDs.
 */

export interface StaticIssuer {
  id: number;
  name: string;
}

export interface StaticCategory {
  id: number;
  name: string;
}

export interface StaticCard {
  id: number;
  name: string;
  issuer_id: number;
  network: string;
}

export interface StaticRule {
  id: number;
  credit_card_id: number;
  category_id: number;
  multiplier: number;
  cap_amount: number | null;
  cap_period: string | null; // 'QUARTERLY' | 'YEARLY' | 'MONTHLY' | null
  is_rotating: boolean;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD or null
  notes: string;
}

// Issuer IDs (1-indexed by order)
// Chase=1, AmEx=2, CapitalOne=3, Discover=4, Citi=5, BofA=6, USBank=7, WellsFargo=8
export const ISSUERS: StaticIssuer[] = [
  { id: 1, name: 'Chase' },
  { id: 2, name: 'American Express' },
  { id: 3, name: 'Capital One' },
  { id: 4, name: 'Discover' },
  { id: 5, name: 'Citi' },
  { id: 6, name: 'Bank of America' },
  { id: 7, name: 'US Bank' },
  { id: 8, name: 'Wells Fargo' },
];

// Category IDs (1-indexed by order)
// Dining=1, Travel=2, Groceries=3, Gas=4, Streaming=5, Drugstore=6,
// Entertainment=7, Online Shopping=8, Transit=9, Home Improvement=10, Movies=11, General=12
export const CATEGORIES: StaticCategory[] = [
  { id: 1,  name: 'Dining' },
  { id: 2,  name: 'Travel' },
  { id: 3,  name: 'Groceries' },
  { id: 4,  name: 'Gas' },
  { id: 5,  name: 'Streaming' },
  { id: 6,  name: 'Drugstore' },
  { id: 7,  name: 'Entertainment' },
  { id: 8,  name: 'Online Shopping' },
  { id: 9,  name: 'Transit' },
  { id: 10, name: 'Home Improvement' },
  { id: 11, name: 'Movies' },
  { id: 12, name: 'General' },
];

// Card IDs (1-indexed by order)
export const CARDS: StaticCard[] = [
  { id: 1,  name: 'Freedom Unlimited',    issuer_id: 1, network: 'Visa' },
  { id: 2,  name: 'Freedom Flex',          issuer_id: 1, network: 'Mastercard' },
  { id: 3,  name: 'Sapphire Preferred',    issuer_id: 1, network: 'Visa' },
  { id: 4,  name: 'Sapphire Reserve',      issuer_id: 1, network: 'Visa' },
  { id: 5,  name: 'Gold',                  issuer_id: 2, network: 'American Express' },
  { id: 6,  name: 'Platinum',              issuer_id: 2, network: 'American Express' },
  { id: 7,  name: 'Blue Cash Preferred',   issuer_id: 2, network: 'American Express' },
  { id: 8,  name: 'Blue Cash Everyday',    issuer_id: 2, network: 'American Express' },
  { id: 9,  name: 'Venture',               issuer_id: 3, network: 'Visa' },
  { id: 10, name: 'Venture X',             issuer_id: 3, network: 'Visa' },
  { id: 11, name: 'SavorOne',              issuer_id: 3, network: 'Mastercard' },
  { id: 12, name: 'Discover it Cash Back', issuer_id: 4, network: 'Discover' },
  { id: 13, name: 'Discover it Miles',     issuer_id: 4, network: 'Discover' },
  { id: 14, name: 'Double Cash',           issuer_id: 5, network: 'Mastercard' },
  { id: 15, name: 'Custom Cash',           issuer_id: 5, network: 'Mastercard' },
  { id: 16, name: 'Premier',               issuer_id: 5, network: 'Mastercard' },
  { id: 17, name: 'Cash Rewards',          issuer_id: 6, network: 'Visa' },
  { id: 18, name: 'Travel Rewards',        issuer_id: 6, network: 'Visa' },
  { id: 19, name: 'Cash+',                 issuer_id: 7, network: 'Visa' },
  { id: 20, name: 'Altitude Go',           issuer_id: 7, network: 'Visa' },
  { id: 21, name: 'Active Cash',           issuer_id: 8, network: 'Visa' },
];

// Rules — each entry maps (card_id, category_id) → reward multiplier + metadata
// category IDs: Dining=1, Travel=2, Groceries=3, Gas=4, Streaming=5, Drugstore=6,
//               Entertainment=7, Online Shopping=8, Transit=9, HomeImprovement=10, Movies=11, General=12
export const RULES: StaticRule[] = [
  // ─── Chase Freedom Unlimited (card_id: 1) ───
  { id: 1,  credit_card_id: 1,  category_id: 12, multiplier: 1.5,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: 'Unlimited 1.5% cash back on all purchases' },
  { id: 2,  credit_card_id: 1,  category_id: 1,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back on dining' },
  { id: 3,  credit_card_id: 1,  category_id: 6,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back at drugstores' },
  { id: 4,  credit_card_id: 1,  category_id: 2,  multiplier: 5.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5% cash back on travel purchased through Chase Travel portal' },

  // ─── Chase Freedom Flex (card_id: 2) ───
  { id: 5,  credit_card_id: 2,  category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1% cash back on all other purchases' },
  { id: 6,  credit_card_id: 2,  category_id: 1,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back on dining' },
  { id: 7,  credit_card_id: 2,  category_id: 6,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back at drugstores' },
  { id: 8,  credit_card_id: 2,  category_id: 2,  multiplier: 5.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5% cash back on travel through Chase Travel portal' },
  { id: 9,  credit_card_id: 2,  category_id: 4,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-01-01', end_date: '2026-03-31', notes: 'Q1 2026 rotating: Gas & EV Charging Stations' },
  { id: 10, credit_card_id: 2,  category_id: 7,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-01-01', end_date: '2026-03-31', notes: 'Q1 2026 rotating: Select Live Entertainment' },
  { id: 11, credit_card_id: 2,  category_id: 5,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-04-01', end_date: '2026-06-30', notes: 'Q2 2026 rotating: Select Streaming Services' },
  { id: 12, credit_card_id: 2,  category_id: 8,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-04-01', end_date: '2026-06-30', notes: 'Q2 2026 rotating: Select Online Shopping' },

  // ─── Chase Sapphire Preferred (card_id: 3) ───
  { id: 13, credit_card_id: 3,  category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1x points on all other purchases' },
  { id: 14, credit_card_id: 3,  category_id: 1,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x points on dining worldwide' },
  { id: 15, credit_card_id: 3,  category_id: 2,  multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2x points on travel worldwide' },
  { id: 16, credit_card_id: 3,  category_id: 5,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x points on select streaming services' },
  { id: 17, credit_card_id: 3,  category_id: 3,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x points on online grocery purchases (excluding Target, Walmart, wholesale clubs)' },

  // ─── Chase Sapphire Reserve (card_id: 4) ───
  { id: 18, credit_card_id: 4,  category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1x points on all other purchases' },
  { id: 19, credit_card_id: 4,  category_id: 1,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x points on dining worldwide' },
  { id: 20, credit_card_id: 4,  category_id: 2,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x points on travel worldwide (after $300 travel credit)' },

  // ─── Amex Gold (card_id: 5) ───
  { id: 21, credit_card_id: 5,  category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1x Membership Rewards points on all other purchases' },
  { id: 22, credit_card_id: 5,  category_id: 1,  multiplier: 4.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '4x Membership Rewards points on dining worldwide' },
  { id: 23, credit_card_id: 5,  category_id: 3,  multiplier: 4.0,  cap_amount: 25000,  cap_period: 'YEARLY',    is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '4x Membership Rewards points at U.S. supermarkets (up to $25k/year)' },
  { id: 24, credit_card_id: 5,  category_id: 2,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x Membership Rewards points on flights booked directly or via Amex Travel' },

  // ─── Amex Platinum (card_id: 6) ───
  { id: 25, credit_card_id: 6,  category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1x Membership Rewards points on all other purchases' },
  { id: 26, credit_card_id: 6,  category_id: 2,  multiplier: 5.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5x Membership Rewards points on flights booked directly with airlines or via Amex Travel; 5x on prepaid hotels via Amex Travel' },

  // ─── Amex Blue Cash Preferred (card_id: 7) ───
  { id: 27, credit_card_id: 7,  category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1% cash back on all other purchases' },
  { id: 28, credit_card_id: 7,  category_id: 3,  multiplier: 6.0,  cap_amount: 6000,   cap_period: 'YEARLY',    is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '6% cash back at U.S. supermarkets (up to $6k/year)' },
  { id: 29, credit_card_id: 7,  category_id: 5,  multiplier: 6.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '6% cash back on select U.S. streaming services' },
  { id: 30, credit_card_id: 7,  category_id: 4,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back at U.S. gas stations' },
  { id: 31, credit_card_id: 7,  category_id: 9,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back on transit (trains, taxis, rideshare, buses, ferries, tolls, parking)' },

  // ─── Amex Blue Cash Everyday (card_id: 8) ───
  { id: 32, credit_card_id: 8,  category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1% cash back on all other purchases' },
  { id: 33, credit_card_id: 8,  category_id: 3,  multiplier: 3.0,  cap_amount: 6000,   cap_period: 'YEARLY',    is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back at U.S. supermarkets (up to $6k/year)' },
  { id: 34, credit_card_id: 8,  category_id: 4,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back at U.S. gas stations' },
  { id: 35, credit_card_id: 8,  category_id: 8,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back on U.S. online retail purchases' },

  // ─── Capital One Venture (card_id: 9) ───
  { id: 36, credit_card_id: 9,  category_id: 12, multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2x miles on every purchase' },
  { id: 37, credit_card_id: 9,  category_id: 2,  multiplier: 5.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5x miles on hotels and rental cars booked through Capital One Travel' },

  // ─── Capital One Venture X (card_id: 10) ───
  { id: 38, credit_card_id: 10, category_id: 12, multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2x miles on every purchase' },
  { id: 39, credit_card_id: 10, category_id: 2,  multiplier: 10.0, cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '10x miles on hotels and rental cars booked through Capital One Travel; 5x on flights' },

  // ─── Capital One SavorOne (card_id: 11) ───
  { id: 40, credit_card_id: 11, category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1% cash back on all other purchases' },
  { id: 41, credit_card_id: 11, category_id: 1,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back on dining' },
  { id: 42, credit_card_id: 11, category_id: 7,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back on entertainment' },
  { id: 43, credit_card_id: 11, category_id: 5,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back on select streaming services' },
  { id: 44, credit_card_id: 11, category_id: 3,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back at grocery stores (excluding superstores like Walmart and Target)' },

  // ─── Discover it Cash Back (card_id: 12) ───
  { id: 45, credit_card_id: 12, category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1% cash back on all other purchases' },
  { id: 46, credit_card_id: 12, category_id: 3,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-01-01', end_date: '2026-03-31', notes: 'Q1 2026 rotating 5% category: Grocery Stores' },
  { id: 47, credit_card_id: 12, category_id: 10, multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-01-01', end_date: '2026-03-31', notes: 'Q1 2026 rotating 5% category: Home Improvement Stores' },
  { id: 48, credit_card_id: 12, category_id: 4,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-04-01', end_date: '2026-06-30', notes: 'Q2 2026 rotating 5% category: Gas Stations & EV Charging' },
  { id: 49, credit_card_id: 12, category_id: 5,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-04-01', end_date: '2026-06-30', notes: 'Q2 2026 rotating 5% category: Select Streaming Services' },
  { id: 50, credit_card_id: 12, category_id: 1,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-07-01', end_date: '2026-09-30', notes: 'Q3 2026 rotating 5% category: Restaurants' },
  { id: 51, credit_card_id: 12, category_id: 7,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-07-01', end_date: '2026-09-30', notes: 'Q3 2026 rotating 5% category: Live Entertainment & Events' },
  { id: 52, credit_card_id: 12, category_id: 8,  multiplier: 5.0,  cap_amount: 1500,   cap_period: 'QUARTERLY', is_rotating: true,  start_date: '2026-10-01', end_date: '2026-12-31', notes: 'Q4 2026 rotating 5% category: Amazon, Wholesale Clubs, Target' },

  // ─── Discover it Miles (card_id: 13) ───
  { id: 53, credit_card_id: 13, category_id: 12, multiplier: 1.5,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1.5x miles on every purchase' },

  // ─── Citi Double Cash (card_id: 14) ───
  { id: 54, credit_card_id: 14, category_id: 12, multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2% cash back on all purchases (1% when you buy + 1% when you pay)' },

  // ─── Citi Custom Cash (card_id: 15) ───
  { id: 55, credit_card_id: 15, category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1% cash back on all other purchases' },
  { id: 56, credit_card_id: 15, category_id: 1,  multiplier: 5.0,  cap_amount: 500,    cap_period: 'MONTHLY',   is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5% cash back on top eligible spend category each billing cycle (up to $500/month)' },
  { id: 57, credit_card_id: 15, category_id: 3,  multiplier: 5.0,  cap_amount: 500,    cap_period: 'MONTHLY',   is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5% cash back on top eligible spend category each billing cycle (up to $500/month)' },
  { id: 58, credit_card_id: 15, category_id: 4,  multiplier: 5.0,  cap_amount: 500,    cap_period: 'MONTHLY',   is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5% cash back on top eligible spend category each billing cycle (up to $500/month)' },
  { id: 59, credit_card_id: 15, category_id: 2,  multiplier: 5.0,  cap_amount: 500,    cap_period: 'MONTHLY',   is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5% cash back on top eligible spend category each billing cycle (up to $500/month)' },

  // ─── Citi Premier (card_id: 16) ───
  { id: 60, credit_card_id: 16, category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1x ThankYou points on all other purchases' },
  { id: 61, credit_card_id: 16, category_id: 1,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x ThankYou points at restaurants' },
  { id: 62, credit_card_id: 16, category_id: 3,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x ThankYou points at grocery stores' },
  { id: 63, credit_card_id: 16, category_id: 4,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x ThankYou points at gas stations' },
  { id: 64, credit_card_id: 16, category_id: 2,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3x ThankYou points on air travel, hotels, and travel agencies' },

  // ─── Bank of America Cash Rewards (card_id: 17) ───
  { id: 65, credit_card_id: 17, category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1% cash back on all other purchases' },
  { id: 66, credit_card_id: 17, category_id: 1,  multiplier: 3.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '3% cash back in chosen category (dining selected by default)' },
  { id: 67, credit_card_id: 17, category_id: 3,  multiplier: 2.0,  cap_amount: 2500,   cap_period: 'QUARTERLY', is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2% cash back at grocery stores & wholesale clubs (up to $2,500 combined with 3% category/quarter)' },

  // ─── Bank of America Travel Rewards (card_id: 18) ───
  { id: 68, credit_card_id: 18, category_id: 12, multiplier: 1.5,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1.5x points on all purchases' },

  // ─── US Bank Cash+ (card_id: 19) ───
  { id: 69, credit_card_id: 19, category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1% cash back on all other purchases' },
  { id: 70, credit_card_id: 19, category_id: 1,  multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2% cash back on one everyday category (dining chosen)' },
  { id: 71, credit_card_id: 19, category_id: 5,  multiplier: 5.0,  cap_amount: 2000,   cap_period: 'QUARTERLY', is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5% cash back on two chosen categories each quarter (up to $2k/quarter combined)' },
  { id: 72, credit_card_id: 19, category_id: 10, multiplier: 5.0,  cap_amount: 2000,   cap_period: 'QUARTERLY', is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '5% cash back on two chosen categories each quarter (up to $2k/quarter combined)' },

  // ─── US Bank Altitude Go (card_id: 20) ───
  { id: 73, credit_card_id: 20, category_id: 12, multiplier: 1.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '1x points on all other purchases' },
  { id: 74, credit_card_id: 20, category_id: 1,  multiplier: 4.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '4x points on dining, takeout, and restaurant delivery' },
  { id: 75, credit_card_id: 20, category_id: 3,  multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2x points at grocery stores' },
  { id: 76, credit_card_id: 20, category_id: 5,  multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2x points on streaming services' },
  { id: 77, credit_card_id: 20, category_id: 4,  multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2x points at gas stations and EV charging stations' },

  // ─── Wells Fargo Active Cash (card_id: 21) ───
  { id: 78, credit_card_id: 21, category_id: 12, multiplier: 2.0,  cap_amount: null,   cap_period: null,        is_rotating: false, start_date: '2024-01-01', end_date: null,         notes: '2% cash rewards on all purchases, no categories to track' },
];

export const CARD_DATA = {
  issuers: ISSUERS,
  categories: CATEGORIES,
  cards: CARDS,
  rules: RULES,
};
