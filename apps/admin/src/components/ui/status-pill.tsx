interface StatusPillProps {
  status: 'playing' | 'finished' | 'enabled' | 'disabled';
}

export function StatusPill({ status }: StatusPillProps) {
  const config = {
    playing: { bg: '#e3eaff', fg: '#5a7cff', bd: '#c7d3ff', dot: '#5a7cff', label: '进行中' },
    finished: { bg: '#e6f5ec', fg: '#1fa85a', bd: '#c8e6d3', dot: '#1fa85a', label: '已结束' },
    enabled: { bg: '#e6f5ec', fg: '#1fa85a', bd: '#c8e6d3', dot: '#1fa85a', label: 'enabled' },
    disabled: { bg: '#f4f4f8', fg: '#9b9ba6', bd: 'var(--color-border)', dot: '#b0b0b8', label: 'disabled' },
  }[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: '0.6562rem',
        fontWeight: 500,
        background: config.bg,
        color: config.fg,
        border: `1px solid ${config.bd}`,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: config.dot }} />
      {config.label}
    </span>
  );
}
