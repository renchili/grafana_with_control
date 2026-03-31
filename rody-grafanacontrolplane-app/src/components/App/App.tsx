import React from 'react';
import { locationService } from '@grafana/runtime';
import { DraftsPage } from '../../pages/DraftsPage';
import { PublishCenterPage } from '../../pages/PublishCenterPage';
import { ConflictResolvePage } from '../../pages/ConflictResolvePage';
import { GovernancePage } from '../../pages/GovernancePage';
import { DatasourceChangesPage } from '../../pages/DatasourceChangesPage';
import { DraftDetailPage } from '../../pages/DraftDetailPage';
import { ResourceDefinitionPage } from '../../pages/ResourceDefinitionPage';

type AppProps = {
  path?: string;
};

const navItems = [
  { label: 'Drafts', path: '/a/rody-grafanacontrolplane-app/drafts' },
  { label: 'Publish Center', path: '/a/rody-grafanacontrolplane-app/publish-center' },
  { label: 'Conflict Resolve', path: '/a/rody-grafanacontrolplane-app/conflict-resolve' },
  { label: 'Governance', path: '/a/rody-grafanacontrolplane-app/governance' },
  { label: 'Datasource Changes', path: '/a/rody-grafanacontrolplane-app/datasource-changes' },
];

export const App = ({ path = '/a/rody-grafanacontrolplane-app/drafts' }: AppProps) => {
  const normalizedPath = path.replace(/\/+$/, '') || '/a/rody-grafanacontrolplane-app';

  const renderPage = () => {
    if (normalizedPath.includes('/draft/')) {
      const draftId = normalizedPath.split('/draft/')[1] || '0';
      return <DraftDetailPage draftId={draftId} />;
    }
    if (normalizedPath.includes('/resource/')) {
      const uid = normalizedPath.split('/resource/')[1] || '';
      return <ResourceDefinitionPage uid={uid} />;
    }
    if (normalizedPath.includes('/publish-center')) {
      return <PublishCenterPage />;
    }
    if (normalizedPath.includes('/conflict-resolve')) {
      return <ConflictResolvePage />;
    }
    if (normalizedPath.includes('/governance')) {
      return <GovernancePage />;
    }
    if (normalizedPath.includes('/datasource-changes')) {
      return <DatasourceChangesPage />;
    }
    return <DraftsPage />;
  };

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Grafana Control Plane</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          Grafana = Data Plane · Platform = Control Plane
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
                height: 36,
                padding: '0 14px',
                borderRadius: 6,
                border: '1px solid var(--border-weak)',
                background: active ? '#3274d9' : 'var(--panel-bg)',
                color: active ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {renderPage()}
    </div>
  );
};
