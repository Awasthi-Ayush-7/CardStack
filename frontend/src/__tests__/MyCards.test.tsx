import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyCards from '../components/MyCards';

jest.mock('../config', () => ({ IS_STATIC: false }));

jest.mock('../services/api', () => ({
  api: {
    getIssuers: jest.fn(),
    getIssuerCards: jest.fn(),
    getUserCards: jest.fn(),
    addUserCard: jest.fn(),
    removeUserCard: jest.fn(),
  },
}));

import { api } from '../services/api';

const mockIssuers = [
  { id: 1, name: 'Chase' },
  { id: 2, name: 'American Express' },
];

const mockChaseCards = [
  { id: 1, name: 'Freedom Unlimited', issuer_id: 1, network: 'Visa', annual_fee: 0 },
  { id: 2, name: 'Sapphire Preferred', issuer_id: 1, network: 'Visa', annual_fee: 95 },
];

const mockUserCard = {
  id: 100,
  user_id: 1,
  credit_card_id: 1,
  credit_card: { id: 1, name: 'Freedom Unlimited', issuer_id: 1, network: 'Visa', annual_fee: 0, issuer: { id: 1, name: 'Chase' } },
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.getIssuers as jest.Mock).mockResolvedValue(mockIssuers);
  (api.getUserCards as jest.Mock).mockResolvedValue([]);
  (api.getIssuerCards as jest.Mock).mockResolvedValue(mockChaseCards);
});

test('renders empty state when user has no cards', async () => {
  render(<MyCards />);
  await waitFor(() => {
    expect(screen.getByText(/no cards added yet/i)).toBeInTheDocument();
  });
});

test('renders user cards when they exist', async () => {
  (api.getUserCards as jest.Mock).mockResolvedValue([mockUserCard]);
  render(<MyCards />);
  await waitFor(() => {
    expect(screen.getByText('Freedom Unlimited')).toBeInTheDocument();
  });
});

test('add card flow calls addUserCard', async () => {
  (api.addUserCard as jest.Mock).mockResolvedValue(mockUserCard);
  (api.getUserCards as jest.Mock)
    .mockResolvedValueOnce([])        // initial load
    .mockResolvedValueOnce([mockUserCard]); // after add

  render(<MyCards />);

  // Wait for issuers to load
  await waitFor(() => {
    expect(screen.getByLabelText(/issuer/i)).toBeInTheDocument();
  });

  // Select issuer
  fireEvent.change(screen.getByLabelText(/issuer/i), { target: { value: '1' } });

  // Wait for cards to load
  await waitFor(() => {
    expect(screen.getByLabelText(/card/i)).toBeInTheDocument();
  });

  // Select a card
  fireEvent.change(screen.getByLabelText(/card/i), { target: { value: '1' } });

  // Click add
  fireEvent.click(screen.getByRole('button', { name: /add card/i }));

  await waitFor(() => {
    expect(api.addUserCard).toHaveBeenCalledWith(1);
  });
});

test('remove card calls removeUserCard', async () => {
  (api.getUserCards as jest.Mock)
    .mockResolvedValueOnce([mockUserCard])
    .mockResolvedValueOnce([]);
  (api.removeUserCard as jest.Mock).mockResolvedValue(undefined);

  render(<MyCards />);

  await waitFor(() => {
    expect(screen.getByText('Freedom Unlimited')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('button', { name: /remove/i }));

  await waitFor(() => {
    expect(api.removeUserCard).toHaveBeenCalledWith(100);
  });
});
