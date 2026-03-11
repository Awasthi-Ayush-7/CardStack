/**
 * Authentication service.
 * Supports Auth0, Firebase Auth, Clerk, and other JWT-based providers.
 * 
 * For GitHub Pages deployment, configure your auth provider and set
 * REACT_APP_AUTH_PROVIDER environment variable.
 */

// Get auth token from storage or auth provider
export const getAuthToken = (): string | null => {
  // Check localStorage first (for custom implementations)
  const token = localStorage.getItem('auth_token');
  if (token) {
    return token;
  }

  // For Auth0, Clerk, Firebase - tokens are typically managed by their SDKs
  // This is a placeholder - implement based on your chosen provider
  return null;
};

// Set auth token (for custom implementations)
export const setAuthToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Clear auth token
export const clearAuthToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};
