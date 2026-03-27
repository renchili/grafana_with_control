import React from 'react';

export const ConflictPathList: React.FC<{ paths: string[] }> = ({ paths }) => (
  <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 12 }}>
    <div style={{ fontWeight: 600, marginBottom: 10 }}>Conflict paths</div>
    {paths.length === 0 ? (
      <div style={{ color: 'var(--text-secondary)' }}>No conflicting paths</div>
    ) : (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {paths.map((path) => (
          <li key={path} style={{ marginBottom: 6, wordBreak: 'break-all' }}>
            <code>{path}</code>
          </li>
        ))}
      </ul>
    )}
  </div>
);
