import React from 'react';
import { locationService } from '@grafana/runtime';
import { DraftsPage } from '../../pages/DraftsPage';
import { ResourceReadonlyPage } from '../../pages/ResourceReadonlyPage';
import { DraftEditorPage } from '../../pages/DraftEditorPage';

type AppProps = {
  path?: string;
};

const navItems = [
  { label: 'Drafts', path: '/a/rody-grafanacontrolplane-app/drafts' },
  { label: 'Resource', path: '/a/rody-grafanacontrolplane-app/resource/cpu-overview' },
];

export const App = ({ path = '/a/rody-grafanacontrolplane-app/drafts' }: AppProps) => {
  const normalizedPath = path.replace(/\/+$/, '') || '/a/rody-grafanacontrolplane-app';
  const isResource = normalizedPath.includes('/resource/');
  const isDraft = normalizedPath.includes('/draft/');
  const uid = isResource ? normalizedPath.split('/resource/')[1] || 'cpu-overview' : 'cpu-overview';
  const draftId = isDraft ? normalizedPath.split('/draft/')[1] || '0' : '0';

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0 }}>Grafana Control Plane</h2>
        <div style={{ color: 'var(--text-secondary)' }}>
          Governed drafts and controlled publish workflow
        </div>
      </div>

      <div
        style={{
          border: '1px solid var(--border-weak)',
          borderRadius: 8,
          background: 'var(--panel-bg)',
          padding: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {navItems.map((item) => {
          const active = normalizedPath === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => locationService.push(item.path)}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-weak)',
                background: active ? '#3274d9' : 'var(--panel-bg)',
                color: active ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {isDraft ? <DraftEditorPage draftId={draftId} /> : isResource ? <ResourceReadonlyPage uid={uid} /> : <DraftsPage />}
    </div>
  );
};
