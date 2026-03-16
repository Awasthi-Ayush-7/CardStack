/**
 * Redemption Concierge — find the best way to redeem your points for travel.
 *
 * Enter your destination, travel month, cabin class, and point balances.
 * The Concierge finds transfer paths ranked by cents-per-point, calls Claude
 * for AI-powered reasoning, and generates step-by-step booking instructions.
 *
 * API mode only (requires authentication).
 */
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../services/api';
import { ConciergeSearchResponse, UserCardWithBalance } from '../types';
import PageLayout from './ui/PageLayout';
import Button from './ui/Button';

const ORIGIN_SUGGESTIONS = [
  'New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami',
  'Seattle', 'Boston', 'Dallas', 'Atlanta', 'Washington DC',
  'Houston', 'Denver', 'Las Vegas', 'Orlando', 'Philadelphia',
];

const DESTINATION_SUGGESTIONS = [
  'Tokyo', 'London', 'Paris', 'Dubai', 'Singapore',
  'Sydney', 'Bangkok', 'Hong Kong', 'Istanbul', 'Doha',
  'Abu Dhabi', 'Rome', 'Amsterdam', 'Barcelona', 'Bali',
  'Hawaii', 'Caribbean', 'Cancun', 'New York',
];

// Shared card style for panels
const panelStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--spacing-lg)',
  overflow: 'hidden',
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--color-border)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--color-text)',
};

const greatDealBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  background: 'var(--color-success)',
  borderRadius: 'var(--radius-full)',
  padding: '2px 8px',
  marginLeft: 6,
  letterSpacing: '0.2px',
};

const bonusBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--color-primary)',
  background: 'rgba(59,127,245,0.1)',
  border: '1px solid rgba(59,127,245,0.2)',
  borderRadius: 'var(--radius-full)',
  padding: '1px 7px',
  marginLeft: 6,
};

