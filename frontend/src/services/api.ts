/**
 * API service for communicating with the backend.
 * Used in API mode only (not in static/GitHub Pages mode).
 */
import { getAuthToken, clearAuthToken } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Abort controller for request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : (undefined as T);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    fetchAPI<import('../types').User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    fetchAPI<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getCurrentUser: () => fetchAPI<import('../types').User>('/auth/me'),
  forgotPassword: (email: string) =>
    fetchAPI<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    fetchAPI<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    }),

  // Issuers
  getIssuers: () => fetchAPI<import('../types').CardIssuer[]>('/issuers'),
  getIssuerCards: (issuerId: number) =>
    fetchAPI<import('../types').CreditCard[]>(`/issuers/${issuerId}/cards`),

  // Cards (legacy)
  getCards: () => fetchAPI<import('../types').CreditCard[]>('/cards'),

  // Categories
  getCategories: () => fetchAPI<import('../types').RewardCategory[]>('/categories'),

  // User Cards
  getUserCards: () => fetchAPI<import('../types').UserCard[]>('/user/cards'),
  addUserCard: (creditCardId: number) =>
    fetchAPI<import('../types').UserCard>('/user/cards', {
      method: 'POST',
      body: JSON.stringify({ credit_card_id: creditCardId }),
    }),
  removeUserCard: (userCardId: number) =>
    fetchAPI<void>(`/user/cards/${userCardId}`, { method: 'DELETE' }),

  // Recommendations
  getRecommendations: (category: string) =>
    fetchAPI<import('../types').RecommendationResponse>(
      `/recommendations?category=${encodeURIComponent(category)}`
    ),
  optimizePortfolio: (spending: import('../types').SpendingEntry[]) =>
    fetchAPI<import('../types').PortfolioResponse>('/recommendations/portfolio', {
      method: 'POST',
      body: JSON.stringify({ spending }),
    }),

  // Card Suggestions (user-facing)
  submitSuggestion: (data: {
    card_name: string;
    issuer_name: string;
    network?: string;
    notes?: string;
  }) =>
    fetchAPI<import('../types').CardSuggestion>('/suggestions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMySuggestions: () =>
    fetchAPI<import('../types').CardSuggestion[]>('/suggestions/my'),

  // Admin — Suggestions
  getAdminSuggestions: (status?: string) =>
    fetchAPI<import('../types').CardSuggestion[]>(
      `/admin/suggestions${status ? `?status=${encodeURIComponent(status)}` : ''}`
    ),
  updateSuggestionStatus: (id: number, status: string, adminNotes?: string) =>
    fetchAPI<import('../types').CardSuggestion>(`/admin/suggestions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, admin_notes: adminNotes }),
    }),

  // Admin — Users
  getAdminUsers: (role?: string) =>
    fetchAPI<import('../types').AdminUser[]>(
      `/admin/users${role ? `?role=${encodeURIComponent(role)}` : ''}`
    ),
  updateUserRole: (userId: number, role: string) =>
    fetchAPI<import('../types').AdminUser>(
      `/admin/users/${userId}/role?role=${encodeURIComponent(role)}`,
      { method: 'PATCH' }
    ),

  // Admin — Sync Cards
  syncCards: (url?: string) =>
    fetchAPI<{ message: string; issuers: number; cards: number; rules: number }>(
      `/admin/sync-cards${url ? `?url=${encodeURIComponent(url)}` : ''}`,
      { method: 'POST' }
    ),
};
