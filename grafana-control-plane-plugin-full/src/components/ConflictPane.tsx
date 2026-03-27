import React from 'react';
import { CodeEditor } from '@grafana/ui';

interface ConflictPaneProps {
  title: string;
  value: Record<string, unknown>;
  highlightPaths?: string[];
  tone?: 'base' | 'yours' | 'theirs';
}

export const ConflictPane: React.FC<ConflictPaneProps> = ({ title, value, highlightPaths = [], tone = 'base' }) => {
  const borderColor =
    tone === 'yours'
      ? 'var(--color-success-border-weak)'
      : tone === 'theirs'
      ? 'var(--color-warning-border-weak)'
      : 'var(--border-weak)';

  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden', background: 'var(--panel-bg)', minHeight: 520, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-weak)', fontWeight: 600 }}>
        {title}
      </div>
      <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
        Highlighted paths: {highlightPaths.length ? highlightPaths.join(', ') : 'None'}
      </div>
      <div style={{ flex: 1 }}>
        <CodeEditor language="json" value={JSON.stringify(value, null, 2)} readOnly showLineNumbers height="100%" />
      </div>
    </div>
  );
};
