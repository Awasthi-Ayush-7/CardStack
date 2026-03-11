/**
 * Authentication context for managing user authentication state.
 * In static mode (IS_STATIC=true), returns a no-op context so the app
 * works without any backend or login requirement.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { getAuthToken, setAuthToken, clearAuthToken, isAuthenticated } from '../services/auth';
import { IS_STATIC } from '../config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isTestAccount: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In static mode, skip all API calls — no auth needed
    if (IS_STATIC) {
      setLoading(false);
      return;
    }
    if (isAuthenticated()) {
      loadUser();
    } else {
      setLoading(false);
    }
    const onUnauthorized = () => {
      clearAuthToken();
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch {
      // Token might be invalid, clear it
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string) => {
    setAuthToken(token);
    loadUser();
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: IS_STATIC ? true : !!user,
        isAdmin: IS_STATIC ? false : user?.role === 'admin',
        isTestAccount: IS_STATIC ? false : user?.role === 'test',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
