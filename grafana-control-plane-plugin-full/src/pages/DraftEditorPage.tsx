import React from 'react';
import { PluginPage, locationService } from '@grafana/runtime';
import { Alert, Button, HorizontalGroup, Spinner } from '@grafana/ui';
import { useParams } from 'react-router-dom';
import { PlatformPageLayout } from '../components/layout/PlatformPageLayout';
import { useDraftDetail } from '../hooks/useDraftDetail';
import { DraftPanelEditor } from '../components/draft/DraftPanelEditor';

export const DraftEditorPage: React.FC = () => {
  const { draftId = '0' } = useParams<{ draftId: string }>();
  const numericDraftId = Number(draftId);
  const { data, loading, error, reload, saveDraft, publishDraft, abandonDraft, saving, publishing, abandoning } = useDraftDetail(numericDraftId);

  return (
    <PluginPage>
      <PlatformPageLayout
        title={data?.title || `Draft ${draftId}`}
        description={data ? `Governed draft editor · owner ${data.ownerName} · base version v${data.baseVersionNo}` : 'Governed draft editor'}
        actions={
          <HorizontalGroup>
            {data?.resourceUid && (
              <Button variant="secondary" onClick={() => locationService.push(`/a/rody-grafanacontrol-app/resource/${data.resourceUid}`)}>
                View definition
              </Button>
            )}
            <Button variant="secondary" onClick={() => saveDraft()} disabled={saving || !data}>
              {saving ? 'Saving...' : 'Save draft'}
            </Button>
            <Button onClick={() => publishDraft()} disabled={publishing || !data}>
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
            <Button variant="destructive" onClick={() => abandonDraft()} disabled={abandoning || !data}>
              {abandoning ? 'Abandoning...' : 'Abandon'}
            </Button>
            <Button variant="secondary" onClick={() => reload()}>Refresh</Button>
          </HorizontalGroup>
        }
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={32} /></div>
        ) : error ? (
          <Alert title="Draft unavailable" severity="warning">{error}</Alert>
        ) : !data ? (
          <Alert title="Draft not found" severity="warning">No governed draft details were returned for {draftId}.</Alert>
        ) : (
          <DraftPanelEditor draft={data} saving={saving} onSave={saveDraft} />
        )}
      </PlatformPageLayout>
    </PluginPage>
  );
};
