import { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, X, Plus } from 'lucide-react';
import { CANDY_ORDER, CANDY_COLORS, candyLabel } from './candy-colors';
import { Input } from './input';
import { Button } from './button';

export interface StageDraft {
  name: string;
  length: number;
  probabilities: Record<string, number>;
}

export interface ProbabilityGridProps {
  stages: StageDraft[];
  onStagesChange: (next: StageDraft[]) => void;
  onAdd: () => void;
}

// ============ 数学 ============

function normalizeTo100(record: Record<string, number>): Record<string, number> {
  const keys = Object.keys(record);
  if (keys.length === 0) return {};
  const total = keys.reduce((s, k) => s + record[k], 0);
  if (total <= 0) {
    // 全 0：均分
    const even = 100 / keys.length;
    return Object.fromEntries(keys.map((k) => [k, even]));
  }
  const scale = 100 / total;
  const next: Record<string, number> = {};
  for (const k of keys) next[k] = record[k] * scale;
  const sum = keys.reduce((s, k) => s + next[k], 0);
  const diff = 100 - sum;
  if (Math.abs(diff) > 1e-9) {
    const maxKey = keys.reduce((m, k) => (next[k] > next[m] ? k : m), keys[0]);
    next[maxKey] += diff;
  }
  return next;
}

// 改某段为新值，其他段按原比例分配剩余额度
function setAndRebalance(
  record: Record<string, number>, key: string, newVal: number,
): Record<string, number> {
  const clamped = Math.max(0, Math.min(100, newVal));
  const others = Object.keys(record).filter((k) => k !== key);
  const othersSum = others.reduce((s, k) => s + record[k], 0);
  const remaining = 100 - clamped;
  const next: Record<string, number> = { [key]: clamped };
  if (othersSum <= 0) {
    // 其他段全 0 —— 把 remaining 均分
    const even = others.length > 0 ? remaining / others.length : 0;
    for (const k of others) next[k] = even;
  } else {
    const scale = remaining / othersSum;
    for (const k of others) next[k] = record[k] * scale;
  }
  return normalizeTo100(next);
}

// 添加新 key：所有段 (N+1) 均分到 100/(N+1)
function addEvenly(record: Record<string, number>, key: string): Record<string, number> {
  if (key in record) return record;
  const keys = [...Object.keys(record), key];
  const even = 100 / keys.length;
  return Object.fromEntries(keys.map((k) => [k, even]));
}

// 移除 key：剩余段按当前比例放大回 100
function removeKey(record: Record<string, number>, key: string): Record<string, number> {
  if (!(key in record)) return record;
  const next: Record<string, number> = {};
  for (const k of Object.keys(record)) if (k !== key) next[k] = record[k];
  return Object.keys(next).length === 0 ? {} : normalizeTo100(next);
}

// ============ 单元格：可编辑数字或 + ============

