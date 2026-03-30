import React, { useMemo } from 'react';
import { DraftDetail } from '../../types/resource';

interface Props {
  draft?: DraftDetail;
}

export const DraftPanelEditor: React.FC<Props> = ({ draft }) => {
  const raw = useMemo(() => JSON.stringify(draft?.rawDraft ?? draft ?? {}, null, 2), [draft]);

  if (!draft) {
    return <div style={{ color: 'var(--text-secondary)' }}>Draft not found.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Governed draft metadata</div>
        <div>Resource UID: {draft.resourceUid}</div>
        <div>Status: {draft.status}</div>
        <div>Owner: {draft.ownerName}</div>
        <div>Base version: v{draft.baseVersionNo}</div>
      </div>

      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Draft payload</div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
          This is a governed draft view. Users can inspect and save draft content here without being sent back to Grafana native edit.
        </div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{raw}</pre>
      </div>
    </div>
  );
};
