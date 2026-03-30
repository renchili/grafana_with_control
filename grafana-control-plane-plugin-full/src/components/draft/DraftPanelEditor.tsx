import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, HorizontalGroup, TextArea } from '@grafana/ui';
import { DraftDetail } from '../../types/resource';

interface Props {
  draft?: DraftDetail;
  saving?: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}

const safeStringify = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const parseJsonField = (label: string, raw: string) => {
  try {
    return { ok: true as const, value: JSON.parse(raw) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? `${label}: ${error.message}` : `${label}: invalid JSON`,
    };
  }
};

export const DraftPanelEditor: React.FC<Props> = ({ draft, saving = false, onSave }) => {
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [queryExpression, setQueryExpression] = useState('');
  const [fieldConfigText, setFieldConfigText] = useState('{}');
  const [rawPanelText, setRawPanelText] = useState('{}');
  const [error, setError] = useState<string | undefined>();

  const panels = draft?.panels ?? [];
  const selectedPanel = panels[selectedPanelIndex];

  useEffect(() => {
    setSelectedPanelIndex(0);
  }, [draft?.draftId]);

  useEffect(() => {
    if (!selectedPanel) {
      setTitle('');
      setQueryExpression('');
      setFieldConfigText('{}');
      setRawPanelText('{}');
      return;
    }

    setTitle(selectedPanel.title ?? '');
    setQueryExpression(selectedPanel.queries?.[0]?.expression ?? '');
    setFieldConfigText(safeStringify(selectedPanel.fieldConfig ?? {}));
    setRawPanelText(safeStringify(selectedPanel.rawModel ?? {}));
    setError(undefined);
  }, [selectedPanel]);

  const rawDraftPreview = useMemo(() => safeStringify(draft?.rawDraft ?? draft ?? {}), [draft]);

  if (!draft) {
    return <div style={{ color: 'var(--text-secondary)' }}>Draft not found.</div>;
  }

  const handleSave = async () => {
    if (!selectedPanel) {
      return;
    }

    const parsedFieldConfig = parseJsonField('Field config', fieldConfigText);
    if (!parsedFieldConfig.ok) {
      setError(parsedFieldConfig.error);
      return;
    }

    const parsedRawPanel = parseJsonField('Panel raw JSON', rawPanelText);
    if (!parsedRawPanel.ok) {
      setError(parsedRawPanel.error);
      return;
    }

    const nextPanels = panels.map((panel, index) => {
      if (index !== selectedPanelIndex) {
        return panel;
      }

      const firstQuery = panel.queries?.[0] ?? { refId: 'A', datasource: panel.datasource, expression: '' };
      return {
        ...panel,
        title,
        fieldConfig: parsedFieldConfig.value,
        rawModel: parsedRawPanel.value,
        queries: [
          {
            ...firstQuery,
            expression: queryExpression,
          },
          ...(panel.queries?.slice(1) ?? []),
        ],
      };
    });

    const payload = {
      draftId: draft.draftId,
      resourceUid: draft.resourceUid,
      title: draft.title,
      ownerName: draft.ownerName,
      status: draft.status,
      baseVersionNo: draft.baseVersionNo,
      governanceMode: draft.governanceMode,
      panels: nextPanels,
      rawDraft: {
        ...(typeof draft.rawDraft === 'object' && draft.rawDraft !== null ? (draft.rawDraft as Record<string, unknown>) : {}),
        panels: nextPanels,
      },
    };

    setError(undefined);
    await onSave(payload);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Governed draft metadata</div>
        <div>Resource UID: {draft.resourceUid}</div>
        <div>Status: {draft.status}</div>
        <div>Owner: {draft.ownerName}</div>
        <div>Base version: v{draft.baseVersionNo}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Panels</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {panels.map((panel, index) => (
              <Button
                key={panel.id}
                variant={index === selectedPanelIndex ? 'primary' : 'secondary'}
                fill="text"
                onClick={() => setSelectedPanelIndex(index)}
              >
                {panel.title || `Panel ${panel.id}`} · {panel.type}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
            <HorizontalGroup justify="space-between">
              <div>
                <div style={{ fontWeight: 600 }}>{selectedPanel?.title || 'Panel editor'}</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                  Edit panel definition in draft only. Native Grafana save is still bypassed.
                </div>
              </div>
              <Button onClick={() => void handleSave()} disabled={saving || !selectedPanel}>
                {saving ? 'Saving…' : 'Save panel draft'}
              </Button>
            </HorizontalGroup>
          </div>

          {error && <Alert title="Cannot save panel draft" severity="warning">{error}</Alert>}

          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <TextArea
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
                rows={2}
                placeholder="Panel title"
              />
              <TextArea
                value={queryExpression}
                onChange={(event) => setQueryExpression(event.currentTarget.value)}
                rows={8}
                placeholder="Query expression"
              />
              <TextArea
                value={fieldConfigText}
                onChange={(event) => setFieldConfigText(event.currentTarget.value)}
                rows={10}
                placeholder="Field config JSON"
              />
              <TextArea
                value={rawPanelText}
                onChange={(event) => setRawPanelText(event.currentTarget.value)}
                rows={14}
                placeholder="Panel raw JSON"
              />
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Current raw draft payload</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rawDraftPreview}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
