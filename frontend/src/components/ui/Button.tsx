import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const baseStyle: React.CSSProperties = {
    padding: '10px 22px',
    borderRadius: 'var(--radius-full)',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    border: 'none',
    width: fullWidth ? '100%' : undefined,
    opacity: isDisabled ? 0.45 : 1,
    transition: 'all 0.15s ease',
    letterSpacing: '0.01em',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #3b7ff5 0%, #1d4ed8 100%)',
      color: '#ffffff',
      boxShadow: isDisabled ? 'none' : '0 0 20px rgba(59,127,245,0.35)',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid var(--color-primary)',
    },
    danger: {
      background: 'rgba(239,68,68,0.1)',
      color: '#ef4444',
      border: '1px solid rgba(239,68,68,0.25)',
    },
    ghost: {
      background: 'none',
      color: 'var(--color-primary)',
      border: 'none',
      textDecoration: 'underline',
      fontWeight: 400,
      padding: '0',
    },
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      style={{ ...baseStyle, ...variantStyles[variant], ...style }}
      {...rest}
    >
      {loading ? (
        <>
          <span
            style={{
              width: 14,
              height: 14,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'btn-spin 0.7s linear infinite',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <style>{`@keyframes btn-spin { to { transform: rotate(360deg); } }`}</style>
          Please wait...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
