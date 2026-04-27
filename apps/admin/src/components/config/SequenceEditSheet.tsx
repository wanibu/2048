import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import type { GeneratedSequence } from '@/api/types';

const LABEL_STYLE = {
  fontSize: '0.6875rem',
  color: '#8a8a94',
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  marginBottom: 6,
} as const;

const INPUT_STYLE = {
  width: '100%',
  padding: '9px 12px',
  fontSize: '0.875rem',
  border: '1px solid #e6e6ec',
  borderRadius: 6,
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
} as const;

const SECONDARY_BTN = {
  padding: '7px 14px',
  fontSize: '0.7812rem',
  border: '1px solid #e6e6ec',
  borderRadius: 6,
  background: '#fff',
  color: '#5a5a66',
  cursor: 'pointer',
  fontFamily: 'inherit',
} as const;

const PRIMARY_BTN = {
  ...SECONDARY_BTN,
  border: '1px solid #2a2a33',
  background: '#2a2a33',
  color: '#fff',
} as const;

interface SequenceEditSheetProps {
  open: boolean;
  sequence: GeneratedSequence | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SequenceEditSheet({ open, sequence, onClose, onSaved }: SequenceEditSheetProps) {
  const [status, setStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  // name 校验状态：'idle' / 'checking' / 'ok' / 'error'
  const [nameCheckState, setNameCheckState] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [nameError, setNameError] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!sequence) return;
    setStatus(sequence.status);
    setName(sequence.sequence_name ?? '');
    setNote(sequence.sequence_note ?? '');
    setNameCheckState('idle');
    setNameError('');
  }, [sequence]);

  // name 实时校验：debounce 300ms
  useEffect(() => {
    if (!sequence) return;
    const trimmed = name.trim();
    // 必填校验（前端先报）
    if (!trimmed) {
      setNameCheckState('error');
      setNameError('系列名称不能为空');
      return;
    }
    // 与原值相同 → 不重名（自己排除）
    if (trimmed === (sequence.sequence_name ?? '')) {
      setNameCheckState('ok');
      setNameError('');
      return;
    }
    setNameCheckState('checking');
    setNameError('');
    const timer = setTimeout(() => {
      void api<{ available: boolean; reason?: string }>(
        `/api/admin/generated-sequences/check-name?plan_id=${encodeURIComponent(sequence.sequence_plan_id)}&name=${encodeURIComponent(trimmed)}&exclude_id=${encodeURIComponent(sequence.id)}`,
      )
        .then((res) => {
          if (res.available) {
            setNameCheckState('ok');
            setNameError('');
          } else {
            setNameCheckState('error');
            setNameError(res.reason || '名称不可用');
          }
        })
        .catch(() => {
          setNameCheckState('idle');
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [name, sequence]);

  if (!open || !sequence) return null;

  async function handleSave() {
    if (!sequence) return;
    if (nameCheckState !== 'ok') {
      toast.error(nameError || '请先填写有效的系列名称');
      return;
    }
    try {
      setSaving(true);
      await api(`/api/admin/generated-sequences/${sequence.id}`, {
        method: 'PUT',
        body: { status, sequence_name: name.trim(), sequence_note: note },
      });
      toast.success('已保存');
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  }

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
          width: '60vw',
          maxWidth: 720,
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
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 22 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: 22,
              boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)',
            }}
          >
            <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '1.125rem', fontWeight: 600, marginBottom: 20 }}>
              编辑序列
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <div style={LABEL_STYLE}>序列 ID</div>
                <div
                  style={{
                    ...INPUT_STYLE,
                    background: '#fafafc',
                    color: '#6a6a74',
                    fontFamily: 'Menlo, Monaco, monospace',
                    fontSize: '0.8125rem',
                  }}
                >
                  {sequence.id}
                </div>
              </div>
              <div>
                <div style={LABEL_STYLE}>系列名称 <span style={{ color: '#c8343a' }}>*</span></div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="必填，且同 Plan 下不能重名"
                  style={{
                    ...INPUT_STYLE,
                    borderColor: nameCheckState === 'error' ? '#c8343a' : nameCheckState === 'ok' ? '#1f8a47' : '#e6e6ec',
                  }}
                />
                <div style={{ marginTop: 4, fontSize: '0.6875rem', minHeight: 16 }}>
                  {nameCheckState === 'checking' && <span style={{ color: '#9b9ba6' }}>检查中…</span>}
                  {nameCheckState === 'error' && <span style={{ color: '#c8343a' }}>{nameError}</span>}
                  {nameCheckState === 'ok' && <span style={{ color: '#1f8a47' }}>✓ 可用</span>}
                </div>
              </div>
              <div>
                <div style={LABEL_STYLE}>备注</div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="可选，用于描述这条序列的特点"
                  rows={3}
                  style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 64 }}
                />
              </div>
              <div>
                <div style={LABEL_STYLE}>状态</div>
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
                    ['enabled', '启用'],
                    ['disabled', '禁用'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatus(value)}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        border: 'none',
                        borderRadius: 6,
                        background: status === value ? '#2a2a33' : 'transparent',
                        color: status === value ? '#fff' : '#6a6a74',
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
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button type="button" onClick={onClose} style={SECONDARY_BTN}>
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || nameCheckState !== 'ok'}
                style={{
                  ...PRIMARY_BTN,
                  opacity: (saving || nameCheckState !== 'ok') ? 0.5 : 1,
                  cursor: (saving || nameCheckState !== 'ok') ? 'not-allowed' : 'pointer',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