const RedemptionConcierge: React.FC = () => {
  const [userCards, setUserCards] = useState<UserCardWithBalance[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // Form state
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelMonth, setTravelMonth] = useState('');
  const [cabin, setCabin] = useState<'economy' | 'business' | 'first'>('economy');
  const [balances, setBalances] = useState<Record<number, string>>({});

  // Results state
  const [result, setResult] = useState<ConciergeSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Origin autocomplete state
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const originRef = useRef<HTMLDivElement>(null);

  // Destination autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const destinationRef = useRef<HTMLDivElement>(null);

  // Month picker state
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // UI accordion state
  const [expandedAnalysis, setExpandedAnalysis] = useState(true);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (originRef.current && !originRef.current.contains(e.target as Node)) {
        setShowOriginSuggestions(false);
      }
      if (destinationRef.current && !destinationRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
        setShowMonthPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    api.getUserCards().then((cards) => {
      const withBalance = cards as UserCardWithBalance[];
      // Sort: cards with a saved balance first (highest balance first), then the rest
      const sorted = [...withBalance].sort((a, b) => {
        const balA = a.point_balance ?? 0;
        const balB = b.point_balance ?? 0;
        if (balA === 0 && balB > 0) return 1;
        if (balA > 0 && balB === 0) return -1;
        return balB - balA;
      });
      setUserCards(sorted);
      // Pre-populate balances from stored values
      const stored: Record<number, string> = {};
      withBalance.forEach((uc) => {
        if (uc.point_balance != null) stored[uc.id] = String(uc.point_balance);
      });
      setBalances(stored);
    }).catch(() => {
      // Non-fatal — user can still enter balances manually
    }).finally(() => setLoadingCards(false));
  }, []);

  const handleBalanceBlur = async (userCardId: number) => {
    const raw = balances[userCardId];
    const val = raw ? parseInt(raw, 10) : null;
    const balance = val !== null && !isNaN(val) ? val : null;
    try {
      await api.updateCardBalance(userCardId, balance);
    } catch {
      // Non-blocking — local state still reflects input
    }
  };

  const handleSearch = async () => {
    if (!origin.trim()) {
      setError('Please enter your departure city (e.g. "New York" or "Los Angeles").');
      return;
    }
    if (!destination.trim()) {
      setError('Please enter a destination (e.g. "Tokyo" or "Paris").');
      return;
    }
    if (!travelMonth.trim()) {
      setError('Please enter a travel month (e.g. "October 2026").');
      return;
    }

    const pointBalances: Record<number, number> = {};
    Object.entries(balances).forEach(([id, val]) => {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 0) pointBalances[Number(id)] = n;
    });

    if (Object.keys(pointBalances).length === 0) {
      setError('Enter at least one point balance to find redemption paths.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setExpandedCard(null);
      setExpandedAnalysis(false);

      const response = await api.searchConcierge({
        origin: origin.trim(),
        destination,
        travel_month: travelMonth.trim(),
        cabin,
        point_balances: pointBalances,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setExpandedAnalysis(false);
    setExpandedCard(null);
  };

  return (
    <PageLayout title="Redemption Concierge">
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 0, marginBottom: 'var(--spacing-lg)' }}>
        Tell us where you want to go and how many points you have. The Concierge finds
        the best transfer paths by cents-per-point value, reasons through the options
        with AI, and gives you a step-by-step booking plan.
      </p>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            color: 'var(--color-danger)',
            marginBottom: 'var(--spacing-md)',
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

      {/* ── Section 1: Search Form ── */}
      <div style={panelStyle}>
        <div style={panelHeaderStyle}>
          <h3 style={sectionTitleStyle}>Trip Details</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Origin — custom autocomplete */}
            <div ref={originRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
              <label htmlFor="origin" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>
                Departure City
              </label>
              <input
                id="origin"
                type="text"
                autoComplete="off"
                placeholder="e.g. New York, Los Angeles..."
                value={origin}
                onChange={(e) => { setOrigin(e.target.value); setShowOriginSuggestions(true); }}
                onFocus={() => setShowOriginSuggestions(true)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${showOriginSuggestions ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  fontSize: 14,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  boxShadow: showOriginSuggestions ? '0 0 0 2px rgba(59,127,245,0.15)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
              {showOriginSuggestions && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 2,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  zIndex: 100,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}>
                  {ORIGIN_SUGGESTIONS.filter((c) =>
                    c.toLowerCase().includes(origin.toLowerCase())
                  ).map((c) => (
                    <div
                      key={c}
                      onMouseDown={(e) => { e.preventDefault(); setOrigin(c); setShowOriginSuggestions(false); }}
                      style={{
                        padding: '9px 12px',
                        fontSize: 14,
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                        background: origin === c ? 'rgba(59,127,245,0.08)' : 'transparent',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,127,245,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = origin === c ? 'rgba(59,127,245,0.08)' : 'transparent')}
                    >
                      {c}
                    </div>
                  ))}
                  {origin.trim() && !ORIGIN_SUGGESTIONS.some(
                    (c) => c.toLowerCase() === origin.toLowerCase()
                  ) && (
                    <div style={{
                      padding: '9px 12px',
                      fontSize: 13,
                      color: 'var(--color-text-muted)',
                      fontStyle: 'italic',
                    }}>
                      Search "{origin}" — press Find to continue
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Destination — custom autocomplete */}
            <div ref={destinationRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
              <label htmlFor="destination" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>
                Destination
              </label>
              <input
                id="destination"
                type="text"
                autoComplete="off"
                placeholder="Type any city, e.g. Tokyo..."
                value={destination}
                onChange={(e) => { setDestination(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${showSuggestions ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  fontSize: 14,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  outline: 'none',
                  boxShadow: showSuggestions ? '0 0 0 2px rgba(59,127,245,0.15)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
              {showSuggestions && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 2,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                  zIndex: 100,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}>
                  {DESTINATION_SUGGESTIONS.filter((d) =>
                    d.toLowerCase().includes(destination.toLowerCase())
                  ).map((d) => (
                    <div
                      key={d}
                      onMouseDown={(e) => { e.preventDefault(); setDestination(d); setShowSuggestions(false); }}
                      style={{
                        padding: '9px 12px',
                        fontSize: 14,
                        cursor: 'pointer',
                        color: 'var(--color-text)',
                        background: destination === d ? 'rgba(59,127,245,0.08)' : 'transparent',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,127,245,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = destination === d ? 'rgba(59,127,245,0.08)' : 'transparent')}
                    >
                      {d}
                    </div>
                  ))}
                  {destination.trim() && !DESTINATION_SUGGESTIONS.some(
                    (d) => d.toLowerCase() === destination.toLowerCase()
                  ) && (
                    <div style={{
                      padding: '9px 12px',
                      fontSize: 13,
                      color: 'var(--color-text-muted)',
                      fontStyle: 'italic',
                    }}>
                      Search "{destination}" — press Find to continue
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Travel Month — custom month picker */}
            <div ref={monthPickerRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>
                Travel Month
              </label>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => { setShowMonthPicker((v) => !v); setPickerYear(new Date().getFullYear()); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${showMonthPicker ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  fontSize: 14,
                  background: 'var(--color-surface)',
                  color: travelMonth ? 'var(--color-text)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: showMonthPicker ? '0 0 0 2px rgba(59,127,245,0.15)' : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <span>{travelMonth || 'Select month'}</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>▼</span>
              </button>

              {/* Dropdown calendar */}
              {showMonthPicker && (() => {
                const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth(); // 0-indexed

                return (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 4,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
                    zIndex: 200,
                    width: 260,
                    padding: '12px',
                  }}>
                    {/* Year navigation */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => Math.max(y - 1, currentYear))}
                        disabled={pickerYear <= currentYear}
                        style={{
                          background: 'none', border: 'none', cursor: pickerYear <= currentYear ? 'not-allowed' : 'pointer',
                          color: pickerYear <= currentYear ? 'var(--color-text-muted)' : 'var(--color-text)',
                          fontSize: 18, padding: '2px 8px', borderRadius: 4,
                        }}
                      >‹</button>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{pickerYear}</span>
                      <button
                        type="button"
                        onClick={() => setPickerYear((y) => y + 1)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--color-text)', fontSize: 18, padding: '2px 8px', borderRadius: 4,
                        }}
                      >›</button>
                    </div>

                    {/* Month grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {MONTHS.map((m, i) => {
                        const isPast = pickerYear === currentYear && i < currentMonth;
                        const isSelected = travelMonth === `${MONTHS_FULL[i]} ${pickerYear}`;
                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={isPast}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              if (isPast) return;
                              setTravelMonth(`${MONTHS_FULL[i]} ${pickerYear}`);
                              setShowMonthPicker(false);
                            }}
                            style={{
                              padding: '8px 4px',
                              borderRadius: 6,
                              border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                              background: isSelected ? 'rgba(59,127,245,0.15)' : 'transparent',
                              color: isPast ? 'var(--color-text-muted)' : isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                              fontSize: 13,
                              fontWeight: isSelected ? 700 : 400,
                              cursor: isPast ? 'not-allowed' : 'pointer',
                              opacity: isPast ? 0.35 : 1,
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={(e) => { if (!isPast && !isSelected) e.currentTarget.style.background = 'rgba(59,127,245,0.08)'; }}
                            onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Cabin Class */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor="cabin" style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}>
                Cabin Class
              </label>
              <select
                id="cabin"
                value={cabin}
                onChange={(e) => setCabin(e.target.value as 'economy' | 'business' | 'first')}
                style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 14, background: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                <option value="economy">Economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </div>
          </div>

          {/* Point Balances */}
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
            Your Point Balances
          </h4>
          {loadingCards ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>Loading your cards...</p>
          ) : userCards.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
              Add cards to your wallet first via the My Cards tab.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {userCards.map((uc) => (
                <div key={uc.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label
                    htmlFor={`balance-${uc.id}`}
                    style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}
                  >
                    {uc.credit_card.issuer?.name} {uc.credit_card.name}
                  </label>
                  <input
                    id={`balance-${uc.id}`}
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0 points"
                    value={balances[uc.id] || ''}
                    onChange={(e) => setBalances((prev) => ({ ...prev, [uc.id]: e.target.value }))}
                    onBlur={() => handleBalanceBlur(uc.id)}
                    aria-label={`Point balance for ${uc.credit_card.name}`}
                    style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 14, background: 'var(--color-surface)', color: 'var(--color-text)', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Button onClick={handleSearch} loading={loading} disabled={loading} variant="primary">
              Find Best Redemption
            </Button>
            {result && (
              <Button onClick={handleReset} variant="secondary" disabled={loading}>
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      {result && (
        <div aria-live="polite">

          {/* ── Section 2: Paths Table ── */}
          {result.paths.length === 0 ? (
            <div
              role="status"
              style={{
                padding: '16px 20px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-lg)',
              }}
            >
              No transfer paths found for {result.destination} ({result.cabin}) with your current balances.
              Try a different destination or cabin class, or add more cards to your wallet.
            </div>
          ) : (
            <div style={{ ...panelStyle, marginBottom: 'var(--spacing-lg)' }}>
              <div style={panelHeaderStyle}>
                <h3 style={sectionTitleStyle}>
                  Redemption Paths — {result.destination} ({result.cabin})
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Ranked by cents-per-point value (higher = better)
                </p>
              </div>
              <div style={{
                padding: '12px 20px',
                background: 'rgba(234,179,8,0.08)',
                borderBottom: '1px solid rgba(234,179,8,0.25)',
                fontSize: 13,
                color: '#92400e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <span>
                  <strong>Points shown are published Saver award rates</strong> — the minimum cost if Saver space is available.
                  Actual availability varies by route and date. <strong>Always search the airline before transferring points</strong> — transfers are irreversible.
                  Use <em>Search Award Space →</em> to verify directly on each program's site.
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-raised)' }}>
                      {['Source Currency', 'Partner Program', 'Saver Rate (from)', 'CPP', 'Deal', 'Affordable', 'Search Awards'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '10px 16px',
                            textAlign: 'left',
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.paths.map((path, i) => (
                      <tr key={i} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--color-text)' }}>
                          {path.source_currency}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {path.partner_program}
                          {path.bonus_ratio != null && (
                            <span style={bonusBadgeStyle}>
                              +{Math.round(path.bonus_ratio * 100)}% bonus
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                          {path.effective_points_needed.toLocaleString()}
                          {path.live_cash_price != null && (
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                              Live fare: ${path.live_cash_price.toFixed(0)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: path.cpp > 2.0 ? 'var(--color-success)' : 'var(--color-text)' }}>
                          {path.cpp.toFixed(2)}¢
                          {path.live_cash_price != null && (
                            <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-text-muted)', marginTop: 1 }}>
                              live price
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {path.is_great_deal && (
                            <span style={greatDealBadgeStyle}>Great Deal</span>
                          )}
                          {path.is_estimated && (
                            <span style={{ ...greatDealBadgeStyle, background: 'rgba(234,179,8,0.15)', color: '#ca8a04', marginLeft: path.is_great_deal ? 6 : 0 }}>
                              Dynamic Pricing
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: path.can_afford ? 'var(--color-success)' : '#f59e0b' }}>
                          {path.can_afford
                            ? 'Yes'
                            : `Need ${(path.points_required - path.points_available_after_transfer).toLocaleString()} more`}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {path.award_search_url ? (
                            <a
                              href={path.award_search_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-primary)',
                                color: '#fff',
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Search Award Space →
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Section 3: Claude Analysis ── */}
          <div style={panelStyle}>
            <button
              onClick={() => setExpandedAnalysis((v) => !v)}
              aria-expanded={expandedAnalysis}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '16px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--color-text)',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600 }}>AI Analysis</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {expandedAnalysis ? '▲ collapse' : '▼ expand'}
              </span>
            </button>
            {expandedAnalysis && (
              <div style={{ padding: '0 20px 24px', borderTop: '1px solid var(--color-border)' }}>
                <div style={{
                  marginTop: 16,
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: 'var(--color-text)',
                }}>
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--color-text)',
                          margin: '20px 0 8px',
                          paddingBottom: 6,
                          borderBottom: '1px solid var(--color-border)',
                          letterSpacing: 0.2,
                        }}>{children}</h2>
                      ),
                      p: ({ children }) => (
                        <p style={{ margin: '6px 0 12px', lineHeight: 1.8 }}>{children}</p>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ margin: '6px 0 12px', paddingLeft: 22, lineHeight: 1.9 }}>{children}</ol>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ margin: '6px 0 12px', paddingLeft: 22, lineHeight: 1.9 }}>{children}</ul>
                      ),
                      li: ({ children }) => (
                        <li style={{ marginBottom: 6 }}>{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{children}</strong>
                      ),
                    }}
                  >
                    {result.claude_analysis}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 4: Booking Instruction Cards ── */}
          {result.booking_cards.length > 0 && (
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 12px' }}>
                Booking Instructions
              </h3>
              {result.booking_cards.map((card, i) => (
                <div key={i} style={{ ...panelStyle }}>
                  <button
                    onClick={() => setExpandedCard(expandedCard === i ? null : i)}
                    aria-expanded={expandedCard === i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '14px 20px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
                        {card.source_currency} → {card.partner_program}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        ({card.cabin})
                      </span>
                      {card.is_great_deal && (
                        <span style={greatDealBadgeStyle}>Great Deal</span>
                      )}
                      {result.paths.find(p => p.partner_program === card.partner_program)?.is_estimated && (
                        <span style={{ ...greatDealBadgeStyle, background: 'rgba(234,179,8,0.15)', color: '#ca8a04', marginLeft: 6 }}>
                          Dynamic Pricing
                        </span>
                      )}
                      {!card.can_afford && (
                        <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
                          Insufficient balance
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: card.cpp > 2.0 ? 'var(--color-success)' : 'var(--color-text)' }}>
                        {card.cpp.toFixed(2)}¢/pt
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {expandedCard === i ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>

                  {expandedCard === i && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
                      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9, fontSize: 14, color: 'var(--color-text)' }}>
                        {card.steps.map((step, j) => (
                          <li key={j} style={{ marginBottom: 6 }}>{step}</li>
                        ))}
                      </ol>
                      {card.portal_url && (
                        <a
                          href={card.portal_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: 16,
                            padding: '9px 18px',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            borderRadius: 'var(--radius-sm)',
                            textDecoration: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Go to Transfer Portal →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default RedemptionConcierge;
