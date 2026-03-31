import React, { useEffect, useState } from 'react';

type QueryDefinition = {
  refId: string;
  datasource?: string;
  expression: string;
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

export const DraftEditorPage: React.FC<{ draftId?: string }> = ({ draftId = '0' }) => {
  const [data, setData] = useState<DraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rawDraftText, setRawDraftText] = useState('');

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
      setRawDraftText(JSON.stringify(json.rawDraft ?? {}, null, 2));
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
    } catch (e) {
      setError('Invalid JSON in draft payload');
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      let payload: Record<string, unknown> = {};
      try {
        payload = rawDraftText ? JSON.parse(rawDraftText) : {};
      } catch (e) {
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
        <button type="button" onClick={() => void formatJson()} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Format JSON
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
        </>
      )}
    </div>
  );
};
