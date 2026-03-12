/**
 * Reset password - set new password using token from email link.
 */
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import Input from './ui/Input';
import Button from './ui/Button';

const AuthPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      minHeight: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--spacing-lg)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 600,
        height: 400,
        background: 'radial-gradient(ellipse at center, rgba(59,127,245,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}
    />
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #3b7ff5 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 17,
          color: '#fff',
          boxShadow: '0 0 20px rgba(59,127,245,0.5)',
        }}
      >
        ✦
      </div>
      <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
        CardStack
      </span>
    </div>
    <div
      style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '36px 40px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {children}
    </div>
  </div>
);

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!token) {
      setError('Invalid reset link. Request a new one.');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token && !success) {
    return (
      <AuthPage>
        <h2 style={{ marginTop: 0, color: 'var(--color-text)', fontSize: 22, fontWeight: 700 }}>
          Invalid reset link
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          This link is missing the reset token. Request a new password reset from the login page.
        </p>
        <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
          ← Back to sign in
        </Link>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
      <h2
        style={{
          marginTop: 0,
          marginBottom: 6,
          color: 'var(--color-text)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.3px',
        }}
      >
        Set a new password
      </h2>
      <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--color-text-muted)' }}>
        Choose a strong password for your account
      </p>

      {success && (
        <>
          <div
            style={{
              color: 'var(--color-success)',
              marginBottom: 20,
              padding: '10px 14px',
              backgroundColor: 'var(--color-success-bg)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            Password updated successfully. You can now sign in.
          </div>
          <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
            → Go to sign in
          </Link>
        </>
      )}

      {!success && (
        <>
          {error && (
            <div
              style={{
                color: 'var(--color-danger)',
                marginBottom: 20,
                padding: '10px 14px',
                backgroundColor: 'var(--color-danger-bg)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <Input
              type="password"
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
            <Input
              type="password"
              label="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              minLength={6}
            />
            <Button type="submit" loading={loading} fullWidth variant="primary">
              Reset password
            </Button>
          </form>
          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--color-text-muted)' }}>
            <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
              ← Back to sign in
            </Link>
          </p>
        </>
      )}
    </AuthPage>
  );
};

export default ResetPassword;
