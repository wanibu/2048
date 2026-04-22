// admin-app.jsx — full single-page admin with left-nav switcher.

function AdminApp() {
  const [page, setPage] = React.useState(() => localStorage.getItem('admin_page') || 'stats');
  const [openGameId, setOpenGameId] = React.useState(null);

  React.useEffect(() => { localStorage.setItem('admin_page', page); }, [page]);

  const nav = [
    { k: 'stats',    label: '统计',       icon: '▦' },
    { k: 'analysis', label: '样本分析',   icon: '◈' },
    { k: 'games',    label: '游戏局',     icon: '◐' },
    { k: 'config',   label: '配置',       icon: '⚙' },
  ];

  let body;
  if (page === 'stats') body = <StatsPage />;
  else if (page === 'analysis') body = <PlanAnalysisPage />;
  else if (page === 'games') {
    body = openGameId
      ? <GameDetailPage onBack={() => setOpenGameId(null)} />
      : <GamesPage onOpenGame={(id) => setOpenGameId(id)} />;
  }
  else if (page === 'config') body = <ConfigPage />;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#2a2a33', background: '#f7f7fa' }}>
      {/* left nav */}
      <div style={{ width: 168, background: '#fafaf7', borderRight: '1px solid #ececf2', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 18px 14px' }}>
          <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: 17, color: '#c8343a' }}>Giant 2048</div>
          <div style={{ fontSize: 10, color: '#9b9ba6' }}>Admin · v0.1.2</div>
        </div>
        <div style={{ padding: '6px 8px', flex: 1 }}>
          {nav.map((n) => {
            const active = page === n.k;
            return (
              <div key={n.k} onClick={() => { setPage(n.k); setOpenGameId(null); }} style={{
                padding: '7px 10px', borderRadius: 6, fontSize: 12.5, marginBottom: 2,
                background: active ? '#ececf2' : 'transparent',
                color: active ? '#2a2a33' : '#6a6a74',
                fontWeight: active ? 600 : 500,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer',
              }}>
                <span style={{ fontSize: 12, color: '#9b9ba6', width: 14, textAlign: 'center' }}>{n.icon}</span>
                {n.label}
              </div>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #ececf2', fontSize: 11, color: '#9b9ba6', cursor: 'pointer' }}>↩ 退出</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {body}
      </div>
    </div>
  );
}

// Config page — Plans tree + reused DetailVariantA
function ConfigPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PageHeader title="配置" actions={<RefreshBtn />} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
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
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0, background: '#f7f7fa' }}>
          <DetailVariantA />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminApp, ConfigPage });
