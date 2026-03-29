import React from 'react';
import { useLocation } from 'react-router-dom';
import { locationService } from '@grafana/runtime';
import { Button, HorizontalGroup } from '@grafana/ui';

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const navItems = [
  { label: 'Drafts', path: '/a/rody-grafanacontrol-app/drafts' },
  { label: 'Publish Center', path: '/a/rody-grafanacontrol-app/publish-center' },
  { label: 'Conflict Resolve', path: '/a/rody-grafanacontrol-app/conflict' },
  { label: 'Governance', path: '/a/rody-grafanacontrol-app/governance' },
  { label: 'Datasource Changes', path: '/a/rody-grafanacontrol-app/datasource-changes' },
];

export const PlatformPageLayout: React.FC<Props> = ({ title, description, actions, children }) => {
  const location = useLocation();

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ borderBottom: '1px solid var(--border-weak)', paddingBottom: 12 }}>
        <HorizontalGroup justify="space-between" align="center">
          <div>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {description && <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{description}</div>}
          </div>
          {actions}
        </HorizontalGroup>
      </div>

      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 12 }}>
        <HorizontalGroup wrap>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={active ? 'primary' : 'secondary'}
                onClick={() => locationService.push(item.path)}
              >
                {item.label}
              </Button>
            );
          })}
        </HorizontalGroup>
      </div>

      {children}
    </div>
  );
};
