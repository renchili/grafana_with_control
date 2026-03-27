import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { Button, HorizontalGroup, Spinner, VerticalGroup } from '@grafana/ui';
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
          <div style={{ color: 'var(--color-error-text)' }}>{error}</div>
        ) : (
          <DraftTable data={data} actingDraftId={actingDraftId} onPublish={publish} onAbandon={abandon} />
        )}
      </VerticalGroup>
    </PluginPage>
  );
};
