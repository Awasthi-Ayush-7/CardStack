/**
 * Login and Register — dynamic split-screen landing page.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Input from './ui/Input';
import Button from './ui/Button';

type Mode = 'login' | 'register';

// ─── Animated Orb ────────────────────────────────────────────────────────────
const Orb: React.FC<{
  size: number;
  color: string;
  top: string;
  left: string;
  duration: number;
  delay: number;
}> = ({ size, color, top, left, duration, delay }) => (
  <div
    style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      top,
      left,
      filter: 'blur(60px)',
      opacity: 0.45,
      animation: `orbFloat ${duration}s ease-in-out ${delay}s infinite alternate`,
      pointerEvents: 'none',
    }}
  />
);

// ─── Typing Headline ─────────────────────────────────────────────────────────
const PHRASES = [
  'maximize every swipe.',
  'earn smarter, not harder.',
  'never leave rewards on the table.',
  'find your perfect card.',
];

const TypingHeadline: React.FC = () => {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const current = PHRASES[phraseIdx];

    if (!deleting && displayed.length < current.length) {
      timeout.current = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 55);
    } else if (!deleting && displayed.length === current.length) {
      timeout.current = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeout.current = setTimeout(() => setDisplayed(current.slice(0, displayed.length - 1)), 28);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setPhraseIdx(i => (i + 1) % PHRASES.length);
    }

    return () => { if (timeout.current) clearTimeout(timeout.current); };
  }, [displayed, deleting, phraseIdx]);

  return (
    <span>
      {displayed}
      <span
        style={{
          display: 'inline-block',
          width: 2,
          height: '1em',
          background: '#3b7ff5',
          marginLeft: 2,
          verticalAlign: 'text-bottom',
          animation: 'blink 1s step-end infinite',
        }}
      />
    </span>
  );
};

// ─── Feature row ─────────────────────────────────────────────────────────────
const Feature: React.FC<{ icon: string; title: string; desc: string; delay: number }> = ({
  icon, title, desc, delay,
}) => (
  <div
    style={{
      display: 'flex',
      gap: 14,
      alignItems: 'flex-start',
      animation: `fadeSlideUp 0.6s ease both`,
      animationDelay: `${delay}ms`,
    }}
  >
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'rgba(59,127,245,0.12)',
        border: '1px solid rgba(59,127,245,0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#e8eeff', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#6b7fa3', lineHeight: 1.5 }}>{desc}</div>
    </div>
  </div>
);

// ─── Main Login Component ─────────────────────────────────────────────────────
const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setFormVisible(false);
    setError(null);
    setTimeout(() => {
      setMode(next);
      setFormVisible(true);
    }, 180);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register(email, password);
      }
      const { access_token } = await api.login(email, password);
      login(access_token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Global keyframe animations */}
      <style>{`
        @keyframes orbFloat {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-40px) scale(1.08); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.03; }
          50%       { opacity: 0.06; }
        }
        .login-input-wrap input:focus,
        .login-input-wrap input:focus-visible {
          border-color: #3b7ff5 !important;
          box-shadow: 0 0 0 3px rgba(59,127,245,0.18) !important;
          outline: none !important;
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: '#060b18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', -apple-system, sans-serif",
          position: 'relative',
          overflow: 'hidden',
          padding: '48px 32px',
        }}
      >
        {/* ── Animated background orbs ── */}
        <Orb size={500} color="radial-gradient(circle, rgba(59,127,245,0.5), transparent 70%)"  top="-10%"  left="-5%"   duration={9}  delay={0} />
        <Orb size={400} color="radial-gradient(circle, rgba(99,51,245,0.4), transparent 70%)"   top="60%"   left="5%"    duration={11} delay={2} />
        <Orb size={350} color="radial-gradient(circle, rgba(16,185,129,0.3), transparent 70%)"  top="30%"   left="45%"   duration={13} delay={1} />
        <Orb size={300} color="radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)"  top="-5%"   left="55%"   duration={10} delay={3} />

        {/* Animated grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(59,127,245,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,127,245,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            animation: 'gridPulse 6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />

        {/* ── Centered content wrapper ── */}
        <div
          style={{
            width: '100%',
            maxWidth: 1020,
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            position: 'relative',
            zIndex: 1,
            background: 'rgba(13,21,38,0.55)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
          }}
        >

        {/* ═══════════════════════════════════════════════════════════════
            LEFT PANEL — Branding & Feature highlights
        ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '56px 48px',
            position: 'relative',
            borderRight: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 56,
              animation: 'fadeSlideUp 0.5s ease both',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #3b7ff5 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#fff',
                boxShadow: '0 0 24px rgba(59,127,245,0.55)',
              }}
            >
              ✦
            </div>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#e8eeff', letterSpacing: '-0.3px' }}>
              CardStack
            </span>
          </div>

          {/* Hero headline */}
          <div style={{ marginBottom: 48, animation: 'fadeSlideUp 0.5s ease 0.1s both' }}>
            <h1
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: '#e8eeff',
                lineHeight: 1.18,
                letterSpacing: '-0.8px',
                margin: '0 0 16px',
              }}
            >
              Use the right card to{' '}
              <br />
              <span
                style={{
                  background: 'linear-gradient(90deg, #3b7ff5, #818cf8, #3b7ff5)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 3s linear infinite',
                  display: 'inline-block',
                  minWidth: 320,
                }}
              >
                <TypingHeadline />
              </span>
            </h1>
            <p style={{ fontSize: 16, color: '#6b7fa3', lineHeight: 1.65, margin: 0, maxWidth: 420 }}>
              CardStack tells you exactly which card in your wallet earns the most points for every purchase — no spreadsheets needed.
            </p>
          </div>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <Feature
              icon="💳"
              title="Smart card matching"
              desc="Instantly see which card gives the highest rewards for any spending category."
              delay={200}
            />
            <Feature
              icon="📊"
              title="All your cards in one place"
              desc="Add your entire wallet and get personalized, ranked recommendations."
              delay={320}
            />
            <Feature
              icon="🔄"
              title="Always up to date"
              desc="Rotating categories, quarterly bonuses, and caps are all tracked automatically."
              delay={440}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            RIGHT PANEL — Auth Form
        ═══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            width: 420,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 40px',
          }}
        >
          <div style={{ width: '100%' }}>
            {/* Mode toggle pill */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: 4,
                marginBottom: 28,
              }}
            >
              {(['login', 'register'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    borderRadius: 9,
                    border: 'none',
                    background: mode === m
                      ? 'linear-gradient(135deg, #3b7ff5 0%, #2563eb 100%)'
                      : 'transparent',
                    color: mode === m ? '#fff' : '#6b7fa3',
                    fontSize: 14,
                    fontWeight: mode === m ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.2s ease',
                    boxShadow: mode === m ? '0 4px 14px rgba(59,127,245,0.35)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Sign in' : 'Register'}
                </button>
              ))}
            </div>

            {/* Form card */}
            <div
              style={{
                opacity: formVisible ? 1 : 0,
                transform: formVisible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.18s ease, transform 0.18s ease',
              }}
            >
              <h2
                style={{
                  margin: '0 0 4px',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#e8eeff',
                  letterSpacing: '-0.3px',
                }}
              >
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7fa3' }}>
                {mode === 'login'
                  ? 'Sign in to continue to CardStack'
                  : 'Start optimizing your card rewards today'}
              </p>

              {error && (
                <div
                  style={{
                    marginBottom: 18,
                    padding: '10px 14px',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8,
                    color: '#ef4444',
                    fontSize: 13,
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-input-wrap">
                <Input
                  type="email"
                  label="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <div style={{ marginBottom: 8 }}>
                  {/* Password field with show/hide toggle — label above, relative wrapper around input only */}
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label
                      htmlFor="login-password"
                      style={{
                        display: 'block',
                        marginBottom: 6,
                        fontWeight: 500,
                        fontSize: 13,
                        color: 'var(--color-text-muted)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                        required
                        minLength={mode === 'register' ? 6 : undefined}
                        style={{
                          width: '100%',
                          padding: '11px 42px 11px 14px',
                          border: '1px solid var(--color-border-strong)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 14,
                          fontFamily: 'var(--font-sans)',
                          boxSizing: 'border-box',
                          backgroundColor: 'var(--color-surface-raised)',
                          color: 'var(--color-text)',
                          outline: 'none',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}
                        onFocus={e => {
                          e.target.style.borderColor = '#3b7ff5';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59,127,245,0.18)';
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = 'var(--color-border-strong)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: showPassword ? '#3b7ff5' : '#6b7fa3',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'color 0.15s ease',
                        }}
                      >
                        {showPassword ? (
                          /* Eye-off icon */
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                          </svg>
                        ) : (
                          /* Eye icon */
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {mode === 'login' && (
                    <div style={{ marginTop: -10, marginBottom: 20, textAlign: 'right' }}>
                      <Link
                        to="/forgot-password"
                        style={{ color: '#3b7ff5', textDecoration: 'none', fontSize: 13 }}
                      >
                        Forgot password?
                      </Link>
                    </div>
                  )}
                </div>

                <Button type="submit" loading={loading} fullWidth variant="primary">
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </Button>
              </form>

              <p style={{ marginTop: 18, textAlign: 'center', fontSize: 13, color: '#6b7fa3', margin: '18px 0 0' }}>
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      style={{
                        background: 'none', border: 'none', color: '#3b7ff5',
                        cursor: 'pointer', fontSize: 13, padding: 0,
                        fontWeight: 500, fontFamily: 'inherit',
                      }}
                    >
                      Register free
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      style={{
                        background: 'none', border: 'none', color: '#3b7ff5',
                        cursor: 'pointer', fontSize: 13, padding: 0,
                        fontWeight: 500, fontFamily: 'inherit',
                      }}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Trust line */}
            <p
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: 'rgba(107,127,163,0.55)',
                marginTop: 20,
              }}
            >
              No credit card required · Free to use
            </p>
          </div>
        </div>
        </div>{/* end centered wrapper */}
      </div>
    </>
  );
};

export default Login;
