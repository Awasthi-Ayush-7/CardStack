import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortfolioOptimizer from '../components/PortfolioOptimizer';

jest.mock('../config', () => ({ IS_STATIC: false }));

jest.mock('../services/api', () => ({
  api: {
    optimizePortfolio: jest.fn(),
  },
}));

import { api } from '../services/api';

const mockPortfolioResponse = {
  per_category: [
    {
      category: 'Dining',
      monthly_amount: 500,
      best_card: 'Freedom Unlimited',
      multiplier: 3.0,
      annual_rewards: 18000,
      annual_fee: 0,
      net_annual_value: 18000,
    },
  ],
  total_estimated_rewards: 18000,
  total_net_value: 18000,
  suggested_additions: [
    {
      card_name: 'Gold',
      issuer: 'American Express',
      annual_fee: 325,
      improvement: 5675,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders spending input table with all 12 categories', () => {
  render(<PortfolioOptimizer />);
  const expectedCategories = [
    'Dining', 'Travel', 'Groceries', 'Gas', 'Streaming',
    'Drugstore', 'Entertainment', 'Online Shopping', 'Transit',
    'Home Improvement', 'Movies', 'General',
  ];
  for (const cat of expectedCategories) {
    expect(screen.getByLabelText(new RegExp(`monthly spend on ${cat}`, 'i'))).toBeInTheDocument();
  }
});

test('submits spending profile and shows results', async () => {
  (api.optimizePortfolio as jest.Mock).mockResolvedValue(mockPortfolioResponse);
  render(<PortfolioOptimizer />);

  // Enter dining spend
  const diningInput = screen.getByLabelText(/monthly spend on dining/i);
  fireEvent.change(diningInput, { target: { value: '500' } });

  fireEvent.click(screen.getByText('Optimize Portfolio'));

  await waitFor(() => {
    expect(screen.getByText('Freedom Unlimited')).toBeInTheDocument();
    expect(screen.getByText('$18,000')).toBeInTheDocument();
  });
});

test('shows suggested additions section', async () => {
  (api.optimizePortfolio as jest.Mock).mockResolvedValue(mockPortfolioResponse);
  render(<PortfolioOptimizer />);

  const diningInput = screen.getByLabelText(/monthly spend on dining/i);
  fireEvent.change(diningInput, { target: { value: '500' } });
  fireEvent.click(screen.getByText('Optimize Portfolio'));

  await waitFor(() => {
    expect(screen.getByText('Cards to Consider Adding')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('+$5,675')).toBeInTheDocument();
  });
});

test('shows error when no spend entered', async () => {
  render(<PortfolioOptimizer />);
  fireEvent.click(screen.getByText('Optimize Portfolio'));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(/enter at least one/i);
  });
  expect(api.optimizePortfolio).not.toHaveBeenCalled();
});

test('handles API error gracefully', async () => {
  (api.optimizePortfolio as jest.Mock).mockRejectedValue(new Error('Server error'));
  render(<PortfolioOptimizer />);

  const diningInput = screen.getByLabelText(/monthly spend on dining/i);
  fireEvent.change(diningInput, { target: { value: '200' } });
  fireEvent.click(screen.getByText('Optimize Portfolio'));

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
  });
});
