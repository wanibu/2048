// plan-detail-views.jsx — Two redesigns of the right-hand Plan Detail area.
// Both are READ-ONLY preview + a top-right "编辑 / 删除" action, matching
// the existing ConfigPage pattern. Shell (left nav + Plans tree) is mocked
// statically so the detail area reads in context.

// ───────── sample ─────────
const DETAIL_PLAN = {
  id: 'bdbe684e-681c-4452-b5a6-291b55f79928',
  name: 'planB',
  desc: 'Plan',
  stagesCount: 4,
  maxLen: 120,
  createdAt: '2026/4/21 18:22:23',
  updatedAt: '2026/4/21 18:22:23',
  stages: [
    { id: 'st1', name: 'Stage 1', length: 30, weights: { 2: 16.7, 4: 16.7, 8: 16.7, 16: 16.7, 32: 16.7, 64: 16.7 } },
    { id: 'st2', name: 'Stage 2', length: 30, weights: { 2: 14.3, 4: 14.3, 8: 14.3, 16: 14.3, 32: 14.3, 64: 14.3, 128: 14.3 } },
    { id: 'st3', name: 'Stage 3', length: 30, weights: { 2: 13.2, 4: 14.3, 8: 16.5, 16: 14.5, 32: 14.5, 64: 14.2, 128: 12.8 } },
    { id: 'st4', name: 'Stage 4', length: 30, weights: { 2: 16.7, 4: 16.7, 8: 16.7, 16: 16.7, 32: 16.7, 64: 16.7 } },
  ],
  sequences: [
    { id: '34025f32-a2c1-4da8', name: 'planA_seq_1a8f', note: '默认配置首轮采样',              createdAt: '2026/4/21 18:22' },
    { id: '92e9a3d4-b018-4c22', name: 'planA_seq_9e21', note: '提高后期 2048 概率测试',         createdAt: '2026/4/21 18:25' },
    { id: '31d10fb0-c410-4e88', name: 'planA_seq_7c4d', note: '',                              createdAt: '2026/4/21 18:28' },
    { id: '8640e23a-4a20-4c00', name: 'planA_seq_2f06', note: '对照组 — 仅调整阶段 3 权重',    createdAt: '2026/4/21 18:31' },
  ],
};

