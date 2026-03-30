import React, { useMemo, useState } from 'react';
import { HorizontalGroup, Button } from '@grafana/ui';
import { PanelDefinition } from '../../types/resource';

interface Props {
  panel?: PanelDefinition;
}

type ViewTab = 'query' | 'transformations' | 'fieldConfig' | 'raw';

export const PanelDefinitionView: React.FC<Props> = ({ panel }) => {
  const [tab, setTab] = useState<ViewTab>('query');

  const raw = useMemo(() => JSON.stringify(panel?.rawModel ?? {}, null, 2), [panel]);
  const fieldConfig = useMemo(() => JSON.stringify(panel?.fieldConfig ?? {}, null, 2), [panel]);
  const transformations = useMemo(() => JSON.stringify(panel?.transformations ?? [], null, 2), [panel]);

  if (!panel) {
    return <div style={{ color: 'var(--text-secondary)' }}>No panel selected.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{panel.title || `Panel ${panel.id}`}</div>
        <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Type: {panel.type} · Datasource: {panel.datasource || 'default'}
        </div>
      </div>

      <HorizontalGroup>
        <Button variant={tab === 'query' ? 'primary' : 'secondary'} onClick={() => setTab('query')}>Query</Button>
        <Button variant={tab === 'transformations' ? 'primary' : 'secondary'} onClick={() => setTab('transformations')}>Transformations</Button>
        <Button variant={tab === 'fieldConfig' ? 'primary' : 'secondary'} onClick={() => setTab('fieldConfig')}>Field config</Button>
        <Button variant={tab === 'raw' ? 'primary' : 'secondary'} onClick={() => setTab('raw')}>Raw JSON</Button>
      </HorizontalGroup>

      {tab === 'query' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {panel.queries.length ? panel.queries.map((query) => (
            <div key={query.refId} style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Query {query.refId}</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Datasource: {query.datasource || panel.datasource || 'default'}</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{query.expression}</pre>
            </div>
          )) : <div style={{ color: 'var(--text-secondary)' }}>No query definitions available.</div>}
        </div>
      )}

      {tab === 'transformations' && <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{transformations}</pre>}
      {tab === 'fieldConfig' && <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{fieldConfig}</pre>}
      {tab === 'raw' && <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{raw}</pre>}
    </div>
  );
};
