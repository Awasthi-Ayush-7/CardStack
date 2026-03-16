import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RedemptionConcierge from '../components/RedemptionConcierge';

jest.mock('../config', () => ({ IS_STATIC: false }));

jest.mock('../services/api', () => ({
  api: {
    getUserCards: jest.fn(),
    searchConcierge: jest.fn(),
    updateCardBalance: jest.fn(),
  },
}));

import { api } from '../services/api';

const mockUserCards = [
  {
    id: 1,
    user_id: 10,
    credit_card_id: 101,
    point_balance: 80000,
    credit_card: {
      id: 101,
      name: 'Sapphire Preferred',
      network: 'Visa',
      issuer_id: 1,
      annual_fee: 95,
      issuer: { id: 1, name: 'Chase' },
    },
  },
  {
    id: 2,
    user_id: 10,
    credit_card_id: 102,
    point_balance: null,
    credit_card: {
      id: 102,
      name: 'Gold',
      network: 'American Express',
      issuer_id: 2,
      annual_fee: 325,
      issuer: { id: 2, name: 'American Express' },
    },
  },
];

const mockSearchResponse = {
  destination: 'Tokyo',
  travel_month: 'October 2026',
  cabin: 'economy',
  paths: [
    {
      source_currency: 'Chase UR',
      partner_program: 'United MileagePlus',
      destination: 'Tokyo',
      cabin: 'economy',
      points_required: 35000,
      effective_points_needed: 35000,
      user_balance: 80000,
      points_available_after_transfer: 80000,
      can_afford: true,
      cash_price_usd: 900,
      taxes_fees_usd: 65,
      cpp: 2.39,
      is_great_deal: true,
      transfer_ratio: 1.0,
      bonus_ratio: null,
      bonus_expires: null,
      portal_url: 'https://creditcards.chase.com/travel-credit-cards/transfer-partners',
      award_notes: 'Saver economy',
    },
  ],
  booking_cards: [
    {
      source_currency: 'Chase UR',
      partner_program: 'United MileagePlus',
      cabin: 'economy',
      cpp: 2.39,
      is_great_deal: true,
      can_afford: true,
      steps: [
        'Log in to your Chase UR account portal.',
        "Navigate to the 'Transfer Points' section and select United MileagePlus.",
        'Transfer 35,000 points.',
        'Search for Tokyo award availability.',
        'Book the economy award.',
      ],
      portal_url: 'https://creditcards.chase.com/travel-credit-cards/transfer-partners',
    },
  ],
  claude_analysis: 'This is an excellent value. Transfer Chase UR to United for Tokyo economy.',
  best_path: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.getUserCards as jest.Mock).mockResolvedValue(mockUserCards);
  (api.updateCardBalance as jest.Mock).mockResolvedValue({});
});

test('renders destination dropdown with all seeded destinations', async () => {
  render(<RedemptionConcierge />);
  const select = screen.getByLabelText(/destination/i);
  expect(select).toBeInTheDocument();
  for (const dest of ['Tokyo', 'Paris', 'Hawaii', 'Caribbean', 'London']) {
    expect(screen.getByRole('option', { name: dest })).toBeInTheDocument();
  }
});

test('renders one balance input per user card', async () => {
  render(<RedemptionConcierge />);
  await waitFor(() => {
    expect(screen.getByLabelText(/point balance for sapphire preferred/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/point balance for gold/i)).toBeInTheDocument();
  });
});

test('pre-populates stored balance from user card data', async () => {
  render(<RedemptionConcierge />);
  await waitFor(() => {
    const input = screen.getByLabelText(/point balance for sapphire preferred/i) as HTMLInputElement;
    expect(input.value).toBe('80000');
  });
});

test('shows validation error when no balances entered', async () => {
  (api.getUserCards as jest.Mock).mockResolvedValue([
    { ...mockUserCards[0], point_balance: null },
    { ...mockUserCards[1], point_balance: null },
  ]);
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/at least one point balance/i);
  });
});

test('shows validation error when travel month is empty', async () => {
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/travel month/i);
  });
});

test('displays paths table after successful search', async () => {
  (api.searchConcierge as jest.Mock).mockResolvedValue(mockSearchResponse);
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => {
    expect(screen.getByText('Chase UR')).toBeInTheDocument();
    expect(screen.getByText('United MileagePlus')).toBeInTheDocument();
    expect(screen.getByText('2.39¢')).toBeInTheDocument();
  });
});

test('shows Great Deal badge on high-CPP paths', async () => {
  (api.searchConcierge as jest.Mock).mockResolvedValue(mockSearchResponse);
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => {
    expect(screen.getByText('Great Deal')).toBeInTheDocument();
  });
});

test('shows empty state when no paths found', async () => {
  (api.searchConcierge as jest.Mock).mockResolvedValue({
    ...mockSearchResponse,
    paths: [],
    booking_cards: [],
    claude_analysis: 'No paths found.',
  });
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => {
    expect(screen.getByText(/no transfer paths found/i)).toBeInTheDocument();
  });
});

test('Claude analysis accordion expands and collapses', async () => {
  (api.searchConcierge as jest.Mock).mockResolvedValue(mockSearchResponse);
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => screen.getByText('AI Analysis'));

  // Analysis text should not be visible yet
  expect(screen.queryByText(/excellent value/i)).not.toBeInTheDocument();

  // Expand
  fireEvent.click(screen.getByText('AI Analysis'));
  expect(screen.getByText(/excellent value/i)).toBeInTheDocument();

  // Collapse
  fireEvent.click(screen.getByText('AI Analysis'));
  expect(screen.queryByText(/excellent value/i)).not.toBeInTheDocument();
});

test('booking instruction card expands to show steps', async () => {
  (api.searchConcierge as jest.Mock).mockResolvedValue(mockSearchResponse);
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => screen.getByText('Booking Instructions'));

  // Steps not visible before expanding
  expect(screen.queryByText(/Log in to your Chase UR/i)).not.toBeInTheDocument();

  // Click the booking card header — target the header button with the CPP value
  fireEvent.click(screen.getByText('2.39¢/pt'));
  expect(screen.getByText(/Log in to your Chase UR/i)).toBeInTheDocument();
});

test('portal deep-link has correct href', async () => {
  (api.searchConcierge as jest.Mock).mockResolvedValue(mockSearchResponse);
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => screen.getByText('2.39¢/pt'));
  fireEvent.click(screen.getByText('2.39¢/pt'));

  await waitFor(() => {
    const link = screen.getByText('Go to Transfer Portal →');
    expect(link).toHaveAttribute(
      'href',
      'https://creditcards.chase.com/travel-credit-cards/transfer-partners'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });
});

test('shows error message on API failure', async () => {
  (api.searchConcierge as jest.Mock).mockRejectedValue(new Error('Network error'));
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
  });
});

test('reset button clears results', async () => {
  (api.searchConcierge as jest.Mock).mockResolvedValue(mockSearchResponse);
  render(<RedemptionConcierge />);
  await waitFor(() => screen.getByLabelText(/point balance for sapphire preferred/i));

  fireEvent.change(screen.getByLabelText(/travel month/i), {
    target: { value: 'October 2026' },
  });
  fireEvent.click(screen.getByText('Find Best Redemption'));

  await waitFor(() => screen.getByText('Chase UR'));
  fireEvent.click(screen.getByText('Reset'));

  expect(screen.queryByText('Chase UR')).not.toBeInTheDocument();
});
