import { RefreshCw } from 'lucide-react';

interface RefreshBtnProps {
  onClick: () => void;
  loading?: boolean;
}

export function RefreshBtn({ onClick, loading }: RefreshBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '5px 10px',
        fontSize: '0.75rem',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 6,
        background: 'var(--color-surface)',
        color: 'var(--color-text-soft)',
        cursor: loading ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'inherit',
      }}
    >
      <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
      刷新
    </button>
  );
}
