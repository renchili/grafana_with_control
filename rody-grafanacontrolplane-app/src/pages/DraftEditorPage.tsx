import React, { useEffect, useMemo, useState } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';

type QueryDefinition = {
  refId: string;
  datasource?: string;
  expression: string;
};

type GridPos = {
  h?: number;
  w?: number;
  x?: number;
  y?: number;
};

type PanelDefinition = {
  id: number;
  title: string;
  type: string;
  datasource?: string;
  queries: QueryDefinition[];
  rawModel?: Record<string, unknown>;
};

type DraftDetail = {
  draftId: number;
  resourceUid: string;
  title: string;
  ownerName: string;
  status: string;
  baseVersionNo: number;
  governanceMode: string;
  panels: PanelDefinition[];
  rawDraft?: Record<string, unknown>;
};

type LayoutRow = {
  id: number;
  title: string;
  type: string;
  datasource?: string;
  expr: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

function extractRows(detail: DraftDetail): LayoutRow[] {
  const rawDraft = detail.rawDraft ?? {};
  const rawPanels = Array.isArray(rawDraft.panels) ? (rawDraft.panels as Array<Record<string, unknown>>) : [];

  if (rawPanels.length > 0) {
    return rawPanels.map((panel, idx) => {
      const gridPos = ((panel.gridPos as GridPos | undefined) ?? {}) as GridPos;
      const targets = Array.isArray(panel.targets) ? (panel.targets as Array<Record<string, unknown>>) : [];
      const firstTarget = targets[0] ?? {};
      return {
        id: Number(panel.id ?? idx + 1),
        title: String(panel.title ?? `Panel ${idx + 1}`),
        type: String(panel.type ?? 'timeseries'),
        datasource:
          typeof panel.datasource === 'string'
            ? panel.datasource
            : typeof firstTarget.datasource === 'string'
              ? String(firstTarget.datasource)
              : undefined,
        expr: String(firstTarget.expr ?? firstTarget.rawSql ?? ''),
        x: Number(gridPos.x ?? (idx % 2 === 0 ? 0 : 12)),
        y: Number(gridPos.y ?? Math.floor(idx / 2) * 8),
        w: Number(gridPos.w ?? 12),
        h: Number(gridPos.h ?? 8),
      };
    });
  }

  return (detail.panels ?? []).map((panel, idx) => ({
    id: Number(panel.id ?? idx + 1),
    title: panel.title ?? `Panel ${idx + 1}`,
    type: panel.type ?? 'timeseries',
    datasource: panel.datasource,
    expr: panel.queries?.[0]?.expression ?? '',
    x: idx % 2 === 0 ? 0 : 12,
    y: Math.floor(idx / 2) * 8,
    w: 12,
    h: 8,
  }));
}

function applyRowsToRawDraft(
  previousRawDraft: Record<string, unknown> | undefined,
  draft: DraftDetail,
  rows: LayoutRow[]
): Record<string, unknown> {
  const base = { ...(previousRawDraft ?? {}) };

  const panels = rows.map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    datasource: row.datasource ?? 'grafana',
    gridPos: {
      x: row.x,
      y: row.y,
      w: row.w,
      h: row.h,
    },
    targets: [
      {
        refId: 'A',
        expr: row.expr,
      },
    ],
  }));

  return {
    ...base,
    title: draft.title,
    resourceUid: draft.resourceUid,
    governanceMode: draft.governanceMode,
    panels,
  };
}

