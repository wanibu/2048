// design-showcase.jsx — 孤岛页面：Admin UI 看板 / 组件库 / 设计规范
// 访问：http://127.0.0.1:8080/design.html
// 不在主 AdminApp 导航里，独立壳。

// ───────── small layout helpers ─────────
function Block({ id, title, desc, children }) {
  return (
    <section id={id} style={{
      background: '#fff', borderRadius: 10, border: '1px solid #ececf2',
      padding: '20px 22px', marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'Fredoka, system-ui, sans-serif' }}>{title}</div>
        {desc && <div style={{ fontSize: '0.75rem', color: '#8a8a94' }}>{desc}</div>}
      </div>
      {children}
    </section>
  );
}

function Row({ children }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>{children}</div>;
}

function Swatch({ color, label, dark }) {
  return (
    <div style={{ textAlign: 'center', width: 96 }}>
      <div style={{
        width: 96, height: 56, borderRadius: 6, background: color,
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 6,
        color: dark ? '#fff' : '#2a2a33', fontSize: '0.5625rem', fontFamily: 'Menlo, monospace',
      }}>{color}</div>
      <div style={{ fontSize: '0.6875rem', color: '#6a6a74', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <div style={{ fontSize: '0.7188rem', color: '#6a6a74', lineHeight: 1.9 }}>
      <span style={{ color: '#8a8a94' }}>· </span>{label} <code>{value}</code>
    </div>
  );
}

// ───────── 1. 布局骨架 ─────────
function LayoutBlock() {
  return (
    <div>
      <div style={{ display: 'flex', border: '1px solid #ececf2', borderRadius: 8, height: 200, overflow: 'hidden' }}>
        <div style={{ width: 84, background: '#fafaf7', borderRight: '1px solid #ececf2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', color: '#9b9ba6', textAlign: 'center', padding: 4 }}>
          <div style={{ fontWeight: 600, color: '#c8343a', fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '0.6875rem' }}>左栏</div>
          <div style={{ marginTop: 3 }}>168px · #fafaf7</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 40, borderBottom: '1px solid #ececf2', background: '#fff', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: '0.6875rem', color: '#6a6a74', fontWeight: 500 }}>
            PageHeader · 48px · 白底
          </div>
          <div style={{ flex: 1, background: '#f7f7fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', color: '#8a8a94' }}>
            内容区 · <code style={{ marginLeft: 4 }}>flex: 1 · overflow: auto · bg #f7f7fa</code>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Spec label="左栏宽度" value="168px" />
        <Spec label="PageHeader 高" value="48px" />
        <Spec label="配置页左树" value="248px · 白底 · 右边界 #ececf2" />
        <Spec label="抽屉宽度" value="PlanEdit 85vw · 序列详情 70vw · Stage 详情 70vw · 序列编辑 60vw" />
      </div>
    </div>
  );
}

// ───────── 2. 颜色 tokens ─────────
function ColorsBlock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>中性色 · 背景 + 边框</div>
        <Row>
          <Swatch color="#f7f7fa" label="页面底色" />
          <Swatch color="#fff" label="卡片 surface" />
          <Swatch color="#fafafc" label="surface-2 / hover" />
          <Swatch color="#fafaf7" label="左栏 / 暖白" />
          <Swatch color="#fff3ea" label="选中暖橙" />
          <Swatch color="#ececf2" label="主边框" />
          <Swatch color="#f0f0f4" label="浅边框" />
          <Swatch color="#f4f4f8" label="更浅边框" />
        </Row>
      </div>
      <div>
        <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>文字 · 灰阶 4 级</div>
        <Row>
          <Swatch color="#2a2a33" label="主文字" dark />
          <Swatch color="#6a6a74" label="次文字" dark />
          <Swatch color="#8a8a94" label="muted" dark />
          <Swatch color="#9b9ba6" label="dimmest" dark />
        </Row>
      </div>
      <div>
        <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>语义色</div>
        <Row>
          <Swatch color="#5a7cff" label="primary 蓝紫" dark />
          <Swatch color="#1fa85a" label="success 绿" dark />
          <Swatch color="#d48a1f" label="warning 橙" dark />
          <Swatch color="#ffb93c" label="warning 亮" />
          <Swatch color="#c83a3a" label="danger 红" dark />
          <Swatch color="#c8343a" label="brand 红 (logo)" dark />
          <Swatch color="#c87a3a" label="accent 橙" dark />
        </Row>
      </div>
    </div>
  );
}

