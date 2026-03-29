import React from 'react';
import { PluginPage } from '@grafana/runtime';
import { Button, Spinner, VerticalGroup } from '@grafana/ui';
import { DraftTable } from '../components/DraftTable';
import { useDrafts } from '../hooks/useDrafts';
import { PlatformPageLayout } from '../components/layout/PlatformPageLayout';
import { UnavailableState } from '../components/common/UnavailableState';

export const DraftsPage: React.FC = () => {
  const { data, loading, error, reload, publish, abandon, actingDraftId } = useDrafts();

  return (
    <PluginPage>
      <PlatformPageLayout
        title="Drafts"
        description="Resume, publish, or resolve governed drafts."
        actions={<Button variant="secondary" onClick={() => reload()}>Refresh</Button>}
      >
        <VerticalGroup spacing="md">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={32} /></div>
          ) : error ? (
            <UnavailableState
              title="Service temporarily unavailable"
              message="We can’t load governed drafts right now because the backend service is unavailable or not configured."
              technicalDetails={error}
              onRetry={() => reload()}
            />
          ) : (
            <DraftTable data={data} actingDraftId={actingDraftId} onPublish={publish} onAbandon={abandon} />
          )}
        </VerticalGroup>
      </PlatformPageLayout>
    </PluginPage>
  );
};
