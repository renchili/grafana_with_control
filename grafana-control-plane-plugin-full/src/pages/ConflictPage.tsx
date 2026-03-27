import React from 'react';
import { PluginPage, locationService } from '@grafana/runtime';
import { Alert, Button, HorizontalGroup, Spinner, VerticalGroup } from '@grafana/ui';
import { useConflict } from '../hooks/useConflict';
import { ConflictMetaBar } from '../components/ConflictMetaBar';
import { ConflictDiffColumns } from '../components/ConflictDiffColumns';
import { ConflictPathList } from '../components/ConflictPathList';
import { ConflictActionBar } from '../components/ConflictActionBar';

function getDraftIdFromLocation(): number {
  const search = locationService.getSearchObject();
  return Number(search.draftId || 0);
}

export const ConflictPage: React.FC = () => {
  const draftId = getDraftIdFromLocation();
  const { loading, error, data, acting, reload, runAction } = useConflict(draftId);

  return (
    <PluginPage>
      <VerticalGroup spacing="md">
        <HorizontalGroup justify="space-between">
          <div>
            <h2 style={{ margin: 0 }}>Conflict Resolve</h2>
            <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
              Resolve version mismatch without losing your draft.
            </div>
          </div>
          <Button variant="secondary" onClick={() => reload()}>Refresh</Button>
        </HorizontalGroup>

        {loading && <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={32} /></div>}
        {error && <Alert title="Failed to load conflict" severity="error">{error}</Alert>}

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
    </PluginPage>
  );
};