function PctCell({
  k, value, onChange, onRemove,
}: {
  k: string;
  value: number | undefined;
  onChange: (n: number) => void;
  onRemove: () => void;
}) {
  const has = value !== undefined;
  const color = CANDY_COLORS[k];
  const [editing, setEditing] = useState(false);
  const [buf, setBuf] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const n = parseFloat(buf);
    if (Number.isFinite(n)) onChange(n);
    setEditing(false);
  }

  function onContextMenu(e: React.MouseEvent) {
    if (!has) return;
    e.preventDefault();
    onRemove();
  }

  if (editing) {
    return (
      <td className="p-1 text-center">
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={buf}
          onChange={(e) => setBuf(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-14 px-1 py-0.5 text-xs font-mono text-center rounded border border-[var(--color-primary)] outline-none"
        />
      </td>
    );
  }

  if (!has) {
    return (
      <td className="p-0 text-center">
        <button
          type="button"
          onClick={() => onChange(0 /* marker 值，由 onChange 触发 addEvenly */)}
          className="w-full h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] cursor-pointer opacity-50 hover:opacity-100"
          title={`加入 ${k}（所有段自动均分）`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </td>
    );
  }

  return (
    <td className="p-1 text-center" onContextMenu={onContextMenu}>
      <button
        type="button"
        onClick={() => { setBuf(value!.toFixed(1)); setEditing(true); }}
        className="inline-block px-2 py-0.5 text-xs font-mono rounded border cursor-pointer hover:shadow-sm"
        style={{
          background: color.badgeBg,
          color: color.badgeText,
          borderColor: color.badgeBorder,
        }}
        title={`${k} = ${value!.toFixed(1)}% · 点击编辑 · 右键移除`}
      >
        {value!.toFixed(1)}
      </button>
    </td>
  );
}

// ============ Stage 行 ============

function StageRow({
  idx, stage, total, canMoveUp, canMoveDown,
  onChangeName, onChangeLength, onCellChange, onCellRemove,
  onMoveUp, onMoveDown, onDelete,
}: {
  idx: number;
  stage: StageDraft;
  total: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChangeName: (v: string) => void;
  onChangeLength: (v: number) => void;
  onCellChange: (k: string, v: number) => void;
  onCellRemove: (k: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const isValid = Math.abs(total - 100) < 0.01 && stage.name.trim() && stage.length > 0;

  return (
    <tr className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/40 group">
      <td className="px-2 py-2 text-center text-xs text-[var(--color-text-muted)] font-mono">
        {idx + 1}
      </td>
      <td className="px-2 py-2 min-w-[180px]">
        <Input
          value={stage.name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Stage 名"
          className="h-7 text-sm"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          min={1}
          value={stage.length}
          onChange={(e) => onChangeLength(parseInt(e.target.value) || 0)}
          className="w-16 h-7 text-sm text-center"
        />
      </td>
      {CANDY_ORDER.map((k) => (
        <PctCell
          key={k}
          k={k}
          value={stage.probabilities[k]}
          onChange={(n) => onCellChange(k, n)}
          onRemove={() => onCellRemove(k)}
        />
      ))}
      <td className="px-2 py-2 text-right text-xs font-mono">
        <span className={isValid ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
          {total.toFixed(0)}%
        </span>
      </td>
      <td className="px-1 py-2 whitespace-nowrap">
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={!canMoveUp} title="上移">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={!canMoveDown} title="下移">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="删除 Stage">
            <X className="h-3.5 w-3.5 text-[var(--color-danger)]" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ============ 主组件 ============

export function ProbabilityGrid({ stages, onStagesChange, onAdd }: ProbabilityGridProps) {
  function updateStage(idx: number, patch: Partial<StageDraft>) {
    onStagesChange(stages.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function removeStage(idx: number) {
    onStagesChange(stages.filter((_, i) => i !== idx));
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= stages.length) return;
    const copy = [...stages];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    onStagesChange(copy);
  }

  function cellChange(stageIdx: number, k: string, n: number) {
    const stage = stages[stageIdx];
    const existing = stage.probabilities;
    let nextProbs: Record<string, number>;
    if (!(k in existing)) {
      // 加入：均分
      nextProbs = addEvenly(existing, k);
    } else {
      // 修改：按比例重分配
      nextProbs = setAndRebalance(existing, k, n);
    }
    updateStage(stageIdx, { probabilities: nextProbs });
  }

  function cellRemove(stageIdx: number, k: string) {
    const stage = stages[stageIdx];
    const nextProbs = removeKey(stage.probabilities, k);
    updateStage(stageIdx, { probabilities: nextProbs });
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--color-surface-2)]/40 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-2 py-3 text-center w-10">#</th>
              <th className="px-2 py-3 text-left">Stage</th>
              <th className="px-2 py-3 text-center w-20">长度</th>
              {CANDY_ORDER.map((k) => (
                <th key={k} className="px-1 py-2 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="w-6 h-6 rounded-full shadow-sm"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), ${CANDY_COLORS[k].ball} 70%)`,
                      }}
                      title={k}
                    />
                    <span className="text-[10px] font-mono text-[var(--color-text)]">{candyLabel(k)}</span>
                  </div>
                </th>
              ))}
              <th className="px-2 py-3 text-right w-14">总</th>
              <th className="px-1 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {stages.length === 0 ? (
              <tr>
                <td colSpan={CANDY_ORDER.length + 5} className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
                  尚未添加 Stage —— 点下方按钮新增
                </td>
              </tr>
            ) : stages.map((s, idx) => {
              const total = Object.values(s.probabilities).reduce((a, b) => a + b, 0);
              return (
                <StageRow
                  key={idx}
                  idx={idx}
                  stage={s}
                  total={total}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < stages.length - 1}
                  onChangeName={(v) => updateStage(idx, { name: v })}
                  onChangeLength={(v) => updateStage(idx, { length: v })}
                  onCellChange={(k, n) => cellChange(idx, k, n)}
                  onCellRemove={(k) => cellRemove(idx, k)}
                  onMoveUp={() => move(idx, -1)}
                  onMoveDown={() => move(idx, 1)}
                  onDelete={() => removeStage(idx)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[var(--color-border)] p-3 flex justify-center">
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          添加 Stage
        </Button>
      </div>
      <div className="px-4 pb-3 text-[11px] text-[var(--color-text-muted)]">
        点击空单元格 <Plus className="inline h-2.5 w-2.5" /> 加入数字（所有段自动均分）·
        点数字编辑后其他值等比缩放保持 100% · 右键单元格移除
      </div>
    </div>
  );
}
