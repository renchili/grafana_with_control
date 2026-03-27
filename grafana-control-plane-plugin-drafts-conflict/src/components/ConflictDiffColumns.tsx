import React from 'react';
import { HorizontalGroup } from '@grafana/ui';
import { ConflictPayload } from '../types/conflict';
import { ConflictPane } from './ConflictPane';

export const ConflictDiffColumns: React.FC<{ data: ConflictPayload }> = ({ data }) => (
  <HorizontalGroup align="flex-start" spacing="md">
    <div style={{ flex: 1, minWidth: 0 }}>
      <ConflictPane title={`Base v${data.baseVersionNo}`} value={data.base} highlightPaths={data.conflictPaths} tone="base" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <ConflictPane title="Yours (Draft)" value={data.yours} highlightPaths={data.conflictPaths} tone="yours" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <ConflictPane title={`Theirs v${data.currentVersionNo}`} value={data.theirs} highlightPaths={data.conflictPaths} tone="theirs" />
    </div>
  </HorizontalGroup>
);
