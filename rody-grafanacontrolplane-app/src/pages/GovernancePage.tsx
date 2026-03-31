import React from 'react';

export const GovernancePage: React.FC = () => {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>Governance</div>
      <div style={{ color: 'var(--text-secondary)' }}>
        Resource ownership, governance mode, reviewer policy, and editability control.
      </div>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
        Coming next: governance table, filters, owner/reviewer editing and audit drawer.
      </div>
    </div>
  );
};
