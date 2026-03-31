import React from 'react';
import { locationService } from '@grafana/runtime';
import { DraftsPage } from '../../pages/DraftsPage';
import { PublishCenterPage } from '../../pages/PublishCenterPage';
import { ConflictResolvePage } from '../../pages/ConflictResolvePage';
import { GovernancePage } from '../../pages/GovernancePage';
import { DatasourceChangesPage } from '../../pages/DatasourceChangesPage';

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

const pageWrap: React.CSSProperties = {
  padding: 20,
  display: 'grid',
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border-weak)',
  borderRadius: 8,
  background: 'var(--panel-bg)',
  padding: 16,
};

const navButtonStyle = (active: boolean): React.CSSProperties => ({
  height: 36,
  padding: '0 14px',
  borderRadius: 6,
  border: '1px solid var(--border-weak)',
  background: active ? '#3274d9' : 'var(--panel-bg)',
  color: active ? '#fff' : 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
});

export const App = ({ path = '/a/rody-grafanacontrolplane-app/drafts' }: AppProps) => {
  const normalizedPath = path.replace(/\/+$/, '') || '/a/rody-grafanacontrolplane-app';

  const renderPage = () => {
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
    <div style={pageWrap}>
      <div style={cardStyle}>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>Grafana Control Plane</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          Grafana = Data Plane · Platform = Control Plane
        </div>
      </div>

      <div
        style={{
          ...cardStyle,
          padding: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {navItems.map((item) => {
          const active = normalizedPath === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => locationService.push(item.path)}
              style={navButtonStyle(active)}
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
