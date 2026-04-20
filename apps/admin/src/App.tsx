import { useState, useEffect } from 'react';
import { LogOut, Gamepad2, Settings, BarChart3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getToken, clearToken } from '@/api/client';
import { LoginPage } from '@/pages/LoginPage';
import { StatsPage } from '@/pages/StatsPage';
import { GamesPage } from '@/pages/GamesPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { PlanAnalysisPage } from '@/pages/PlanAnalysisPage';

export type GamesStatusFilter = 'all' | 'playing' | 'finished';

type NavKey = 'stats' | 'plan-analysis' | 'games' | 'config';

interface NavItem {
  key: NavKey;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { key: 'stats', label: '统计', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'plan-analysis', label: 'Plan 分析', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'games', label: '游戏局', icon: <Gamepad2 className="h-4 w-4" /> },
  { key: 'config', label: '配置', icon: <Settings className="h-4 w-4" /> },
];

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [nav, setNav] = useState<NavKey>('stats');
  const [gamesFilter, setGamesFilter] = useState<GamesStatusFilter>('all');

  useEffect(() => {
    setLoggedIn(!!getToken());
  }, []);

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  function handleLogout() {
    clearToken();
    setLoggedIn(false);
  }

  function navigateToGames(filter: GamesStatusFilter) {
    setGamesFilter(filter);
    setNav('games');
  }

  return (
    <div className="h-screen w-screen grid grid-cols-[220px_1fr] bg-[var(--color-bg)] overflow-hidden">
      {/* ======== SIDEBAR ======== */}
      <aside className="flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="px-4 py-4 border-b border-[var(--color-border)]">
          <div className="text-base font-semibold text-[var(--color-primary)]">Giant 2048</div>
          <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Admin · v0.1.0</div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map((item) => {
            const active = nav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setNav(item.key)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left cursor-pointer transition ${
                  active
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-text)] border-l-2 border-[var(--color-primary)]'
                    : 'hover:bg-[var(--color-surface-2)] border-l-2 border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--color-border)]">
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start">
            <LogOut className="h-4 w-4" />
            退出
          </Button>
        </div>
      </aside>

      {/* ======== MAIN ======== */}
      <main className="flex flex-col overflow-hidden">
        {nav === 'stats' && (
          <StatsPage
            onNavigateGames={navigateToGames}
            onNavigatePlanAnalysis={() => setNav('plan-analysis')}
            onNavigatePlans={() => setNav('config')}
            onNavigateSequences={() => setNav('config')}
          />
        )}
        {nav === 'plan-analysis' && <PlanAnalysisPage />}
        {nav === 'games' && (
          <GamesPage statusFilter={gamesFilter} onStatusFilterChange={setGamesFilter} />
        )}
        {nav === 'config' && <ConfigPage />}
      </main>
    </div>
  );
}
