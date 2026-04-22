// plan-detail-views.jsx — Two redesigns of the right-hand Plan Detail area.
// Both are READ-ONLY preview + a top-right "编辑 / 删除" action, matching
// the existing ConfigPage pattern. Shell (left nav + Plans tree) is mocked
// statically so the detail area reads in context.

// ───────── sample plans (unified demo data) ─────────
// Each sequence carries a deterministic tokens[] generated from the plan's
// stage weights — stones inserted at even intervals, never in first 4 slots.

const PLAN_A = {
  id: 'bdbe684e-681c-4452-b5a6-291b55f79928',
  name: 'planA',
  note: '基础方案 · 从小数字起步',
  stagesCount: 4,
  maxLen: 118,
  createdAt: '2026-04-21 18:22:23',
  updatedAt: '2026-04-21 18:22:23',
  stages: [
    { id: 'a_s1', name: 'Stage 1 · 暖场',      length: 30, weights: { 2: 18.1, 4: 18.3, 8: 23.9, 16: 24.9, 32: 14.8 } },
    { id: 'a_s2', name: 'Stage 2 · 合成练习',  length: 30, weights: { 64: 60, 128: 28, 256: 7, stone: 5 } },
    { id: 'a_s3', name: 'Stage 3 · 中期',      length: 30, weights: { 64: 18, 128: 18, 256: 18, 512: 18, 1024: 18, stone: 10 } },
    { id: 'a_s4', name: 'Stage 4 · 终盘',      length: 28, weights: { 512: 25, 1024: 25, 2048: 20, 4096: 15, 8192: 10, stone: 5 } },
  ],
  sequences: [],
};
PLAN_A.sequences = [
  { id: '34025f32-a2c1-4da8-9312-1a8f2c7e0a11', name: 'planA_seq_1a8f', displayName: 'planA版本1', note: '默认配置首轮采样',  status: 'enabled',  length: 118, createdAt: '2026-04-21 18:22:08', tokens: genTokens(PLAN_A, 1001) },
  { id: '92e9a3d4-b018-4c22-b010-9e210b3f2c44', name: 'planA_seq_9e21', displayName: 'planA版本2', note: '提高后期概率测试',   status: 'enabled',  length: 118, createdAt: '2026-04-21 18:25:14', tokens: genTokens(PLAN_A, 1002) },
  { id: '31d10fb0-c410-4e88-9400-7c4d10aa8820', name: 'planA_seq_7c4d', displayName: 'planA版本3', note: '',                status: 'disabled', length: 118, createdAt: '2026-04-21 18:28:40', tokens: genTokens(PLAN_A, 1003) },
  { id: '8640e23a-4a20-4c00-82cc-2f06a10bb044', name: 'planA_seq_2f06', displayName: 'planA版本4', note: '对照组',           status: 'disabled', length: 118, createdAt: '2026-04-21 18:31:02', tokens: genTokens(PLAN_A, 1004) },
];

const PLAN_B = {
  id: '7a210ff8-c42e-4812-a6c0-5514f88b0a12',
  name: 'planB',
  note: '扩展方案 · 均衡权重',
  stagesCount: 4,
  maxLen: 120,
  createdAt: '2026-04-20 23:53:29',
  updatedAt: '2026-04-21 14:02:18',
  stages: [
    { id: 'b_s1', name: 'Stage 1', length: 30, weights: { 2: 16.7, 4: 16.7, 8: 16.7, 16: 16.7, 32: 16.7, 64: 16.7 } },
    { id: 'b_s2', name: 'Stage 2', length: 30, weights: { 2: 14.3, 4: 14.3, 8: 14.3, 16: 14.3, 32: 14.3, 64: 14.3, 128: 14.3 } },
    { id: 'b_s3', name: 'Stage 3', length: 30, weights: { 2: 13.2, 4: 14.3, 8: 16.5, 16: 14.5, 32: 14.5, 64: 14.2, 128: 12.8 } },
    { id: 'b_s4', name: 'Stage 4', length: 30, weights: { 2: 16.7, 4: 16.7, 8: 16.7, 16: 16.7, 32: 16.7, 64: 16.7 } },
  ],
  sequences: [],
};
PLAN_B.sequences = [
  { id: 'a12fe842-b004-4122-9e00-4b811a22cc08', name: 'planB_seq_4b81', displayName: 'planB版本1', note: '基线',     status: 'enabled', length: 120, createdAt: '2026-04-20 23:53:29', tokens: genTokens(PLAN_B, 2001) },
  { id: 'b73ff9c2-0880-4e22-bc40-c09110884a11', name: 'planB_seq_c091', displayName: 'planB版本2', note: '扩展权重',  status: 'enabled', length: 120, createdAt: '2026-04-21 08:14:27', tokens: genTokens(PLAN_B, 2002) },
];

