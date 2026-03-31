import React from 'react';

export const DatasourceChangesPage: React.FC = () => {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>Datasource Changes</div>
      <div style={{ color: 'var(--text-secondary)' }}>
        High-risk datasource changes should be validated, rendered, reviewed and published through the platform.
      </div>
      <div style={{ border: '1px solid var(--border-weak)', borderRadius: 8, padding: 16 }}>
        Coming next: datasource form, validation banner, YAML preview and publish flow.
      </div>
    </div>
  );
};
