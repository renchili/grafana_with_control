import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { PlatformPageLayout } from '../components/layout/PlatformPageLayout';

export const PublishCenterPage: React.FC = () => {
  return (
    <PluginPage>
      <PlatformPageLayout
        title="Publish Center"
        description="Track governed publish jobs, retries, rollbacks, and delivery status."
      >
        <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 20 }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Frontend shell ready</h3>
          <div style={{ color: 'var(--text-secondary)' }}>
            This module is wired into the app navigation and ready for publish job data, summary cards, and diff actions.
          </div>
        </div>
      </PlatformPageLayout>
    </PluginPage>
  );
};
