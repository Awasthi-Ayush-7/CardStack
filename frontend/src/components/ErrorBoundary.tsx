/**
 * Global error boundary — catches React render errors and shows a recovery UI
 * instead of crashing the entire app.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'var(--color-background)',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 40,
              marginBottom: 20,
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: '0 0 12px',
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              margin: '0 0 24px',
              maxWidth: 400,
            }}
          >
            An unexpected error occurred. Your data is safe — reload the page to continue.
          </p>
          {this.state.errorMessage && (
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-subtle)',
                fontFamily: 'monospace',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '8px 16px',
                marginBottom: 24,
                maxWidth: 500,
                wordBreak: 'break-word',
              }}
            >
              {this.state.errorMessage}
            </p>
          )}
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
