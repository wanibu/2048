import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  right?: ReactNode;
}

export function PageHeader({ title, right }: PageHeaderProps) {
  return (
    <div
      style={{
        height: 48,
        padding: '0 20px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
      {right}
    </div>
  );
}
