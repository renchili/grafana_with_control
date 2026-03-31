import React, { useEffect, useState } from 'react';
import { locationService } from '@grafana/runtime';

type Draft = {
  draftId: number;
  resourceUid: string;
  title: string;
  ownerName: string;
  baseVersionNo: number;
  status: string;
  updatedAt: string;
};

const statusColor = (status: string) => {
  switch (status) {
    case 'published':
      return '#299c46';
    case 'conflict':
      return '#d44a3a';
    case 'abandoned':
      return '#ff9830';
    default:
      return '#3274d9';
  }
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border-weak)',
  borderRadius: 8,
  background: 'var(--panel-bg)',
  padding: 16,
};

const buttonStyle: React.CSSProperties = {
  height: 36,
  padding: '0 14px',
  borderRadius: 6,
  border: '1px solid var(--border-weak)',
  background: 'var(--panel-bg)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};

export const DraftsPage: React.FC = () => {
  const [data, setData] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/platform/v1/me/drafts');
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  const publishDraft = async (draftId: number) => {
    setActioningId(draftId);
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}/publish`, {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish draft');
    } finally {
      setActioningId(null);
    }
  };

  const abandonDraft = async (draftId: number) => {
    setActioningId(draftId);
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}/abandon`, {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to abandon draft');
    } finally {
      setActioningId(null);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>Drafts</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          Resume, inspect, publish, and abandon governed drafts.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => void load()} style={buttonStyle}>
          Refresh
        </button>
      </div>

      {loading && (
        <div style={cardStyle}>
          <div style={{ color: 'var(--text-secondary)' }}>Loading drafts…</div>
        </div>
      )}

      {!loading && error && (
        <div style={{ ...cardStyle, border: '1px solid #d44a3a' }}>
          <div style={{ color: '#d44a3a', fontWeight: 600 }}>Error</div>
          <div style={{ marginTop: 6 }}>{error}</div>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div style={cardStyle}>
          <div style={{ color: 'var(--text-secondary)' }}>No drafts found.</div>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {data.map((draft) => (
            <div key={draft.draftId} style={cardStyle}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{draft.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{draft.resourceUid}</div>
                </div>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 24,
                    padding: '0 10px',
                    borderRadius: 999,
                    color: '#fff',
                    background: statusColor(draft.status),
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {draft.status}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Owner</div>
                  <div style={{ marginTop: 4 }}>{draft.ownerName}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Base Version</div>
                  <div style={{ marginTop: 4 }}>v{draft.baseVersionNo}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Updated</div>
                  <div style={{ marginTop: 4 }}>{draft.updatedAt}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => locationService.push(`/a/rody-grafanacontrolplane-app/draft/${draft.draftId}`)}
                >
                  Resume
                </button>

                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => locationService.push(`/a/rody-grafanacontrolplane-app/resource/${draft.resourceUid}`)}
                >
                  View definition
                </button>

                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => void publishDraft(draft.draftId)}
                  disabled={actioningId === draft.draftId}
                >
                  {actioningId === draft.draftId ? 'Working…' : 'Publish'}
                </button>

                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => void abandonDraft(draft.draftId)}
                  disabled={actioningId === draft.draftId}
                >
                  {actioningId === draft.draftId ? 'Working…' : 'Abandon'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
