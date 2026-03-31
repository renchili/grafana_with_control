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

export const DraftsPage: React.FC = () => {
  const [data, setData] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    void load();
  }, []);

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
          Failed to load drafts: {error}
        </div>
      )}

      {!loading && !error && (
        <div
          style={{
            border: '1px solid var(--border-weak)',
            borderRadius: 8,
            background: 'var(--panel-bg)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  <td style={{ padding: 12 }}>{draft.status}</td>
                  <td style={{ padding: 12 }}>{draft.updatedAt}</td>
                  <td style={{ padding: 12 }}>
                    <button
                      type="button"
                      style={{ padding: '6px 10px', cursor: 'pointer' }}
                      onClick={() =>
                        locationService.push(`/a/rody-grafanacontrolplane-app/resource/${draft.resourceUid}`)
                      }
                    >
                      View definition
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 12, color: 'var(--text-secondary)' }}>
                    No drafts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
