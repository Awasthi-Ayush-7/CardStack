/**
 * Best Card Finder component - recommends the best card for a spending category.
 *
 * Dual-mode:
 *  - Static mode: categories from bundled data, recommendations via rewardEngine.ts
 *  - API mode: data and recommendations from the backend API
 */
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { RewardCategory, RecommendationItem, BestOverallItem } from '../types';
import { CARD_DATA } from '../data/cardData';
import { localStore } from '../services/localStore';
import { getRecommendations } from '../services/rewardEngine';
import { IS_STATIC } from '../config';
import PageLayout from './ui/PageLayout';
import Button from './ui/Button';

const BestCardFinder: React.FC = () => {
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [bestOverall, setBestOverall] = useState<BestOverallItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (IS_STATIC) {
      const cats = CARD_DATA.categories;
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0].name);
      return;
    }
    try {
      const cats = await api.getCategories();
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0].name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    }
  };

  const handleFindBestCard = async () => {
    if (!selectedCategory) return;
    if (IS_STATIC) {
      setLoading(true);
      setError(null);
      setSearched(false);
      const userCardIds = localStore.getUserCardIds();
      const response = getRecommendations(selectedCategory, userCardIds);
      setRecommendations(response.recommendations);
      setBestOverall(response.best_overall);
      setSearched(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSearched(false);
      const response = await api.getRecommendations(selectedCategory);
      setRecommendations(response.recommendations);
      setBestOverall(response.best_overall);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
      setRecommendations([]);
      setBestOverall(null);
    } finally {
      setLoading(false);
    }
  };

  // Is the best-overall card already shown in user's recommendations?
  const bestOverallAlreadyShown =
    bestOverall !== null &&
    recommendations.some((r) => r.card_id === bestOverall.card_id);

  return (
    <PageLayout title="Best Card Finder">
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

      {/* Selector */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <label
          htmlFor="category-select"
          style={{
            display: 'block',
            marginBottom: 12,
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--color-text)',
          }}
        >
          Spending Category
        </label>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setSearched(false); }}
            style={{ minWidth: 220 }}
            aria-label="Select spending category"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <Button
            onClick={handleFindBestCard}
            disabled={!selectedCategory || loading}
            loading={loading}
            variant="primary"
            aria-label={`Find best card for ${selectedCategory}`}
          >
            Find Best Card
          </Button>
        </div>
      </div>

      {/* Results region — screen readers announce changes */}
      <div aria-live="polite" aria-atomic="false">
        {/* Your Cards Results */}
        {searched && recommendations.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3
              style={{
                margin: '0 0 16px',
                color: 'var(--color-text)',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Your cards for{' '}
              <span style={{ color: 'var(--color-primary)' }}>{selectedCategory}</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map((rec, index) => (
                <div
                  key={rec.card_id}
                  style={{
                    background: index === 0 && !rec.is_general_fallback
                      ? 'linear-gradient(135deg, rgba(59,127,245,0.08) 0%, rgba(59,127,245,0.03) 100%)'
                      : 'var(--color-surface)',
                    border: index === 0 && !rec.is_general_fallback
                      ? '1px solid rgba(59,127,245,0.3)'
                      : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px 22px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 16,
                    opacity: rec.is_general_fallback ? 0.8 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    {/* Rank badge */}
                    {index === 0 && !rec.is_general_fallback ? (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-full)',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          flexShrink: 0,
                          boxShadow: '0 0 12px rgba(245,158,11,0.4)',
                        }}
                        aria-hidden="true"
                      >
                        🏆
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-surface-raised)',
                          border: '1px solid var(--color-border-strong)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--color-text-muted)',
                          flexShrink: 0,
                        }}
                        aria-label={`Rank ${index + 1}`}
                      >
                        {index + 1}
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 15,
                            color: index === 0 && !rec.is_general_fallback
                              ? 'var(--color-primary)'
                              : 'var(--color-text)',
                          }}
                        >
                          {rec.card}
                        </div>
                        {rec.is_general_fallback && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--color-text-muted)',
                              background: 'var(--color-surface-raised)',
                              border: '1px solid var(--color-border-strong)',
                              borderRadius: 'var(--radius-full)',
                              padding: '2px 8px',
                              letterSpacing: '0.3px',
                            }}
                          >
                            General rate
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: rec.annual_fee > 0 ? 'var(--color-text-muted)' : 'var(--color-success)',
                            background: 'var(--color-surface-raised)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            padding: '2px 8px',
                          }}
                        >
                          {rec.annual_fee > 0 ? `$${rec.annual_fee}/yr` : 'No annual fee'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.4, marginTop: 4 }}>
                        {rec.explanation}
                      </div>
                    </div>
                  </div>

                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: rec.is_general_fallback
                          ? 'var(--color-text-muted)'
                          : index === 0
                          ? 'var(--color-primary)'
                          : 'var(--color-success)',
                        letterSpacing: '-0.5px',
                        lineHeight: 1,
                      }}
                      aria-label={`${rec.multiplier}x rewards`}
                    >
                      {rec.multiplier}x
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                      {rec.is_general_fallback ? 'general' : 'rewards'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No cards in wallet fallback */}
        {searched && recommendations.length === 0 && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: 40,
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 14,
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            No cards added yet. Add cards in "My Cards" to see your personalized rankings.
          </div>
        )}

        {/* Best Overall Suggestion */}
        {searched && bestOverall && !bestOverallAlreadyShown && (
          <div>
            <h3
              style={{
                margin: '0 0 12px',
                color: 'var(--color-text)',
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              Best card for{' '}
              <span style={{ color: 'var(--color-primary)' }}>{selectedCategory}</span>
              {' '}in our catalog
            </h3>
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(245,158,11,0.02) 100%)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    flexShrink: 0,
                    boxShadow: '0 0 12px rgba(245,158,11,0.3)',
                  }}
                  aria-hidden="true"
                >
                  ✦
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#f59e0b' }}>
                      {bestOverall.card}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#f59e0b',
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                        letterSpacing: '0.3px',
                      }}
                    >
                      {bestOverall.issuer}
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
                      Not in your wallet
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: bestOverall.annual_fee > 0 ? 'var(--color-text-muted)' : 'var(--color-success)',
                        background: 'var(--color-surface-raised)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                      }}
                    >
                      {bestOverall.annual_fee > 0 ? `$${bestOverall.annual_fee}/yr` : 'No annual fee'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                    {bestOverall.explanation}
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#f59e0b',
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                  }}
                  aria-label={`${bestOverall.multiplier}x rewards`}
                >
                  {bestOverall.multiplier}x
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>
                  best available
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Best overall already owned */}
        {searched && bestOverall && bestOverallAlreadyShown && recommendations.length > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(34,197,94,0.02) 100%)',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              color: 'var(--color-success)',
            }}
            role="status"
          >
            <span style={{ fontSize: 16 }} aria-hidden="true">✓</span>
            You already own the best card for{' '}
            <strong style={{ marginLeft: 4, marginRight: 4 }}>{selectedCategory}</strong>
            {' '}— {bestOverall.card} at {bestOverall.multiplier}x.
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default BestCardFinder;