export const DraftEditorPage: React.FC<{ draftId?: string }> = ({ draftId = '0' }) => {
  const [data, setData] = useState<DraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rawDraftText, setRawDraftText] = useState('');
  const [rows, setRows] = useState<LayoutRow[]>([]);

  const syncJsonFromRows = (nextRows: LayoutRow[], nextData?: DraftDetail | null, currentRawText?: string) => {
    const sourceData = nextData ?? data;
    if (!sourceData) {
      return;
    }

    let previousRawDraft: Record<string, unknown> | undefined = {};
    try {
      previousRawDraft = currentRawText ? (JSON.parse(currentRawText) as Record<string, unknown>) : {};
    } catch {
      previousRawDraft = {};
    }

    const nextRawDraft = applyRowsToRawDraft(previousRawDraft, sourceData, nextRows);
    setRawDraftText(JSON.stringify(nextRawDraft, null, 2));
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      setData(json);
      const extracted = extractRows(json);
      setRows(extracted);
      const pretty = JSON.stringify(json.rawDraft ?? applyRowsToRawDraft({}, json, extracted), null, 2);
      setRawDraftText(pretty);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load draft');
      setData(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const formatJson = () => {
    try {
      const parsed = rawDraftText ? JSON.parse(rawDraftText) : {};
      setRawDraftText(JSON.stringify(parsed, null, 2));
      setError('');
    } catch {
      setError('Invalid JSON in draft payload');
    }
  };

  const syncRowsFromJson = () => {
    try {
      if (!data) {
        return;
      }
      const parsed = rawDraftText ? (JSON.parse(rawDraftText) as Record<string, unknown>) : {};
      const merged: DraftDetail = {
        ...data,
        rawDraft: parsed,
      };
      const extracted = extractRows(merged);
      setRows(extracted);
      setNotice('Layout canvas synced from JSON');
      setError('');
    } catch {
      setError('Invalid JSON in draft payload');
    }
  };

  const updateRow = (panelId: number, patch: Partial<LayoutRow>) => {
    setRows((prev) => {
      const next = prev.map((row) => (row.id === panelId ? { ...row, ...patch } : row));
      syncJsonFromRows(next, data, rawDraftText);
      return next;
    });
  };

  const onLayoutChange = (layout: Layout[]) => {
    setRows((prev) => {
      const layoutMap = new Map(layout.map((item) => [Number(item.i), item]));
      const next = prev.map((row) => {
        const item = layoutMap.get(row.id);
        if (!item) {
          return row;
        }
        return {
          ...row,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        };
      });
      syncJsonFromRows(next, data, rawDraftText);
      return next;
    });
  };

  const saveDraft = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = rawDraftText ? (JSON.parse(rawDraftText) as Record<string, unknown>) : {};
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      setData(json);
      const extracted = extractRows(json);
      setRows(extracted);
      setRawDraftText(JSON.stringify(json.rawDraft ?? applyRowsToRawDraft({}, json, extracted), null, 2));
      setNotice('Draft saved successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const publishDraft = async () => {
    setPublishing(true);
    setError('');
    setNotice('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}/publish`, {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      setNotice('Draft published successfully');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish draft');
    } finally {
      setPublishing(false);
    }
  };

  const abandonDraft = async () => {
    setAbandoning(true);
    setError('');
    setNotice('');
    try {
      const resp = await fetch(`/api/platform/v1/drafts/${draftId}/abandon`, {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      setNotice('Draft abandoned successfully');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to abandon draft');
    } finally {
      setAbandoning(false);
    }
  };

  useEffect(() => {
    void load();
  }, [draftId]);

  const gridLayout = useMemo<Layout[]>(
    () =>
      rows.map((row) => ({
        i: String(row.id),
        x: row.x,
        y: row.y,
        w: row.w,
        h: row.h,
        minW: 4,
        minH: 4,
      })),
    [rows]
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <style>{`
        .layout-canvas {
          background: transparent;
        }
        .layout-canvas .react-grid-item {
          transition: all 180ms ease;
        }
        .layout-canvas .react-grid-item.react-grid-placeholder {
          background: rgba(50, 116, 217, 0.25);
          border: 1px dashed rgba(50, 116, 217, 0.8);
          border-radius: 8px;
        }
        .layout-canvas .react-resizable-handle {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }
      `}</style>

      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>{data?.title || `Draft ${draftId}`}</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          {data
            ? `Owner ${data.ownerName} · base version v${data.baseVersionNo} · status ${data.status}`
            : 'Governed draft editor'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => void load()} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Refresh
        </button>
        <button type="button" onClick={formatJson} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Format JSON
        </button>
        <button type="button" onClick={syncRowsFromJson} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Sync Canvas From JSON
        </button>
        <button type="button" onClick={() => void saveDraft()} style={{ padding: '8px 12px', cursor: 'pointer' }} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={() => void publishDraft()} style={{ padding: '8px 12px', cursor: 'pointer' }} disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
        <button type="button" onClick={() => void abandonDraft()} style={{ padding: '8px 12px', cursor: 'pointer' }} disabled={abandoning}>
          {abandoning ? 'Abandoning...' : 'Abandon'}
        </button>
      </div>

      {notice && (
        <div style={{ border: '1px solid #299c46', borderRadius: 8, padding: 12, color: '#299c46' }}>
          {notice}
        </div>
      )}

      {loading && <div>Loading draft…</div>}

      {!loading && error && (
        <div style={{ border: '1px solid #d44a3a', borderRadius: 8, padding: 12 }}>
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Layout Canvas</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              Drag panels to move them. Drag the bottom-right handle to resize. Changes sync into the draft JSON automatically.
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 960 }}>
                <GridLayout
                  className="layout-canvas"
                  layout={gridLayout}
                  cols={24}
                  rowHeight={30}
                  width={960}
                  margin={[12, 12]}
                  containerPadding={[0, 0]}
                  isDraggable
                  isResizable
                  onLayoutChange={onLayoutChange}
                >
                  {rows.map((row) => (
                    <div key={String(row.id)}>
                      <div
                        style={{
                          height: '100%',
                          border: '1px solid var(--border-weak)',
                          borderRadius: 8,
                          background: 'var(--panel-bg)',
                          padding: 12,
                          display: 'grid',
                          gap: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <div style={{ fontWeight: 600 }}>{row.title}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          {row.type} · {row.datasource || 'default'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                          x={row.x} y={row.y} w={row.w} h={row.h}
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontSize: 12,
                            overflow: 'hidden',
                          }}
                        >
                          {row.expr}
                        </pre>
                      </div>
                    </div>
                  ))}
                </GridLayout>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Panel Properties</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {rows.map((row) => (
                <div
                  key={row.id}
                  style={{
                    border: '1px solid var(--border-weak)',
                    borderRadius: 8,
                    padding: 12,
                    display: 'grid',
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    Panel #{row.id} · {row.title}
                  </div>

                  <label style={{ display: 'grid', gap: 4 }}>
                    <span>Title</span>
                    <input
                      value={row.title}
                      onChange={(e) => updateRow(row.id, { title: e.currentTarget.value })}
                      style={{ padding: '8px 12px' }}
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(70px, 1fr))', gap: 8 }}>
                    {(['x', 'y', 'w', 'h'] as const).map((field) => (
                      <label key={field} style={{ display: 'grid', gap: 4 }}>
                        <span>{field}</span>
                        <input
                          type="number"
                          value={row[field]}
                          onChange={(e) => updateRow(row.id, { [field]: Number(e.currentTarget.value) } as Partial<LayoutRow>)}
                          style={{ padding: '8px 12px' }}
                        />
                      </label>
                    ))}
                  </div>

                  <label style={{ display: 'grid', gap: 4 }}>
                    <span>Main Query Expression</span>
                    <textarea
                      value={row.expr}
                      onChange={(e) => updateRow(row.id, { expr: e.currentTarget.value })}
                      style={{ width: '100%', minHeight: 120, fontFamily: 'monospace', fontSize: 13 }}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Editable Draft Payload JSON</div>
            <textarea
              value={rawDraftText}
              onChange={(e) => setRawDraftText(e.currentTarget.value)}
              style={{ width: '100%', minHeight: 420, fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>
        </>
      )}
    </div>
  );
};
