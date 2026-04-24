import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import type { GeneratedSequence } from '@/api/types';
import { CandyChip } from '@/components/ui/candy-chip';

function fmtDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}

function tokenValue(token: string | number) {
  if (token === 'stone' || token === 0) return 0;
  const numeric = Number(token);
  return Number.isFinite(numeric) ? numeric : 0;
}

function StatusPill({ status }: { status: GeneratedSequence['status'] }) {
  const enabled = status === 'enabled';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: '0.6875rem',
        color: enabled ? '#1f8a47' : '#7c7c88',
        background: enabled ? '#e9f8ef' : '#f1f1f5',
      }}
    >
      {status}
    </span>
  );
}

interface SequenceDetailSheetProps {
  open: boolean;
  sequenceId: string | null;
  onClose: () => void;
}

export function SequenceDetailSheet({ open, sequenceId, onClose }: SequenceDetailSheetProps) {
  const [sequence, setSequence] = useState<GeneratedSequence | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'sections' | 'dividers' | 'timeline'>('sections');

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !sequenceId) return;
    let cancelled = false;
    setLoading(true);
    void api<GeneratedSequence>(`/api/admin/generated-sequences/${sequenceId}`)
      .then((resp) => {
        if (!cancelled) setSequence(resp);
      })
      .catch((err) => {
        if (!cancelled) {
          setSequence(null);
          toast.error((err as { error?: string })?.error || '加载序列失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sequenceId]);

  useEffect(() => {
    if (!open) {
      setSequence(null);
      setViewMode('sections');
    }
  }, [open]);

  const tokens = useMemo(() => sequence?.sequence_data ?? [], [sequence]);
  const timelineTokens = useMemo(() => tokens.slice(0, 200), [tokens]);
  const moreCount = tokens.length > 200 ? tokens.length - 200 : 0;

  if (!open) return null;

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
          <div style={{ display: 'grid', gap: 18 }}>
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                padding: '18px 22px',
              }}
            >
              {loading || !sequence ? (
                <div style={{ fontSize: '0.8125rem', color: '#9b9ba6' }}>加载中…</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontFamily: 'Menlo, Monaco, monospace', fontSize: '0.875rem', fontWeight: 600, color: '#2a2a33' }}>{sequence.id}</div>
                    <StatusPill status={sequence.status} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
                    {[
                      ['Plan name', sequence.plan_name ?? '—'],
                      ['Total length', String(sequence.sequence_length)],
                      ['Created at', fmtDate(sequence.created_at)],
                      ['Updated at', fmtDate(sequence.updated_at)],
                    ].map(([label, value]) => (
                      <div key={label} style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.625rem', letterSpacing: 0.6, textTransform: 'uppercase', color: '#9b9ba6', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: '0.75rem', color: '#2a2a33', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  display: 'inline-flex',
                  background: '#fff',
                  border: '1px solid #ececf2',
                  borderRadius: 8,
                  padding: 3,
                  gap: 2,
                }}
              >
                {([
                  ['sections', '分节'],
                  ['dividers', '分隔'],
                  ['timeline', '时间轴'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setViewMode(value)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.7188rem',
                      border: 'none',
                      borderRadius: 6,
                      background: viewMode === value ? '#2a2a33' : 'transparent',
                      color: viewMode === value ? '#fff' : '#6a6a74',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #ececf2',
                padding: 18,
              }}
            >
              {!sequence ? (
                <div style={{ fontSize: '0.7812rem', color: '#9b9ba6' }}>{loading ? '加载中…' : '未找到序列'}</div>
              ) : viewMode === 'timeline' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {timelineTokens.map((token, index) => (
                    <CandyChip key={`${index}-${token}`} v={tokenValue(token)} size={26} />
                  ))}
                  {moreCount > 0 ? (
                    <span style={{ fontSize: '0.7188rem', color: '#8a8a94', paddingLeft: 4 }}>+ {moreCount} more</span>
                  ) : null}
                </div>
              ) : (
                <div style={{ display: 'grid', gap: viewMode === 'sections' ? 12 : 0 }}>
                  {viewMode === 'sections' ? (
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2a2a33' }}>完整序列</div>
                  ) : null}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: viewMode === 'sections' ? 6 : 5 }}>
                    {tokens.map((token, index) => (
                      <CandyChip key={`${index}-${token}`} v={tokenValue(token)} size={26} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
