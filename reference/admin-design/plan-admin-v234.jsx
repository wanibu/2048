// plan-admin-v2-3-4.jsx — three more layout variants.

// ═══════════════════════════════════════════════════════════════════
// V2 — Split panel: stage list (left) · detail editor (right)
// Pattern familiar from Notion / Linear / Figma file browsers.
// ═══════════════════════════════════════════════════════════════════
function AdminV2_SplitPanel() {
  const [plan, setPlan] = React.useState(SAMPLE_PLAN);
  const [selId, setSelId] = React.useState(plan.stages[0].id);
  const sel = plan.stages.find((s) => s.id === selId) || plan.stages[0];

  const patchStage = (id, p) => setPlan((pl) => ({
    ...pl, stages: pl.stages.map((s) => s.id === id ? { ...s, ...p } : s),
  }));
  const totalLength = plan.stages.reduce((a, s) => a + s.length, 0);

  return (
    <div style={{ padding: 0, background: '#f7f7fa', height: '100%', fontFamily: 'Inter, system-ui, sans-serif', color: '#2a2a33', boxSizing: 'border-box' }}>
      <div style={{ background: '#fff', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* header */}
        <div style={{ padding: '18px 26px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center', gap: 12 }}>
          <input value={plan.name} onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
            style={{ border: 'none', outline: 'none', fontSize: '1.125rem', fontWeight: 600, width: 160, fontFamily: 'inherit', color: '#2a2a33' }} />
          <span style={{ color: '#d0d0d6' }}>·</span>
          <input placeholder="备注" value={plan.note} onChange={(e) => setPlan((p) => ({ ...p, note: e.target.value }))}
            style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', color: '#8a8a94', flex: 1, fontFamily: 'inherit' }} />
          <div style={{ fontSize: '0.75rem', color: '#8a8a94' }}>总长度 <b style={{ color: '#2a2a33' }}>{totalLength}</b></div>
          <button style={secondaryBtn}>取消</button>
          <button style={primaryBtn}>创建</button>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* left rail */}
          <div style={{ width: 260, borderRight: '1px solid #f0f0f4', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px 8px', fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 500 }}>阶段列表</div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0 8px' }}>
              {plan.stages.map((s, i) => {
                const active = s.id === selId;
                const ev = expectedValue(s.weights);
                return (
                  <div key={s.id} onClick={() => setSelId(s.id)} style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 3,
                    background: active ? '#eef0ff' : 'transparent',
                    border: active ? '1px solid #d8dcf4' : '1px solid transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 4, background: active ? '#5a7cff' : '#ececf2',
                        color: active ? '#fff' : '#6a6a74',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.6875rem',
                      }}>{i + 1}</div>
                      <div style={{ flex: 1, fontSize: '0.8125rem', fontWeight: active ? 600 : 500, color: '#2a2a33', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#8a8a94' }}>{s.length}</div>
                    </div>
                    {/* mini bar */}
                    <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 8, background: '#eceaf0' }}>
                      {Object.keys(s.weights).map(Number).map((k) => {
                        const c = COLOR_MAP[k];
                        const t = Object.values(s.weights).reduce((a, b) => a + b, 0);
                        return <div key={k} style={{ flex: `0 0 ${(s.weights[k] / t) * 100}%`, background: c.bg }} />;
                      })}
                    </div>
                    <div style={{ display: 'flex', marginTop: 6, fontSize: '0.625rem', color: '#8a8a94', justifyContent: 'space-between' }}>
                      <span>{Object.keys(s.weights).length} 种</span>
                      <span>EV {ev < 10 ? ev.toFixed(1) : Math.round(ev)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button style={{
              margin: 10, padding: '8px', border: '1.5px dashed #d4d4dc', background: 'transparent',
              borderRadius: 8, cursor: 'pointer', color: '#6a6a74', fontSize: '0.75rem', fontFamily: 'inherit',
            }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="Plus" size={12} /> 添加 Stage</span></button>
          </div>

          {/* detail */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            <DetailEditor stage={sel}
              onName={(v) => patchStage(sel.id, { name: v })}
              onLength={(v) => patchStage(sel.id, { length: v })}
              onWeights={(w) => patchStage(sel.id, { weights: w })} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailEditor({ stage, onName, onLength, onWeights }) {
  const [picker, setPicker] = React.useState(false);
  const keys = Object.keys(stage.weights).map(Number);
  const total = keys.reduce((a, k) => a + stage.weights[k], 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <input value={stage.name} onChange={(e) => onName(e.target.value)} style={{
          border: 'none', outline: 'none', fontSize: '1.25rem', fontWeight: 600, flex: 1, fontFamily: 'inherit', color: '#2a2a33',
        }} />
        <label style={{ fontSize: '0.75rem', color: '#8a8a94' }}>方块数</label>
        <input type="number" value={stage.length} onChange={(e) => onLength(Number(e.target.value))} style={{
          width: 74, border: '1px solid #e6e6ec', borderRadius: 8, padding: '7px 10px',
          fontSize: '0.875rem', textAlign: 'center', background: '#fff', outline: 'none', fontFamily: 'inherit',
        }} />
        <DifficultyBadge weights={stage.weights} />
      </div>

      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>概率分布</div>
      <ProbBar weights={stage.weights} onChange={onWeights} height={48} />
      <div style={{ fontSize: '0.6875rem', color: '#9b9ba6', marginTop: 6 }}>拖动色块之间的白线调整概率。总和 <b style={{ color: Math.round(total) === 100 ? '#1fa85a' : '#c83a3a' }}>{Math.round(total)}%</b></div>

      {/* table of values + weight inputs */}
      <div style={{ marginTop: 22, border: '1px solid #ececf2', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 40px', padding: '10px 14px', background: '#fafafc', fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          <div>方块</div>
          <div style={{ textAlign: 'right' }}>概率</div>
          <div style={{ textAlign: 'right' }}>贡献</div>
          <div />
        </div>
        {keys.map((k) => {
          const p = stage.weights[k];
          const contrib = k * (p / total);
          return (
            <div key={k} style={{
              display: 'grid', gridTemplateColumns: '1fr 120px 120px 40px',
              padding: '10px 14px', alignItems: 'center',
              borderTop: '1px solid #f4f4f8',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CandyChip v={k} size={26} />
                <div style={{ fontWeight: 500, fontFamily: 'Fredoka, system-ui, sans-serif' }}>{labelOf(k)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <input type="number" step="0.1" value={p.toFixed(1)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    onWeights(normalize({ ...stage.weights, [k]: next }, 100));
                  }}
                  style={{
                    width: 90, border: '1px solid #e6e6ec', borderRadius: 6, padding: '5px 8px',
                    fontSize: '0.8125rem', textAlign: 'right', background: '#fff', outline: 'none',
                    fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                  }} />
                <span style={{ fontSize: '0.75rem', color: '#8a8a94', marginLeft: 4 }}>%</span>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem', color: '#6a6a74' }}>{contrib < 10 ? contrib.toFixed(1) : Math.round(contrib)}</div>
              <div style={{ textAlign: 'right' }}>
                <button onClick={() => {
                  const w = { ...stage.weights }; delete w[k];
                  onWeights(normalize(w, 100));
                }}
                  style={{ border: 'none', background: 'transparent', color: '#c6c6cc', cursor: 'pointer', fontSize: '1rem', padding: 0, width: 24, height: 24 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#c83a3a')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#c6c6cc')}>×</button>
              </div>
            </div>
          );
        })}
        <div style={{ borderTop: '1px solid #f4f4f8', padding: 10, position: 'relative' }}>
          <button onClick={() => setPicker((o) => !o)}
            style={{
              width: '100%', padding: '8px', border: '1.5px dashed #d4d4dc', background: 'transparent',
              borderRadius: 8, cursor: 'pointer', color: '#6a6a74', fontSize: '0.8125rem', fontFamily: 'inherit',
            }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="Plus" size={12} /> 加入数字</span></button>
          {picker && (
            <div style={{ position: 'absolute', bottom: '100%', left: 10, right: 10, marginBottom: 6, zIndex: 10 }}>
              <ChipPicker current={stage.weights} onAdd={(v) => {
                const next = [...keys, v].sort((a, b) => a - b);
                onWeights(evenSplit(next));
                setPicker(false);
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V3 — Timeline: stages laid out as a horizontal timeline, widths
// proportional to their length. Below each: compact probability rail
// + chip list. Top: overall difficulty curve.
// ═══════════════════════════════════════════════════════════════════
function AdminV3_Timeline() {
  const [plan, setPlan] = React.useState(SAMPLE_PLAN);
  const [selId, setSelId] = React.useState(plan.stages[0].id);
  const total = plan.stages.reduce((a, s) => a + s.length, 0);

  const patchStage = (id, p) => setPlan((pl) => ({
    ...pl, stages: pl.stages.map((s) => s.id === id ? { ...s, ...p } : s),
  }));

  return (
    <div style={{ padding: 26, background: '#f7f7fa', height: '100%', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box', color: '#2a2a33', overflow: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.8 }}>Plan</div>
          <input value={plan.name} onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
            style={{ border: 'none', outline: 'none', fontSize: '1.125rem', fontWeight: 600, fontFamily: 'inherit' }} />
          <input placeholder="备注" value={plan.note} onChange={(e) => setPlan((p) => ({ ...p, note: e.target.value }))}
            style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', color: '#8a8a94', flex: 1, fontFamily: 'inherit' }} />
          <div style={{ fontSize: '0.75rem', color: '#8a8a94' }}>总 {total} 块 · {plan.stages.length} 阶段</div>
        </div>

        {/* difficulty curve */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>难度曲线（EV log₂）</div>
          <DifficultyCurve stages={plan.stages} />
        </div>

        {/* timeline — stages sized by length */}
        <div style={{ display: 'flex', gap: 6, height: 72, marginBottom: 14 }}>
          {plan.stages.map((s, i) => {
            const sel = s.id === selId;
            const keys = Object.keys(s.weights).map(Number);
            const tw = Object.values(s.weights).reduce((a, b) => a + b, 0) || 1;
            return (
              <div key={s.id} onClick={() => setSelId(s.id)} style={{
                flex: `${s.length} 1 0`, borderRadius: 8,
                border: sel ? '2px solid #5a7cff' : '1px solid #e6e6ec',
                padding: sel ? 5 : 6, cursor: 'pointer',
                background: '#fafafc',
                display: 'flex', flexDirection: 'column', gap: 4,
                minWidth: 0, overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: sel ? '#5a7cff' : '#6a6a74' }}>#{i + 1}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#2a2a33', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.name}</div>
                  <div style={{ fontSize: '0.625rem', color: '#8a8a94', fontFamily: 'Fredoka, system-ui, sans-serif' }}>{s.length}</div>
                </div>
                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: '#eceaf0' }}>
                  {keys.map((k) => (
                    <div key={k} style={{ flex: `0 0 ${(s.weights[k] / tw) * 100}%`, background: COLOR_MAP[k].bg }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 3, marginTop: 2, overflow: 'hidden' }}>
                  {keys.slice(0, 6).map((k) => <CandyChip key={k} v={k} size={14} hasNumber={false} />)}
                  {keys.length > 6 && <div style={{ fontSize: '0.625rem', color: '#8a8a94', alignSelf: 'center' }}>+{keys.length - 6}</div>}
                </div>
              </div>
            );
          })}
          <button style={{
            width: 60, flexShrink: 0, borderRadius: 8, border: '1.5px dashed #d4d4dc',
            background: 'transparent', cursor: 'pointer', color: '#9b9ba6', fontSize: '1.25rem',
            fontFamily: 'inherit',
          }}><Icon name="Plus" size={15} /></button>
        </div>

        {/* selected stage editor */}
        <div style={{ marginTop: 14, padding: 16, background: '#fafafc', borderRadius: 10, border: '1px solid #ececf2' }}>
          {(() => {
            const sel = plan.stages.find((s) => s.id === selId) || plan.stages[0];
            return (
              <DetailEditor stage={sel}
                onName={(v) => patchStage(sel.id, { name: v })}
                onLength={(v) => patchStage(sel.id, { length: v })}
                onWeights={(w) => patchStage(sel.id, { weights: w })} />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function DifficultyCurve({ stages }) {
  const vals = stages.map((s) => {
    const ev = expectedValue(s.weights);
    return ev > 0 ? Math.log2(ev) : 0;
  });
  const max = Math.max(14, ...vals) || 14;
  const min = 0;
  const w = 100;
  const h = 36;
  // build a polyline, one point per stage
  const pts = vals.map((v, i) => {
    const x = (i / Math.max(vals.length - 1, 1)) * w;
    const y = h - ((v - min) / (max - min)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 44, display: 'block' }}>
      <polyline points={pts} fill="none" stroke="#5a7cff" strokeWidth="0.8" strokeLinejoin="round" strokeLinecap="round" />
      {vals.map((v, i) => {
        const x = (i / Math.max(vals.length - 1, 1)) * w;
        const y = h - ((v - min) / (max - min)) * h;
        return <circle key={i} cx={x} cy={y} r="1.4" fill="#5a7cff" />;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
// V4 — Spreadsheet grid: rows = stages, columns = all possible numbers.
// Compact, bulk-edit-friendly — like a designer's Excel.
// ═══════════════════════════════════════════════════════════════════
function AdminV4_Spreadsheet({ initialPlan, mode = 'new', onCancel, onSave } = {}) {
  const [plan, setPlan] = React.useState(initialPlan || SAMPLE_PLAN);
  const cols = [...ALL_VALUES, STONE_VALUE];
  const patchStage = (id, p) => setPlan((pl) => ({
    ...pl, stages: pl.stages.map((s) => s.id === id ? { ...s, ...p } : s),
  }));
  const addStage = () => setPlan((pl) => ({
    ...pl,
    stages: [...pl.stages, {
      id: `stage_${Date.now()}_${pl.stages.length + 1}`,
      name: `Stage ${pl.stages.length + 1}`,
      length: 30,
      weights: evenSplit([2, 4, 8, 16, 32]),
    }],
  }));
  const totalLength = plan.stages.reduce((a, s) => a + s.length, 0);

  const toggleCell = (sid, v) => {
    const s = plan.stages.find((x) => x.id === sid);
    const has = v in s.weights;
    const keys = Object.keys(s.weights).map(Number);
    const next = has ? keys.filter((k) => k !== v) : [...keys, v].sort((a, b) => a - b);
    patchStage(sid, { weights: evenSplit(next) });
  };

  const setCell = (sid, v, pct) => {
    const s = plan.stages.find((x) => x.id === sid);
    if (!(v in s.weights)) return;
    patchStage(sid, { weights: normalize({ ...s.weights, [v]: pct }, 100) });
  };

  return (
    <div style={{ padding: 26, background: '#f7f7fa', height: '100%', fontFamily: 'Inter, system-ui, sans-serif', boxSizing: 'border-box', color: '#2a2a33', overflow: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.8 }}>Plan</div>
          <input value={plan.name} onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
            placeholder="计划名称"
            style={{ border: 'none', outline: 'none', fontSize: '1.125rem', fontWeight: 600, fontFamily: 'inherit', width: 200 }} />
          <input value={plan.note || ''} onChange={(e) => setPlan((p) => ({ ...p, note: e.target.value }))}
            placeholder="备注（可选）"
            style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', color: '#6a6a74', flex: 1, fontFamily: 'inherit', minWidth: 0 }} />
          <div style={{ fontSize: '0.75rem', color: '#8a8a94' }}>总长度 <b style={{ color: '#2a2a33' }}>{totalLength}</b></div>
          <button style={secondaryBtn} onClick={onCancel}>取消</button>
          <button style={primaryBtn} onClick={() => onSave && onSave(plan)}>{mode === 'edit' ? '保存' : '创建'}</button>
        </div>

        {/* grid */}
        <div style={{ overflow: 'auto', border: '1px solid #ececf2', borderRadius: 10 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: '#fafafc' }}>
                <th style={thStyle}>Stage</th>
                <th style={{ ...thStyle, width: 60 }}>长度</th>
                <th style={{ ...thStyle, width: 110 }}>EV</th>
                {cols.map((v) => (
                  <th key={v} style={{ ...thStyle, width: 58, textAlign: 'center', padding: '10px 4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <CandyChip v={v} size={20} hasNumber={false} />
                      <div style={{ fontSize: '0.625rem', color: '#6a6a74', fontWeight: 500, fontFamily: 'Fredoka, system-ui, sans-serif' }}>{labelOf(v)}</div>
                    </div>
                  </th>
                ))}
                <th style={{ ...thStyle, width: 50 }}>总</th>
              </tr>
            </thead>
            <tbody>
              {plan.stages.map((s, i) => {
                const sum = Object.values(s.weights).reduce((a, b) => a + b, 0);
                const ok = Math.round(sum) === 100;
                return (
                  <tr key={s.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 5, background: '#ececf2', color: '#6a6a74',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.6875rem', flexShrink: 0,
                        }}>{i + 1}</div>
                        <input value={s.name} onChange={(e) => patchStage(s.id, { name: e.target.value })}
                          style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', fontWeight: 500, flex: 1, minWidth: 0, fontFamily: 'inherit', background: 'transparent' }} />
                      </div>
                    </td>
                    <td style={{ ...tdStyle, padding: '4px 6px' }}>
                      <input type="number" value={s.length} onChange={(e) => patchStage(s.id, { length: Number(e.target.value) })}
                        style={{ width: '100%', border: '1px solid #e6e6ec', borderRadius: 5, padding: '5px 6px', fontSize: '0.75rem', textAlign: 'center', fontFamily: 'inherit', background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
                    </td>
                    <td style={tdStyle}><DifficultyBadge weights={s.weights} dense /></td>
                    {cols.map((v) => {
                      const has = v in s.weights;
                      const p = has ? s.weights[v] : 0;
                      const c = COLOR_MAP[v];
                      return (
                        <td key={v} style={{
                          ...tdStyle, padding: 3, textAlign: 'center',
                          background: has ? `${c.bg}18` : 'transparent',
                          cursor: has ? 'text' : 'pointer',
                        }}
                          onClick={(e) => {
                            if (!has) toggleCell(s.id, v);
                          }}>
                          {has ? (
                            <input type="number" step="0.1" value={p.toFixed(1)}
                              onChange={(e) => setCell(s.id, v, Number(e.target.value))}
                              onContextMenu={(e) => { e.preventDefault(); toggleCell(s.id, v); }}
                              title="右键移除"
                              style={{
                                width: '100%', border: `1px solid ${c.bg}`, borderRadius: 4,
                                padding: '4px 2px', fontSize: '0.6875rem', textAlign: 'center',
                                background: '#fff', outline: 'none',
                                fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
                                color: c.dark, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box',
                              }} />
                          ) : (
                            <div style={{ color: '#d0d0d6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="Plus" size={14} /></div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, textAlign: 'center',
                      fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
                      color: ok ? '#1fa85a' : '#c83a3a', fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem' }}>{Math.round(sum)}%</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={cols.length + 4} style={{ padding: 10, textAlign: 'center' }}>
                  <button onClick={addStage} style={{
                    padding: '6px 14px', border: '1.5px dashed #d4d4dc', background: 'transparent',
                    borderRadius: 8, cursor: 'pointer', color: '#6a6a74', fontSize: '0.75rem', fontFamily: 'inherit',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2a2a33'; e.currentTarget.style.color = '#2a2a33'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d4d4dc'; e.currentTarget.style.color = '#6a6a74'; }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="Plus" size={12} /> 添加 Stage</span></button>
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

const thStyle = {
  textAlign: 'left', padding: '12px 10px',
  fontSize: '0.625rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6,
  fontWeight: 500, borderBottom: '1px solid #ececf2',
};
const tdStyle = {
  padding: '8px 10px', borderBottom: '1px solid #f4f4f8', verticalAlign: 'middle',
};

Object.assign(window, {
  AdminV2_SplitPanel, AdminV3_Timeline, AdminV4_Spreadsheet, DetailEditor, DifficultyCurve,
});
