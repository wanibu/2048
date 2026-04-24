import { COLOR_MAP, STONE_VALUE } from '@/lib/plan-shared';

interface CandyChipProps {
  v: number;
  size?: number;
  selected?: boolean;
  hasNumber?: boolean;
}

export function CandyChip({ v, size = 22, selected, hasNumber = true }: CandyChipProps) {
  const c = COLOR_MAP[v] ?? COLOR_MAP[STONE_VALUE];
  const isStone = v === STONE_VALUE;
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: isStone ? 5 : '50%',
        background: isStone
          ? 'linear-gradient(135deg, #c0c0c8, #808088)'
          : `radial-gradient(circle at 30% 25%, #fff 0%, ${c.bg} 55%, ${c.dark})`,
        boxShadow: selected
          ? `0 0 0 2px #fff, 0 0 0 4px ${c.dark}`
          : `0 1px 2px rgba(0,0,0,.2), inset 0 -1px 2px rgba(0,0,0,.2)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {hasNumber && !isStone && (
        <div
          style={{
            fontFamily: 'Fredoka, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: size * 0.45,
            color: '#fff',
            textShadow: '0 1px 0 rgba(0,0,0,.3)',
            lineHeight: 1,
          }}
        >
          {v}
        </div>
      )}
    </div>
  );
}
