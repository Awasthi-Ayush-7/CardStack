import React from 'react';

interface PageLayoutProps {
  title?: string;
  children: React.ReactNode;
  maxWidth?: number;
}

const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  children,
  maxWidth = 1200,
}) => (
  <div
    style={{
      padding: 'var(--spacing-xl) var(--spacing-lg)',
      maxWidth: maxWidth ? `${maxWidth}px` : undefined,
      margin: '0 auto',
    }}
  >
    {title && (
      <h2
        style={{
          marginTop: 0,
          marginBottom: 'var(--spacing-lg)',
          color: 'var(--color-text)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.3px',
        }}
      >
        {title}
      </h2>
    )}
    {children}
  </div>
);

export default PageLayout;
