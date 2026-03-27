import React from 'react';
import { Badge, HorizontalGroup } from '@grafana/ui';
import { ConflictPayload } from '../types/conflict';

export const ConflictMetaBar: React.FC<{ data: ConflictPayload }> = ({ data }) => (
  <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 12, background: 'var(--panel-bg)' }}>
    <HorizontalGroup justify="space-between">
      <div>
        <div style={{ fontWeight: 600 }}>{data.resourceUid}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
          {data.resourceType} · Base v{data.baseVersionNo} → Current v{data.currentVersionNo}
        </div>
      </div>
      <HorizontalGroup>
        <Badge color={data.hasConflict ? 'red' : 'green'} text={data.hasConflict ? 'Version mismatch' : 'No conflict'} />
        <Badge color="blue" text={`${data.conflictPaths.length} conflict paths`} />
      </HorizontalGroup>
    </HorizontalGroup>
  </div>
);
