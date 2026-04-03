import React from 'react';

export const buttonBaseStyle: React.CSSProperties = {
  height: 32,
  padding: '0 12px',
  borderRadius: 4,
  border: '1px solid #3b4252',
  background: '#1f232a',
  color: '#d8dee9',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '30px',
  boxSizing: 'border-box',
};

export const buttonPrimaryStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: '#3274d9',
  borderColor: '#3274d9',
  color: '#ffffff',
};

export const buttonDisabledStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: '#2b303b',
  borderColor: '#3b4252',
  color: '#7f8c9a',
  cursor: 'not-allowed',
  opacity: 0.8,
};

export const getButtonStyle = (opts?: {
  primary?: boolean;
  disabled?: boolean;
  active?: boolean;
}): React.CSSProperties => {
  if (opts?.disabled) {
    return buttonDisabledStyle;
  }
  if (opts?.primary || opts?.active) {
    return buttonPrimaryStyle;
  }
  return buttonBaseStyle;
};
