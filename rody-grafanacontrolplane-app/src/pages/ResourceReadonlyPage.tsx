import React, { useEffect, useMemo, useState } from 'react';
import { locationService } from '@grafana/runtime';

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

export const ResourceReadonlyPage: React.FC<{ uid?: string }> = ({ uid = 'cpu-overview' }) => {
  const [data, setData] = useState<ResourceDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState<number | undefined>(undefined);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [lookupUid, setLookupUid] = useState(uid);
  const [notice, setNotice] = useState('');

  const load = async (targetUid = uid) => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const resp = await fetch(`/api/platform/v1/resources/${targetUid}`);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      setData(json);
      setLookupUid(targetUid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load resource');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const createDraft = async () => {
    setCreatingDraft(true);
    setError('');
    setNotice('');
    try {
      const resp = await fetch(`/api/platform/v1/resources/${lookupUid}/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json = await resp.json();
      if (!json?.draftId) {
        throw new Error('draftId missing');
      }
      locationService.push(`/a/rody-grafanacontrolplane-app/draft/${json.draftId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create draft');
    } finally {
      setCreatingDraft(false);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied`);
    } catch {
      setError(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const openLookupUid = () => {
    const target = lookupUid.trim();
    if (!target) {
      setError('UID is required');
      return;
    }
    locationService.push(`/a/rody-grafanacontrolplane-app/resource/${target}`);
  };

  useEffect(() => {
    void load(uid);
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
        <div style={{ fontWeight: 600, fontSize: 18 }}>{data?.title || `Resource ${lookupUid}`}</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          {data
            ? `Readonly governed definition · owner ${data.ownerName} · mode ${data.governanceMode}`
            : 'Readonly governed definition'}
        </div>
      </div>

      <div
        style={{
          border: '1px solid var(--border-weak)',
          borderRadius: 8,
          padding: 16,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 600 }}>Dashboard UID Lookup</div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Copy the dashboard UID from the Grafana URL and open it here to inspect panel expressions even when the dashboard page does not show query details.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={lookupUid}
            onChange={(e) => setLookupUid(e.currentTarget.value)}
            placeholder="Enter dashboard UID, for example cpu-overview"
            style={{
              minWidth: 320,
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-weak)',
              background: 'var(--panel-bg)',
              color: 'var(--text-primary)',
            }}
          />
          <button type="button" onClick={openLookupUid} style={{ padding: '8px 12px', cursor: 'pointer' }}>
            Open by UID
          </button>
          <button type="button" onClick={() => void load(lookupUid)} style={{ padding: '8px 12px', cursor: 'pointer' }}>
            Refresh
          </button>
          <button type="button" onClick={() => void createDraft()} style={{ padding: '8px 12px', cursor: 'pointer' }} disabled={creatingDraft}>
            {creatingDraft ? 'Creating draft...' : 'Create Draft'}
          </button>
        </div>
      </div>

      {notice && (
        <div style={{ border: '1px solid #299c46', borderRadius: 8, padding: 12, color: '#299c46' }}>
          {notice}
        </div>
      )}

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
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => void copyText(JSON.stringify(selectedPanel.rawModel ?? {}, null, 2), 'Panel raw JSON')}
                      style={{ padding: '6px 10px', cursor: 'pointer' }}
                    >
                      Copy Panel JSON
                    </button>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Panel Expressions</div>
                  {selectedPanel.queries?.length ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {selectedPanel.queries.map((query) => (
                        <div
                          key={query.refId}
                          style={{
                            border: '1px solid var(--border-weak)',
                            borderRadius: 8,
                            padding: 12,
                            display: 'grid',
                            gap: 8,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>Query {query.refId}</div>
                              <div style={{ color: 'var(--text-secondary)' }}>
                                Datasource: {query.datasource || 'default'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => void copyText(query.expression, `Query ${query.refId} expression`)}
                                style={{ padding: '6px 10px', cursor: 'pointer' }}
                              >
                                Copy Expression
                              </button>
                            </div>
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              background: 'rgba(255,255,255,0.03)',
                              padding: 12,
                              borderRadius: 6,
                            }}
                          >
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
