// plan-admin-variants.jsx — 4 admin layouts for configuring a Plan
// (N stages; each stage: length + probability distribution over
// a subset of 2048 values + stone). All variants operate on the
// same seed data for direct comparison.

const SAMPLE_PLAN = {
  name: 'planA',
  note: '',
  stages: [
    { id: 's1', name: 'Stage 1 · 暖场',      length: 30, weights: { 2: 18.1, 4: 18.3, 8: 23.9, 16: 24.9, 32: 14.8 } },
    { id: 's2', name: 'Stage 2 · 合成练习',  length: 30, weights: { 64: 64.6, 128: 30.0, 256: 5.4 } },
    { id: 's3', name: 'Stage 3 · 中期',      length: 30, weights: { 64: 20, 128: 20, 256: 20, 512: 20, 1024: 20 } },
    { id: 's4', name: 'Stage 4 · 终盘',      length: 28, weights: { 512: 25, 1024: 25, 2048: 25, 4096: 15, 8192: 10 } },
  ],
};

// ─────────────────────────────────────────────────────────────
// Shared small bits used across variants
// ─────────────────────────────────────────────────────────────

// Picker popover body — click a chip to add it to the stage.
function ChipPicker({ current, onAdd, includeStone = true }) {
  const existing = new Set(Object.keys(current).map(Number));
  const allowed = [...ALL_VALUES, ...(includeStone ? [STONE_VALUE] : [])];
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 6,
      padding: '8px 10px', background: '#fff',
      border: '1px solid #e6e6ec', borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,.12)',
    }}>
      {allowed.filter((v) => !existing.has(v)).map((v) => (
        <button key={v} onClick={() => onAdd(v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: '1px solid #eee',
            padding: '4px 8px 4px 4px', borderRadius: 16, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7fa')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
          <CandyChip v={v} size={20} />
          <span style={{ fontSize: '0.75rem', color: '#5a5a66' }}>{labelOf(v)}</span>
          <span style={{ fontSize: '0.875rem', color: '#c6c6cc', marginLeft: 2 }}>+</span>
        </button>
      ))}
    </div>
  );
}

// Expected-value pill + difficulty indicator
function DifficultyBadge({ weights, dense = false }) {
  const ev = expectedValue(weights);
  // Map expected-block log2 to rough "difficulty" bucket
  const log = ev > 0 ? Math.log2(ev) : 0;
  const bucket = log < 5 ? ['easy', '#4ecd7a'] : log < 8 ? ['medium', '#ffb93c'] : log < 11 ? ['hard', '#ff6a3c'] : ['extreme', '#c14dff'];
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: dense ? 6 : 8,
      padding: dense ? '2px 8px' : '4px 10px',
      background: '#f4f4f8', borderRadius: 10, border: '1px solid #ececf2',
    }}>
      <span style={{ fontSize: dense ? 10 : 11, color: '#8a8a94', letterSpacing: 0.6, textTransform: 'uppercase' }}>EV</span>
      <span style={{
        fontFamily: 'Fredoka, system-ui, sans-serif',
        fontWeight: 600, fontSize: dense ? 12 : 13.5,
        color: '#2a2a33', fontVariantNumeric: 'tabular-nums',
      }}>{ev < 10 ? ev.toFixed(1) : Math.round(ev).toLocaleString()}</span>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: bucket[1], boxShadow: `0 0 0 2px ${bucket[1]}22` }} />
      <span style={{ fontSize: dense ? 10 : 11, color: bucket[1], fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>{bucket[0]}</span>
    </div>
  );
}

