import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { PlanStage } from '@/api/types';
import { CandyChip } from '@/components/ui/candy-chip';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { ALL_VALUES, COLOR_MAP, STONE_VALUE, labelOf, normalize } from '@/lib/plan-shared';

interface StageDetailSheetProps {
  open: boolean;
  stage: PlanStage | null;
  stageIndex: number;
  onClose: () => void;
}

export function StageDetailSheet({ open, stage, stageIndex, onClose }: StageDetailSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !stage) return null;

  const weights = normalize(stage.probabilities);
  const allKeys = [...ALL_VALUES, STONE_VALUE];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(16,16,24,0.35)',
          zIndex: 80,
          animation: 'planSheetOverlayIn 200ms ease-out',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '70vw',
          maxWidth: 1000,
          background: 'var(--color-bg)',
          zIndex: 90,
          boxShadow: '-12px 0 32px rgba(0,0,0,0.15)',
          animation: 'planSheetSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: 'absolute',
            top: 14,
            right: '100%',
            width: 40,
            height: 40,
            background: '#fff',
            border: '1px solid #ececf2',
            borderRadius: 4,
            color: '#6a6a74',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <X size={18} />
        </button>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 26 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: 24,
              boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: '#ececf2', color: '#6a6a74', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.875rem' }}>
                #{stageIndex + 1}
              </div>
              <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '1.125rem', fontWeight: 600 }}>{stage.name}</div>
              <div style={{ flex: 1 }} />
              <DifficultyBadge weights={weights} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 22 }}>
              {[
                ['Stage ID', stage.id],
                ['Plan name', '—'],
                ['Block count', String(stage.length)],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.625rem', letterSpacing: 0.6, textTransform: 'uppercase', color: '#9b9ba6', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#2a2a33', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: label === 'Stage ID' ? 'Menlo, Monaco, monospace' : 'inherit' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>概率分布</div>
            <div style={{ display: 'flex', height: 28, borderRadius: 6, background: '#eceaf0', overflow: 'hidden', marginBottom: 22 }}>
              {allKeys.map((value) => {
                const pct = weights[labelOf(value)] ?? 0;
                if (pct <= 0) return null;
                return <div key={value} style={{ width: `${pct}%`, background: COLOR_MAP[value].bg }} />;
              })}
            </div>

            <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>完整权重表</div>
            <div style={{ border: '1px solid #ececf2', borderRadius: 8, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 90px 80px 1fr',
                  padding: '8px 14px',
                  background: '#fafafc',
                  fontSize: '0.625rem',
                  color: '#8a8a94',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  gap: 10,
                }}
              >
                <div />
                <div>方块</div>
                <div style={{ textAlign: 'right' }}>%</div>
                <div>占比</div>
              </div>
              {allKeys.map((value) => {
                const key = labelOf(value);
                const pct = weights[key] ?? 0;
                return (
                  <div
                    key={key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '56px 90px 80px 1fr',
                      padding: '8px 14px',
                      borderTop: '1px solid #f4f4f8',
                      alignItems: 'center',
                      gap: 10,
                      opacity: pct > 0 ? 1 : 0.42,
                    }}
                  >
                    <div>
                      <CandyChip v={value} size={20} hasNumber={false} />
                    </div>
                    <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 500, fontSize: '0.75rem', color: '#2a2a33' }}>{labelOf(value)}</div>
                    <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem', color: '#2a2a33' }}>{pct.toFixed(1)}%</div>
                    <div style={{ height: 6, background: '#eceaf0', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: COLOR_MAP[value].bg }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
