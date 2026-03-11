/**
 * Main App component with navigation between screens.
 *
 * Dual-mode:
 *  - Static mode  (REACT_APP_STATIC_MODE=true): HashRouter, no auth, bundled data
 *  - API mode     (default): BrowserRouter, JWT auth, FastAPI backend
 */
import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { IS_STATIC } from './config';
import './App.css';

// Lazy-load heavy feature components to reduce initial bundle size
const MyCards        = lazy(() => import('./components/MyCards'));
const BestCardFinder = lazy(() => import('./components/BestCardFinder'));
const SuggestCard    = lazy(() => import('./components/SuggestCard'));
const AdminPanel     = lazy(() => import('./components/AdminPanel'));
const Login          = lazy(() => import('./components/Login'));
const ForgotPassword = lazy(() => import('./components/ForgotPassword'));
const ResetPassword  = lazy(() => import('./components/ResetPassword'));

type Screen = 'my-cards' | 'finder' | 'suggest' | 'admin';

const LoadingSpinner: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      background: 'var(--color-background)',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 36,
          height: 36,
          border: '2px solid var(--color-border-strong)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
        role="status"
        aria-label="Loading"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Loading…</span>
    </div>
  </div>
);

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const GuestOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const Dashboard: React.FC = () => {
  const { user, logout, isAdmin, isTestAccount } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('my-cards');

  type NavItem = { key: Screen; label: string };
  const navItems: NavItem[] = [
    { key: 'my-cards', label: 'My Cards' },
    { key: 'finder',   label: 'Best Card Finder' },
    ...(!IS_STATIC ? [{ key: 'suggest' as Screen, label: 'Suggest a Card' }] : []),
    ...(isAdmin    ? [{ key: 'admin'   as Screen, label: 'Admin' }] : []),
  ];

  return (
    <div className="App">
      {/* Sticky header */}
      <header className="app-header">
        <div className="app-header-inner">
          {/* Logo */}
          <div className="app-logo">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3b7ff5 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                color: '#fff',
                boxShadow: '0 0 16px rgba(59,127,245,0.5)',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              ✦
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--color-text)',
                letterSpacing: '-0.3px',
              }}
            >
              RewardsIQ
            </span>
          </div>

          {/* Nav tabs */}
          <nav className="app-nav" aria-label="Main navigation">
            {navItems.map(({ key, label }) => {
              const active = currentScreen === key;
              const isAdminTab = key === 'admin';
              return (
                <button
                  key={key}
                  className="app-nav-item"
                  onClick={() => setCurrentScreen(key)}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    padding: '6px 18px',
                    background: active
                      ? (isAdminTab ? 'rgba(139,92,246,0.15)' : 'var(--color-primary-subtle)')
                      : 'transparent',
                    color: active
                      ? (isAdminTab ? '#8b5cf6' : 'var(--color-primary)')
                      : 'var(--color-text-muted)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* User area — hidden in static mode (no account needed) */}
          {!IS_STATIC && (
            <div className="app-user-area">
              {user?.role && user.role !== 'user' && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: isAdmin ? 'rgba(139,92,246,0.15)' : 'rgba(107,114,128,0.15)',
                    color: isAdmin ? '#8b5cf6' : '#9ca3af',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  {user.role}
                </span>
              )}
              {isTestAccount && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 20,
                    background: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}
                >
                  TEST
                </span>
              )}
              <span className="app-user-email">{user?.email}</span>
              <button
                onClick={logout}
                aria-label="Sign out of your account"
                style={{
                  padding: '6px 14px',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        <Suspense fallback={<LoadingSpinner />}>
          {currentScreen === 'my-cards' && <MyCards />}
          {currentScreen === 'finder'   && <BestCardFinder />}
          {currentScreen === 'suggest'  && !IS_STATIC && <SuggestCard />}
          {currentScreen === 'admin'    && isAdmin    && <AdminPanel />}
        </Suspense>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const Router = IS_STATIC ? HashRouter : BrowserRouter;

  if (IS_STATIC) {
    // Static mode: no auth routes, go straight to the Dashboard
    return (
      <Router>
        <ErrorBoundary>
          <Routes>
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </ErrorBoundary>
      </Router>
    );
  }

  // API mode: full auth flow
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/login"           element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/forgot-password" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
