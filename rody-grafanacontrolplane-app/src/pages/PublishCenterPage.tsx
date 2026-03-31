import React from 'react';

export const PublishCenterPage: React.FC = () => {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>Publish Center</div>
      <div style={{ color: 'var(--text-secondary)' }}>
        Controlled publish jobs, retries, rollback, and release visibility.
      </div>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
        Coming next: publish job list, summary cards, retry and rollback actions.
      </div>
    </div>
  );
};
