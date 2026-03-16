/**
 * My Cards component - allows users to add/remove credit cards.
 * Uses issuer → card selection flow.
 *
 * Dual-mode:
 *  - Static mode: reads/writes via localStore + bundled cardData
 *  - API mode: reads/writes via the backend API
 */
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { CardIssuer, CreditCard, UserCard } from '../types';
import { CARD_DATA } from '../data/cardData';
import { localStore } from '../services/localStore';
import { IS_STATIC } from '../config';
import Button from './ui/Button';

/* ── Network colour helpers ───────────────────────────────────── */

const NETWORK_META: Record<string, { gradient: string; badge: string; text: string }> = {
  Visa: {
    gradient: 'linear-gradient(135deg, #0d2248 0%, #1a3a6b 60%, #1e4d8c 100%)',
    badge: '#1a4fa8',
    text: '#a8c4ff',
  },
  Mastercard: {
    gradient: 'linear-gradient(135deg, #2d0a0a 0%, #5c1010 60%, #7a1515 100%)',
    badge: '#8b1a1a',
    text: '#ffb3b3',
  },
  'American Express': {
    gradient: 'linear-gradient(135deg, #0a2e1a 0%, #154d2e 60%, #1a6038 100%)',
    badge: '#1a6038',
    text: '#8effc8',
  },
  Amex: {
    gradient: 'linear-gradient(135deg, #0a2e1a 0%, #154d2e 60%, #1a6038 100%)',
    badge: '#1a6038',
    text: '#8effc8',
  },
  Discover: {
    gradient: 'linear-gradient(135deg, #2e1a00 0%, #5c3400 60%, #7a4800 100%)',
    badge: '#7a4800',
    text: '#ffd08a',
  },
};

function networkMeta(network: string) {
  return (
    NETWORK_META[network] ??
    NETWORK_META[Object.keys(NETWORK_META).find((k) => network.toLowerCase().includes(k.toLowerCase())) ?? ''] ?? {
      gradient: 'linear-gradient(135deg, #141e38 0%, #1e2d54 60%, #243566 100%)',
      badge: '#243566',
      text: '#aabbee',
    }
  );
}

/* ── Mini credit-card visual ─────────────────────────────────── */
const CardFace: React.FC<{ userCard: UserCard; onRemove: () => void }> = ({ userCard, onRemove }) => {
  const card = userCard.credit_card;
  const issuerName = card.issuer?.name ?? 'Unknown';
  const meta = networkMeta(card.network);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: meta.gradient,
        borderRadius: 14,
        padding: '14px 16px 12px',
        minWidth: 180,
        maxWidth: 210,
        flex: '1 1 180px',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        cursor: 'default',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Decorative circle accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: -20,
          left: 60,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          pointerEvents: 'none',
        }}
      />

      {/* Top row: issuer + network badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '1.2px',
            color: 'rgba(255,255,255,0.55)',
            textTransform: 'uppercase',
          }}
        >
          {issuerName}
        </span>
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.8px',
            padding: '2px 6px',
            borderRadius: 3,
            background: 'rgba(255,255,255,0.1)',
            color: meta.text,
            textTransform: 'uppercase',
          }}
        >
          {card.network}
        </span>
      </div>

      {/* Card chip placeholder */}
      <div
        aria-hidden="true"
        style={{
          width: 18,
          height: 13,
          borderRadius: 2,
          background: 'linear-gradient(135deg, rgba(255,215,100,0.6) 0%, rgba(200,160,40,0.5) 100%)',
          border: '1px solid rgba(255,215,100,0.35)',
          marginBottom: 10,
        }}
      />

      {/* Masked card number */}
      <div
        aria-hidden="true"
        style={{
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: '1.5px',
          color: 'rgba(255,255,255,0.35)',
          marginBottom: 10,
        }}
      >
        •••• •••• •••• ••••
      </div>

      {/* Bottom row: card name + annual fee */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.1px',
            lineHeight: 1.3,
            maxWidth: 130,
          }}
        >
          {card.name}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 6 }}>
          {card.annual_fee > 0 ? (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>
              ${card.annual_fee}/yr
            </span>
          ) : (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>No fee</span>
          )}
        </div>
      </div>

      {/* Remove button — visible on hover */}
      <button
        onClick={onRemove}
        aria-label={`Remove ${card.name} from your wallet`}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: hovered ? 'rgba(239,68,68,0.8)' : 'rgba(0,0,0,0)',
          border: hovered ? '1px solid rgba(239,68,68,0.5)' : '1px solid transparent',
          color: hovered ? '#fff' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          lineHeight: 1,
          transition: 'all 0.15s ease',
          padding: 0,
          fontFamily: 'var(--font-sans)',
        }}
        title="Remove card"
      >
        ×
      </button>
    </div>
  );
};

