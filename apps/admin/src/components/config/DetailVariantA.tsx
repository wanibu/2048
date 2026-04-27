import { useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import type { GeneratedSequence, Plan, PlanStage } from '@/api/types';
import { CandyChip } from '@/components/ui/candy-chip';
import { COLOR_MAP } from '@/lib/plan-shared';

interface DetailVariantAProps {
  plan: Plan;
  sequences: GeneratedSequence[];
  onEdit: () => void;
  onDelete: () => void;
  onGenerateSequence: () => void;
  onSelectStage: (stage: PlanStage, stageIndex: number) => void;
  onSelectSequence: (sequence: GeneratedSequence) => void;
  onEditSequence: (sequence: GeneratedSequence) => void;
  onDeleteSequence: (sequence: GeneratedSequence) => void;
  onRefresh: () => void;
}

const SECONDARY_BTN = {
  padding: '5px 10px',
  fontSize: '0.75rem',
  border: '1px solid #e6e6ec',
  borderRadius: 6,
  background: '#fff',
  color: '#5a5a66',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
} as const;

const DANGER_TEXT_BTN = {
  ...SECONDARY_BTN,
  color: '#c83a3a',
  border: '1px solid #f0d6d6',
} as const;

function fmtDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}

function shortId(id: string) {
  return id.length <= 12 ? id : `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function toEntries(probabilities: Record<string, number>) {
  return Object.entries(probabilities)
    .map(([key, value]) => [key, Number(value) || 0] as const)
    .sort((a, b) => b[1] - a[1]);
}

function dominantEntries(probabilities: Record<string, number>) {
  return toEntries(probabilities).slice(0, 4);
}

function totalKinds(probabilities: Record<string, number>) {
  return Object.values(probabilities).filter((value) => Number(value) > 0).length;
}

function maxProbability(probabilities: Record<string, number>) {
  return Math.max(0, ...Object.values(probabilities).map((value) => Number(value) || 0));
}

function Meta({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.625rem', letterSpacing: 0.6, textTransform: 'uppercase', color: '#9b9ba6', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: '#2a2a33', fontFamily: mono ? 'Menlo, Monaco, monospace' : 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 14px',
        fontSize: '0.75rem',
        border: 'none',
        borderRadius: 6,
        background: active ? '#2a2a33' : 'transparent',
        color: active ? '#fff' : '#6a6a74',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

function MiniProbBar({ probabilities }: { probabilities: Record<string, number> }) {
  const entries = useMemo(() => toEntries(probabilities), [probabilities]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div style={{ height: 8, borderRadius: 999, background: '#f1f1f5', overflow: 'hidden', display: 'flex' }}>
      {total <= 0 ? (
        <div style={{ width: '100%', background: '#d8d8df' }} />
      ) : (
        entries.map(([key, value]) => {
          const numericKey = key === 'stone' ? 0 : Number(key);
          const color = COLOR_MAP[numericKey] ?? COLOR_MAP[0];
          return <div key={key} style={{ width: `${(value / total) * 100}%`, background: color.bg }} />;
        })
      )}
    </div>
  );
}

function StagesTable({
  stages,
  onSelectStage,
}: {
  stages: PlanStage[];
  onSelectStage: (stage: PlanStage, stageIndex: number) => void;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '48px 1.5fr 0.5fr 2fr 1.5fr 28px', padding: '8px 20px', background: '#fafafc', borderBottom: '1px solid #f0f0f4', fontSize: '0.625rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, gap: 14 }}>
        <div>#</div>
        <div>名称</div>
        <div style={{ textAlign: 'right' }}>长度</div>
        <div>概率分布</div>
        <div>主导</div>
        <div />
      </div>
      {stages.map((stage, index) => {
        const dominant = dominantEntries(stage.probabilities);
        return (
          <div
            key={stage.id}
            onClick={() => onSelectStage(stage, index)}
            style={{ display: 'grid', gridTemplateColumns: '48px 1.5fr 0.5fr 2fr 1.5fr 28px', padding: '14px 20px', borderBottom: index === stages.length - 1 ? 'none' : '1px solid #f4f4f8', alignItems: 'center', gap: 14, fontSize: '0.7812rem', cursor: 'pointer', transition: 'background 120ms ease, box-shadow 120ms ease' }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = '#fafafc';
              event.currentTarget.style.boxShadow = 'inset 2px 0 0 #c87a3a';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent';
              event.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ width: 24, height: 24, borderRadius: 5, background: '#f4f4f8', color: '#6a6a74', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.6875rem' }}>{index + 1}</div>
            <div style={{ fontWeight: 500, color: '#2a2a33' }}>{stage.name}</div>
            <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', color: '#2a2a33' }}>{stage.length}</div>
            <div>
              <MiniProbBar probabilities={stage.probabilities} />
              <div style={{ fontSize: '0.625rem', color: '#9b9ba6', marginTop: 4, fontFamily: 'Fredoka, system-ui, sans-serif' }}>
                {totalKinds(stage.probabilities)} 种 · 最大 {maxProbability(stage.probabilities).toFixed(1)}%
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {dominant.map(([key, value]) => {
                const numericKey = key === 'stone' ? 0 : Number(key);
                const color = COLOR_MAP[numericKey] ?? COLOR_MAP[0];
                return (
                  <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px 2px 2px', background: `${color.bg}14`, borderRadius: 10, fontSize: '0.6562rem', color: color.dark, fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600 }}>
                    <CandyChip v={numericKey} size={14} hasNumber={false} />
                    {value.toFixed(0)}%
                  </span>
                );
              })}
            </div>
            <div style={{ color: '#c6c6cc', display: 'flex', justifyContent: 'flex-end' }}>
              <ChevronRight size={14} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SequencesTable({
  sequences,
  onGenerateSequence,
  onSelectSequence,
  onEditSequence,
  onDeleteSequence,
}: {
  sequences: GeneratedSequence[];
  onGenerateSequence: () => void;
  onSelectSequence: (sequence: GeneratedSequence) => void;
  onEditSequence: (sequence: GeneratedSequence) => void;
  onDeleteSequence: (sequence: GeneratedSequence) => void;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>已生成序列</div>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={onGenerateSequence} style={SECONDARY_BTN}>
          <Plus size={12} />
          生成序列
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '180px 140px 160px 100px 1fr 90px', padding: '8px 20px', background: '#fafafc', borderBottom: '1px solid #f0f0f4', fontSize: '0.625rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, gap: 14 }}>
        <div>ID</div>
        <div>系列名称</div>
        <div>备注</div>
        <div>状态</div>
        <div>创建时间</div>
        <div style={{ textAlign: 'right' }}>操作</div>
      </div>
      {sequences.length === 0 ? (
        <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: '0.75rem', color: '#9b9ba6' }}>暂无序列，点击右上角生成序列</div>
      ) : (
        sequences.map((sequence, index) => (
          <div
            key={sequence.id}
            onClick={() => onSelectSequence(sequence)}
            style={{ display: 'grid', gridTemplateColumns: '180px 140px 160px 100px 1fr 90px', padding: '14px 20px', borderBottom: index === sequences.length - 1 ? 'none' : '1px solid #f4f4f8', alignItems: 'center', gap: 14, fontSize: '0.75rem', cursor: 'pointer' }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = '#fafafc';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ fontFamily: 'Menlo, Monaco, monospace', color: '#2a2a33' }}>{shortId(sequence.id)}</div>
            <div style={{ color: sequence.sequence_name ? '#2a2a33' : '#c8c8d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sequence.sequence_name}>
              {sequence.sequence_name || '—'}
            </div>
            <div style={{ color: sequence.sequence_note ? '#5a5a66' : '#c8c8d0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sequence.sequence_note}>
              {sequence.sequence_note || '—'}
            </div>
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, fontSize: '0.6875rem', color: sequence.status === 'enabled' ? '#1f8a47' : '#7c7c88', background: sequence.status === 'enabled' ? '#e9f8ef' : '#f1f1f5' }}>{sequence.status}</span>
            </div>
            <div style={{ color: '#5a5a66' }}>{fmtDate(sequence.created_at)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditSequence(sequence);
                }}
                style={{ ...SECONDARY_BTN, padding: 6, gap: 0 }}
                title="编辑序列"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteSequence(sequence);
                }}
                style={{ ...DANGER_TEXT_BTN, padding: 6, gap: 0 }}
                title="删除序列"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function DetailVariantA({
  plan,
  sequences,
  onEdit,
  onDelete,
  onGenerateSequence,
  onSelectStage,
  onSelectSequence,
  onEditSequence,
  onDeleteSequence,
  onRefresh: _onRefresh,
}: DetailVariantAProps) {
  const [tab, setTab] = useState<'stages' | 'sequences'>('stages');
  const totalLength = plan.total_length ?? plan.stages.reduce((sum, stage) => sum + stage.length, 0);

  return (
    <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, fontFamily: 'Fredoka, system-ui, sans-serif', color: '#2a2a33' }}>{plan.name}</div>
          {plan.description ? <span style={{ padding: '2px 8px', borderRadius: 999, background: '#f4f4f8', color: '#6a6a74', fontSize: '0.6562rem' }}>{plan.description}</span> : null}
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onEdit} style={SECONDARY_BTN}>
            <Pencil size={13} />
            编辑
          </button>
          <button type="button" onClick={onDelete} style={DANGER_TEXT_BTN}>
            <Trash2 size={13} />
            删除
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16, fontSize: '0.6875rem' }}>
          <Meta label="Plan ID" value={shortId(plan.id)} mono />
          <Meta label="阶段数" value={plan.stages.length} />
          <Meta label="总长度" value={totalLength} />
          <Meta label="创建时间" value={fmtDate(plan.created_at)} />
          <Meta label="更新时间" value={fmtDate(plan.updated_at)} />
        </div>
      </div>

      <div style={{ display: 'inline-flex', width: 'fit-content', background: '#fff', border: '1px solid #ececf2', borderRadius: 8, padding: 3 }}>
        <TabButton active={tab === 'stages'} onClick={() => setTab('stages')}>
          阶段顺序 <span style={{ marginLeft: 3, opacity: 0.7 }}>{plan.stages.length}</span>
        </TabButton>
        <TabButton active={tab === 'sequences'} onClick={() => setTab('sequences')}>
          已生成序列 <span style={{ marginLeft: 3, opacity: 0.7 }}>{sequences.length}</span>
        </TabButton>
      </div>

      {tab === 'stages' ? (
        <StagesTable stages={plan.stages} onSelectStage={onSelectStage} />
      ) : (
        <SequencesTable
          sequences={sequences}
          onGenerateSequence={onGenerateSequence}
          onSelectSequence={onSelectSequence}
          onEditSequence={onEditSequence}
          onDeleteSequence={onDeleteSequence}
        />
      )}
    </div>
  );
}
