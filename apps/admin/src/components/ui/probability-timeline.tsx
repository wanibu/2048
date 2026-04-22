import { useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { CandyIcon, candyAvailableKeys } from './candy-icon';

// 排序：数字小→大，stone 放最后
function sortKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === 'stone') return 1;
    if (b === 'stone') return -1;
    return parseInt(a) - parseInt(b);
  });
}

function cloneRecord(r: Record<string, number>): Record<string, number> {
  return { ...r };
}

// 把 delta 从 victim 里扣除（按 victim 当前值均摊），返回新 record
function takeFromOthers(
  record: Record<string, number>,
  exceptKey: string,
  delta: number,
): Record<string, number> {
  const others = Object.keys(record).filter((k) => k !== exceptKey);
  const othersSum = others.reduce((s, k) => s + record[k], 0);
  const next = cloneRecord(record);
  if (othersSum <= 0) {
    // 其他段都是 0，无处扣减，返回原值
    return next;
  }
  for (const k of others) {
    const share = (record[k] / othersSum) * delta;
    next[k] = Math.max(0, record[k] - share);
  }
  return next;
}

// 归一化：总和严格对齐到 100（浮点补偿塞给最大段）
function normalizeTo100(record: Record<string, number>): Record<string, number> {
  const keys = Object.keys(record);
  if (keys.length === 0) return record;
  const total = keys.reduce((s, k) => s + record[k], 0);
  if (total <= 0) return record;
  const scale = 100 / total;
  const next: Record<string, number> = {};
  for (const k of keys) next[k] = record[k] * scale;
  // 浮点修正
  const sum = keys.reduce((s, k) => s + next[k], 0);
  const diff = 100 - sum;
  if (Math.abs(diff) > 1e-9) {
    const maxKey = keys.reduce((m, k) => (next[k] > next[m] ? k : m), keys[0]);
    next[maxKey] += diff;
  }
  return next;
}

export function ProbabilityTimeline({
  value, onChange,
}: {
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  const keys = sortKeys(Object.keys(value));
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ key: string; startX: number; startPct: number } | null>(null);

  const totalSum = Object.values(value).reduce((s, v) => s + v, 0);

  // —— 拖拽：拖某段的右边界（= 调该段的 %，差额均摊给其他段）——
  function onHandlePointerDown(e: React.PointerEvent, key: string) {
    e.stopPropagation();
    e.preventDefault();
    const bar = barRef.current;
    if (!bar) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({ key, startX: e.clientX, startPct: value[key] ?? 0 });
  }
  function onHandlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const bar = barRef.current;
    if (!bar) return;
    const barW = bar.clientWidth;
    if (barW === 0) return;
    const dxPct = ((e.clientX - dragging.startX) / barW) * 100;
    let targetPct = dragging.startPct + dxPct;
    // 限制 0 ~ 100
    targetPct = Math.max(0, Math.min(100, targetPct));
    const delta = targetPct - (value[dragging.key] ?? 0);
    if (Math.abs(delta) < 0.01) return;
    const next = cloneRecord(value);
    next[dragging.key] = targetPct;
    const rebalanced = takeFromOthers(next, dragging.key, delta);
    onChange(normalizeTo100(rebalanced));
  }
  function onHandlePointerUp(e: React.PointerEvent) {
    if (!dragging) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(null);
  }

  function removeKey(k: string) {
    if (!(k in value)) return;
    const removed = value[k];
    const rest: Record<string, number> = {};
    for (const key of Object.keys(value)) if (key !== k) rest[key] = value[key];
    // 把被删段的 % 按现有比例均摊回去
    const restSum = Object.values(rest).reduce((s, v) => s + v, 0);
    const next: Record<string, number> = {};
    if (restSum > 0) {
      for (const key of Object.keys(rest)) {
        next[key] = rest[key] + (rest[key] / restSum) * removed;
      }
    } else {
      // 一种边缘情况：其他段都是 0
      const firstKey = Object.keys(rest)[0];
      if (firstKey) next[firstKey] = removed;
    }
    onChange(Object.keys(next).length > 0 ? normalizeTo100(next) : next);
  }

  function addKey(k: string) {
    if (k in value) return;
    // 从最大段扣 1%，给新段
    const keys = Object.keys(value);
    if (keys.length === 0) {
      onChange({ [k]: 100 });
      return;
    }
    const maxKey = keys.reduce((m, key) => (value[key] > value[m] ? key : m), keys[0]);
    const donation = Math.min(1, value[maxKey]);
    const next = cloneRecord(value);
    next[maxKey] -= donation;
    next[k] = donation;
    onChange(normalizeTo100(next));
  }

  const availableToAdd = candyAvailableKeys().filter((k) => !(k in value));

  return (
    <div className="space-y-2">
      {/* 主轴 */}
      <div className="flex items-center gap-2">
        <div
          ref={barRef}
          className="relative flex-1 h-12 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden select-none"
        >
          {keys.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
              未配置任何糖果 — 点下方 ➕ 添加
            </div>
          ) : (
            <div className="absolute inset-0 flex">
              {keys.map((k, idx) => {
                const pct = value[k] ?? 0;
                const isLast = idx === keys.length - 1;
                return (
                  <div
                    key={k}
                    className="relative flex items-center justify-center border-r border-white/40 last:border-r-0 group"
                    style={{ width: `${pct}%`, minWidth: pct > 0 ? 0 : undefined }}
                  >
                    {pct > 3 && (
                      <>
                        <CandyIcon value={k} size={36} className="opacity-85" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-mono bg-black/50 text-white px-1 rounded">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    )}
                    {/* 删除按钮 */}
                    <button
                      type="button"
                      onClick={() => removeKey(k)}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded bg-white/80 hover:bg-rose-100 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title={`移除 ${k}`}
                    >
                      <X className="h-2.5 w-2.5 text-rose-600" />
                    </button>
                    {/* 拖拽把手 —— 每段右边界（最后一段没有） */}
                    {!isLast && (
                      <div
                        className="absolute top-0 bottom-0 -right-[3px] w-[6px] cursor-ew-resize hover:bg-[var(--color-primary)]/50"
                        onPointerDown={(e) => onHandlePointerDown(e, k)}
                        onPointerMove={onHandlePointerMove}
                        onPointerUp={onHandlePointerUp}
                        onPointerCancel={onHandlePointerUp}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div
          className={`text-xs font-mono w-16 text-right ${
            Math.abs(totalSum - 100) < 0.01 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
          }`}
        >
          {totalSum.toFixed(1)}%
        </div>
      </div>

      {/* 底部候选面板 */}
      {availableToAdd.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center pt-1">
          <span className="text-[11px] text-[var(--color-text-muted)] mr-1">➕ 加入：</span>
          {availableToAdd.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => addKey(k)}
              className="group flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--color-border)] hover:border-[var(--color-primary)] cursor-pointer"
              title={`添加 ${k}`}
            >
              <CandyIcon value={k} size={18} />
              <span className="text-[10px]">{k}</span>
              <Plus className="h-2.5 w-2.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