/* ── Empty state ─────────────────────────────────────────────── */
const EmptyWallet: React.FC<{ onAddClick: () => void }> = ({ onAddClick }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '72px 24px',
      textAlign: 'center',
    }}
  >
    {/* Stacked card illustration */}
    <div
      aria-hidden="true"
      style={{ position: 'relative', width: 80, height: 56, marginBottom: 28 }}
    >
      {[
        { bg: '#1e3a6b', rotate: '-8deg', top: 8, left: 8 },
        { bg: '#1a4a2e', rotate: '4deg', top: 4, left: 4 },
        { bg: '#2a2a4a', rotate: '0deg', top: 0, left: 0 },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: 72,
            height: 48,
            borderRadius: 8,
            background: s.bg,
            border: '1px solid rgba(255,255,255,0.1)',
            transform: `rotate(${s.rotate})`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        />
      ))}
    </div>

    <h3
      style={{
        margin: '0 0 10px',
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--color-text)',
        letterSpacing: '-0.3px',
      }}
    >
      Your wallet is empty
    </h3>
    <p
      style={{
        margin: '0 0 28px',
        fontSize: 14,
        color: 'var(--color-text-muted)',
        maxWidth: 320,
        lineHeight: 1.6,
      }}
    >
      Add your credit cards to get personalized rewards recommendations and portfolio insights.
    </p>
    <button
      onClick={onAddClick}
      style={{
        padding: '10px 24px',
        background: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        boxShadow: '0 0 20px var(--color-primary-glow)',
        transition: 'all 0.15s ease',
      }}
    >
      + Add your first card
    </button>
  </div>
);

/* ── Stats bar ───────────────────────────────────────────────── */
const StatsBar: React.FC<{ userCards: UserCard[] }> = ({ userCards }) => {
  const networks = Array.from(new Set(userCards.map((uc) => uc.credit_card.network)));
  const totalFee = userCards.reduce((sum, uc) => sum + (uc.credit_card.annual_fee ?? 0), 0);

  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        padding: '14px 20px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        marginBottom: 28,
        flexWrap: 'wrap',
      }}
    >
      {[
        { label: 'Cards', value: String(userCards.length) },
        { label: 'Networks', value: networks.join(', ') || '—' },
        { label: 'Total annual fees', value: totalFee === 0 ? '$0' : `$${totalFee.toLocaleString()}` },
      ].map(({ label, value }) => (
        <div key={label}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>
            {label}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{value}</div>
        </div>
      ))}
    </div>
  );
};

