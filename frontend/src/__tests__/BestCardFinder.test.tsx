import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BestCardFinder from '../components/BestCardFinder';

// Mock IS_STATIC so we're in API mode
jest.mock('../config', () => ({ IS_STATIC: false }));

// Mock the api service
jest.mock('../services/api', () => ({
  api: {
    getCategories: jest.fn(),
    getRecommendations: jest.fn(),
  },
}));

import { api } from '../services/api';

const mockCategories = [
  { id: 1, name: 'Dining' },
  { id: 2, name: 'Travel' },
];

const mockRecommendations = {
  category: 'Dining',
  recommendations: [
    {
      card: 'Gold',
      multiplier: 4.0,
      explanation: '4x points on Dining',
      card_id: 1,
      annual_fee: 325,
      is_general_fallback: false,
    },
    {
      card: 'Freedom Unlimited',
      multiplier: 3.0,
      explanation: '3x on Dining',
      card_id: 2,
      annual_fee: 0,
      is_general_fallback: false,
    },
  ],
  best_overall: {
    card: 'Gold',
    issuer: 'American Express',
    multiplier: 4.0,
    explanation: '4x points on Dining',
    card_id: 1,
    annual_fee: 325,
    user_owns: true,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.getCategories as jest.Mock).mockResolvedValue(mockCategories);
});

test('renders category selector after loading categories', async () => {
  render(<BestCardFinder />);
  await waitFor(() => {
    expect(screen.getByLabelText(/select spending category/i)).toBeInTheDocument();
  });
  expect(screen.getByText('Dining')).toBeInTheDocument();
});

test('shows annual fee on recommendation cards', async () => {
  (api.getRecommendations as jest.Mock).mockResolvedValue(mockRecommendations);
  render(<BestCardFinder />);

  await waitFor(() => screen.getByLabelText(/select spending category/i));

  fireEvent.click(screen.getByText('Find Best Card'));

  await waitFor(() => {
    // Gold has $325/yr annual fee
    expect(screen.getByText('$325/yr')).toBeInTheDocument();
    // Freedom Unlimited has no annual fee
    expect(screen.getByText('No annual fee')).toBeInTheDocument();
  });
});

test('shows empty state when no user cards', async () => {
  (api.getRecommendations as jest.Mock).mockResolvedValue({
    category: 'Dining',
    recommendations: [],
    best_overall: null,
  });
  render(<BestCardFinder />);

  await waitFor(() => screen.getByLabelText(/select spending category/i));
  fireEvent.click(screen.getByText('Find Best Card'));

  await waitFor(() => {
    expect(
      screen.getByText(/no cards added yet/i)
    ).toBeInTheDocument();
  });
});

test('shows error when api fails', async () => {
  (api.getRecommendations as jest.Mock).mockRejectedValue(new Error('Network error'));
  render(<BestCardFinder />);

  await waitFor(() => screen.getByLabelText(/select spending category/i));
  fireEvent.click(screen.getByText('Find Best Card'));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });
});
