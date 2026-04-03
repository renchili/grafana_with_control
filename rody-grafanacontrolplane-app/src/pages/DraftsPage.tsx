import React, { useEffect, useState } from 'react';
import { locationService } from '@grafana/runtime';
import { getButtonStyle } from '../components/common/buttonStyles';

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
  const [notice, setNotice] = useState('');

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

  const abandonDraft = async (draftId: number) => {
    setNotice('Abandoning draft...');
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}/abandon`, {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      setNotice('Draft abandoned. Published resource definition is unchanged.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to abandon draft');
      setNotice('');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Drafts</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          Resume active drafts, inspect published definitions, and take controlled actions.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => void load()} style={getButtonStyle()}>
          Refresh
        </button>
      </div>

      {notice && <div style={{ color: 'var(--text-secondary)' }}>{notice}</div>}
      {loading && <div style={{ color: 'var(--text-secondary)' }}>Loading drafts…</div>}
      {error && <div style={{ color: '#d44a3a' }}>{error}</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gap: 12 }}>
          {data.map((draft) => {
            const canResume = draft.status === 'active' || draft.status === 'conflict';
            const canAbandon = draft.status === 'active';

            return (
              <div
                key={draft.draftId}
                style={{
                  border: '1px solid var(--border-weak)',
                  borderRadius: 8,
                  background: 'var(--panel-bg)',
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{draft.title}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{draft.resourceUid}</div>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
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

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={getButtonStyle({ disabled: !canResume })}
                    disabled={!canResume}
                    onClick={() =>
                      locationService.push(`/a/rody-grafanacontrolplane-app/draft/${draft.draftId}`)
                    }
                  >
                    Resume
                  </button>

                  <button
                    type="button"
                    style={getButtonStyle()}
                    onClick={() =>
                      locationService.push(`/a/rody-grafanacontrolplane-app/resource/${draft.resourceUid}`)
                    }
                  >
                    View definition
                  </button>

                  <button
                    type="button"
                    style={getButtonStyle({ disabled: !canAbandon })}
                    disabled={!canAbandon}
                    onClick={() => void abandonDraft(draft.draftId)}
                  >
                    Abandon
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
