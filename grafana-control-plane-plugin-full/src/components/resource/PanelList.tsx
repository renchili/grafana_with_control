import React from 'react';
import { Button, VerticalGroup } from '@grafana/ui';
import { PanelDefinition } from '../../types/resource';

interface Props {
  panels: PanelDefinition[];
  selectedPanelId?: number;
  onSelect: (panelId: number) => void;
}

export const PanelList: React.FC<Props> = ({ panels, selectedPanelId, onSelect }) => {
  return (
    <VerticalGroup spacing="sm">
      {panels.map((panel) => (
        <Button
          key={panel.id}
          variant={selectedPanelId === panel.id ? 'primary' : 'secondary'}
          fill="text"
          onClick={() => onSelect(panel.id)}
        >
          {panel.title || `Panel ${panel.id}`} · {panel.type}
        </Button>
      ))}
    </VerticalGroup>
  );
};
