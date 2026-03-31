import React from 'react';

export const GrafanaPreviewBridgePage: React.FC<{ target?: string }> = ({ target = '' }) => {
  const decoded = decodeURIComponent(target || '');

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
          This is an <strong>unsaved preview version</strong>.
        </div>
        <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
          It is for preview only and does not affect the final published version.
        </div>
      </div>

      <div
        style={{
          border: '1px solid var(--border-weak)',
          borderRadius: 8,
          overflow: 'hidden',
          background: 'var(--panel-bg)',
        }}
      >
        {decoded ? (
          <iframe
            src={decoded}
            style={{ width: '100%', height: '80vh', border: 'none' }}
            title="grafana-preview"
          />
        ) : (
          <div style={{ padding: 20, color: '#d44a3a' }}>Missing preview target.</div>
        )}
      </div>
    </div>
  );
};
