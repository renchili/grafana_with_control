import React from 'react';

export const ConflictResolvePage: React.FC = () => {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>Conflict Resolve</div>
      <div style={{ color: 'var(--text-secondary)' }}>
        Resolve base / yours / theirs conflicts without losing drafts.
      </div>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
        Coming next: conflict pane, path list, rebase / save-as-copy / takeover actions.
      </div>
    </div>
  );
};
