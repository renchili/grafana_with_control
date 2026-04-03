import React, { useEffect, useState } from 'react';

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

export const PreviewPage: React.FC<{ draftId?: string }> = ({ draftId = '0' }) => {
  const [data, setData] = useState<DraftDetail | null>(null);
  const [error, setError] = useState('');

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
      setError(e instanceof Error ? e.message : 'Failed to load preview data');
    }
  };

  useEffect(() => {
    void load();
  }, [draftId]);

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
        <div style={{ fontSize: 20, fontWeight: 700, color: '#ff9830' }}>预览</div>
        <div style={{ marginTop: 8, color: 'var(--text-primary)' }}>
          当前页面展示的是 <strong>未保存 / 未发布的数据预览</strong>。
        </div>
        <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
          这是预览状态，不代表正式版本，不会直接影响线上资源。
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
            <div><strong>标题:</strong> {data.title}</div>
            <div><strong>资源 UID:</strong> {data.resourceUid}</div>
            <div><strong>Owner:</strong> {data.ownerName}</div>
            <div><strong>当前 Draft 状态:</strong> {data.status}</div>
            <div><strong>基线版本:</strong> v{data.baseVersionNo}</div>
            <div><strong>治理模式:</strong> {data.governanceMode}</div>
          </div>

          <div
            style={{
              border: '1px solid var(--border-weak)',
              borderRadius: 8,
              background: 'var(--panel-bg)',
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>预览数据 JSON</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(data.rawDraft ?? {}, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};