const ALL_PLANS = [PLAN_A, PLAN_B];
const DETAIL_PLAN = PLAN_B;  // back-compat alias for AdminShell preview

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
          <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: '1.0625rem', color: '#c8343a' }}>Giant 2048</div>
          <div style={{ fontSize: '0.625rem', color: '#9b9ba6' }}>Admin · v0.1.2</div>
        </div>
        <div style={{ padding: '6px 8px', flex: 1 }}>
          {nav.map((n) => (
            <div key={n.k} style={{
              padding: '7px 10px', borderRadius: 6, fontSize: '0.7812rem', marginBottom: 2,
              background: n.active ? '#ececf2' : 'transparent',
              color: n.active ? '#2a2a33' : '#6a6a74',
              fontWeight: n.active ? 600 : 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: '0.75rem', color: '#9b9ba6', width: 14, textAlign: 'center' }}>{n.icon}</span>
              {n.label}
            </div>
          ))}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #ececf2', fontSize: '0.6875rem', color: '#9b9ba6', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="LogOut" size={13} /> 退出
        </div>
      </div>

      {/* main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* top bar */}
        <div style={{ height: 48, borderBottom: '1px solid #ececf2', display: 'flex', alignItems: 'center', padding: '0 20px', background: '#fff', flexShrink: 0 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>配置</div>
          <div style={{ flex: 1 }} />
          <button style={{ fontSize: '0.75rem', padding: '5px 12px', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', color: '#5a5a66', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="RefreshCw" size={12} /> 刷新
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* plans tree */}
          <div style={{ width: 248, borderRight: '1px solid #ececf2', background: '#fff', padding: 14, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="搜索框" style={{
              width: '100%', padding: '6px 10px', fontSize: '0.75rem', border: '1px solid #e6e6ec',
              borderRadius: 6, background: '#fafafc', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600, color: '#6a6a74' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="ChevronDown" size={12} /> Plans</span>
                <span style={{ color: '#9b9ba6', fontWeight: 400 }}>1 <span style={{ marginLeft: 4, color: '#c0c0c8' }}>+</span></span>
              </div>
              <div>
                <div style={{
                  padding: '6px 10px', fontSize: '0.7812rem', borderRadius: 6,
                  background: '#fff3ea', color: '#2a2a33', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 2,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="ChevronDown" size={12} /> planB</span><span style={{ color: '#c87a3a', fontWeight: 500, fontSize: '0.6875rem' }}>4</span>
                </div>
                {DETAIL_PLAN.sequences.map((s) => (
                  <div key={s.id} style={{ padding: '5px 12px 5px 26px', fontSize: '0.7188rem', color: '#6a6a74', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#c6c6cc', fontSize: 12, lineHeight: 1 }}>•</span>
                    <span style={{ fontFamily: 'Menlo, monospace', fontSize: '0.6875rem' }}>{s.id}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ color: '#c6c6cc', display: 'inline-flex' }}><Icon name="ChevronRight" size={11} /></span>
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
// Normalize a weight-map key — 'stone' → 0 (STONE_VALUE); numeric keys → Number.
const keyNum = (k) => (k === 'stone' ? 0 : Number(k));

function Dominant(weights, n = 3) {
  const entries = Object.entries(weights).map(([k, w]) => [keyNum(k), w]).sort((a, b) => b[1] - a[1]);
  return entries.slice(0, n);
}

function MiniProbBar({ weights, height = 10 }) {
  const entries = Object.entries(weights).map(([k, w]) => [keyNum(k), w]);
  const total = entries.reduce((a, [, w]) => a + w, 0) || 1;
  return (
    <div style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', background: '#eceaf0' }}>
      {entries.map(([k, w]) => {
        const c = COLOR_MAP[k] || COLOR_MAP[0];
        return (
          <div key={k} title={`${labelOf(k)} · ${w.toFixed(1)}%`}
            style={{ flex: `0 0 ${(w / total) * 100}%`, background: c.bg }} />
        );
      })}
    </div>
  );
}

function SeqStatusPill({ status }) {
  const ok = status === 'enabled';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 7px', borderRadius: 10, fontSize: '0.6562rem', fontWeight: 500,
      background: ok ? '#e6f5ec' : '#f4f4f8', color: ok ? '#1fa85a' : '#9b9ba6',
      border: `1px solid ${ok ? '#c8e6d3' : '#ececf2'}`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: ok ? '#1fa85a' : '#b0b0b8' }} />
      {ok ? 'enabled' : 'disabled'}
    </span>
  );
}

// ─── sequence list row — encapsulates per-row copy state ───
// 5 columns: 序列 ID (+ inline copy) / 序列名称 / 备注 / 日期 / 操作 (编辑 + 删除)
function SequenceRow({ seq, isLast, onOpen, onEdit, onDelete }) {
  const [copied, setCopied] = React.useState(false);
  const copyId = async (e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(seq.name); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const stop = (fn) => (e) => { e.stopPropagation(); if (fn) fn(seq); };
  return (
    <div onClick={onOpen}
      style={{
        display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr) minmax(0, 1fr) 170px 120px',
        padding: '12px 20px', alignItems: 'center', gap: 14, fontSize: '0.7812rem',
        borderBottom: isLast ? 'none' : '1px solid #f4f4f8',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafc')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      {/* 序列 ID + inline copy */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        <span style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 500, color: '#2a2a33', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seq.name}</span>
        <button onClick={copyId} title={`复制序列 ID: ${seq.name}`}
          style={{
            padding: '2px 8px', fontSize: '0.6562rem',
            background: copied ? '#e6f5ec' : 'transparent',
            border: `1px solid ${copied ? '#1fa85a' : '#ececf2'}`, borderRadius: 5,
            color: copied ? '#1fa85a' : '#6a6a74', cursor: 'pointer', fontFamily: 'inherit',
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>{copied ? <Icon name="Check" size={11} /> : '复制'}</button>
      </div>
      {/* 序列名称 (displayName) */}
      <div style={{ color: '#2a2a33', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seq.displayName || <span style={{ color: '#c6c6cc' }}>—</span>}</div>
      {/* 备注 */}
      <div style={{ color: '#6a6a74', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seq.note || <span style={{ color: '#c6c6cc' }}>—</span>}</div>
      {/* 日期 */}
      <div style={{ color: '#6a6a74', fontSize: '0.7188rem', fontFamily: 'Menlo, monospace' }}>{seq.createdAt}</div>
      {/* 操作 */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={stop(onEdit)}
          style={{
            padding: '2px 9px', fontSize: '0.6875rem', background: 'transparent',
            border: '1px solid #ececf2', borderRadius: 5,
            color: '#5a5a66', cursor: 'pointer', fontFamily: 'inherit',
          }}>编辑</button>
        <button onClick={stop(onDelete)}
          style={{
            padding: '2px 9px', fontSize: '0.6875rem', background: 'transparent',
            border: '1px solid #f0d6d6', borderRadius: 5,
            color: '#c83a3a', cursor: 'pointer', fontFamily: 'inherit',
          }}>删除</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// VARIANT A — 紧凑表格式 (compact table-style stages)
//   · Overview bar at top: meta reduced to one horizontal strip
//   · Stages as a dense table: order · name · length · dominant tokens
//     · mini prob bar · percent pills · chevron
//   · Bottom: generated sequences list
// ═══════════════════════════════════════════════════════════════════
function DetailVariantA({ plan, onEdit, onSelectSequence, onSelectStage, onEditSequence, onDeleteSequence } = {}) {
  const p = plan || DETAIL_PLAN;
  const [tab, setTab] = React.useState('stages');
  const totalLen = p.stages.reduce((a, s) => a + s.length, 0);

  return (
    <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* header card */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, fontFamily: 'Fredoka, system-ui, sans-serif' }}>{p.name}</div>
          {p.note && (
            <span style={{ fontSize: '0.7188rem', color: '#6a6a74', padding: '2px 8px', border: '1px solid #ececf2', borderRadius: 4, background: '#fafafc' }}>{p.note}</span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onEdit} style={{ ...secondaryBtn, padding: '6px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="Pencil" size={13} /> 编辑
          </button>
          <button style={{
            padding: '6px 10px', fontSize: '0.75rem', background: '#fff', color: '#c83a3a',
            border: '1px solid #f0d6d6', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}><Icon name="Trash2" size={13} /> 删除</button>
        </div>

        {/* meta strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 100px 110px minmax(0, 1.5fr) minmax(0, 1.5fr)', gap: 0, fontSize: '0.7188rem', color: '#8a8a94' }}>
          <MetaCell label="ID" value={p.id} mono />
          <MetaCell label="阶段数" value={p.stages.length} />
          <MetaCell label="最长长度" value={totalLen} />
          <MetaCell label="创建" value={p.createdAt} />
          <MetaCell label="更新" value={p.updatedAt} last />
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #ececf2', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {[
          { k: 'stages',    label: '阶段顺序',   n: p.stages.length },
          { k: 'sequences', label: '已生成序列', n: p.sequences.length },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: '6px 14px', fontSize: '0.75rem', border: 'none', borderRadius: 6,
            background: tab === t.k ? '#2a2a33' : 'transparent',
            color: tab === t.k ? '#fff' : '#6a6a74',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          }}>{t.label} <span style={{ opacity: 0.7, marginLeft: 3 }}>{t.n}</span></button>
        ))}
      </div>

      {/* STAGES tab */}
      {tab === 'stages' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>阶段顺序</div>
            <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>{p.stages.length} 个阶段 · 共 {totalLen} 方块</div>
          </div>
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 60px minmax(0, 1.6fr) minmax(0, 1.2fr) 24px',
              padding: '8px 20px', background: '#fafafc', borderBottom: '1px solid #f0f0f4',
              fontSize: '0.625rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, gap: 14,
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
                <div key={s.id}
                  onClick={() => onSelectStage && onSelectStage(s, i)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 60px minmax(0, 1.6fr) minmax(0, 1.2fr) 24px',
                    padding: '14px 20px', borderBottom: i === p.stages.length - 1 ? 'none' : '1px solid #f4f4f8',
                    alignItems: 'center', gap: 14, fontSize: '0.7812rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 5, background: '#f4f4f8', color: '#6a6a74',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.6875rem',
                  }}>{i + 1}</div>
                  <div style={{ fontWeight: 500 }}>{s.name}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', color: '#2a2a33' }}>{s.length}</div>
                  <div>
                    <MiniProbBar weights={s.weights} height={8} />
                    <div style={{ fontSize: '0.625rem', color: '#9b9ba6', marginTop: 4, fontFamily: 'Fredoka, system-ui, sans-serif' }}>
                      {Object.keys(s.weights).length} 种 · 最大 {Math.max(...Object.values(s.weights)).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    {dom.map(([k, w]) => {
                      const c = COLOR_MAP[k] || COLOR_MAP[0];
                      return (
                        <span key={k} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 6px 2px 2px', background: `${c.bg}14`,
                          borderRadius: 10, fontSize: '0.6562rem', color: c.dark,
                          fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
                        }}>
                          <CandyChip v={k} size={14} hasNumber={false} />
                          {w.toFixed(0)}%
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ color: '#c6c6cc', textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}><Icon name="ChevronRight" size={14} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEQUENCES tab */}
      {tab === 'sequences' && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>已生成序列</div>
            <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>{p.sequences.length} 条</div>
            <div style={{ flex: 1 }} />
            <button style={{ ...secondaryBtn, padding: '5px 11px', fontSize: '0.7188rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="Plus" size={12} /> 生成序列
            </button>
          </div>
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr) minmax(0, 1fr) 170px 120px',
              padding: '8px 20px', background: '#fafafc', borderBottom: '1px solid #f0f0f4',
              fontSize: '0.625rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, gap: 14,
            }}>
              <div>序列 ID</div>
              <div>序列名称</div>
              <div>备注</div>
              <div>日期</div>
              <div style={{ textAlign: 'right' }}>操作</div>
            </div>
            {p.sequences.length === 0 ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: '0.75rem', color: '#9b9ba6' }}>暂无已生成序列</div>
            ) : p.sequences.map((s, i) => (
              <SequenceRow
                key={s.id}
                seq={s}
                isLast={i === p.sequences.length - 1}
                onOpen={() => onSelectSequence && onSelectSequence(s)}
                onEdit={onEditSequence}
                onDelete={onDeleteSequence}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TokenPill — single token chip used in the sequence detail grid.
// Colored by value via COLOR_MAP; stone renders as a grey metal chip.
// ═══════════════════════════════════════════════════════════════════
function TokenPill({ index, token }) {
  const isStone = token === 'stone';
  const v = isStone ? 0 : Number(token);
  const c = COLOR_MAP[v] || COLOR_MAP[0];
  const textColor = '#fff';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 12,
      background: isStone
        ? 'linear-gradient(135deg, #c0c0c8, #808088)'
        : `linear-gradient(135deg, ${c.bg}, ${c.dark})`,
      color: textColor,
      fontSize: '0.6875rem', fontFamily: 'Fredoka, system-ui, sans-serif',
      fontWeight: 600, fontVariantNumeric: 'tabular-nums',
      boxShadow: '0 1px 2px rgba(0,0,0,.15)',
    }}>
      <span style={{ opacity: 0.65, fontSize: '0.625rem' }}>#{index + 1}</span>
      {labelOf(v)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SequenceDetailSheet — nested right-drawer showing the full token list
// of a single generated sequence. Narrower than PlanEditSheet (70vw)
// and higher z-index so it stacks on top if both ever coexist.
// ═══════════════════════════════════════════════════════════════════
function SequenceDetailSheet({ open, onClose, plan, sequence, onSelectStage, zLevel = 0 }) {
  const [copied, setCopied] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('sections');
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  React.useEffect(() => { setCopied(false); }, [sequence && sequence.id]);

  if (!open || !sequence) return null;

  const overlayZ = 60 + zLevel * 20;
  const panelZ = 70 + zLevel * 20;

  const copyId = async () => {
    try { await navigator.clipboard.writeText(sequence.name); } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const statusEnabled = sequence.status === 'enabled';
  const tokens = sequence.tokens || [];

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(16, 16, 24, 0.35)',
        zIndex: overlayZ,
        animation: 'planSheetOverlayIn 200ms ease-out',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '70vw', maxWidth: 1000,
        background: '#f7f7fa', zIndex: panelZ,
        boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.15)',
        animation: 'planSheetSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} aria-label="关闭"
          style={{
            position: 'absolute', top: 14, right: '100%',
            width: 40, height: 40,
            background: '#fff', border: '1px solid #ececf2', borderRadius: 4,
            color: '#6a6a74', fontSize: '1.375rem', lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, fontFamily: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}><Icon name="X" size={18} /></button>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 26 }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '1.125rem', fontWeight: 600 }}>{sequence.name}</div>
              {sequence.note && <div style={{ fontSize: '0.7812rem', color: '#6a6a74' }}>{sequence.note}</div>}
              <button onClick={copyId} title={`复制序列 ID: ${sequence.name}`}
                style={{
                  padding: '4px 12px', fontSize: '0.7188rem',
                  background: copied ? '#e6f5ec' : '#fafafc',
                  border: `1px solid ${copied ? '#1fa85a' : '#ececf2'}`, borderRadius: 6,
                  color: copied ? '#1fa85a' : '#6a6a74', cursor: 'pointer', fontFamily: 'inherit',
                }}>{copied ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="Check" size={12} /> 已复制</span> : '复制'}</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', columnGap: 20, rowGap: 10, fontSize: '0.7812rem', marginBottom: 22 }}>
              <div style={{ color: '#8a8a94' }}>ID</div>
              <div style={{ fontFamily: 'Menlo, monospace', color: '#2a2a33' }}>{sequence.id}</div>
              <div style={{ color: '#8a8a94' }}>方案</div>
              <div style={{ color: '#2a2a33', fontWeight: 500 }}>{plan ? plan.name : '—'}</div>
              <div style={{ color: '#8a8a94' }}>长度</div>
              <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', color: '#2a2a33' }}>{sequence.length}</div>
              <div style={{ color: '#8a8a94' }}>状态</div>
              <div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: '0.7188rem', fontWeight: 500,
                  color: statusEnabled ? '#1fa85a' : '#9b9ba6',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusEnabled ? '#1fa85a' : '#b0b0b8' }} />
                  {statusEnabled ? '启用' : '禁用'}
                </span>
              </div>
              <div style={{ color: '#8a8a94' }}>创建时间</div>
              <div style={{ fontFamily: 'Menlo, monospace', color: '#2a2a33' }}>{sequence.createdAt}</div>
            </div>

            {/* 完整序列 title row + view-mode toggle */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>完整序列</div>
              <div style={{ fontSize: '0.7188rem', color: '#9b9ba6' }}>（{tokens.length} 个）</div>
              <div style={{ flex: 1 }} />
              {plan && plan.stages && plan.stages.length > 0 && (
                <div style={{
                  display: 'inline-flex', background: '#fff', border: '1px solid #ececf2',
                  borderRadius: 8, padding: 3,
                }}>
                  {[
                    { k: 'sections', label: '分段',   icon: 'StretchHorizontal' },
                    { k: 'dividers', label: '分隔',   icon: 'StretchVertical' },
                    { k: 'timeline', label: '时间轴', icon: 'ChartNoAxesGantt' },
                  ].map((t) => (
                    <button key={t.k} onClick={() => setViewMode(t.k)} style={{
                      padding: '4px 12px', fontSize: '0.7188rem', border: 'none', borderRadius: 6,
                      background: viewMode === t.k ? '#2a2a33' : 'transparent',
                      color: viewMode === t.k ? '#fff' : '#6a6a74',
                      cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                    }}>
                      <Icon name={t.icon} size={13} /> {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 分段 mode — grouped by stage with per-stage header */}
            {plan && plan.stages && plan.stages.length > 0 && viewMode === 'sections' && (
              <div>
                {plan.stages.map((stage, stageIdx) => {
                  const startPos = plan.stages.slice(0, stageIdx).reduce((a, s) => a + s.length, 0);
                  const stageTokens = tokens.slice(startPos, startPos + stage.length);
                  const clickable = !!onSelectStage;
                  return (
                    <div key={stage.id} style={{ marginBottom: stageIdx === plan.stages.length - 1 ? 0 : 18 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f4f4f8',
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 5, background: '#f4f4f8', color: '#6a6a74',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.6875rem',
                          flexShrink: 0,
                        }}>{stageIdx + 1}</div>
                        <button type="button"
                          onClick={() => clickable && onSelectStage(stage, stageIdx)}
                          title={clickable ? '查看 Stage 详情' : undefined}
                          style={{
                            border: 'none', background: 'transparent', padding: 0,
                            fontSize: '0.8125rem', fontWeight: 600, color: '#2a2a33',
                            cursor: clickable ? 'pointer' : 'default',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={(e) => { if (clickable) e.currentTarget.style.color = '#5a7cff'; }}
                          onMouseLeave={(e) => { if (clickable) e.currentTarget.style.color = '#2a2a33'; }}>{stage.name}</button>
                        <div style={{ fontSize: '0.6875rem', color: '#9b9ba6', fontFamily: 'Menlo, monospace' }}>#{startPos + 1}–#{startPos + stage.length}</div>
                        <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>· {stage.length} 个</div>
                        <div style={{ flex: 1 }} />
                        <div style={{ width: 110 }}>
                          <MiniProbBar weights={stage.weights} height={6} />
                        </div>
                        <DifficultyBadge weights={stage.weights} dense />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {stageTokens.map((tok, i) => (
                          <TokenPill key={startPos + i} index={startPos + i} token={tok} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分隔 mode — flat wrap with full-width dividers at stage boundaries */}
            {plan && plan.stages && plan.stages.length > 0 && viewMode === 'dividers' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {(() => {
                  const out = [];
                  let cursor = 0;
                  plan.stages.forEach((stage, sIdx) => {
                    if (sIdx > 0) {
                      out.push(
                        <div key={`div-${sIdx}`} style={{
                          flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 0 4px', fontSize: '0.6562rem', color: '#8a8a94',
                          letterSpacing: 0.4,
                        }}>
                          <div style={{ flex: 1, height: 1, background: '#ececf2' }} />
                          <span style={{ fontFamily: 'Menlo, monospace', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Stage {sIdx + 1} · {stage.name} <Icon name="ArrowDown" size={11} /></span>
                          <div style={{ flex: 1, height: 1, background: '#ececf2' }} />
                        </div>
                      );
                    }
                    for (let i = 0; i < stage.length; i++) {
                      if (cursor < tokens.length) {
                        out.push(<TokenPill key={cursor} index={cursor} token={tokens[cursor]} />);
                      }
                      cursor++;
                    }
                  });
                  return out;
                })()}
              </div>
            )}

            {/* 时间轴 mode — top segmented bar + flat token grid */}
            {(viewMode === 'timeline' || !plan || !plan.stages || plan.stages.length === 0) && (
              <React.Fragment>
                {plan && plan.stages && plan.stages.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{
                      display: 'flex', height: 26, borderRadius: 5, overflow: 'hidden',
                      background: '#eceaf0', fontSize: '0.625rem', color: '#fff',
                    }}>
                      {plan.stages.map((stage, i) => {
                        const totalLen = plan.stages.reduce((a, s) => a + s.length, 0) || 1;
                        const pct = (stage.length / totalLen) * 100;
                        const hues = ['#5a7cff', '#4ecd7a', '#ffb93c', '#c83a3a'];
                        const hue = hues[i % hues.length];
                        return (
                          <div key={stage.id} title={`${stage.name} · ${stage.length} 个`}
                            style={{
                              flex: `0 0 ${pct}%`, background: hue,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: '0 8px', overflow: 'hidden', whiteSpace: 'nowrap',
                              fontWeight: 500, letterSpacing: 0.3,
                              borderRight: i < plan.stages.length - 1 ? '1px solid rgba(255,255,255,0.4)' : 'none',
                            }}>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>Stage {i + 1} · {stage.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {tokens.map((tok, i) => <TokenPill key={i} index={i} token={tok} />)}
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

function MetaCell({ label, value, mono, last }) {
  return (
    <div style={{ padding: '4px 16px', borderRight: last ? 'none' : '1px solid #f0f0f4' }}>
      <div style={{ fontSize: '0.625rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>{label}</div>
      <div style={{
        fontSize: '0.75rem', color: '#2a2a33', fontWeight: 500,
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
                <div style={{ fontSize: '1.375rem', fontWeight: 600, fontFamily: 'Fredoka, system-ui, sans-serif', lineHeight: 1 }}>{p.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#9b9ba6' }}>{p.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 22, fontSize: '0.75rem', color: '#6a6a74' }}>
                <KpiInline label="阶段" value={p.stagesCount} />
                <KpiInline label="最长长度" value={p.maxLen} />
                <KpiInline label="序列" value={p.sequences.length} />
                <KpiInline label="更新" value="刚刚" muted />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{
                padding: '7px 10px', fontSize: '0.7188rem', background: '#fafafc', color: '#6a6a74',
                border: '1px solid #ececf2', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
              }} title={`ID · ${p.id}\n创建 · ${p.createdAt}`}>ⓘ 详情</button>
              <button style={{ ...primaryBtn, padding: '7px 14px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Icon name="Pencil" size={13} /> 编辑
              </button>
              <button style={{
                padding: '7px 10px', fontSize: '0.75rem', background: '#fff', color: '#c83a3a',
                border: '1px solid #f0d6d6', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 5,
              }}><Icon name="Trash2" size={13} /> 删除</button>
            </div>
          </div>
        </div>

        {/* stages list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10, gap: 10, padding: '0 4px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2a2a33', textTransform: 'uppercase', letterSpacing: 0.8 }}>阶段顺序</div>
            <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>{p.stages.length} 个 · 共 {p.stages.reduce((a, s) => a + s.length, 0)} 方块</div>
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
                    fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: '1rem',
                    flexShrink: 0, border: '1px solid #f7d5b3',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>{tokenCount} 种 token</div>
                      <div style={{ flex: 1 }} />
                      <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>长度</div>
                      <div style={{
                        fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
                        fontSize: '0.9375rem', color: '#2a2a33', fontVariantNumeric: 'tabular-nums',
                      }}>{s.length}</div>
                    </div>
                    <MiniProbBar weights={s.weights} height={12} />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                      {dom.map(([k, w]) => (
                        <div key={k} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '2px 7px 2px 2px',
                          borderRadius: 12, fontSize: '0.6562rem',
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
                        <div style={{ fontSize: '0.6875rem', color: '#9b9ba6' }}>+{tokenCount - dom.length}</div>
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
            <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>已生成序列</div>
            <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>{p.sequences.length}</div>
            <div style={{ flex: 1 }} />
            <button style={{
              padding: '4px 10px', fontSize: '0.6875rem', background: '#fafafc', color: '#5a5a66',
              border: '1px solid #e6e6ec', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
            }}><Icon name="Plus" size={13} /></button>
          </div>
          <div>
            {p.sequences.map((s, i) => (
              <div key={s.id} style={{
                padding: '10px 16px', borderBottom: i === p.sequences.length - 1 ? 'none' : '1px solid #f8f8fa',
                display: 'flex', flexDirection: 'column', gap: 5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: 'Menlo, monospace', fontSize: '0.6875rem', color: '#2a2a33', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.id}</div>
                  <SeqStatusPill status={s.status} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6562rem', color: '#9b9ba6' }}>
                  <span style={{ fontFamily: 'Fredoka, system-ui, sans-serif' }}>长度 {s.len}</span>
                  <span>{s.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* quick actions */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', padding: 14 }}>
          <div style={{ fontSize: '0.6875rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>操作</div>
          <button style={{ ...secondaryBtn, width: '100%', marginBottom: 6, fontSize: '0.75rem', padding: '7px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Icon name="Plus" size={12} /> 生成新序列
          </button>
          <button style={{ ...secondaryBtn, width: '100%', fontSize: '0.75rem', padding: '7px' }}>导出 Plan JSON</button>
        </div>
      </div>
    </div>
  );
}

function KpiInline({ label, value, muted }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
      <div style={{ fontSize: '0.6562rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{
        fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600,
        fontSize: muted ? 12.5 : 14, color: muted ? '#6a6a74' : '#2a2a33',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// StageDetailSheet — nested right-drawer showing full read-only Stage
// info: EV + difficulty, meta, big probability bar, full 14-row weights
// table, and a 30-token sample grid generated from just this stage.
// ═══════════════════════════════════════════════════════════════════
function StageDetailSheet({ open, onClose, plan, stage, stageIndex = 0, zLevel = 0 }) {
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open || !stage) return null;

  const overlayZ = 60 + zLevel * 20;
  const panelZ = 70 + zLevel * 20;

  const ev = expectedValue(stage.weights);
  const log = ev > 0 ? Math.log2(ev) : 0;
  const bucket = log < 5 ? ['easy', '#4ecd7a'] : log < 8 ? ['medium', '#ffb93c'] : log < 11 ? ['hard', '#ff6a3c'] : ['extreme', '#c14dff'];

  let startPos = 1;
  if (plan && plan.stages) {
    for (let i = 0; i < stageIndex; i++) startPos += plan.stages[i].length;
  }
  const endPos = startPos + stage.length - 1;

  const sampleCount = Math.min(30, stage.length);
  const sampleTokens = genTokens(
    { stages: [{ ...stage, length: sampleCount }] },
    (stageIndex + 1) * 1000 + stage.length * 7 + 101,
  );

  const ALL_KEYS = [...ALL_VALUES.map(String), 'stone'];
  const total = Object.values(stage.weights).reduce((a, b) => a + b, 0) || 1;

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(16, 16, 24, 0.35)',
        zIndex: overlayZ,
        animation: 'planSheetOverlayIn 200ms ease-out',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '70vw', maxWidth: 1000,
        background: '#f7f7fa', zIndex: panelZ,
        boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.15)',
        animation: 'planSheetSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} aria-label="关闭"
          style={{
            position: 'absolute', top: 14, right: '100%',
            width: 40, height: 40,
            background: '#fff', border: '1px solid #ececf2', borderRadius: 4,
            color: '#6a6a74', fontSize: '1.375rem', lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, fontFamily: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}><Icon name="X" size={18} /></button>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 26 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)' }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6, background: '#f4f4f8', color: '#6a6a74',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: '0.875rem',
              }}>{stageIndex + 1}</div>
              <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '1.125rem', fontWeight: 600 }}>{stage.name}</div>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: '#f4f4f8', borderRadius: 10, border: '1px solid #ececf2' }}>
                <span style={{ fontSize: '0.6875rem', color: '#8a8a94', letterSpacing: 0.6, textTransform: 'uppercase' }}>EV</span>
                <span style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600, fontSize: '0.8438rem', color: '#2a2a33', fontVariantNumeric: 'tabular-nums' }}>{ev < 10 ? ev.toFixed(1) : Math.round(ev).toLocaleString()}</span>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: bucket[1], boxShadow: `0 0 0 2px ${bucket[1]}22` }} />
                <span style={{ fontSize: '0.6875rem', color: bucket[1], fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4 }}>{bucket[0]}</span>
              </div>
            </div>

            {/* meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', columnGap: 20, rowGap: 10, fontSize: '0.7812rem', marginBottom: 22 }}>
              <div style={{ color: '#8a8a94' }}>Stage ID</div>
              <div style={{ fontFamily: 'Menlo, monospace', color: '#2a2a33' }}>{stage.id}</div>
              <div style={{ color: '#8a8a94' }}>所属 Plan</div>
              <div style={{ color: '#2a2a33', fontWeight: 500 }}>{plan ? plan.name : '—'}</div>
              <div style={{ color: '#8a8a94' }}>顺序</div>
              <div style={{ color: '#2a2a33' }}>第 {stageIndex + 1} / {plan ? plan.stages.length : '—'} 阶段</div>
              <div style={{ color: '#8a8a94' }}>长度</div>
              <div>
                <span style={{ fontFamily: 'Fredoka, system-ui, sans-serif', color: '#2a2a33', fontVariantNumeric: 'tabular-nums' }}>{stage.length}</span>
                <span style={{ color: '#6a6a74', fontSize: '0.75rem' }}> 方块</span>
                <span style={{ color: '#9b9ba6', fontSize: '0.6875rem', marginLeft: 10, fontFamily: 'Menlo, monospace' }}>序列位置 #{startPos}–#{endPos}</span>
              </div>
            </div>

            {/* big probability bar */}
            <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>概率分布</div>
            <div style={{ marginBottom: 22 }}>
              <MiniProbBar weights={stage.weights} height={28} />
            </div>

            {/* full weights table */}
            <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>完整权重表</div>
            <div style={{ border: '1px solid #ececf2', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '40px 70px 1fr 80px 80px',
                padding: '8px 14px', background: '#fafafc',
                fontSize: '0.625rem', color: '#8a8a94', letterSpacing: 0.6, textTransform: 'uppercase',
              }}>
                <div></div>
                <div>方块</div>
                <div>占比</div>
                <div style={{ textAlign: 'right' }}>百分比</div>
                <div style={{ textAlign: 'right' }}>贡献</div>
              </div>
              {ALL_KEYS.map((key) => {
                const has = key in stage.weights;
                const w = has ? stage.weights[key] : 0;
                const numKey = key === 'stone' ? 0 : Number(key);
                const contrib = has ? numKey * (w / total) : 0;
                const c = COLOR_MAP[numKey] || COLOR_MAP[0];
                return (
                  <div key={key} style={{
                    display: 'grid', gridTemplateColumns: '40px 70px 1fr 80px 80px',
                    padding: '8px 14px', borderTop: '1px solid #f4f4f8',
                    alignItems: 'center', fontSize: '0.75rem', gap: 8,
                    opacity: has ? 1 : 0.4,
                  }}>
                    <div><CandyChip v={numKey} size={20} hasNumber={false} /></div>
                    <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 500 }}>{labelOf(numKey)}</div>
                    <div>
                      {has ? (
                        <div style={{ height: 6, background: '#eceaf0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${(w / total) * 100}%`, height: '100%', background: c.bg }} />
                        </div>
                      ) : <span style={{ color: '#c6c6cc', fontSize: '0.6875rem' }}>—</span>}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{has ? w.toFixed(1) + '%' : ''}</div>
                    <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontVariantNumeric: 'tabular-nums', color: '#6a6a74' }}>{has ? (contrib < 10 ? contrib.toFixed(1) : Math.round(contrib)) : ''}</div>
                  </div>
                );
              })}
            </div>

            {/* sample */}
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>采样示例</div>
              <div style={{ marginLeft: 8, fontSize: '0.7188rem', color: '#9b9ba6' }}>从该 Stage 按概率采样 {sampleCount} 个方块</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {sampleTokens.map((tok, i) => <TokenPill key={i} index={i} token={tok} />)}
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SequenceEditSheet — minimal edit drawer for a single sequence.
// Editable: 序列名称 (displayName) + 备注 (note). 序列 ID readonly.
// Demo-only — "保存" just closes the drawer (no persistence).
// ═══════════════════════════════════════════════════════════════════
function SequenceEditSheet({ open, onClose, sequence }) {
  const [displayName, setDisplayName] = React.useState('');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  React.useEffect(() => {
    if (sequence) {
      setDisplayName(sequence.displayName || '');
      setNote(sequence.note || '');
    }
  }, [sequence && sequence.id]);

  if (!open || !sequence) return null;

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(16, 16, 24, 0.35)',
        zIndex: 60, animation: 'planSheetOverlayIn 200ms ease-out',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '60vw', maxWidth: 720,
        background: '#f7f7fa', zIndex: 70,
        boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.15)',
        animation: 'planSheetSlideIn 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <button onClick={onClose} aria-label="关闭"
          style={{
            position: 'absolute', top: 14, right: '100%',
            width: 40, height: 40,
            background: '#fff', border: '1px solid #ececf2', borderRadius: 4,
            color: '#6a6a74', fontSize: '1.375rem', lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, fontFamily: 'inherit',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}><Icon name="X" size={18} /></button>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 26 }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.06)',
          }}>
            <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '1.125rem', fontWeight: 600, marginBottom: 20 }}>编辑序列</div>

            {/* readonly 序列 ID */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>序列 ID</div>
              <div style={{
                padding: '8px 12px', fontSize: '0.8125rem', fontFamily: 'Menlo, monospace',
                background: '#fafafc', border: '1px solid #ececf2', borderRadius: 6,
                color: '#6a6a74',
              }}>{sequence.name}</div>
            </div>

            {/* 序列名称 input */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>序列名称</div>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="给这条序列取一个易记的名字"
                style={{
                  width: '100%', padding: '9px 12px', fontSize: '0.875rem',
                  border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }} />
            </div>

            {/* 备注 input */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>备注</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="备注（可选）"
                rows={3}
                style={{
                  width: '100%', padding: '9px 12px', fontSize: '0.8125rem',
                  border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  resize: 'vertical',
                }} />
            </div>

            {/* actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={secondaryBtn}>取消</button>
              <button onClick={onClose} style={primaryBtn}>保存</button>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, {
  PLAN_A, PLAN_B, ALL_PLANS, DETAIL_PLAN,
  AdminShell, DetailVariantA, DetailVariantB,
  SequenceDetailSheet, StageDetailSheet, SequenceEditSheet, TokenPill,
  Dominant, MiniProbBar, SeqStatusPill,
});
