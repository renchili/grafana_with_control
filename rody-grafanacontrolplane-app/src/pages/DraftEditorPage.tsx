import React, { useEffect, useMemo, useState } from 'react';

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
  x: number;
  y: number;
  w: number;
  h: number;
};

function extractPanelsFromRawDraft(rawDraft: Record<string, unknown> | undefined, fallbackPanels: PanelDefinition[]): LayoutRow[] {
  const rawPanels = Array.isArray(rawDraft?.panels) ? (rawDraft!.panels as Array<Record<string, unknown>>) : [];
  if (rawPanels.length > 0) {
    return rawPanels.map((panel, idx) => {
      const gridPos = (panel.gridPos ?? {}) as GridPos;
      return {
        id: Number(panel.id ?? idx + 1),
        title: String(panel.title ?? `Panel ${idx + 1}`),
        x: Number(gridPos.x ?? 0),
        y: Number(gridPos.y ?? idx * 8),
        w: Number(gridPos.w ?? 12),
        h: Number(gridPos.h ?? 8),
      };
    });
  }

  return fallbackPanels.map((panel, idx) => ({
    id: Number(panel.id ?? idx + 1),
    title: panel.title ?? `Panel ${idx + 1}`,
    x: idx % 2 === 0 ? 0 : 12,
    y: Math.floor(idx / 2) * 8,
    w: 12,
    h: 8,
  }));
}

function applyLayoutToRawDraft(rawDraft: Record<string, unknown>, layoutRows: LayoutRow[]): Record<string, unknown> {
  const next = { ...rawDraft };
  const currentPanels = Array.isArray(next.panels) ? [...(next.panels as Array<Record<string, unknown>>)] : [];

  const byId = new Map(layoutRows.map((row) => [row.id, row]));

  const updatedPanels = currentPanels.map((panel, idx) => {
    const id = Number(panel.id ?? idx + 1);
    const row = byId.get(id);
    if (!row) {
      return panel;
    }
    return {
      ...panel,
      gridPos: {
        ...((panel.gridPos ?? {}) as Record<string, unknown>),
        x: row.x,
        y: row.y,
        w: row.w,
        h: row.h,
      },
    };
  });

  next.panels = updatedPanels;
  return next;
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
  const [layoutRows, setLayoutRows] = useState<LayoutRow[]>([]);

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
      const pretty = JSON.stringify(json.rawDraft ?? {}, null, 2);
      setRawDraftText(pretty);
      setLayoutRows(extractPanelsFromRawDraft(json.rawDraft ?? {}, json.panels ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load draft');
      setData(null);
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

  const syncLayoutIntoJson = () => {
    try {
      const parsed = rawDraftText ? JSON.parse(rawDraftText) : {};
      const next = applyLayoutToRawDraft(parsed, layoutRows);
      setRawDraftText(JSON.stringify(next, null, 2));
      setNotice('Layout synced into draft JSON');
      setError('');
    } catch {
      setError('Invalid JSON in draft payload');
    }
  };

  const updateLayoutCell = (panelId: number, field: keyof Omit<LayoutRow, 'id' | 'title'>, value: string) => {
    const numeric = Number(value);
    setLayoutRows((rows) =>
      rows.map((row) => (row.id === panelId ? { ...row, [field]: Number.isFinite(numeric) ? numeric : 0 } : row))
    );
  };

  const saveDraft = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      let payload: Record<string, unknown> = {};
      try {
        payload = rawDraftText ? JSON.parse(rawDraftText) : {};
      } catch {
        throw new Error('Invalid JSON in draft payload');
      }
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
      setRawDraftText(JSON.stringify(json.rawDraft ?? {}, null, 2));
      setLayoutRows(extractPanelsFromRawDraft(json.rawDraft ?? {}, json.panels ?? []));
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

  const parsedPreview = useMemo(() => {
    try {
      return rawDraftText ? JSON.parse(rawDraftText) : {};
    } catch {
      return null;
    }
  }, [rawDraftText]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
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
        <button type="button" onClick={syncLayoutIntoJson} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Apply Layout To JSON
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
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Layout Editor</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
              Edit grid position for each panel, then click Apply Layout To JSON, then Save.
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-weak)' }}>
                    <th style={{ padding: 10 }}>Panel</th>
                    <th style={{ padding: 10 }}>x</th>
                    <th style={{ padding: 10 }}>y</th>
                    <th style={{ padding: 10 }}>w</th>
                    <th style={{ padding: 10 }}>h</th>
                  </tr>
                </thead>
                <tbody>
                  {layoutRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border-weak)' }}>
                      <td style={{ padding: 10 }}>
                        <div style={{ fontWeight: 600 }}>{row.title}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>panel #{row.id}</div>
                      </td>
                      {(['x', 'y', 'w', 'h'] as const).map((field) => (
                        <td key={field} style={{ padding: 10 }}>
                          <input
                            type="number"
                            value={row[field]}
                            onChange={(e) => updateLayoutCell(row.id, field, e.currentTarget.value)}
                            style={{
                              width: 80,
                              padding: '6px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border-weak)',
                              background: 'var(--panel-bg)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Panels</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {data.panels.map((panel) => (
                <div key={panel.id} style={{ border: '1px solid var(--border-weak)', borderRadius: 6, padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{panel.title}</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                    Type: {panel.type} · Datasource: {panel.datasource || 'default'}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    {panel.queries.map((query) => (
                      <div key={query.refId} style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Query {query.refId}</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {query.expression}
                        </pre>
                      </div>
                    ))}
                  </div>
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

          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>JSON Preview Status</div>
            <div style={{ color: parsedPreview ? '#299c46' : '#d44a3a' }}>
              {parsedPreview ? 'Draft JSON is valid' : 'Draft JSON is invalid'}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
