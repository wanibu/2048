// admin-app.jsx — full single-page admin with left-nav switcher.

function AdminApp() {
  const [page, setPage] = React.useState(() => localStorage.getItem('admin_page') || 'stats');
  React.useEffect(() => { localStorage.setItem('admin_page', page); }, [page]);

  const nav = [
    { k: 'stats',    label: '统计',       icon: 'BarChart3' },
    { k: 'analysis', label: '样本分析',   icon: 'LineChart' },
    { k: 'games',    label: '游戏局',     icon: 'Gamepad2' },
    { k: 'config',   label: '配置',       icon: 'Settings' },
  ];

  let body;
  if (page === 'stats') body = <StatsPage />;
  else if (page === 'analysis') body = <PlanAnalysisPage />;
  else if (page === 'games') body = <GamesPage />;
  else if (page === 'config') body = <ConfigPage />;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#2a2a33', background: '#f7f7fa' }}>
      {/* left nav */}
      <div style={{ width: 168, background: '#fafaf7', borderRight: '1px solid #ececf2', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 18px 14px' }}>
          <div style={{ fontFamily: 'Fredoka, system-ui, sans-serif', fontWeight: 700, fontSize: '1.0625rem', color: '#c8343a' }}>Giant 2048</div>
          <div style={{ fontSize: '0.625rem', color: '#9b9ba6' }}>Admin · v0.1.2</div>
        </div>
        <div style={{ padding: '6px 8px', flex: 1 }}>
          {nav.map((n) => {
            const active = page === n.k;
            return (
              <div key={n.k} onClick={() => setPage(n.k)} style={{
                padding: '7px 10px', borderRadius: 6, fontSize: '0.7812rem', marginBottom: 2,
                background: active ? '#ececf2' : 'transparent',
                color: active ? '#2a2a33' : '#6a6a74',
                fontWeight: active ? 600 : 500,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer',
              }}>
                <span style={{ color: active ? '#5a5a66' : '#9b9ba6', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={n.icon} size={18} />
                </span>
                {n.label}
              </div>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: '1px solid #ececf2', fontSize: '0.6875rem', color: '#9b9ba6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="LogOut" size={13} /> 退出
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {body}
      </div>
    </div>
  );
}

// Blank plan template for "new plan" flow — 1 pre-filled empty-ish stage so
// the spreadsheet isn't an empty skeleton. User types name/note + edits stage.
function makeBlankPlan() {
  return {
    name: '', note: '',
    stages: [{ id: 'new_1', name: 'Stage 1', length: 30, weights: evenSplit([2, 4, 8, 16, 32]) }],
  };
}

// Config page — Plans tree (PLAN_A + PLAN_B) + tabbed DetailVariantA
// + nested sheets for Plan edit and Sequence detail.
function ConfigPage() {
  const [selectedPlanId, setSelectedPlanId] = React.useState(ALL_PLANS[0].id);
  const selectedPlan = ALL_PLANS.find((p) => p.id === selectedPlanId) || ALL_PLANS[0];

  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState('new');
  const [editTargetPlan, setEditTargetPlan] = React.useState(null);

  const [seqOpen, setSeqOpen] = React.useState(false);
  const [seqTarget, setSeqTarget] = React.useState(null);

  const [stageOpen, setStageOpen] = React.useState(false);
  const [stageTarget, setStageTarget] = React.useState(null);
  const [stageTargetIdx, setStageTargetIdx] = React.useState(0);

  const [seqEditOpen, setSeqEditOpen] = React.useState(false);
  const [seqEditTarget, setSeqEditTarget] = React.useState(null);

  const openNew = () => { setEditMode('new'); setEditTargetPlan(makeBlankPlan()); setEditOpen(true); };
  const openEdit = () => { setEditMode('edit'); setEditTargetPlan(selectedPlan); setEditOpen(true); };
  const openSeq = (s) => { setSeqTarget(s); setSeqOpen(true); };
  const openStage = (s, i) => { setStageTarget(s); setStageTargetIdx(i); setStageOpen(true); };
  const openSeqEdit = (s) => { setSeqEditTarget(s); setSeqEditOpen(true); };
  const deleteSeq = (s) => {
    if (window.confirm(`确认删除序列 "${s.displayName || s.name}"？此操作不可撤销。`)) {
      // demo-only: no actual deletion from mock data
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PageHeader title="配置" />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 248, borderRight: '1px solid #ececf2', background: '#fff', padding: 14, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input placeholder="搜索框" style={{
              flex: 1, padding: '6px 10px', fontSize: '0.75rem', border: '1px solid #e6e6ec',
              borderRadius: 6, background: '#fff', outline: 'none', fontFamily: 'inherit',
              boxSizing: 'border-box', minWidth: 0,
            }} />
            <button onClick={openNew} title="新增 Plan"
              style={{
                padding: '5px 10px', fontSize: '0.75rem',
                border: '1px solid #e6e6ec', borderRadius: 6,
                background: '#fff', color: '#5a5a66', cursor: 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
              <Icon name="Plus" size={12} /> 新增
            </button>
          </div>
          <div>
            {ALL_PLANS.map((p) => {
              const active = p.id === selectedPlanId;
              return (
                <div key={p.id} onClick={() => setSelectedPlanId(p.id)} style={{
                  padding: '7px 10px', fontSize: '0.7812rem', borderRadius: 6,
                  background: active ? '#fff3ea' : 'transparent',
                  color: '#2a2a33', fontWeight: active ? 600 : 500,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 2, cursor: 'pointer',
                }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#fafafc'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <span>{p.name}</span>
                  <span style={{ color: active ? '#c87a3a' : '#9b9ba6', fontWeight: 500, fontSize: '0.6875rem' }}>{p.sequences.length}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0, background: '#f7f7fa' }}>
          <DetailVariantA plan={selectedPlan} onEdit={openEdit} onSelectSequence={openSeq} onSelectStage={openStage} onEditSequence={openSeqEdit} onDeleteSequence={deleteSeq} />
        </div>
      </div>

      <PlanEditSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode={editMode}
        initialPlan={editTargetPlan}
      />
      <SequenceDetailSheet
        open={seqOpen}
        onClose={() => setSeqOpen(false)}
        plan={selectedPlan}
        sequence={seqTarget}
        onSelectStage={openStage}
      />
      <StageDetailSheet
        open={stageOpen}
        onClose={() => setStageOpen(false)}
        plan={selectedPlan}
        stage={stageTarget}
        stageIndex={stageTargetIdx}
      />
      <SequenceEditSheet
        open={seqEditOpen}
        onClose={() => setSeqEditOpen(false)}
        sequence={seqEditTarget}
      />
    </div>
  );
}

// Right-side drawer that hosts the V4 spreadsheet editor for creating / editing a plan.
function PlanEditSheet({ open, onClose, mode, initialPlan }) {
  React.useEffect(() => {
    if (document.getElementById('plan-edit-sheet-keyframes')) return;
    const s = document.createElement('style');
    s.id = 'plan-edit-sheet-keyframes';
    s.textContent = '@keyframes planSheetOverlayIn { from { opacity: 0; } to { opacity: 1; } } @keyframes planSheetSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }';
    document.head.appendChild(s);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <React.Fragment>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(16, 16, 24, 0.35)',
        zIndex: 40, animation: 'planSheetOverlayIn 200ms ease-out',
      }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '85vw', maxWidth: 1280,
        background: '#f7f7fa', zIndex: 50,
        boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.12)',
        animation: 'planSheetSlideIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
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
        <div style={{ flex: 1, minHeight: 0 }}>
          <AdminV4_Spreadsheet
            initialPlan={initialPlan}
            mode={mode}
            onCancel={onClose}
            onSave={() => onClose()}
          />
        </div>
      </div>
    </React.Fragment>
  );
}

Object.assign(window, { AdminApp, ConfigPage, PlanEditSheet });
