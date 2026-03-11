/**
 * AdminPanel — manage card suggestions and view users, restricted to admin role.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { CardSuggestion, AdminUser } from '../types';

type AdminTab = 'suggestions' | 'users';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b', label: 'Pending' },
  reviewed: { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6', label: 'Reviewed' },
  added:    { bg: 'rgba(16,185,129,0.12)',  text: '#10b981', label: 'Added' },
  declined: { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444', label: 'Declined' },
};

const roleColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6' },
  user:  { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  test:  { bg: 'rgba(107,114,128,0.12)', text: '#9ca3af' },
};

// ----- Suggestions Sub-Panel -----------------------------------------------

const SuggestionsPanel: React.FC = () => {
  const [suggestions, setSuggestions]   = useState<CardSuggestion[]>([]);
  const [filter, setFilter]             = useState<string>('');
  const [loading, setLoading]           = useState(true);
  const [updatingId, setUpdatingId]     = useState<number | null>(null);
  const [adminNote, setAdminNote]       = useState<Record<number, string>>({});
  const [error, setError]               = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminSuggestions(filter || undefined);
      setSuggestions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      const updated = await api.updateSuggestionStatus(id, status, adminNote[id]);
      setSuggestions(prev => prev.map(s => s.id === id ? updated : s));
    } catch (err: any) {
      setError(err.message || 'Failed to update suggestion');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = suggestions.filter(s => s.status === 'pending').length;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {['', 'pending', 'reviewed', 'added', 'declined'].map(s => {
          const active = filter === s;
          const label = s === '' ? 'All' : (statusColors[s]?.label || s);
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: active ? 'var(--color-primary)' : 'var(--color-border-strong)',
                background: active ? 'var(--color-primary-subtle)' : 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {label}
              {s === 'pending' && pendingCount > 0 && (
                <span style={{ marginLeft: 6, background: '#f59e0b', color: '#000', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={load}
          style={{
            marginLeft: 'auto',
            padding: '5px 14px',
            borderRadius: 20,
            border: '1px solid var(--color-border-strong)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading suggestions…</div>
      ) : suggestions.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
          No suggestions found.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.map(s => {
            const sc = statusColors[s.status] || statusColors.pending;
            const isUpdating = updatingId === s.id;
            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  padding: '16px 18px',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text)', marginBottom: 2 }}>
                      {s.card_name}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {s.issuer_name}{s.network ? ` · ${s.network}` : ''} · by {s.user_email || `user #${s.user_id}`}
                    </div>
                    {s.notes && (
                      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        "{s.notes}"
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      background: sc.bg,
                      color: sc.text,
                    }}>
                      {sc.label}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Admin note input */}
                <input
                  type="text"
                  placeholder="Admin note (optional)…"
                  value={adminNote[s.id] ?? (s.admin_notes || '')}
                  onChange={e => setAdminNote(prev => ({ ...prev, [s.id]: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    color: 'var(--color-text)',
                    fontSize: 13,
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    marginBottom: 10,
                    boxSizing: 'border-box',
                  }}
                />

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['pending', 'reviewed', 'added', 'declined'] as const).map(st => {
                    const stc = statusColors[st];
                    const isCurrent = s.status === st;
                    return (
                      <button
                        key={st}
                        onClick={() => handleStatusUpdate(s.id, st)}
                        disabled={isUpdating || isCurrent}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 6,
                          border: '1px solid',
                          borderColor: isCurrent ? stc.text : 'var(--color-border-strong)',
                          background: isCurrent ? stc.bg : 'transparent',
                          color: isCurrent ? stc.text : 'var(--color-text-muted)',
                          fontSize: 12,
                          fontWeight: isCurrent ? 600 : 400,
                          cursor: isCurrent || isUpdating ? 'not-allowed' : 'pointer',
                          fontFamily: 'var(--font-sans)',
                          opacity: isUpdating ? 0.6 : 1,
                        }}
                      >
                        {stc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ----- Users Sub-Panel -------------------------------------------------------

const UsersPanel: React.FC = () => {
  const [users, setUsers]       = useState<AdminUser[]>([]);
  const [filter, setFilter]     = useState<string>('');
  const [loading, setLoading]   = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminUsers(filter || undefined);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdatingId(userId);
    try {
      const updated = await api.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  };

  const countByRole = (role: string) => users.filter(u => u.role === role).length;

  return (
    <div>
      {/* Role filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { value: '', label: 'All' },
          { value: 'admin', label: 'Admin' },
          { value: 'user', label: 'User' },
          { value: 'test', label: 'Test' },
        ].map(({ value, label }) => {
          const active = filter === value;
          const rc = value ? roleColors[value] : null;
          return (
            <button
              key={value}
              onClick={() => setFilter(value)}
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: active ? (rc?.text || 'var(--color-primary)') : 'var(--color-border-strong)',
                background: active ? (rc?.bg || 'var(--color-primary-subtle)') : 'transparent',
                color: active ? (rc?.text || 'var(--color-primary)') : 'var(--color-text-muted)',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {label}
              {value && (
                <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 12 }}>
                  {countByRole(value)}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={load}
          style={{
            marginLeft: 'auto',
            padding: '5px 14px',
            borderRadius: 20,
            border: '1px solid var(--color-border-strong)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading users…</div>
      ) : users.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
          No users found.
        </div>
      ) : (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {users.map((u, idx) => {
            const rc = roleColors[u.role] || roleColors.user;
            const isUpdating = updatingId === u.id;
            return (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: rc.bg,
                    color: rc.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {u.email.charAt(0).toUpperCase()}
                </div>

                {/* Email + date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Joined {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Role badge + changer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background: rc.bg,
                    color: rc.text,
                  }}>
                    {u.role}
                  </span>
                  <select
                    value={u.role}
                    disabled={isUpdating}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border-strong)',
                      borderRadius: 6,
                      color: 'var(--color-text-muted)',
                      fontSize: 12,
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-sans)',
                      opacity: isUpdating ? 0.6 : 1,
                    }}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="test">test</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ----- Main Admin Panel ------------------------------------------------------

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('suggestions');

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'suggestions', label: 'Card Suggestions' },
    { key: 'users',       label: 'User Accounts' },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 26,
            height: 26,
            borderRadius: 6,
            background: 'rgba(139,92,246,0.15)',
            color: '#8b5cf6',
            fontSize: 13,
            fontWeight: 700,
          }}>
            A
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Admin Panel
          </h2>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
          Manage card suggestions and user accounts.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: 14,
              fontWeight: activeTab === t.key ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              marginBottom: -1,
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'suggestions' && <SuggestionsPanel />}
      {activeTab === 'users'       && <UsersPanel />}
    </div>
  );
};

export default AdminPanel;
