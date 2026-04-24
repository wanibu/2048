import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/api/client';
import type { InlineStageInput, Plan } from '@/api/types';
import { CandyChip } from '@/components/ui/candy-chip';
import { ALL_VALUES, COLOR_MAP, STONE_VALUE, expectedValue, labelOf } from '@/lib/plan-shared';

export interface AdminV4_SpreadsheetProps {
  initialPlan: Plan | null;
  mode: 'new' | 'edit';
  onCancel: () => void;
  onSave: (saved: Plan) => void;
}

interface EditorStage {
  id: string;
  name: string;
  length: number;
  weights: Record<number, number>;
}

interface EditorPlan {
  id?: string;
  name: string;
  description: string;
  stages: EditorStage[];
}

const primaryBtn: CSSProperties = {
  padding: '9px 20px',
  background: '#2a2a33',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: '0.8125rem',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const secondaryBtn: CSSProperties = {
  padding: '9px 20px',
  background: '#fff',
  color: '#5a5a66',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 8,
  fontSize: '0.8125rem',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const thStyle: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #ececf2',
  fontSize: '0.6875rem',
  textAlign: 'left',
  color: '#8a8a94',
  fontWeight: 500,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid #f2f2f6',
  verticalAlign: 'middle',
};

function fromBackendWeights(p: Record<string, number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(p)) {
    const nk = k === 'stone' ? 0 : Number(k);
    out[nk] = v;
  }
  return out;
}

function toBackendWeights(w: Record<number, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(w)) {
    const nk = Number(k);
    out[nk === 0 ? 'stone' : String(nk)] = v;
  }
  return out;
}

function evenSplitNum(keys: number[]): Record<number, number> {
  const out: Record<number, number> = {};
  if (keys.length === 0) return out;
  const value = 100 / keys.length;
  keys.forEach((key) => {
    out[key] = value;
  });
  return out;
}

function normalizeNum(weights: Record<number, number>, target = 100): Record<number, number> {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total === 0) return weights;
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(weights)) out[Number(key)] = (value / total) * target;
  return out;
}

function createBlankStage(index: number): EditorStage {
  return {
    id: `new_${Date.now()}_${index}`,
    name: `Stage ${index}`,
    length: 30,
    weights: evenSplitNum([2, 4, 8, 16, 32]),
  };
}

function toEditorPlan(initialPlan: Plan | null, mode: 'new' | 'edit'): EditorPlan {
  if (mode === 'new' || !initialPlan) {
    return {
      name: '',
      description: '',
      stages: [
        {
          id: 'new_1',
          name: 'Stage 1',
          length: 30,
          weights: evenSplitNum([2, 4, 8, 16, 32]),
        },
      ],
    };
  }

  return {
    id: initialPlan.id,
    name: initialPlan.name,
    description: initialPlan.description,
    stages: initialPlan.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      length: stage.length,
      weights: fromBackendWeights(stage.probabilities),
    })),
  };
}

function DifficultyBadge({ weights, dense = false }: { weights: Record<string, number>; dense?: boolean }) {
  const ev = expectedValue(weights);
  const log = ev > 0 ? Math.log2(ev) : 0;
  const bucket = log < 5 ? ['easy', '#4ecd7a'] : log < 8 ? ['medium', '#ffb93c'] : log < 11 ? ['hard', '#ff6a3c'] : ['extreme', '#c14dff'];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dense ? 6 : 8,
        padding: dense ? '2px 8px' : '4px 10px',
        background: '#f4f4f8',
        borderRadius: 10,
        border: '1px solid #ececf2',
      }}
    >
      <span style={{ fontSize: dense ? 10 : 11, color: '#8a8a94', letterSpacing: 0.6, textTransform: 'uppercase' }}>EV</span>
      <span
        style={{
          fontFamily: 'Fredoka, system-ui, sans-serif',
          fontWeight: 600,
          fontSize: dense ? 12 : 13.5,
          color: '#2a2a33',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {ev < 10 ? ev.toFixed(1) : Math.round(ev).toLocaleString()}
      </span>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: bucket[1], boxShadow: `0 0 0 2px ${bucket[1]}22` }} />
      <span style={{ fontSize: dense ? 10 : 11, color: bucket[1], fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>{bucket[0]}</span>
    </div>
  );
}

