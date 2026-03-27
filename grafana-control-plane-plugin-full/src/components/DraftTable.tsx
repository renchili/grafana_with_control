import React from 'react';
import { Button, HorizontalGroup } from '@grafana/ui';
import { locationService } from '@grafana/runtime';
import { Draft } from '../types/draft';
import { StatusPill } from './StatusPill';

interface Props {
  data: Draft[];
  actingDraftId?: number;
  onPublish: (draftId: number) => void;
  onAbandon: (draftId: number) => void;
}

export const DraftTable: React.FC<Props> = ({ data, actingDraftId, onPublish, onAbandon }) => {
  if (!data.length) return <div style={{ color: 'var(--text-secondary)' }}>No drafts found.</div>;

  return (
    <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-weak)' }}>
            <th style={{ padding: 12 }}>Title</th>
            <th style={{ padding: 12 }}>Owner</th>
            <th style={{ padding: 12 }}>Base Version</th>
            <th style={{ padding: 12 }}>Status</th>
            <th style={{ padding: 12 }}>Updated</th>
            <th style={{ padding: 12 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((draft) => {
            const busy = actingDraftId === draft.draftId;
            return (
              <tr key={draft.draftId} style={{ borderBottom: '1px solid var(--border-weak)' }}>
                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{draft.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{draft.resourceUid}</div>
                </td>
                <td style={{ padding: 12 }}>{draft.ownerName}</td>
                <td style={{ padding: 12 }}>v{draft.baseVersionNo}</td>
                <td style={{ padding: 12 }}><StatusPill status={draft.status} /></td>
                <td style={{ padding: 12 }}>{draft.updatedAt}</td>
                <td style={{ padding: 12 }}>
                  <HorizontalGroup spacing="sm">
                    <Button size="sm" variant="secondary" onClick={() => locationService.push(`/d/${draft.resourceUid}`)}>
                      Resume
                    </Button>
                    {draft.status === 'conflict' ? (
                      <Button size="sm" onClick={() => locationService.push(`/a/company-grafana-control-plane-app/conflict?draftId=${draft.draftId}`)}>
                        Resolve
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => onPublish(draft.draftId)} disabled={busy}>
                        Publish
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => onAbandon(draft.draftId)} disabled={busy}>
                      Abandon
                    </Button>
                  </HorizontalGroup>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
