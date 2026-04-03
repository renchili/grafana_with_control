import React, { useEffect, useState } from 'react';

type ResourceDefinition = {
  resourceUid: string;
  title: string;
  ownerName: string;
  governanceMode: string;
  baseVersionNo: number;
  rawDraft?: Record<string, unknown>;
};

export const ResourcePreviewPage: React.FC<{ uid?: string }> = ({ uid = '' }) => {
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
      setError(e instanceof Error ? e.message : 'Failed to load preview data');
    }
  };

  useEffect(() => {
    void load();
  }, [uid]);

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div
        style={{
          border: '1px solid #ff9830',
          borderRadius: 8,
          background: 'rgba(255,152,48,0.08)',
          padding: 16,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: '#ff9830' }}>Preview</div>
        <div style={{ marginTop: 8 }}>
          This window shows an <strong>unsaved preview version</strong>.
        </div>
        <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
          It is in preview state only and does not affect the final published version.
        </div>
      </div>

      {error && <div style={{ color: '#d44a3a' }}>{error}</div>}

      {data && (
        <>
          <div
            style={{
              border: '1px solid var(--border-weak)',
              borderRadius: 8,
              background: 'var(--panel-bg)',
              padding: 16,
              display: 'grid',
              gap: 8,
            }}
          >
            <div><strong>Title:</strong> {data.title}</div>
            <div><strong>Resource UID:</strong> {data.resourceUid}</div>
            <div><strong>Owner:</strong> {data.ownerName}</div>
            <div><strong>Governance Mode:</strong> {data.governanceMode}</div>
            <div><strong>Base Version:</strong> v{data.baseVersionNo}</div>
          </div>

          <div
            style={{
              border: '1px solid var(--border-weak)',
              borderRadius: 8,
              background: 'var(--panel-bg)',
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview JSON</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(data.rawDraft ?? data, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};
