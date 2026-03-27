import React from 'react';
import { Badge, BadgeColor } from '@grafana/ui';

const colorForStatus = (status: string): BadgeColor => {
  switch (status) {
    case 'active':
    case 'published':
      return 'green';
    case 'conflict':
      return 'red';
    case 'abandoned':
      return 'orange';
    default:
      return 'blue';
  }
};

export const StatusPill: React.FC<{ status: string }> = ({ status }) => (
  <Badge color={colorForStatus(status)} text={status} />
);
