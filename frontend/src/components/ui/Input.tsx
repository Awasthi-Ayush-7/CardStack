import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id?: string;
}

const Input: React.FC<InputProps> = ({ label, id, style, ...rest }) => {
  const inputId = id || rest.name || `input-${Math.random().toString(36).slice(2)}`;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    border: '1px solid var(--color-border-strong)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    ...style,
  };

  return (
    <div style={{ marginBottom: 'var(--spacing-md)' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: 6,
            fontWeight: 500,
            fontSize: 13,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--color-primary)';
          e.target.style.boxShadow = '0 0 0 3px var(--color-primary-subtle)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--color-border-strong)';
          e.target.style.boxShadow = 'none';
        }}
        {...rest}
      />
    </div>
  );
};

export default Input;
