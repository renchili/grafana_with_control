import React from 'react';

export const Card: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{
    border: '1px solid var(--border-weak)',
    borderRadius: 8,
    padding: 16,
    background: 'var(--panel-bg)'
  }}>
    {title && <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>}
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button
    {...props}
    style={{
      height: 36,
      padding: '0 14px',
      borderRadius: 6,
      border: '1px solid var(--border-weak)',
      background: 'var(--panel-bg)',
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === 'published' ? '#299c46' :
    status === 'active' ? '#3274d9' :
    status === 'conflict' ? '#d44a3a' :
    '#888';

  return (
    <span style={{
      background: color,
      color: 'white',
      padding: '4px 8px',
      borderRadius: 999,
      fontSize: 12
    }}>
      {status}
    </span>
  );
};
