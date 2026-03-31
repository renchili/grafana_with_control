import React, { useEffect, useMemo, useState } from 'react';
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

export const DraftsPage: React.FC = () => {
  const [data, setData] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 900 : false);

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

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const emptyState = useMemo(
    () => (
      <div
        style={{
          border: '1px solid var(--border-weak)',
          borderRadius: 8,
          background: 'var(--panel-bg)',
          padding: 16,
          color: 'var(--text-secondary)',
        }}
      >
        No drafts found.
      </div>
    ),
    []
  );

  const actionButtons = (draft: Draft) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        type="button"
        style={{ padding: '6px 10px', cursor: 'pointer' }}
        onClick={() => locationService.push(`/a/rody-grafanacontrolplane-app/draft/${draft.draftId}`)}
      >
        Resume
      </button>
      <button
        type="button"
        style={{ padding: '6px 10px', cursor: 'pointer' }}
        onClick={() => locationService.push(`/a/rody-grafanacontrolplane-app/resource/${draft.resourceUid}`)}
      >
        View definition
      </button>
      <button
        type="button"
        style={{ padding: '6px 10px', cursor: 'pointer' }}
        onClick={() => void publishDraft(draft.draftId)}
        disabled={actioningId === draft.draftId}
      >
        Publish
      </button>
      <button
        type="button"
        style={{ padding: '6px 10px', cursor: 'pointer' }}
        onClick={() => void abandonDraft(draft.draftId)}
        disabled={actioningId === draft.draftId}
      >
        Abandon
      </button>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          border: '1px solid var(--border-weak)',
          borderRadius: 8,
          background: 'var(--panel-bg)',
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Drafts</div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Resume, inspect, and publish governed drafts.
        </div>
      </div>

      <div>
        <button type="button" onClick={() => void load()} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {loading && <div>Loading drafts…</div>}

      {!loading && error && (
        <div style={{ border: '1px solid #d44a3a', borderRadius: 8, padding: 12 }}>
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && emptyState}

      {!loading && !error && data.length > 0 && !isMobile && (
        <div
          style={{
            border: '1px solid var(--border-weak)',
            borderRadius: 8,
            background: 'var(--panel-bg)',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-weak)' }}>
                <th style={{ padding: 12 }}>Title</th>
                <th style={{ padding: 12 }}>Owner</th>
                <th style={{ padding: 12 }}>Base Version</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Updated</th>
                <th style={{ padding: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((draft) => (
                <tr key={draft.draftId} style={{ borderBottom: '1px solid var(--border-weak)' }}>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{draft.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{draft.resourceUid}</div>
                  </td>
                  <td style={{ padding: 12 }}>{draft.ownerName}</td>
                  <td style={{ padding: 12 }}>v{draft.baseVersionNo}</td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        color: '#fff',
                        background: statusColor(draft.status),
                        fontSize: 12,
                      }}
                    >
                      {draft.status}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>{draft.updatedAt}</td>
                  <td style={{ padding: 12 }}>{actionButtons(draft)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && data.length > 0 && isMobile && (
        <div style={{ display: 'grid', gap: 12 }}>
          {data.map((draft) => (
            <div
              key={draft.draftId}
              style={{
                border: '1px solid var(--border-weak)',
                borderRadius: 10,
                background: 'var(--panel-bg)',
                padding: 14,
                display: 'grid',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{draft.title}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{draft.resourceUid}</div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Owner</span>
                  <span>{draft.ownerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Base Version</span>
                  <span>v{draft.baseVersionNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 9999,
                      color: '#fff',
                      background: statusColor(draft.status),
                      fontSize: 12,
                    }}
                  >
                    {draft.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Updated</span>
                  <span>{draft.updatedAt}</span>
                </div>
              </div>

              {actionButtons(draft)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
