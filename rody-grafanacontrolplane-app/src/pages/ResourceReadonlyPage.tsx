import React, { useEffect, useMemo, useState } from 'react';

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

type ResourceDefinition = {
  uid: string;
  title: string;
  ownerName: string;
  governanceMode: string;
  publishedVersionNo: number;
  hasDraft: boolean;
  draftId?: number;
  panels: PanelDefinition[];
};

export const ResourceReadonlyPage: React.FC<{ uid?: string }> = ({ uid = 'demo-dashboard' }) => {
  const [data, setData] = useState<ResourceDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState<number | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/platform/v1/resources/${uid}`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resource');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [uid]);

  useEffect(() => {
    if (!selectedPanelId && data?.panels?.length) {
      setSelectedPanelId(data.panels[0].id);
    }
  }, [data, selectedPanelId]);

  const selectedPanel = useMemo(
    () => data?.panels.find((p) => p.id === selectedPanelId) ?? data?.panels?.[0],
    [data, selectedPanelId]
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>{data?.title || `Resource ${uid}`}</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          {data
            ? `Readonly governed definition · owner ${data.ownerName} · mode ${data.governanceMode}`
            : 'Readonly governed definition'}
        </div>
      </div>

      <div>
        <button type="button" onClick={() => void load()} style={{ padding: '8px 12px', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>

      {loading && <div>Loading resource…</div>}

      {!loading && error && (
        <div style={{ border: '1px solid #d44a3a', borderRadius: 8, padding: 12 }}>
          Failed to load resource: {error}
        </div>
      )}

      {!loading && !error && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Panels</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {data.panels.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  onClick={() => setSelectedPanelId(panel.id)}
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 6,
                    border: '1px solid var(--border-weak)',
                    background: selectedPanel?.id === panel.id ? '#3274d9' : 'var(--panel-bg)',
                    color: selectedPanel?.id === panel.id ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  {panel.title} · {panel.type}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {!selectedPanel && <div>No panel selected.</div>}

            {selectedPanel && (
              <>
                <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600 }}>{selectedPanel.title}</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                    Type: {selectedPanel.type} · Datasource: {selectedPanel.datasource || 'default'}
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Queries</div>
                  {selectedPanel.queries?.length ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {selectedPanel.queries.map((query) => (
                        <div key={query.refId}>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>Query {query.refId}</div>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {query.expression}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-secondary)' }}>No query definitions available.</div>
                  )}
                </div>

                <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Raw JSON</div>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {JSON.stringify(selectedPanel.rawModel ?? {}, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
