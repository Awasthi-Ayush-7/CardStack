/**
 * SuggestCard — lets users suggest credit cards that are missing from the system.
 * In static mode, shows a GitHub Issue link instead of the submission form.
 */
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CardSuggestion } from '../types';
import { IS_STATIC } from '../config';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', label: 'Pending' },
  reviewed: { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6', label: 'Reviewed' },
  added:    { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', label: 'Added' },
  declined: { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', label: 'Declined' },
};

const SuggestCard: React.FC = () => {
  const [cardName, setCardName]       = useState('');
  const [issuerName, setIssuerName]   = useState('');
  const [network, setNetwork]         = useState('');
  const [notes, setNotes]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [mySuggestions, setMySuggestions] = useState<CardSuggestion[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!IS_STATIC) {
      loadMySuggestions();
    } else {
      setLoadingList(false);
    }
  }, []);

  const loadMySuggestions = async () => {
    try {
      const data = await api.getMySuggestions();
      setMySuggestions(data);
    } catch (err) {
      // Non-critical: just show an empty list
      console.error('Failed to load suggestions:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!cardName.trim() || !issuerName.trim()) {
      setErrorMsg('Card name and issuer name are required.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.submitSuggestion({
        card_name: cardName.trim(),
        issuer_name: issuerName.trim(),
        network: network.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setMySuggestions([created, ...mySuggestions]);
      setCardName('');
      setIssuerName('');
      setNetwork('');
      setNotes('');
      setSuccessMsg('Thanks! Your suggestion has been submitted and will be reviewed by our team.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit suggestion.');
    } finally {
      setSubmitting(false);
    }
  };

  // Static mode: show GitHub Issue link
  if (IS_STATIC) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0, marginBottom: 6 }}>
            Suggest a Missing Card
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
            Don't see your card in the list? We'd love to add it!
          </p>
        </div>
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            padding: 28,
          }}
        >
          <p style={{ color: 'var(--color-text)', fontSize: 15, margin: '0 0 16px', fontWeight: 500 }}>
            This app is open source. You can suggest a new card by opening a GitHub Issue:
          </p>
          <a
            href="https://github.com/dexxterr-g/credit-card-rewards-optimizer/issues/new?title=Card+Suggestion&labels=card-suggestion&body=**Card+Name:**%0A%0A**Issuer:**%0A%0A**Network:**%0A%0A**Reward+details:**"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Open a GitHub Issue
          </a>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: '20px 0 0' }}>
            Please include the card name, issuer, network, and reward rates when submitting.
          </p>
        </div>
      </div>
    );
  }

  // API mode: full suggestion form
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0, marginBottom: 6 }}>
          Suggest a Missing Card
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
          Don't see your card in the system? Let us know and we'll add it in the next update.
        </p>
      </div>

      {/* Suggestion Form */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 36,
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label
                htmlFor="suggest-card-name"
                style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 }}
              >
                Card Name <span style={{ color: '#ef4444' }} aria-hidden="true">*</span>
              </label>
              <input
                id="suggest-card-name"
                type="text"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                placeholder="e.g. Venture X"
                required
                aria-required="true"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 8,
                  color: 'var(--color-text)',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="suggest-issuer-name"
                style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 }}
              >
                Issuer / Bank <span style={{ color: '#ef4444' }} aria-hidden="true">*</span>
              </label>
              <input
                id="suggest-issuer-name"
                type="text"
                value={issuerName}
                onChange={e => setIssuerName(e.target.value)}
                placeholder="e.g. Capital One"
                required
                aria-required="true"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border-strong)',
                  borderRadius: 8,
                  color: 'var(--color-text)',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="suggest-network"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 }}
            >
              Network{' '}
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <select
              id="suggest-network"
              value={network}
              onChange={e => setNetwork(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 8,
                color: network ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer',
              }}
            >
              <option value="">Select network…</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Amex">American Express</option>
              <option value="Discover">Discover</option>
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="suggest-notes"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text)', marginBottom: 6 }}
            >
              Notes{' '}
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="suggest-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any details about the card's rewards, categories, or why it should be added…"
              rows={3}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 8,
                color: 'var(--color-text)',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}
            >
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div
              role="status"
              style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: 8, color: '#10b981', fontSize: 13 }}
            >
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            style={{
              padding: '10px 24px',
              background: submitting ? 'var(--color-border-strong)' : 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.15s ease',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Suggestion'}
          </button>
        </form>
      </div>

      {/* My Suggestions History */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 16 }}>
          My Suggestions
        </h3>

        {loadingList ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading…</div>
        ) : mySuggestions.length === 0 ? (
          <div
            style={{
              padding: 24,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 14,
            }}
          >
            You haven't submitted any suggestions yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mySuggestions.map(s => {
              const sc = statusColors[s.status] || statusColors.pending;
              return (
                <div
                  key={s.id}
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginBottom: 2 }}>
                      {s.card_name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: s.notes ? 6 : 0 }}>
                      {s.issuer_name}{s.network ? ` · ${s.network}` : ''}
                    </div>
                    {s.notes && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        {s.notes}
                      </div>
                    )}
                    {s.admin_notes && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-background)', borderRadius: 6, padding: '4px 8px' }}>
                        <span style={{ fontWeight: 500 }}>Admin note: </span>{s.admin_notes}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: sc.bg,
                        color: sc.text,
                        marginBottom: 4,
                      }}
                    >
                      {sc.label}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestCard;
