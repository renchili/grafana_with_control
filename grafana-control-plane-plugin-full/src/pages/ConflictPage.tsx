import React from 'react';
import { PluginPage, locationService } from '@grafana/runtime';
import { Button, Spinner, VerticalGroup } from '@grafana/ui';
import { useConflict } from '../hooks/useConflict';
import { ConflictMetaBar } from '../components/ConflictMetaBar';
import { ConflictDiffColumns } from '../components/ConflictDiffColumns';
import { ConflictPathList } from '../components/ConflictPathList';
import { ConflictActionBar } from '../components/ConflictActionBar';
import { PlatformPageLayout } from '../components/layout/PlatformPageLayout';
import { UnavailableState } from '../components/common/UnavailableState';

function getDraftIdFromLocation(): number {
  const search = locationService.getSearchObject();
  return Number(search.draftId || 0);
}

export const ConflictPage: React.FC = () => {
  const draftId = getDraftIdFromLocation();
  const { loading, error, data, acting, reload, runAction } = useConflict(draftId);

  return (
    <PluginPage>
      <PlatformPageLayout
        title="Conflict Resolve"
        description="Resolve version mismatch without losing your draft."
        actions={<Button variant="secondary" onClick={() => reload()}>Refresh</Button>}
      >
        <VerticalGroup spacing="md">
          {loading && <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={32} /></div>}

          {!loading && error && (
            <UnavailableState
              title="Service temporarily unavailable"
              message="We can’t load conflict details right now because the backend service is unavailable or not configured."
              technicalDetails={error}
              onRetry={() => reload()}
              secondaryAction={
                <Button variant="secondary" onClick={() => locationService.push('/a/rody-grafanacontrol-app/drafts')}>
                  Back to Drafts
                </Button>
              }
            />
          )}

          {!loading && data && (
            <>
              <ConflictMetaBar data={data} />
              <ConflictDiffColumns data={data} />
              <ConflictPathList paths={data.conflictPaths} />
              <ConflictActionBar
                busy={acting}
                onRebase={async () => { await runAction('rebase'); }}
                onSaveAsCopy={async (payload) => { await runAction('save_as_copy', payload); }}
                onTakeOver={async () => { await runAction('takeover'); }}
              />
            </>
          )}
        </VerticalGroup>
      </PlatformPageLayout>
    </PluginPage>
  );
};
