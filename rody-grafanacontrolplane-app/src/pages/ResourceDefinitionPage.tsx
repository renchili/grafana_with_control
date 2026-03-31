import React, { useEffect, useState } from 'react';
import { getButtonStyle } from '../components/common/buttonStyles';

type ResourceDefinition = {
  draftId?: number;
  resourceUid: string;
  title: string;
  ownerName: string;
  governanceMode: string;
  baseVersionNo: number;
  rawDraft?: Record<string, unknown>;
};

export const ResourceDefinitionPage: React.FC<{ uid?: string }> = ({ uid = '' }) => {
  const [data, setData] = useState<ResourceDefinition | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/resources/${uid}`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resource definition');
    }
  };

  const openInGrafana = () => {
    if (!uid) {
      return;
    }
    window.location.href = `/d/${uid}`;
  };

  useEffect(() => {
    void load();
  }, [uid]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16, background: 'var(--panel-bg)' }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Resource Definition</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          Published resource metadata. Native dashboard editing remains in Grafana.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => void load()} style={getButtonStyle()}>
          Refresh
        </button>
        <button type="button" onClick={openInGrafana} style={getButtonStyle()}>
          Open in Grafana
        </button>
      </div>

      {error && <div style={{ color: '#d44a3a' }}>{error}</div>}

      {data && (
        <>
          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16, background: 'var(--panel-bg)', display: 'grid', gap: 8 }}>
            <div><strong>Title:</strong> {data.title}</div>
            <div><strong>Resource UID:</strong> {data.resourceUid}</div>
            <div><strong>Owner:</strong> {data.ownerName}</div>
            <div><strong>Governance Mode:</strong> {data.governanceMode}</div>
            <div><strong>Current Version:</strong> v{data.baseVersionNo}</div>
          </div>

          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16, background: 'var(--panel-bg)' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Published Definition JSON</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(data.rawDraft ?? data, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};