// ───────── 3. 字体 & 字号 ─────────
function TypeBlock() {
  const sizes = [
    { label: 'xs / 10', size: 10, use: 'MetaCell 标签 / meta 小字' },
    { label: 'sm / 11', size: 11, use: 'status pill / 辅助标签' },
    { label: 'body / 12', size: 12, use: '表格正文 / button text' },
    { label: 'md / 13', size: 13, use: '次级标题 / card title' },
    { label: 'lg / 14', size: 14, use: 'PageHeader 标题' },
    { label: 'xl / 17', size: 17, use: '左栏 logo "Giant 2048"' },
    { label: '2xl / 18', size: 18, use: '卡片主标题 / plan 名' },
    { label: '3xl / 22', size: 22, use: 'DetailVariantB hero name' },
    { label: 'display / 26', size: 26, use: '游戏详情 big score' },
  ];
  return (
    <div>
      <Row>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Inter (正文)</div>
          <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.875rem' }}>
            The quick brown fox · 敏捷的棕色狐狸 · 0123456789
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Fredoka (数字/display)</div>
          <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontSize: '1.125rem', fontWeight: 600 }}>
            Giant 2048 · 12,847 · planA
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Menlo (ID / 时间)</div>
          <div style={{ fontFamily: 'Menlo, monospace', fontSize: '0.75rem', color: '#5a5a66' }}>
            a12fe842-b004-4122<br />2026-04-21 18:22:08
          </div>
        </div>
      </Row>
      <div style={{ marginTop: 16, fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>字号阶梯</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sizes.map((s) => (
          <div key={s.size} style={{ display: 'flex', alignItems: 'baseline', gap: 16, borderBottom: '1px dashed #f0f0f4', padding: '4px 0' }}>
            <div style={{ width: 72, fontSize: '0.6875rem', color: '#9b9ba6', fontFamily: 'Menlo, monospace' }}>{s.label}</div>
            <div style={{ fontSize: s.size, fontFamily: 'Inter, system-ui, sans-serif', flexShrink: 0 }}>糖果消除</div>
            <div style={{ fontSize: '0.6875rem', color: '#8a8a94' }}>{s.use}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Spec label="数字列" value="font-variant-numeric: tabular-nums" />
      </div>
    </div>
  );
}

// ───────── 4. 按钮 ─────────
function ButtonsBlock() {
  return (
    <div>
      <Row>
        <button style={primaryBtn}>Primary · 创建</button>
        <button style={secondaryBtn}>Secondary · 取消</button>
        <button style={{ padding: '9px 20px', background: '#fff', color: '#c83a3a', border: '1px solid #f0d6d6', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Danger · 删除</button>
        <button style={{ padding: '5px 12px', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', color: '#5a5a66', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon name="RefreshCw" size={12} /> 刷新
        </button>
        <button style={{ padding: '3px 10px', background: 'transparent', border: '1px solid #ececf2', borderRadius: 6, color: '#6a6a74', fontSize: '0.6875rem', cursor: 'pointer', fontFamily: 'inherit' }}>ghost 编辑</button>
        <button style={{ padding: '5px 12px', fontSize: '0.75rem', border: 'none', borderRadius: 6, background: '#2a2a33', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>active pill</button>
      </Row>
      <div style={{ marginTop: 14 }}>
        <Spec label="primaryBtn" value="padding 9px 20px · bg #2a2a33 · 白字" />
        <Spec label="secondaryBtn" value="padding 9px 20px · 白底 · 边框 #e6e6ec · 字 #5a5a66" />
        <Spec label="Danger" value="白底 · 字 #c83a3a · 边框 #f0d6d6（淡红）" />
        <Spec label="Active pill (tab)" value="bg #2a2a33 · 白字 · 用在 tabs 激活态" />
      </div>
    </div>
  );
}

// ───────── 5. 输入框 ─────────
function InputsBlock() {
  return (
    <div>
      <Row>
        <input placeholder="普通输入框" style={{ padding: '8px 12px', fontSize: '0.8125rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none', fontFamily: 'inherit', width: 220 }} />
        <input placeholder="搜索框（样式同普通输入框）" style={{ padding: '8px 12px', fontSize: '0.8125rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none', fontFamily: 'inherit', width: 220 }} />
        <input type="number" defaultValue={30} style={{ width: 72, padding: '6px 10px', fontSize: '0.8125rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none', fontFamily: 'inherit', textAlign: 'center' }} />
        <textarea placeholder="多行备注（可选）" rows={3} style={{ padding: '9px 12px', fontSize: '0.8125rem', border: '1px solid #e6e6ec', borderRadius: 6, background: '#fff', outline: 'none', fontFamily: 'inherit', width: 260, resize: 'vertical' }} />
      </Row>
      <div style={{ marginTop: 14 }}>
        <Spec label="默认输入" value="padding 8-9px 12px · bg #fff · 边框 #e6e6ec · radius 6" />
        <Spec label="搜索框" value="和普通输入框完全同款（bg #fff · padding 8-12px · 同边框/圆角）· 仅占位符文案区分" />
        <Spec label="Number 输入" value="宽度固定 · 文字居中" />
      </div>
    </div>
  );
}

// ───────── 6. 切换组 / Tabs ─────────
function TabsBlock() {
  const [tab1, setTab1] = React.useState('all');
  const [tab2, setTab2] = React.useState('sections');
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Pill Tabs (GamesPage 风格)</div>
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #ececf2', borderRadius: 8, padding: 3 }}>
        {[{ k: 'all', label: '全部', n: 102 }, { k: 'playing', label: '进行中', n: 38 }, { k: 'finished', label: '已结束', n: 64 }].map((t) => (
          <button key={t.k} onClick={() => setTab1(t.k)} style={{
            padding: '5px 14px', fontSize: '0.75rem', border: 'none', borderRadius: 6,
            background: tab1 === t.k ? '#2a2a33' : 'transparent',
            color: tab1 === t.k ? '#fff' : '#6a6a74',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          }}>{t.label} <span style={{ opacity: 0.7, marginLeft: 3 }}>{t.n}</span></button>
        ))}
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>Segmented Control (SequenceDetailSheet 3 视图切换)</div>
      <div style={{ display: 'inline-flex', background: '#fff', border: '1px solid #ececf2', borderRadius: 8, padding: 3 }}>
        {[{ k: 'sections', label: '分段' }, { k: 'dividers', label: '分隔' }, { k: 'timeline', label: '时间轴' }].map((t) => (
          <button key={t.k} onClick={() => setTab2(t.k)} style={{
            padding: '4px 12px', fontSize: '0.7188rem', border: 'none', borderRadius: 6,
            background: tab2 === t.k ? '#2a2a33' : 'transparent',
            color: tab2 === t.k ? '#fff' : '#6a6a74',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          }}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}

// ───────── 7. 徽章 / 状态 ─────────
function BadgesBlock() {
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>StatusPill (游戏局状态)</div>
      <Row>
        <StatusPill status="playing" />
        <StatusPill status="finished" />
      </Row>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>SeqStatusPill (序列启用态)</div>
      <Row>
        <SeqStatusPill status="enabled" />
        <SeqStatusPill status="disabled" />
      </Row>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>DifficultyBadge (EV 难度桶)</div>
      <Row>
        <DifficultyBadge weights={{ 2: 50, 4: 50 }} dense />
        <DifficultyBadge weights={{ 64: 60, 128: 28, 256: 7, stone: 5 }} dense />
        <DifficultyBadge weights={{ 64: 18, 128: 18, 256: 18, 512: 18, 1024: 18, stone: 10 }} dense />
        <DifficultyBadge weights={{ 512: 25, 1024: 25, 2048: 20, 4096: 15, 8192: 10, stone: 5 }} dense />
      </Row>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>端止原因彩条 (样本分析底部)</div>
      <div style={{ display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden', background: '#f4f4f8', width: 520 }}>
        <div style={{ flex: '0 0 76.6%', background: '#c83a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6562rem', color: '#fff', fontWeight: 500 }}>76.6%</div>
        <div style={{ flex: '0 0 14.2%', background: '#ffb93c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6562rem', color: '#fff', fontWeight: 500 }}>14.2%</div>
        <div style={{ flex: '0 0 6.6%', background: '#8a8a94' }} />
        <div style={{ flex: '0 0 2.4%', background: '#c14dff' }} />
        <div style={{ flex: '0 0 0.3%', background: '#c6c6cc' }} />
      </div>
    </div>
  );
}

// ───────── 8. 卡片 ─────────
function CardsBlock() {
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>基础卡片</div>
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', padding: '16px 20px' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>阶段顺序</div>
        <div style={{ fontSize: '0.6875rem', color: '#9b9ba6', marginTop: 4 }}>4 个阶段 · 共 118 方块</div>
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>带标题行 + 分隔线</div>
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f4', display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>已生成序列</div>
          <div style={{ marginLeft: 8, fontSize: '0.6875rem', color: '#9b9ba6' }}>4 条</div>
          <div style={{ flex: 1 }} />
          <button style={{ ...secondaryBtn, padding: '5px 11px', fontSize: '0.7188rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Icon name="Plus" size={12} /> 生成序列
          </button>
        </div>
        <div style={{ padding: '20px', fontSize: '0.75rem', color: '#9b9ba6', textAlign: 'center' }}>（子内容）</div>
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>Meta strip (一行多字段)</div>
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #ececf2', padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 100px 110px minmax(0, 1.5fr) minmax(0, 1.5fr)', gap: 0, fontSize: '0.7188rem' }}>
          <MetaCell label="ID" value="bdbe684e-681c-4452-b5a6-291b55…" mono />
          <MetaCell label="阶段数" value="4" />
          <MetaCell label="最长长度" value="118" />
          <MetaCell label="创建" value="2026-04-21 18:22:23" />
          <MetaCell label="更新" value="2026-04-21 18:22:23" last />
        </div>
      </div>
    </div>
  );
}

// ───────── 9. 表格 ─────────
function TablesBlock() {
  const [hoverIdx, setHoverIdx] = React.useState(-1);
  const rows = [
    { id: '3fa2e140-8c12-4a66', plan: 'planA', score: 1240, step: 38 },
    { id: 'b41e8820-c0f8-491a', plan: 'planB', score: 8840, step: 124 },
    { id: '81c0aa20-f4c8-4284', plan: 'planA', score: 12480, step: 148 },
  ];

  // nested demo state
  const nestedRows = [
    { id: 'p-a', name: 'planA', samples: 4, avg: 2140, sub: [
      { id: 'planA_seq_1a8f', games: 1420, avg: 1920, max: 8960 },
      { id: 'planA_seq_9e21', games: 1180, avg: 2040, max: 10240 },
    ] },
    { id: 'p-b', name: 'planB', samples: 6, avg: 2420, sub: [
      { id: 'planB_seq_4b81', games: 1620, avg: 2280, max: 11200 },
      { id: 'planB_seq_c091', games: 1364, avg: 2040, max: 9840 },
    ] },
  ];
  const [expanded, setExpanded] = React.useState(new Set(['p-a']));
  const toggle = (id) => {
    const n = new Set(expanded);
    if (n.has(id)) n.delete(id); else n.add(id);
    setExpanded(n);
  };
  const th1 = { textAlign: 'left', padding: '10px 12px', fontSize: '0.625rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 500, borderBottom: '1px solid #ececf2', whiteSpace: 'nowrap' };
  const td1 = { padding: '10px 12px', borderBottom: '1px solid #f4f4f8', verticalAlign: 'middle', whiteSpace: 'nowrap' };
  const th2 = { textAlign: 'left', padding: '7px 10px', fontSize: '0.625rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 500, borderBottom: '1px solid #ececf2' };
  const td2 = { padding: '7px 10px', borderBottom: '1px solid #f8f8fa' };

  return (
    <div>
      {/* basic table (div-grid style) */}
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>基础表格 (div + grid)</div>
      <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px',
          padding: '10px 16px', background: '#fafafc', borderBottom: '1px solid #ececf2',
          fontSize: '0.625rem', color: '#9b9ba6', textTransform: 'uppercase', letterSpacing: 0.6, gap: 14,
        }}>
          <div>Game ID</div><div>Plan</div><div style={{ textAlign: 'right' }}>得分</div><div style={{ textAlign: 'right' }}>步数</div>
        </div>
        {rows.map((r, i) => (
          <div key={r.id}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(-1)}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 80px',
              padding: '12px 16px', alignItems: 'center', gap: 14, fontSize: '0.7812rem',
              borderBottom: i === rows.length - 1 ? 'none' : '1px solid #f4f4f8',
              background: hoverIdx === i ? '#fafafc' : 'transparent',
              cursor: 'pointer',
            }}>
            <div style={{ fontFamily: 'Menlo, monospace', fontSize: '0.7188rem' }}>{r.id}</div>
            <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 500 }}>{r.plan}</div>
            <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600 }}>{r.score.toLocaleString()}</div>
            <div style={{ textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', color: '#6a6a74' }}>{r.step}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <Spec label="表头" value="padding 10px 16px · bg #fafafc · 10px uppercase · letterSpacing 0.6" />
        <Spec label="行" value="padding 12px 16px · hover bg #fafafc · border-bottom #f4f4f8" />
        <Spec label="数字列" value="font Fredoka · tabular-nums · 右对齐" />
      </div>

      {/* 嵌套表格 (real table + colSpan) */}
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 22, marginBottom: 8 }}>
        嵌套表格 / 展开子表 <span style={{ textTransform: 'none', letterSpacing: 0, color: '#6a6a74' }}>— PlanAnalysisPage 模式</span>
      </div>
      <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
          <thead>
            <tr style={{ background: '#fafafc' }}>
              <th style={{ ...th1, width: 28 }}></th>
              <th style={th1}>Plan</th>
              <th style={{ ...th1, textAlign: 'right' }}>样本数</th>
              <th style={{ ...th1, textAlign: 'right' }}>平均分</th>
            </tr>
          </thead>
          <tbody>
            {nestedRows.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
                <React.Fragment key={r.id}>
                  <tr onClick={() => toggle(r.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ ...td1, textAlign: 'center', paddingRight: 0 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 4,
                        color: '#5a5a66',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform .15s',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </span>
                    </td>
                    <td style={{ ...td1, fontWeight: 600, fontFamily: 'Fredoka, system-ui, sans-serif' }}>{r.name}</td>
                    <td style={{ ...td1, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif' }}>{r.samples}</td>
                    <td style={{ ...td1, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600 }}>{r.avg.toLocaleString()}</td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={4} style={{ padding: 0, background: '#fafafc', borderBottom: '1px solid #ececf2' }}>
                        <div style={{ padding: '12px 20px 14px 42px' }}>
                          <div style={{ fontSize: '0.6562rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                            {r.name} · 序列明细 ({r.sub.length})
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7188rem', background: '#fff', border: '1px solid #ececf2', borderRadius: 6, overflow: 'hidden' }}>
                            <thead>
                              <tr>
                                <th style={th2}>序列 ID</th>
                                <th style={{ ...th2, textAlign: 'right' }}>游玩次数</th>
                                <th style={{ ...th2, textAlign: 'right' }}>平均分</th>
                                <th style={{ ...th2, textAlign: 'right' }}>最大分</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.sub.map((s) => (
                                <tr key={s.id}>
                                  <td style={{ ...td2, fontFamily: 'Menlo, monospace', color: '#6a6a74' }}>{s.id}</td>
                                  <td style={{ ...td2, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif' }}>{s.games.toLocaleString()}</td>
                                  <td style={{ ...td2, textAlign: 'right', fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 600 }}>{s.avg.toLocaleString()}</td>
                                  <td style={{ ...td2, textAlign: 'right', color: '#6a6a74', fontFamily: 'Fredoka, system-ui, sans-serif' }}>{s.max.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12 }}>
        <Spec label="展开箭头" value="▸ / ▾ · transform rotate 90° + transition .15s · 点击整行 toggle" />
        <Spec label="展开行" value="<tr><td colSpan={主表列数}>  · td padding 0 (交给内层 div 控制)" />
        <Spec label="展开容器" value="bg #fafafc · border-bottom #ececf2 · 内层 padding 12px 20px 14px 42px (左多 22 缩进对齐箭头)" />
        <Spec label="子表" value="fontSize 11.5 · bg #fff · 独立 border + radius 6 · 嵌在展开容器里" />
        <Spec label="子表头" value="padding 7px 10px · letterSpacing 0.4 · 不加 bg (轻量)" />
        <Spec label="默认展开" value="useState(new Set([firstId])) · 首行预展开提示可交互" />
        <Spec label="实例" value="PlanAnalysisPage 主表 12 列 + 展开后子表 10 列" />
      </div>
    </div>
  );
}

// ───────── 9.5 图标 ─────────
function IconsBlock() {
  // Lucide SVG paths (MIT · lucide.dev)
  const Svg = ({ children, size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
  const unicode = [
    { c: '▦', use: '统计' }, { c: '◈', use: '样本分析' }, { c: '◐', use: '游戏局' },
    { c: '⚙', use: '配置' }, { c: '↩', use: '返回 / 退出' }, { c: '↻', use: '刷新' },
    { c: '▸', use: '折叠态' }, { c: '▾', use: '展开态' }, { c: '›', use: '进入' },
    { c: '×', use: '关闭' }, { c: '+', use: '新增' }, { c: '✎', use: '编辑' },
    { c: '🗑', use: '删除' },
  ];
  const lucide = [
    { name: 'ChevronRight', use: '展开箭头 / › 进入', svg: <Svg><path d="m9 18 6-6-6-6" /></Svg> },
    { name: 'RefreshCw',    use: '刷新',              svg: <Svg><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></Svg> },
    { name: 'Plus',         use: '新增 / 添加',       svg: <Svg><path d="M5 12h14" /><path d="M12 5v14" /></Svg> },
    { name: 'Pencil',       use: '编辑',              svg: <Svg><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></Svg> },
    { name: 'Trash2',       use: '删除',              svg: <Svg><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></Svg> },
    { name: 'Search',       use: '搜索',              svg: <Svg><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Svg> },
    { name: 'X',            use: '关闭抽屉',          svg: <Svg><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg> },
    { name: 'LogOut',       use: '登出',              svg: <Svg><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></Svg> },
  ];
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
        设计稿 demo — Unicode 符号 <span style={{ textTransform: 'none', letterSpacing: 0, color: '#9b9ba6' }}>（零依赖 · 系统字体自带）</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {unicode.map((ic) => (
          <div key={ic.use} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: '#fafafc', border: '1px solid #ececf2', borderRadius: 6, fontSize: '0.75rem' }}>
            <span style={{ fontSize: '1rem', color: '#2a2a33', width: 18, textAlign: 'center', lineHeight: 1 }}>{ic.c}</span>
            <span style={{ color: '#6a6a74' }}>{ic.use}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 }}>
        真实 admin 代码 — lucide-react <span style={{ textTransform: 'none', letterSpacing: 0, color: '#9b9ba6' }}>（来自 lucide.dev · MIT · tree-shakable SVG）</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {lucide.map((ic) => (
          <div key={ic.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 11px', background: '#fafafc', border: '1px solid #ececf2', borderRadius: 6 }}>
            <span style={{ color: '#2a2a33', display: 'inline-flex' }}>{ic.svg}</span>
            <div>
              <div style={{ color: '#2a2a33', fontFamily: 'Menlo, monospace', fontSize: '0.7188rem' }}>{ic.name}</div>
              <div style={{ color: '#9b9ba6', fontSize: '0.6562rem' }}>{ic.use}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <Spec label="Demo 图标" value="Unicode 字符 · 0 KB 依赖 · 字形受系统字体影响" />
        <Spec label="真码图标" value="lucide-react · 官方 lucide.dev · path 可直接 inline 到 JSX 里免装包" />
        <Spec label="svgrepo.com" value="聚合站（含 Lucide 转载）· 不是原始源 · 谨慎使用" />
        <Spec label="替换策略" value="demo 贴近真码 → 把 Unicode 逐个换成 <svg><path d='...' /></svg> · 从 lucide.dev 拷 path" />
        <Spec label="示例" value="本页'表格'板块的 ▸ 已升级成 Lucide ChevronRight SVG（rotate 90° 做展开动画）" />
      </div>
    </div>
  );
}

// ───────── 10. 糖果色板 & 组件 ─────────
function CandyBlock() {
  const vals = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 0];
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>COLOR_MAP · 14 个糖果</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {vals.map((v) => {
          const c = COLOR_MAP[v];
          return (
            <div key={v} style={{ textAlign: 'center', width: 70 }}>
              <CandyChip v={v} size={40} />
              <div style={{ fontSize: '0.6875rem', color: '#2a2a33', fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 500, marginTop: 4 }}>{labelOf(v)}</div>
              <div style={{ fontSize: '0.5625rem', color: '#9b9ba6', fontFamily: 'Menlo, monospace' }}>{c.bg}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 10 }}>CandyChip 尺寸</div>
      <Row>
        {[14, 18, 22, 26, 34, 48].map((s) => (
          <div key={s} style={{ textAlign: 'center' }}>
            <CandyChip v={64} size={s} />
            <div style={{ fontSize: '0.625rem', color: '#9b9ba6', marginTop: 3 }}>{s}px</div>
          </div>
        ))}
      </Row>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 10 }}>TokenPill (序列 token 丸)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {['2', '4', '8', '16', '32', '64', '128', '256', '512', '1024', '2048', '4096', '8192', 'stone'].map((t, i) => (
          <TokenPill key={i} index={i} token={t} />
        ))}
      </div>
    </div>
  );
}

// ───────── 11. 概率条 ─────────
function ProbsBlock() {
  const w1 = { 2: 18.1, 4: 18.3, 8: 23.9, 16: 24.9, 32: 14.8 };
  const w2 = { 64: 60, 128: 28, 256: 7, stone: 5 };
  const w3 = { 512: 25, 1024: 25, 2048: 20, 4096: 15, 8192: 10, stone: 5 };
  return (
    <div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>MiniProbBar (只读细条)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: '0.6875rem', color: '#6a6a74', marginBottom: 4 }}>2/4/8/16/32 · 早期阶段</div>
          <MiniProbBar weights={w1} height={8} />
        </div>
        <div>
          <div style={{ fontSize: '0.6875rem', color: '#6a6a74', marginBottom: 4 }}>64/128/256 + stone · 练习阶段</div>
          <MiniProbBar weights={w2} height={12} />
        </div>
        <div>
          <div style={{ fontSize: '0.6875rem', color: '#6a6a74', marginBottom: 4 }}>512-8192 + stone · 终盘 (粗条)</div>
          <MiniProbBar weights={w3} height={28} />
        </div>
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 10 }}>时间轴彩条 (4 stage)</div>
      <div style={{ display: 'flex', height: 26, borderRadius: 5, overflow: 'hidden', width: 500, fontSize: '0.625rem', color: '#fff' }}>
        {[{ c: '#5a7cff', l: 30 }, { c: '#4ecd7a', l: 30 }, { c: '#ffb93c', l: 30 }, { c: '#c83a3a', l: 28 }].map((s, i) => (
          <div key={i} style={{ flex: `0 0 ${s.l / 118 * 100}%`, background: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, borderRight: i < 3 ? '1px solid rgba(255,255,255,0.4)' : 'none' }}>
            Stage {i + 1} · {s.l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── 12. 抽屉 / Sheets ─────────
function DrawersBlock({ openDrawer, setOpenDrawer }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div style={{ border: '1px solid #ececf2', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>PlanEditSheet</div>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 10 }}>85vw · 宽 · 用于 Plan 新增/编辑 (V4 表格)</div>
          <button onClick={() => setOpenDrawer('plan')} style={{ ...secondaryBtn, padding: '6px 14px', fontSize: '0.75rem' }}>打开</button>
        </div>
        <div style={{ border: '1px solid #ececf2', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>SequenceDetailSheet</div>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 10 }}>70vw · 带 3 视图切换 (分段/分隔/时间轴)</div>
          <button onClick={() => setOpenDrawer('seq')} style={{ ...secondaryBtn, padding: '6px 14px', fontSize: '0.75rem' }}>打开</button>
        </div>
        <div style={{ border: '1px solid #ececf2', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>StageDetailSheet</div>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 10 }}>70vw · Stage 只读详情 (EV + 权重表 + 采样)</div>
          <button onClick={() => setOpenDrawer('stage')} style={{ ...secondaryBtn, padding: '6px 14px', fontSize: '0.75rem' }}>打开</button>
        </div>
        <div style={{ border: '1px solid #ececf2', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>SequenceEditSheet</div>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginBottom: 10 }}>60vw · 窄 · 序列名称 + 备注 编辑</div>
          <button onClick={() => setOpenDrawer('seqEdit')} style={{ ...secondaryBtn, padding: '6px 14px', fontSize: '0.75rem' }}>打开</button>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <Spec label="关闭按钮" value="40×40 方形白底 · position: absolute; right: 100% · 贴在抽屉左外侧" />
        <Spec label="Overlay" value="rgba(16, 16, 24, 0.35) · inset 0 · zIndex 40/60" />
        <Spec label="抽屉" value="position: fixed · right: 0 · zIndex 50/70 · 从右侧 slide-in 300ms" />
        <Spec label="z-index 分层" value="PlanEdit 40/50 · 嵌套抽屉 (Sequence/Stage/SeqEdit) 60/70" />
        <Spec label="ESC" value="关闭最上层抽屉" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════
function DesignShowcase() {
  const [query, setQuery] = React.useState('');
  const [openDrawer, setOpenDrawer] = React.useState(null);

  const sections = [
    { id: 'layout',  title: '布局骨架',      tags: 'layout shell sidebar header 布局 侧栏', node: <LayoutBlock /> },
    { id: 'colors',  title: '颜色 tokens',   tags: 'color token palette 颜色 色板',       node: <ColorsBlock /> },
    { id: 'type',    title: '字体 & 字号',   tags: 'font typography 字体 字号',            node: <TypeBlock /> },
    { id: 'buttons', title: '按钮',          tags: 'button btn primary secondary 按钮',   node: <ButtonsBlock /> },
    { id: 'inputs',  title: '输入框',        tags: 'input search textarea 输入 搜索 过滤', node: <InputsBlock /> },
    { id: 'tabs',    title: '切换组 / Tabs', tags: 'tabs segmented pill 切换 标签',       node: <TabsBlock /> },
    { id: 'badges',  title: '徽章 / 状态',   tags: 'badge pill status 徽章 状态',         node: <BadgesBlock /> },
    { id: 'cards',   title: '卡片',          tags: 'card container meta 卡片',            node: <CardsBlock /> },
    { id: 'tables',  title: '表格',          tags: 'table grid row 表格',                 node: <TablesBlock /> },
    { id: 'icons',   title: '图标',          tags: 'icon svg unicode lucide 图标',        node: <IconsBlock /> },
    { id: 'candy',   title: '糖果色板 & 组件', tags: 'candy chip token 糖果 色',          node: <CandyBlock /> },
    { id: 'probs',   title: '概率条 / 时间轴', tags: 'prob bar weight 概率',               node: <ProbsBlock /> },
    { id: 'drawers', title: '抽屉 / Sheets',  tags: 'drawer sheet modal 抽屉',            node: <DrawersBlock openDrawer={openDrawer} setOpenDrawer={setOpenDrawer} /> },
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sections.filter((s) => s.title.toLowerCase().includes(q) || s.tags.toLowerCase().includes(q))
    : sections;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 60 }}>
      {/* sticky top header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(247, 247, 250, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid #ececf2',
        padding: '14px 36px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: '1.1875rem', color: '#c8343a' }}>
            Giant 2048 · Admin UI 看板
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#8a8a94', marginTop: 2 }}>
            设计规范 / 组件库 · {sections.length} 个板块 · <a href="index.html" style={{ color: '#5a7cff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="LogOut" size={11} /> 回主 admin</a>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索板块（按钮 / 抽屉 / 颜色 / input ...）"
          style={{
            width: 340, padding: '9px 14px', fontSize: '0.8125rem',
            border: '1px solid #e6e6ec', borderRadius: 8,
            background: '#fff', outline: 'none', fontFamily: 'inherit',
          }} />
        {q && (
          <div style={{ fontSize: '0.6875rem', color: '#6a6a74' }}>
            匹配 {filtered.length}/{sections.length}
          </div>
        )}
      </div>

      {/* content */}
      <div style={{ display: 'flex', gap: 0, padding: '20px 36px', alignItems: 'flex-start' }}>
        {/* TOC */}
        <div style={{
          width: 160, flexShrink: 0, paddingRight: 14,
          position: 'sticky', top: 90,
        }}>
          <div style={{ fontSize: '0.625rem', color: '#8a8a94', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>目录</div>
          {filtered.map((s) => (
            <a key={s.id} href={`#${s.id}`} style={{
              display: 'block', padding: '5px 10px', fontSize: '0.75rem',
              color: '#5a5a66', textDecoration: 'none', borderRadius: 5, marginBottom: 1,
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#ececf2')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              {s.title}
            </a>
          ))}
        </div>

        {/* main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #ececf2', borderRadius: 10, padding: '60px 22px', textAlign: 'center', fontSize: '0.8125rem', color: '#9b9ba6' }}>
              没有匹配 "<span style={{ color: '#2a2a33', fontWeight: 500 }}>{query}</span>" 的板块 — 换个关键词试试？
            </div>
          ) : filtered.map((s) => (
            <Block key={s.id} id={s.id} title={s.title}>
              {s.node}
            </Block>
          ))}
        </div>
      </div>

      {/* drawer demos (mounted once, opened on demand) */}
      <PlanEditSheet
        open={openDrawer === 'plan'}
        onClose={() => setOpenDrawer(null)}
        mode="new"
        initialPlan={PLAN_A}
      />
      <SequenceDetailSheet
        open={openDrawer === 'seq'}
        onClose={() => setOpenDrawer(null)}
        plan={PLAN_A}
        sequence={PLAN_A.sequences[0]}
      />
      <StageDetailSheet
        open={openDrawer === 'stage'}
        onClose={() => setOpenDrawer(null)}
        plan={PLAN_A}
        stage={PLAN_A.stages[1]}
        stageIndex={1}
      />
      <SequenceEditSheet
        open={openDrawer === 'seqEdit'}
        onClose={() => setOpenDrawer(null)}
        sequence={PLAN_A.sequences[0]}
      />
    </div>
  );
}

Object.assign(window, { DesignShowcase });