// Probability bar: colored segments sized by weight %, drag dividers.
// Each divider only redistributes between its two neighbors.
function ProbBar({ weights, onChange, height = 36, showPercent = true }) {
  const keys = Object.keys(weights).map(Number);
  const total = keys.reduce((a, k) => a + weights[k], 0) || 1;
  const trackRef = React.useRef(null);
  const MIN = 2;

  const startDrag = (i) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const r = trackRef.current.getBoundingClientRect();
    const kL = keys[i], kR = keys[i + 1];
    const startX = e.clientX;
    const sL = weights[kL], sR = weights[kR];
    const sum = sL + sR;
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dPct = (dx / r.width) * 100;
      let newL = sL + dPct, newR = sR - dPct;
      if (newL < MIN) { newL = MIN; newR = sum - MIN; }
      if (newR < MIN) { newR = MIN; newL = sum - MIN; }
      onChange({ ...weights, [kL]: newL, [kR]: newR });
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  return (
    <div ref={trackRef} style={{
      display: 'flex', height, borderRadius: 8, overflow: 'visible',
      background: '#eceaf0', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.15)',
      position: 'relative', touchAction: 'none',
    }}>
      {keys.map((k, i) => {
        const c = COLOR_MAP[k];
        const pct = (weights[k] / total) * 100;
        const isFirst = i === 0, isLast = i === keys.length - 1;
        return (
          <div key={k} style={{
            flex: `0 0 ${pct}%`,
            background: `linear-gradient(to bottom, ${c.bg}, ${c.dark})`,
            borderTopLeftRadius: isFirst ? 8 : 0,
            borderBottomLeftRadius: isFirst ? 8 : 0,
            borderTopRightRadius: isLast ? 8 : 0,
            borderBottomRightRadius: isLast ? 8 : 0,
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 0, overflow: 'visible',
            transition: 'flex-basis .05s linear',
          }}>
            {/* gloss */}
            <div style={{
              position: 'absolute', top: 2, left: isFirst ? 4 : 1, right: isLast ? 4 : 1, height: Math.max(6, height * 0.22),
              background: 'linear-gradient(to bottom, rgba(255,255,255,.5), rgba(255,255,255,0))',
              borderRadius: '8px 8px 50% 50%',
              pointerEvents: 'none',
            }} />
            {pct >= 6 && showPercent && (
              <div style={{
                fontFamily: 'Fredoka, system-ui, sans-serif',
                fontWeight: 700, fontSize: Math.min(13, height * 0.42),
                color: '#fff',
                textShadow: '0 1px 0 rgba(0,0,0,.3)',
                lineHeight: 1, pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}>{pct.toFixed(1)}%</div>
            )}
            {!isLast && (
              <div onPointerDown={startDrag(i)}
                style={{
                  position: 'absolute', right: -5, top: -3, bottom: -3, width: 10,
                  cursor: 'ew-resize', zIndex: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <div style={{
                  width: 2, height: '70%', background: 'rgba(255,255,255,.7)',
                  borderRadius: 1, boxShadow: '0 0 0 1px rgba(0,0,0,.2)',
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V1 — REFINED VERSION OF THE ORIGINAL
// Keeps the original layout shape but re-skins with better spacing,
// cleaner controls, and a small EV badge per stage.
// ═══════════════════════════════════════════════════════════════════
function AdminV1_Refined() {
  const [plan, setPlan] = React.useState(SAMPLE_PLAN);

  const patchStage = (id, p) => setPlan((pl) => ({
    ...pl, stages: pl.stages.map((s) => s.id === id ? { ...s, ...p } : s),
  }));

  const addNumber = (id, v) => {
    const s = plan.stages.find((x) => x.id === id);
    const keys = Object.keys(s.weights).map(Number);
    const nextKeys = [...keys, v].sort((a, b) => a - b);
    patchStage(id, { weights: evenSplit(nextKeys) });
  };
  const removeNumber = (id, v) => {
    const s = plan.stages.find((x) => x.id === id);
    const w = { ...s.weights }; delete w[v];
    patchStage(id, { weights: normalize(w, 100) });
  };

  const totalLength = plan.stages.reduce((a, s) => a + s.length, 0);

  return (
    <div style={{ padding: 28, background: '#f7f7fa', minHeight: '100%', fontFamily: 'Inter, system-ui, sans-serif', color: '#2a2a33' }}>
      {/* modal header */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '1.0625rem', fontWeight: 600 }}>新增 Plan</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '0.8125rem', color: '#9b9ba6' }}>总长度 <b style={{ color: '#2a2a33', marginLeft: 4 }}>{totalLength}</b></div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <LabeledInput label="名称" value={plan.name} onChange={(v) => setPlan((p) => ({ ...p, name: v }))} />
            <LabeledInput label="备注" placeholder="(可选)" value={plan.note} onChange={(v) => setPlan((p) => ({ ...p, note: v }))} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#2a2a33' }}>阶段列表 <span style={{ color: '#9b9ba6', fontWeight: 400, marginLeft: 6 }}>按顺序生成</span></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plan.stages.map((s, i) => (
              <StageCard key={s.id} idx={i} stage={s}
                onName={(v) => patchStage(s.id, { name: v })}
                onLength={(v) => patchStage(s.id, { length: v })}
                onWeights={(w) => patchStage(s.id, { weights: w })}
                onAdd={(v) => addNumber(s.id, v)}
                onRemove={(v) => removeNumber(s.id, v)}
                onDelete={() => setPlan((p) => ({ ...p, stages: p.stages.filter((x) => x.id !== s.id) }))}
                canDelete={plan.stages.length > 1}
              />
            ))}
            <button style={{
              padding: '14px', border: '1.5px dashed #d4d4dc', background: 'transparent',
              borderRadius: 10, cursor: 'pointer', color: '#6a6a74', fontSize: '0.8125rem', fontFamily: 'inherit',
              fontWeight: 500,
            }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="Plus" size={12} /> 添加 Stage</span></button>
          </div>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid #f0f0f4', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={secondaryBtn}>取消</button>
          <button style={primaryBtn}>创建</button>
        </div>
      </div>
    </div>
  );
}

function StageCard({ idx, stage, onName, onLength, onWeights, onAdd, onRemove, onDelete, canDelete }) {
  const [picker, setPicker] = React.useState(false);
  const keys = Object.keys(stage.weights).map(Number);
  const total = keys.reduce((a, k) => a + stage.weights[k], 0);
  const showTotal = Math.round(total);

  return (
    <div style={{
      background: '#fafafc', border: '1px solid #ececf2', borderRadius: 10, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 26, height: 22, borderRadius: 5, background: '#ececf2', color: '#5a5a66',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.75rem',
        }}>#{idx + 1}</div>
        <input value={stage.name} onChange={(e) => onName(e.target.value)} style={{
          flex: 1, border: '1px solid #e6e6ec', borderRadius: 6, padding: '6px 10px',
          fontSize: '0.8125rem', background: '#fff', outline: 'none', fontFamily: 'inherit',
        }} />
        <label style={{ fontSize: '0.75rem', color: '#8a8a94' }}>长度</label>
        <input type="number" value={stage.length} onChange={(e) => onLength(Number(e.target.value))} style={{
          width: 64, border: '1px solid #e6e6ec', borderRadius: 6, padding: '6px 8px',
          fontSize: '0.8125rem', textAlign: 'center', background: '#fff', outline: 'none', fontFamily: 'inherit',
        }} />
        <DifficultyBadge weights={stage.weights} dense />
        <IconBtn title="上移"><Icon name="ArrowUp" size={13} /></IconBtn>
        <IconBtn title="下移"><Icon name="ArrowDown" size={13} /></IconBtn>
        <IconBtn title="删除" danger disabled={!canDelete} onClick={onDelete}><Icon name="X" size={13} /></IconBtn>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <ProbBar weights={stage.weights} onChange={onWeights} height={34} />
        </div>
        <div style={{
          fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.875rem',
          color: showTotal === 100 ? '#1fa85a' : '#c83a3a',
          fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'right',
        }}>{showTotal}%</div>
      </div>

      {/* active chips + add picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center', position: 'relative' }}>
        <button onClick={() => setPicker((o) => !o)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 10px 4px 8px', border: '1px dashed #c4c4cc', borderRadius: 14,
          background: '#fff', cursor: 'pointer', color: '#6a6a74', fontSize: '0.75rem', fontFamily: 'inherit',
        }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="Plus" size={11} /> 加入</span></button>
        {keys.map((v) => (
          <button key={v} onClick={() => onRemove(v)} title="移除" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px 3px 3px', border: '1px solid #ececf2', borderRadius: 14,
            background: '#fff', cursor: 'pointer', fontSize: '0.75rem', color: '#5a5a66', fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#fff0f0', e.currentTarget.style.borderColor = '#ffd4d4')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff', e.currentTarget.style.borderColor = '#ececf2')}>
            <CandyChip v={v} size={18} />
            <span>{labelOf(v)}</span>
            <span style={{ color: '#c6c6cc', marginLeft: 2, display: 'inline-flex', alignItems: 'center' }}><Icon name="X" size={11} /></span>
          </button>
        ))}
        {picker && (
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 10 }}>
            <ChipPicker current={stage.weights} onAdd={(v) => { onAdd(v); setPicker(false); }} />
          </div>
        )}
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', border: '1px solid #e6e6ec', borderRadius: 8,
          padding: '10px 12px', fontSize: '0.875rem', background: '#fff', outline: 'none',
          boxSizing: 'border-box', fontFamily: 'inherit',
        }} />
    </div>
  );
}

function IconBtn({ children, danger, disabled, onClick, title }) {
  return (
    <button disabled={disabled} title={title} onClick={onClick} style={{
      width: 26, height: 26, borderRadius: 6, border: '1px solid #ececf2',
      background: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
      color: disabled ? '#c6c6cc' : danger ? '#c83a3a' : '#6a6a74',
      fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit', padding: 0,
    }}>{children}</button>
  );
}

const primaryBtn = {
  padding: '9px 20px', background: '#2a2a33', color: '#fff', border: 'none',
  borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
};
const secondaryBtn = {
  padding: '9px 20px', background: '#fff', color: '#5a5a66', border: '1px solid #e6e6ec',
  borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
};

Object.assign(window, {
  SAMPLE_PLAN, ChipPicker, DifficultyBadge, ProbBar, StageCard,
  AdminV1_Refined, primaryBtn, secondaryBtn,
});
