import React from 'react';
import { PluginPage, locationService } from '@grafana/runtime';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DraftsPage } from './pages/DraftsPage';
import { ResourceReadonlyPage } from './pages/ResourceReadonlyPage';

const navItems = [
  { label: 'Drafts', path: '/a/rody-grafanacontrolplane-app/drafts' },
  { label: 'Resource', path: '/a/rody-grafanacontrolplane-app/resource/demo-dashboard' },
];

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <PluginPage>
      <div style={{ padding: 20, display: 'grid', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Grafana Control Plane</h2>
          <div style={{ color: 'var(--text-secondary)' }}>
            Governed drafts and controlled publish workflow
          </div>
        </div>

        <div style={{
          border: '1px solid var(--border-weak)',
          borderRadius: 8,
          background: 'var(--panel-bg)',
          padding: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
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

        {children}
      </div>
    </PluginPage>
  );
}

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="drafts" replace />} />
      <Route
        path="drafts"
        element={
          <AppLayout>
            <DraftsPage />
          </AppLayout>
        }
      />
      <Route
        path="resource/:uid"
        element={
          <AppLayout>
            <ResourceReadonlyPage />
          </AppLayout>
        }
      />
    </Routes>
  );
};
