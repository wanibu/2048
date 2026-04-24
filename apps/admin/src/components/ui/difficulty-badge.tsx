import { expectedValue } from '@/lib/plan-shared';

interface DifficultyBadgeProps {
  weights: Record<string, number>;
  dense?: boolean;
}

export function DifficultyBadge({ weights, dense = false }: DifficultyBadgeProps) {
  const ev = expectedValue(weights);
  const log = ev > 0 ? Math.log2(ev) : 0;
  const bucket: [string, string] =
    log < 5 ? ['easy', '#4ecd7a'] :
    log < 8 ? ['medium', '#ffb93c'] :
    log < 11 ? ['hard', '#ff6a3c'] :
    ['extreme', '#c14dff'];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center',
      gap: dense ? 6 : 8,
      padding: dense ? '2px 8px' : '4px 10px',
      background: '#f4f4f8', borderRadius: 10, border: '1px solid var(--color-border)',
    }}>
      <span style={{ fontSize: dense ? 10 : 11, color: 'var(--color-text-muted)', letterSpacing: 0.6, textTransform: 'uppercase' }}>EV</span>
      <span style={{
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontWeight: 600, fontSize: dense ? 12 : 13.5,
        color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums',
      }}>{ev < 10 ? ev.toFixed(1) : Math.round(ev).toLocaleString()}</span>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: bucket[1], boxShadow: `0 0 0 2px ${bucket[1]}22` }} />
      <span style={{ fontSize: dense ? 10 : 11, color: bucket[1], fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>{bucket[0]}</span>
    </div>
  );
}
