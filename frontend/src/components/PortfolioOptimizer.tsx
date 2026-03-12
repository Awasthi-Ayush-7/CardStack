/**
 * Portfolio Optimizer — enter monthly spend per category and get
 * the best card from your wallet for each, estimated annual rewards,
 * and suggestions for cards to add.
 *
 * API mode only (requires authentication).
 */
import React, { useState } from 'react';
import { api } from '../services/api';
import { SpendingEntry, PortfolioResponse } from '../types';
import PageLayout from './ui/PageLayout';
import Button from './ui/Button';

const ALL_CATEGORIES = [
  'Dining',
  'Travel',
  'Groceries',
  'Gas',
  'Streaming',
  'Drugstore',
  'Entertainment',
  'Online Shopping',
  'Transit',
  'Home Improvement',
  'Movies',
  'General',
];

const PortfolioOptimizer: React.FC = () => {
  // monthly spend per category (empty string = not entered)
  const [spending, setSpending] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    const entries: SpendingEntry[] = ALL_CATEGORIES
      .map((cat) => ({ category: cat, monthly_amount: parseFloat(spending[cat] || '0') }))
      .filter((e) => e.monthly_amount > 0);

    if (entries.length === 0) {
      setError('Enter at least one monthly spending amount to optimize.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.optimizePortfolio(entries);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize portfolio');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSpending({});
    setResult(null);
    setError(null);
  };

  return (
    <PageLayout title="Portfolio Optimizer">
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 0, marginBottom: 'var(--spacing-lg)' }}>
        Enter your average monthly spending per category to see which card in your wallet
        to use for each one — and what cards you should consider adding.
      </p>

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

      {/* Spending input table */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
          Monthly Spending
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {ALL_CATEGORIES.map((cat) => (
            <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                htmlFor={`spend-${cat}`}
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)' }}
              >
                {cat}
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    fontSize: 14,
                    pointerEvents: 'none',
                  }}
                >
                  $
                </span>
                <input
                  id={`spend-${cat}`}
                  type="number"
                  min="0"
                  step="10"
                  placeholder="0"
                  value={spending[cat] || ''}
                  onChange={(e) => setSpending((prev) => ({ ...prev, [cat]: e.target.value }))}
                  style={{ paddingLeft: 22, width: '100%', boxSizing: 'border-box' }}
                  aria-label={`Monthly spend on ${cat}`}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <Button
            onClick={handleOptimize}
            loading={loading}
            disabled={loading}
            variant="primary"
          >
            Optimize Portfolio
          </Button>
          {result && (
            <Button onClick={handleReset} variant="secondary" disabled={loading}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div aria-live="polite">
          {/* Per-category table */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
                Recommended Cards by Category
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-raised)' }}>
                    {['Category', 'Monthly Spend', 'Best Card', 'Rate', 'Monthly Points', 'Annual Points'].map((h) => (
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
                  {result.per_category.map((row, i) => (
                    <tr
                      key={row.category}
                      style={{
                        borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--color-text)' }}>
                        {row.category}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                        ${row.monthly_amount.toFixed(0)}/mo
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {row.best_card ? (
                          <span style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                            {row.best_card}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            No card in wallet
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-success)' }}>
                        {row.multiplier > 0 ? `${row.multiplier}x` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>
                        {row.annual_rewards > 0
                          ? `${(row.annual_rewards / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} pts`
                          : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-text)' }}>
                        {row.annual_rewards > 0
                          ? `${row.annual_rewards.toLocaleString('en-US', { maximumFractionDigits: 0 })} pts`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary totals */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(59,127,245,0.08) 0%, rgba(59,127,245,0.03) 100%)',
                border: '1px solid rgba(59,127,245,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Est. Annual Rewards
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
                {result.total_estimated_rewards.toLocaleString('en-US', { maximumFractionDigits: 0 })} pts
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                ~{(result.total_estimated_rewards / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} pts/mo · before annual fees
              </div>
            </div>

            <div
              style={{
                background: result.total_net_value >= 0
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 100%)'
                  : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)',
                border: result.total_net_value >= 0
                  ? '1px solid rgba(34,197,94,0.2)'
                  : '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '20px 24px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Net Annual Value
              </div>
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                color: result.total_net_value >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                letterSpacing: '-0.5px',
              }}>
                {result.total_net_value.toLocaleString('en-US', { maximumFractionDigits: 0 })} pts
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                ~{(result.total_net_value / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} pts/mo · after annual fees
              </div>
            </div>
          </div>

          {/* Suggested additions */}
          {result.suggested_additions.length > 0 && (
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
                  Cards to Consider Adding
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  These cards would improve your net rewards based on your spending profile.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {result.suggested_additions.map((card, i) => (
                  <div
                    key={card.card_name}
                    style={{
                      padding: '16px 20px',
                      borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)' }}>
                          {card.card_name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--color-text-muted)',
                            background: 'var(--color-surface-raised)',
                            border: '1px solid var(--color-border-strong)',
                            borderRadius: 'var(--radius-full)',
                            padding: '2px 8px',
                          }}
                        >
                          {card.issuer}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: card.annual_fee > 0 ? 'var(--color-text-muted)' : 'var(--color-success)',
                            background: 'var(--color-surface-raised)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            padding: '2px 8px',
                          }}
                        >
                          {card.annual_fee > 0 ? `$${card.annual_fee}/yr` : 'No annual fee'}
                        </span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-success)', letterSpacing: '-0.3px' }}>
                        +${card.improvement.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        net annual improvement
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.suggested_additions.length === 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(34,197,94,0.02) 100%)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: 'var(--color-success)',
              }}
              role="status"
            >
              <span style={{ fontSize: 16 }} aria-hidden="true">✓</span>
              Your current wallet is already well-optimized for this spending profile. No new cards would significantly improve your rewards.
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default PortfolioOptimizer;
