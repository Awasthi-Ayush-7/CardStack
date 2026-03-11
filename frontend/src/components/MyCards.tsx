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
import PageLayout from './ui/PageLayout';
import Button from './ui/Button';

const MyCards: React.FC = () => {
  const [issuers, setIssuers] = useState<CardIssuer[]>([]);
  const [selectedIssuerId, setSelectedIssuerId] = useState<number | ''>('');
  const [issuerCards, setIssuerCards] = useState<CreditCard[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | ''>('');

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
      // In static mode, userCardId === credit_card_id
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

  // Memoized to avoid recalculating on every render
  const availableToAdd = useMemo(
    () => issuerCards.filter((card) => !userCards.some((uc) => uc.credit_card_id === card.id)),
    [issuerCards, userCards]
  );

  if (loading) {
    return (
      <PageLayout title="My Cards">
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading your cards…</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="My Cards">
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

      {/* Add Card Section */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h3
          style={{
            margin: '0 0 16px',
            color: 'var(--color-text)',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Add a Card
        </h3>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
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

      {/* Cards List */}
      <div>
        <h3
          style={{
            margin: '0 0 16px',
            color: 'var(--color-text)',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Your Cards{' '}
          <span
            style={{
              background: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              borderRadius: 'var(--radius-full)',
              padding: '2px 10px',
              fontSize: 12,
              fontWeight: 600,
              marginLeft: 6,
            }}
          >
            {userCards.length}
          </span>
        </h3>

        {userCards.length === 0 ? (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: 40,
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 14,
            }}
          >
            No cards added yet. Select an issuer above to get started.
          </div>
        ) : (
          <ul
            style={{ listStyle: 'none', padding: 0, margin: 0 }}
            aria-live="polite"
            aria-label="Your credit cards"
          >
            {userCards.map((userCard) => (
              <li key={userCard.id} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 20px',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 28,
                        borderRadius: 5,
                        background: 'linear-gradient(135deg, var(--color-surface-raised), var(--color-surface-hover))',
                        border: '1px solid var(--color-border-strong)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        flexShrink: 0,
                        fontWeight: 600,
                      }}
                      aria-hidden="true"
                    >
                      💳
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>
                        {userCard.credit_card.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {userCard.credit_card.issuer?.name || 'Unknown'} · {userCard.credit_card.network}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => handleRemoveCard(userCard.id)}
                    aria-label={`Remove ${userCard.credit_card.name} from your wallet`}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageLayout>
  );
};

export default MyCards;
