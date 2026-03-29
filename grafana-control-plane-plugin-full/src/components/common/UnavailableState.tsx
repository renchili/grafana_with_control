import React from 'react';
import { Alert, Button, HorizontalGroup } from '@grafana/ui';

interface Props {
  title: string;
  message: string;
  technicalDetails?: string;
  onRetry?: () => void;
  secondaryAction?: React.ReactNode;
}

export const UnavailableState: React.FC<Props> = ({ title, message, technicalDetails, onRetry, secondaryAction }) => {
  return (
    <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, background: 'var(--panel-bg)', padding: 20 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h3>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{message}</div>
      <HorizontalGroup>
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
        {secondaryAction}
      </HorizontalGroup>
      {technicalDetails && (
        <div style={{ marginTop: 16 }}>
          <details>
            <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>Show technical details</summary>
            <Alert title="Technical details" severity="warning">
              {technicalDetails}
            </Alert>
          </details>
        </div>
      )}
    </div>
  );
};
