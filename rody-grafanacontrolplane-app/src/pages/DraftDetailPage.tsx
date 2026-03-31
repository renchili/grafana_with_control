import React, { useEffect, useState } from 'react';
import { getButtonStyle } from '../components/common/buttonStyles';

type DraftDetail = {
  draftId: number;
  resourceUid: string;
  title: string;
  ownerName: string;
  status: string;
  baseVersionNo: number;
  governanceMode: string;
  rawDraft?: Record<string, unknown>;
};

export const DraftDetailPage: React.FC<{ draftId?: string }> = ({ draftId = '0' }) => {
  const [data, setData] = useState<DraftDetail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load draft');
    }
  };

  const publish = async () => {
    setNotice('Publishing...');
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}/publish`, { method: 'POST' });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      setNotice('Draft published');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
      setNotice('');
    }
  };

  const abandon = async () => {
    setNotice('Abandoning...');
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}/abandon`, { method: 'POST' });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      setNotice('Draft abandoned');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Abandon failed');
      setNotice('');
    }
  };

  const openInGrafana = () => {
    if (!data?.resourceUid) {
      return;
    }
    window.location.href = `/d/${data.resourceUid}`;
  };

  useEffect(() => {
    void load();
  }, [draftId]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16, background: 'var(--panel-bg)' }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Draft Detail</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          Draft lifecycle and controlled actions. Native dashboard editing remains in Grafana.
        </div>
      </div>

      {notice && <div style={{ color: 'var(--text-secondary)' }}>{notice}</div>}
      {error && <div style={{ color: '#d44a3a' }}>{error}</div>}

      {data && (
        <>
          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16, background: 'var(--panel-bg)', display: 'grid', gap: 8 }}>
            <div><strong>Title:</strong> {data.title}</div>
            <div><strong>Resource UID:</strong> {data.resourceUid}</div>
            <div><strong>Owner:</strong> {data.ownerName}</div>
            <div><strong>Status:</strong> {data.status}</div>
            <div><strong>Base Version:</strong> v{data.baseVersionNo}</div>
            <div><strong>Governance Mode:</strong> {data.governanceMode}</div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={openInGrafana}
              style={getButtonStyle()}
            >
              Open in Grafana
            </button>

            <button
              type="button"
              onClick={() => void publish()}
              disabled={data.status !== 'active'}
              style={getButtonStyle({ disabled: data.status !== 'active' })}
            >
              Publish
            </button>

            <button
              type="button"
              onClick={() => void abandon()}
              disabled={data.status !== 'active'}
              style={getButtonStyle({ disabled: data.status !== 'active' })}
            >
              Abandon
            </button>
          </div>

          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16, background: 'var(--panel-bg)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Raw Draft JSON</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(data.rawDraft ?? {}, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};
