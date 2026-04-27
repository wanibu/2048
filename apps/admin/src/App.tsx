import { useEffect } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart3, Gamepad2, LineChart, LogOut, Settings } from 'lucide-react';
import { StatsPage } from '@/pages/StatsPage';
import { GamesPage } from '@/pages/GamesPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { PlanAnalysisPage } from '@/pages/PlanAnalysisPage';
import { SequenceAnalysisSheet } from '@/pages/SequenceAnalysisSheet';
import { LoginPage } from '@/pages/LoginPage';
import { getToken, logout } from '@/api/client';

export type GamesStatusFilter = 'all' | 'playing' | 'finished';

const NAV = [
  { path: '/stats', label: '统计', icon: BarChart3 },
  { path: '/analysis', label: '样本分析', icon: LineChart },
  { path: '/game-round', label: '游戏局', icon: Gamepad2 },
  { path: '/settings', label: '配置', icon: Settings },
] as const;

// Auth gate：未登录跳 /login（带 next 参数让登录后跳回）
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!getToken()) {
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

function LoginRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/stats';
  return <LoginPage onLoggedIn={() => navigate(next, { replace: true })} />;
}

function Layout() {
  const navigate = useNavigate();

  // 监听 401 / logout 广播：跳到 /login（带 next 让登录后跳回当前页）
  useEffect(() => {
    const onUnauthorized = () => {
      const next = window.location.pathname + window.location.search;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    };
    window.addEventListener('admin-unauthorized', onUnauthorized);
    return () => window.removeEventListener('admin-unauthorized', onUnauthorized);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-[var(--color-bg)] font-[Inter,system-ui,sans-serif] text-[var(--color-text)]">
      <aside className="flex w-[168px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-warm)]">
        <div className="px-[18px] pb-[14px] pt-[18px]">
          <div className="font-[Fredoka,system-ui,sans-serif] text-[1.0625rem] font-bold text-[var(--color-brand)]">
            Giant 2048
          </div>
          <div className="text-[0.625rem] text-[var(--color-text-dimmest)]">Admin · v0.1.2</div>
        </div>

        <nav className="flex-1 px-[8px] py-[6px]">
          {NAV.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `mb-[2px] flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] border-0 px-[10px] py-[7px] text-left text-[0.7812rem] outline-none no-underline ${
                  isActive
                    ? 'bg-[var(--color-border)] font-semibold text-[var(--color-text)]'
                    : 'bg-transparent font-medium text-[var(--color-text-secondary)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center ${
                      isActive ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-dimmest)]'
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => logout()}
          className="flex cursor-pointer items-center gap-[6px] border-0 border-t border-[var(--color-border)] px-[12px] py-[12px] text-[0.6875rem] text-[var(--color-text-dimmest)] outline-none"
        >
          <LogOut size={13} />
          <span>退出</span>
        </button>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <Routes>
          <Route path="/stats" element={<StatsPageRoute />} />
          <Route path="/analysis" element={<AnalysisPageRoute />} />
          <Route path="/game-round" element={<GamesPageRoute />} />
          <Route path="/settings" element={<ConfigPage />} />
          <Route path="*" element={<Navigate to="/stats" replace />} />
        </Routes>
      </main>
      <AnalysisSheetMount />
    </div>
  );
}

function StatsPageRoute() {
  const navigate = useNavigate();
  return (
    <StatsPage
      onNavigateGames={(filter) => navigate(`/game-round?status=${filter}`)}
      onNavigatePlanAnalysis={() => navigate('/analysis')}
      onNavigatePlans={() => navigate('/settings')}
      onNavigateSequences={() => navigate('/settings?tab=sequences')}
    />
  );
}

function AnalysisPageRoute() {
  const [params, setParams] = useSearchParams();
  return (
    <PlanAnalysisPage
      onSelectSequence={(_planId, seqId) => {
        const next = new URLSearchParams(params);
        next.set('sequence', seqId);
        setParams(next, { replace: false });
      }}
    />
  );
}

function GamesPageRoute() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('status') || 'all';
  const status = (raw === 'playing' || raw === 'finished' || raw === 'all') ? raw : 'all';
  return (
    <GamesPage
      statusFilter={status as GamesStatusFilter}
      onStatusFilterChange={(filter) => {
        const next = new URLSearchParams(params);
        if (filter === 'all') next.delete('status');
        else next.set('status', filter);
        setParams(next, { replace: false });
      }}
    />
  );
}

// SequenceAnalysisSheet 由 URL ?sequence=X 控制（PlanAnalysisPage 路由 + 全局浮层）
function AnalysisSheetMount() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const sequenceId = location.pathname === '/analysis' ? params.get('sequence') : null;
  return (
    <SequenceAnalysisSheet
      open={sequenceId !== null}
      sequenceId={sequenceId}
      onClose={() => {
        const next = new URLSearchParams(params);
        next.delete('sequence');
        const search = next.toString();
        navigate(`/analysis${search ? `?${search}` : ''}`, { replace: true });
      }}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="*"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