export function AdminV4_Spreadsheet({ initialPlan, mode, onCancel, onSave }: AdminV4_SpreadsheetProps) {
  const [plan, setPlan] = useState<EditorPlan>(() => toEditorPlan(initialPlan, mode));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPlan(toEditorPlan(initialPlan, mode));
  }, [initialPlan, mode]);

  const cols = useMemo(() => [...ALL_VALUES, STONE_VALUE], []);
  const totalLength = useMemo(() => plan.stages.reduce((sum, stage) => sum + stage.length, 0), [plan.stages]);
  const invalidStageIndex = useMemo(
    () => plan.stages.findIndex((stage) => Math.abs(Object.values(stage.weights).reduce((sum, value) => sum + value, 0) - 100) >= 0.5),
    [plan.stages],
  );
  const hasWeightMismatch = invalidStageIndex >= 0;
  const hasNameError = plan.name.trim().length === 0;

  const patchStage = (id: string, patch: Partial<EditorStage>) =>
    setPlan((pl) => ({
      ...pl,
      stages: pl.stages.map((stage) => (stage.id === id ? { ...stage, ...patch } : stage)),
    }));

  const addStage = () =>
    setPlan((pl) => ({
      ...pl,
      stages: [...pl.stages, createBlankStage(pl.stages.length + 1)],
    }));

  function toggleCell(sid: string, v: number) {
    const stage = plan.stages.find((item) => item.id === sid);
    if (!stage) return;
    const has = v in stage.weights;
    const keys = Object.keys(stage.weights).map(Number);
    const next = has ? keys.filter((key) => key !== v) : [...keys, v].sort((a, b) => a - b);
    patchStage(sid, { weights: evenSplitNum(next) });
  }

  function setCell(sid: string, v: number, pct: number) {
    const stage = plan.stages.find((item) => item.id === sid);
    if (!stage || !(v in stage.weights)) return;
    patchStage(sid, { weights: normalizeNum({ ...stage.weights, [v]: pct }, 100) });
  }

  async function handleSave() {
    if (hasWeightMismatch || hasNameError || saving) return;

    const payload: { name: string; description: string; stages: InlineStageInput[] } = {
      name: plan.name.trim(),
      description: plan.description.trim(),
      stages: plan.stages.map((stage, index) => ({
        name: stage.name.trim() || `Stage ${index + 1}`,
        length: stage.length,
        probabilities: toBackendWeights(stage.weights),
        stage_order: index + 1,
      })),
    };

    setSaving(true);
    try {
      const saved = mode === 'new'
        ? await api<Plan>('/api/admin/sequence-plans', { method: 'POST', body: payload })
        : await api<Plan>(`/api/admin/sequence-plans/${initialPlan!.id}`, { method: 'PUT', body: payload });
      onSave(saved);
    } catch (error) {
      toast.error((error as { error?: string })?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 26, background: 'var(--color-bg)', height: '100%', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box', color: '#2a2a33', overflow: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.8 }}>PLAN</div>
          <input
            value={plan.name}
            onChange={(event) => setPlan((current) => ({ ...current, name: event.target.value }))}
            placeholder="计划名称"
            style={{ border: 'none', outline: 'none', fontSize: '1.125rem', fontWeight: 600, fontFamily: 'inherit', width: 200 }}
          />
          <input
            value={plan.description}
            onChange={(event) => setPlan((current) => ({ ...current, description: event.target.value }))}
            placeholder="备注（可选）"
            style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', color: '#6a6a74', flex: 1, fontFamily: 'inherit', minWidth: 0 }}
          />
          <div style={{ fontSize: '0.75rem', color: '#8a8a94' }}>
            总长度 <b style={{ color: '#2a2a33' }}>{totalLength}</b>
          </div>
          <button type="button" style={secondaryBtn} onClick={onCancel}>
            取消
          </button>
          <button type="button" style={{ ...primaryBtn, opacity: hasWeightMismatch || hasNameError || saving ? 0.6 : 1, cursor: hasWeightMismatch || hasNameError || saving ? 'not-allowed' : 'pointer' }} onClick={() => void handleSave()} disabled={hasWeightMismatch || hasNameError || saving}>
            {mode === 'edit' ? '保存' : '创建'}
          </button>
        </div>

        {(hasWeightMismatch || hasNameError) && (
          <div style={{ marginTop: -10, marginBottom: 14, fontSize: '0.75rem', color: '#c83a3a' }}>
            {hasWeightMismatch ? `stage ${invalidStageIndex + 1} 概率和不是 100%` : '计划名称不能为空'}
          </div>
        )}

        <div style={{ overflow: 'auto', border: '1px solid #ececf2', borderRadius: 10 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#fafafc' }}>
                <th style={thStyle}>Stage</th>
                <th style={{ ...thStyle, width: 60 }}>长度</th>
                <th style={{ ...thStyle, width: 110 }}>EV</th>
                {cols.map((value) => (
                  <th key={value} style={{ ...thStyle, width: 58, textAlign: 'center', padding: '10px 4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <CandyChip v={value} size={20} hasNumber={false} />
                      <div style={{ fontSize: '0.625rem', color: '#6a6a74', fontWeight: 500, fontFamily: 'Fredoka, system-ui, sans-serif' }}>{labelOf(value)}</div>
                    </div>
                  </th>
                ))}
                <th style={{ ...thStyle, width: 50 }}>总</th>
              </tr>
            </thead>
            <tbody>
              {plan.stages.map((stage, index) => {
                const sum = Object.values(stage.weights).reduce((acc, value) => acc + value, 0);
                const ok = Math.round(sum) === 100;

                return (
                  <tr key={stage.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 5,
                            background: '#ececf2',
                            color: '#6a6a74',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'Fredoka, system-ui, sans-serif',
                            fontWeight: 600,
                            fontSize: '0.6875rem',
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </div>
                        <input
                          value={stage.name}
                          onChange={(event) => patchStage(stage.id, { name: event.target.value })}
                          style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', fontWeight: 500, flex: 1, minWidth: 0, fontFamily: 'inherit', background: 'transparent' }}
                        />
                      </div>
                    </td>
                    <td style={{ ...tdStyle, padding: '4px 6px' }}>
                      <input
                        type="number"
                        value={stage.length}
                        onChange={(event) => patchStage(stage.id, { length: Number(event.target.value) })}
                        style={{ width: '100%', border: '1px solid #e6e6ec', borderRadius: 5, padding: '5px 6px', fontSize: '0.75rem', textAlign: 'center', fontFamily: 'inherit', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <DifficultyBadge weights={toBackendWeights(stage.weights)} dense />
                    </td>
                    {cols.map((value) => {
                      const has = value in stage.weights;
                      const pct = has ? stage.weights[value] : 0;
                      const color = COLOR_MAP[value];

                      return (
                        <td
                          key={value}
                          style={{
                            ...tdStyle,
                            padding: 3,
                            textAlign: 'center',
                            background: has ? `${color.bg}18` : 'transparent',
                            cursor: has ? 'text' : 'pointer',
                          }}
                          onClick={() => {
                            if (!has) toggleCell(stage.id, value);
                          }}
                        >
                          {has ? (
                            <input
                              type="number"
                              step="0.1"
                              value={Number.isFinite(pct) ? pct.toFixed(1) : '0.0'}
                              onChange={(event) => setCell(stage.id, value, Number(event.target.value))}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                toggleCell(stage.id, value);
                              }}
                              title="右键移除"
                              style={{
                                width: '100%',
                                border: `1px solid ${color.bg}`,
                                borderRadius: 4,
                                padding: '4px 2px',
                                fontSize: '0.6875rem',
                                textAlign: 'center',
                                background: `${color.bg}18`,
                                outline: 'none',
                                fontFamily: 'Fredoka, system-ui, sans-serif',
                                fontWeight: 600,
                                color: color.dark,
                                fontVariantNumeric: 'tabular-nums',
                                boxSizing: 'border-box',
                              }}
                            />
                          ) : (
                            <div style={{ color: '#d0d0d6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Plus size={14} />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: 'center',
                        fontFamily: 'Fredoka, system-ui, sans-serif',
                        fontWeight: 600,
                        color: ok ? '#1fa85a' : '#c83a3a',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.75rem',
                      }}
                    >
                      {Math.round(sum)}%
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={cols.length + 4} style={{ padding: 10, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={addStage}
                    style={{
                      padding: '6px 14px',
                      border: '1.5px dashed #d4d4dc',
                      background: 'transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: '#6a6a74',
                      fontSize: '0.75rem',
                      fontFamily: 'inherit',
                    }}
                  >
                    ＋ 添加 Stage
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: '0.6875rem', color: '#9b9ba6' }}>
          点击空单元格加入数字（自动均分）· 修改数字后其他值等比缩放保持 100% · 右键单元格移除
        </div>
      </div>
    </div>
  );
}