// ───────── shell chrome (left nav + tree + header) ─────────
function AdminShell({ children }) {
  const nav = [
    { k: 'stats', label: '统计', icon: '▦' },
    { k: 'analysis', label: '样本分析', icon: '◈' },
    { k: 'games', label: '游戏局', icon: '◐' },
    { k: 'config', label: '配置', icon: '⚙', active: true },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'Inter, system-ui, sans-serif', color: '#2a2a33', background: '#f7f7fa' }}>
      {/* left nav */}
      <div style={{ width: 168, background: '#fafaf7', borderRight: '1px solid #ececf2', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 18px 14px' }}>
          <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: 17, color: '#c8343a' }}>Giant 2048</div>
          <div style={{ fontSize: 10, color: '#9b9ba6' }}>Admin · v0.1.2</div>
        </div>
        <div style={{ padding: '6px 8px', flex: 1 }}>
          {nav.map((n) => (
            <div key={n.k} style={{
              padding: '7px 10px', borderRadius: 6, fontSize: 12.5, marginBottom: 2,
              background: n.active ? '#ececf2' : 'transparent',
              color: n.active ? '#2a2a33' : '#6a6a74',
              fontWeight: n.active ? 600 : 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 12, color: '#9b9ba6', width: 14, textAlign: 'center' }}>{n.icon}</span>
              {n.label}
            </div>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #ececf2', fontSize: 11, color: '#9b9ba6' }}>↩ 退出</div>
      </div>

      {/* main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* top bar */}
        <div style={{ height: 48, borderBottom: '1px solid #ececf2', display: 'flex', alignItems: 'center', padding: '0 20px', background: '#fff', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>配置</div>
          <div style={{ flex: 1 }} />
          <button style={{ fontSize: 12, padding: '5px 12px', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', color: '#5a5a66', cursor: 'pointer', fontFamily: 'inherit' }}>↻ 刷新</button>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* plans tree */}
          <div style={{ width: 248, borderRight: '1px solid #ececf2', background: '#fff', padding: 14, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="搜索框" style={{
              width: '100%', padding: '6px 10px', fontSize: 12, border: '1px solid #e6e6ec',
              borderRadius: 6, background: '#fafafc', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', fontSize: 12, fontWeight: 600, color: '#6a6a74' }}>
                <span>▼ Plans</span>
                <span style={{ color: '#9b9ba6', fontWeight: 400 }}>1 <span style={{ marginLeft: 4, color: '#c0c0c8' }}>+</span></span>
              </div>
              <div>
                <div style={{
                  padding: '6px 10px', fontSize: 12.5, borderRadius: 6,
                  background: '#fff3ea', color: '#2a2a33', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 2,
                }}>
                  <span>▾ planB</span><span style={{ color: '#c87a3a', fontWeight: 500, fontSize: 11 }}>4</span>
                </div>
                {DETAIL_PLAN.sequences.map((s) => (
                  <div key={s.id} style={{ padding: '5px 12px 5px 26px', fontSize: 11.5, color: '#6a6a74', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#c6c6cc' }}>◦</span>
                    <span style={{ fontFamily: 'Menlo, monospace', fontSize: 11 }}>{s.id}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ color: '#c6c6cc', fontSize: 10 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* detail slot */}
          <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── small bits shared by both detail variants ─────────
function Dominant(weights, n = 3) {
  const entries = Object.entries(weights).map(([k, w]) => [Number(k), w]).sort((a, b) => b[1] - a[1]);
  return entries.slice(0, n);
}

function MiniProbBar({ weights, height = 10 }) {
  const entries = Object.entries(weights).map(([k, w]) => [Number(k), w]);
  const total = entries.reduce((a, [, w]) => a + w, 0) || 1;
  return (
    <div style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', background: '#eceaf0' }}>
      {entries.map(([k, w]) => (
        <div key={k} title={`${labelOf(k)} · ${w.toFixed(1)}%`}
          style={{ flex: `0 0 ${(w / total) * 100}%`, background: COLOR_MAP[k].bg }} />
      ))}
    </div>
  );
}

function SeqStatusPill({ status }) {
  const ok = status === 'enabled';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 7px', borderRadius: 10, fontSize: 10.5, fontWeight: 500,
      background: ok ? '#e6f5ec' : '#f4f4f8', color: ok ? '#1fa85a' : '#9b9ba6',
      border: `1px solid ${ok ? '#c8e6d3' : '#ececf2'}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: ok ? '#1fa85a' : '#b0b0b8' }} />
      {ok ? 'enabled' : 'disabled'}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANT A — 紧凑表格式 (compact table-style stages)
//   · Overview bar at top: meta reduced to one horizontal strip
//   · Stages as a dense table: order · name · length · dominant tokens
//     · mini prob bar · percent pills · chevron
//   · Bottom: generated sequences list
// ═══════════════════════════════════════════════════════════════════
function DetailVariantA() {
  const p = DETAIL_PLAN;
  return (
    <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* header card */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Fredoka, system-ui, sans-serif' }}>{p.name}</div>
          <span style={{ fontSize: 11, color: '#6a6a74', padding: '2px 8px', border: '1px solid #ececf2', borderRadius: 4, background: '#fafafc' }}>{p.desc}</span>
          <div style={{ flex: 1 }} />
          <button style={{ ...secondaryBtn, padding: '6px 12px', fontSize: 12 }}>✎ 编辑</button>
          <button style={{
            padding: '6px 10px', fontSize: 12, background: '#fff', color: '#c83a3a',
            border: '1px solid #f0d6d6', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
          }}>🗑</button>
        </div>

        {/* meta strip — single row, subtly separated */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 100px 110px minmax(0, 1.5fr) minmax(0, 1.5fr)', gap: 0, fontSize: 11.5, color: '#8a8a94' }}>
          <MetaCell label="ID" value={p.id} mono />
          <MetaCell label="阶段数" value={p.stagesCount} />
          <MetaCell label="最长长度" value={p.maxLen} />
          <MetaCell label="创建" value={p.createdAt} />
          <MetaCell label="更新" value={p.updatedAt} last />
        </div>
      </div>

      {/* stages card */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>阶段顺序</div>
          <div style={{ marginLeft: 8, fontSize: 11, color: '#9b9ba6' }}>{p.stages.length} 个阶段 · 共 {p.stages.reduce((a, s) => a + s.length, 0)} 方块</div>
        </div>
        <div>
          {/* column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 60px minmax(0, 1.6fr) minmax(0, 1.2fr) 24px',
            padding: '8px 20px', background: '#fafafc', borderBottom: '1px solid #f0f0f4',
            fontSize: 10, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, gap: 14,
          }}>
            <div>#</div>
            <div>名称</div>
            <div style={{ textAlign: 'right' }}>长度</div>
            <div>概率分布</div>
            <div>主导</div>
            <div />
          </div>
          {p.stages.map((s, i) => {
            const dom = Dominant(s.weights, 4);
            return (
              <div key={s.id} style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr 60px minmax(0, 1.6fr) minmax(0, 1.2fr) 24px',
                padding: '14px 20px', borderBottom: i === p.stages.length - 1 ? 'none' : '1px solid #f4f4f8',
                alignItems: 'center', gap: 14, fontSize: 12.5,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 5, background: '#f4f4f8', color: '#6a6a74',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: 11,
                }}>{i + 1}</div>
                <div style={{ fontWeight: 500 }}>{s.name}</div>
                <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', color: '#2a2a33' }}>{s.length}</div>
                <div>
                  <MiniProbBar weights={s.weights} height={8} />
                  <div style={{ fontSize: 10, color: '#9b9ba6', marginTop: 4, fontFamily: 'Fredoka, system-ui, sans-serif' }}>
                    {Object.keys(s.weights).length} 种 · 最大 {Math.max(...Object.values(s.weights)).toFixed(1)}%
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  {dom.map(([k, w]) => (
                    <span key={k} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 6px 2px 2px', background: `${COLOR_MAP[k].bg}14`,
                      borderRadius: 10, fontSize: 10.5, color: COLOR_MAP[k].dark,
                      fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
                    }}>
                      <CandyChip v={k} size={14} hasNumber={false} />
                      {w.toFixed(0)}%
                    </span>
                  ))}
                </div>
                <div style={{ color: '#c6c6cc', textAlign: 'right', fontSize: 14 }}>›</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* sequences card */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>已生成序列</div>
          <div style={{ marginLeft: 8, fontSize: 11, color: '#9b9ba6' }}>{p.sequences.length} 条</div>
          <div style={{ flex: 1 }} />
          <button style={{ ...secondaryBtn, padding: '5px 11px', fontSize: 11.5 }}>＋ 生成序列</button>
        </div>
        <div style={{ padding: '6px 0' }}>
          {p.sequences.map((s, i) => (
            <div key={s.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 100px 170px 20px',
              padding: '8px 20px', alignItems: 'center', gap: 12, fontSize: 12,
              borderBottom: i === p.sequences.length - 1 ? 'none' : '1px solid #f8f8fa',
            }}>
              <div style={{ fontFamily: 'Menlo, monospace', fontSize: 11.5, color: '#5a5a66' }}>{s.id}</div>
              <div style={{ color: '#6a6a74', fontFamily: 'Fredoka, system-ui, sans-serif' }}>长度 {s.len}</div>
              <div><SeqStatusPill status={s.status} /></div>
              <div style={{ color: '#9b9ba6', fontSize: 11 }}>{s.createdAt}</div>
              <div style={{ color: '#c6c6cc', textAlign: 'right' }}>›</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value, mono, last }) {
  return (
    <div style={{ padding: '4px 16px', borderRight: last ? 'none' : '1px solid #f0f0f4' }}>
      <div style={{ fontSize: 10, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>{label}</div>
      <div style={{
        fontSize: 12, color: '#2a2a33', fontWeight: 500,
        fontFamily: mono ? 'Menlo, monospace' : 'inherit',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANT B — 信息分层式 (information hierarchy)
//   · Big plan header with name + key KPI pills in a single line
//   · Collapsed meta: ID/timestamps hidden behind a ⓘ popover
//   · Stages rendered as a vertical list, but with clear hierarchy:
//     big numbered pill · stage title · prob bar fills row width ·
//     muted token chips + length on the right.
//   · Sequences relegated to a sidebar on the right.
// ═══════════════════════════════════════════════════════════════════
function DetailVariantB() {
  const p = DETAIL_PLAN;
  return (
    <div style={{ padding: 22, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* hero header */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Fredoka, system-ui, sans-serif', lineHeight: 1 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: '#9b9ba6' }}>{p.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 22, fontSize: 12, color: '#6a6a74' }}>
                <KpiInline label="阶段" value={p.stagesCount} />
                <KpiInline label="最长长度" value={p.maxLen} />
                <KpiInline label="序列" value={p.sequences.length} />
                <KpiInline label="更新" value="刚刚" muted />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '7px 10px', fontSize: 11.5, background: '#fafafc', color: '#6a6a74',
                border: '1px solid #ececf2', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              }} title={`ID · ${p.id}\n创建 · ${p.createdAt}`}>ⓘ 详情</button>
              <button style={{ ...primaryBtn, padding: '7px 14px', fontSize: 12 }}>✎ 编辑</button>
              <button style={{
                padding: '7px 10px', fontSize: 12, background: '#fff', color: '#c83a3a',
                border: '1px solid #f0d6d6', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              }}>🗑</button>
            </div>
          </div>
        </div>

        {/* stages list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10, gap: 10, padding: '0 4px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2a2a33', textTransform: 'uppercase', letterSpacing: 0.8 }}>阶段顺序</div>
            <div style={{ fontSize: 11, color: '#9b9ba6' }}>{p.stages.length} 个 · 共 {p.stages.reduce((a, s) => a + s.length, 0)} 方块</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {p.stages.map((s, i) => {
              const dom = Dominant(s.weights, 5);
              const tokenCount = Object.keys(s.weights).length;
              return (
                <div key={s.id} style={{
                  background: '#fff', border: '1px solid #ececf2', borderRadius: 10,
                  padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  {/* order pill */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 9,
                    background: 'linear-gradient(135deg, #fff3ea, #ffe0c8)',
                    color: '#b0601c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: 16,
                    flexShrink: 0, border: '1px solid #f7d5b3',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#9b9ba6' }}>{tokenCount} 种 token</div>
                      <div style={{ flex: 1 }} />
                      <div style={{ fontSize: 11, color: '#9b9ba6' }}>长度</div>
                      <div style={{
                        fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
                        fontSize: 15, color: '#2a2a33', fontVariantNumeric: 'tabular-nums',
                      }}>{s.length}</div>
                    </div>
                    <MiniProbBar weights={s.weights} height={12} />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                      {dom.map(([k, w]) => (
                        <div key={k} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '2px 7px 2px 2px',
                          borderRadius: 12, fontSize: 10.5,
                          background: '#fafafc', border: '1px solid #f0f0f4',
                          color: '#5a5a66',
                          fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 500,
                        }}>
                          <CandyChip v={k} size={16} hasNumber={false} />
                          <span>{labelOf(k)}</span>
                          <span style={{ color: '#9b9ba6' }}>{w.toFixed(1)}%</span>
                        </div>
                      ))}
                      {tokenCount > dom.length && (
                        <div style={{ fontSize: 11, color: '#9b9ba6' }}>+{tokenCount - dom.length}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* right sidebar — generated sequences */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>已生成序列</div>
            <div style={{ marginLeft: 8, fontSize: 11, color: '#9b9ba6' }}>{p.sequences.length}</div>
            <div style={{ flex: 1 }} />
            <button style={{
              padding: '4px 10px', fontSize: 11, background: '#fafafc', color: '#5a5a66',
              border: '1px solid #e6e6ec', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
            }}>＋</button>
          </div>
          <div>
            {p.sequences.map((s, i) => (
              <div key={s.id} style={{
                padding: '10px 16px', borderBottom: i === p.sequences.length - 1 ? 'none' : '1px solid #f8f8fa',
                display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: 'Menlo, monospace', fontSize: 11, color: '#2a2a33', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.id}</div>
                  <SeqStatusPill status={s.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#9b9ba6' }}>
                  <span style={{ fontFamily: 'Fredoka, system-ui, sans-serif' }}>长度 {s.len}</span>
                  <span>{s.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* quick actions */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', padding: 14 }}>
          <div style={{ fontSize: 11, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>操作</div>
          <button style={{ ...secondaryBtn, width: '100%', marginBottom: 6, fontSize: 12, padding: '7px' }}>＋ 生成新序列</button>
          <button style={{ ...secondaryBtn, width: '100%', fontSize: 12, padding: '7px' }}>导出 Plan JSON</button>
        </div>
      </div>
    </div>
  );
}

function KpiInline({ label, value, muted }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <div style={{ fontSize: 10.5, color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{
        fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
        fontSize: muted ? 12.5 : 14, color: muted ? '#6a6a74' : '#2a2a33',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  );
}

Object.assign(window, {
  DETAIL_PLAN, AdminShell, DetailVariantA, DetailVariantB,
  Dominant, MiniProbBar, SeqStatusPill,
});
