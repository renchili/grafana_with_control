import React, { useEffect, useMemo, useState } from 'react';
import { PluginPage, locationService } from '@grafana/runtime';
import { Alert, Button, HorizontalGroup, Spinner } from '@grafana/ui';
import { useParams } from 'react-router-dom';
import { PlatformPageLayout } from '../components/layout/PlatformPageLayout';
import { useResourceDefinition } from '../hooks/useResourceDefinition';
import { PanelList } from '../components/resource/PanelList';
import { PanelDefinitionView } from '../components/resource/PanelDefinitionView';

export const ResourceReadonlyPage: React.FC = () => {
  const { uid = '' } = useParams<{ uid: string }>();
  const { data, loading, error, reload, createDraft, creatingDraft } = useResourceDefinition(uid);
  const [selectedPanelId, setSelectedPanelId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!selectedPanelId && data?.panels.length) {
      setSelectedPanelId(data.panels[0].id);
    }
  }, [data, selectedPanelId]);

  const selectedPanel = useMemo(
    () => data?.panels.find((panel) => panel.id === selectedPanelId) ?? data?.panels[0],
    [data, selectedPanelId]
  );

  return (
    <PluginPage>
      <PlatformPageLayout
        title={data?.title || `Resource ${uid}`}
        description={data ? `Readonly governed definition · owner ${data.ownerName} · mode ${data.governanceMode}` : 'Readonly governed definition'}
        actions={
          <HorizontalGroup>
            <Button
              onClick={async () => {
                const result = await createDraft();
                locationService.push(`/a/rody-grafanacontrol-app/draft/${result.draftId}`);
              }}
              disabled={creatingDraft || !uid}
            >
              {creatingDraft ? 'Creating draft...' : data?.hasDraft && data.draftId ? 'Create another draft' : 'Create draft'}
            </Button>
            {data?.draftId && (
              <Button variant="secondary" onClick={() => locationService.push(`/a/rody-grafanacontrol-app/draft/${data.draftId}`)}>
                Open existing draft
              </Button>
            )}
            <Button variant="secondary" onClick={() => reload()}>Refresh</Button>
          </HorizontalGroup>
        }
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={32} /></div>
        ) : error ? (
          <Alert title="Resource definition unavailable" severity="warning">{error}</Alert>
        ) : !data ? (
          <Alert title="Resource not found" severity="warning">No governed resource details were returned for {uid}.</Alert>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
            <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Panels</div>
              <PanelList panels={data.panels} selectedPanelId={selectedPanel?.id} onSelect={setSelectedPanelId} />
            </div>
            <PanelDefinitionView panel={selectedPanel} />
          </div>
        )}
      </PlatformPageLayout>
    </PluginPage>
  );
};
