import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { PlatformPageLayout } from '../components/layout/PlatformPageLayout';

export const DatasourceChangesPage: React.FC = () => {
  return (
    <PluginPage>
      <PlatformPageLayout
        title="Datasource Changes"
        description="Prepare governed datasource edits with validation, rendered output, and controlled publish steps."
      >
        <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Frontend shell ready</h3>
          <div style={{ color: 'var(--text-secondary)' }}>
            This module is wired into the app navigation and ready for datasource forms, validation banners, YAML previews, and action flows.
          </div>
        </div>
      </PlatformPageLayout>
    </PluginPage>
  );
};