/* ── Main component ──────────────────────────────────────────── */
const MyCards: React.FC = () => {
  const [issuers, setIssuers] = useState<CardIssuer[]>([]);
  const [selectedIssuerId, setSelectedIssuerId] = useState<number | ''>('');
  const [issuerCards, setIssuerCards] = useState<CreditCard[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | ''>('');
  const addSectionRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedIssuerId) {
      loadIssuerCards(Number(selectedIssuerId));
    } else {
      setIssuerCards([]);
      setSelectedCardId('');
    }
  }, [selectedIssuerId]);

  const loadData = async () => {
    if (IS_STATIC) {
      const { issuers: staticIssuers, cards: staticCards } = CARD_DATA;
      const userCardIds = localStore.getUserCardIds();
      const userCardObjects: UserCard[] = userCardIds
        .map((id) => {
          const card = staticCards.find((c) => c.id === id);
          if (!card) return null;
          const issuer = staticIssuers.find((i) => i.id === card.issuer_id);
          return {
            id: card.id,
            user_id: 0,
            credit_card_id: card.id,
            credit_card: { ...card, issuer },
          } as UserCard;
        })
        .filter((uc): uc is UserCard => uc !== null);
      setIssuers(staticIssuers);
      setUserCards(userCardObjects);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [issuersData, userCardsData] = await Promise.all([
        api.getIssuers(),
        api.getUserCards(),
      ]);
      setIssuers(issuersData);
      setUserCards(userCardsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadIssuerCards = async (issuerId: number) => {
    if (IS_STATIC) {
      setError(null);
      setIssuerCards(CARD_DATA.cards.filter((c) => c.issuer_id === issuerId));
      setSelectedCardId('');
      return;
    }
    try {
      setError(null);
      const cards = await api.getIssuerCards(issuerId);
      setIssuerCards(cards);
      setSelectedCardId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    }
  };

  const handleAddCard = async () => {
    if (!selectedCardId) return;
    const cardId = Number(selectedCardId);
    if (IS_STATIC) {
      setError(null);
      localStore.addUserCardId(cardId);
      const card = CARD_DATA.cards.find((c) => c.id === cardId);
      if (card) {
        const issuer = CARD_DATA.issuers.find((i) => i.id === card.issuer_id);
        const newUserCard: UserCard = {
          id: card.id,
          user_id: 0,
          credit_card_id: card.id,
          credit_card: { ...card, issuer },
        };
        setUserCards([...userCards, newUserCard]);
      }
      setSelectedCardId('');
      return;
    }
    try {
      setError(null);
      const newUserCard = await api.addUserCard(cardId);
      setUserCards([...userCards, newUserCard]);
      setSelectedCardId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add card');
    }
  };

  const handleRemoveCard = async (userCardId: number) => {
    if (IS_STATIC) {
      setError(null);
      localStore.removeUserCardId(userCardId);
      setUserCards(userCards.filter((uc) => uc.id !== userCardId));
      return;
    }
    try {
      setError(null);
      await api.removeUserCard(userCardId);
      setUserCards(userCards.filter((uc) => uc.id !== userCardId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove card');
    }
  };

  const availableToAdd = useMemo(
    () => issuerCards.filter((card) => !userCards.some((uc) => uc.credit_card_id === card.id)),
    [issuerCards, userCards]
  );

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-xl) var(--spacing-lg)', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading your cards…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-xl) var(--spacing-lg)', maxWidth: 1100, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.4px' }}>
          My Wallet
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-muted)' }}>
          Manage your credit cards and track your rewards potential.
        </p>
      </div>

      {error && (
        <div
          role="alert"
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

      {/* Add Card section — pinned to top */}
      <div
        ref={addSectionRef}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--color-primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: 'var(--color-primary)',
            }}
          >
            +
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
            Add a Card
          </h3>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedIssuerId}
            onChange={(e) => setSelectedIssuerId(e.target.value as number | '')}
            style={{ minWidth: 200 }}
            aria-label="Select card issuer"
          >
            <option value="">Select issuer…</option>
            {issuers.map((issuer) => (
              <option key={issuer.id} value={issuer.id}>
                {issuer.name}
              </option>
            ))}
          </select>

          {selectedIssuerId && (
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value as number | '')}
              style={{ minWidth: 220 }}
              aria-label="Select credit card"
            >
              <option value="">Select card…</option>
              {availableToAdd.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} ({card.network})
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={handleAddCard}
            disabled={!selectedCardId || availableToAdd.length === 0}
            variant="primary"
            aria-label="Add selected card to my wallet"
          >
            Add Card
          </Button>
        </div>

        {selectedIssuerId && availableToAdd.length === 0 && issuerCards.length > 0 && (
          <p style={{ color: 'var(--color-text-muted)', marginTop: 12, fontSize: 13, marginBottom: 0 }}>
            All cards from this issuer have already been added.
          </p>
        )}
      </div>

      {/* Stats bar — shown when cards exist */}
      {userCards.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <StatsBar userCards={userCards} />
        </div>
      )}

      {/* Cards grid */}
      {userCards.length === 0 ? (
        <EmptyWallet onAddClick={() => addSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} />
      ) : (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
              Your Cards
            </h3>
            <span
              style={{
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-full)',
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {userCards.length}
            </span>
          </div>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
            aria-live="polite"
            aria-label="Your credit cards"
          >
            {userCards.map((userCard) => (
              <CardFace
                key={userCard.id}
                userCard={userCard}
                onRemove={() => handleRemoveCard(userCard.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCards;
