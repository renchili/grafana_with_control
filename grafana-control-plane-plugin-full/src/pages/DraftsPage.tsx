import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { Alert, Button, HorizontalGroup, Spinner, VerticalGroup } from '@grafana/ui';
import { DraftTable } from '../components/DraftTable';
import { useDrafts } from '../hooks/useDrafts';

export const DraftsPage: React.FC = () => {
  const { data, loading, error, reload, publish, abandon, actingDraftId } = useDrafts();

  return (
    <PluginPage>
      <VerticalGroup spacing="md">
        <HorizontalGroup justify="space-between">
          <div>
            <h2 style={{ margin: 0 }}>Drafts</h2>
            <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              Resume, publish, or resolve governed drafts.
            </div>
          </div>
          <Button variant="secondary" onClick={() => reload()}>Refresh</Button>
        </HorizontalGroup>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={32} /></div>
        ) : error ? (
          <div
            style={{
              border: '1px solid var(--border-weak)',
              borderRadius: 8,
              background: 'var(--panel-bg)',
              padding: 20,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Service temporarily unavailable</h3>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              We can’t load governed drafts right now because the backend service is unavailable or not configured.
            </div>
            <HorizontalGroup>
              <Button onClick={() => reload()}>Try again</Button>
            </HorizontalGroup>
            <div style={{ marginTop: 16 }}>
              <details>
                <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Show technical details</summary>
                <Alert title="Drafts unavailable" severity="warning">
                  {error}
                </Alert>
              </details>
            </div>
          </div>
        ) : (
          <DraftTable data={data} actingDraftId={actingDraftId} onPublish={publish} onAbandon={abandon} />
        )}
      </VerticalGroup>
    </PluginPage>
  );
};
