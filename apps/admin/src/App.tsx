import { useEffect, useState } from 'react';
import { BarChart3, Gamepad2, LineChart, LogOut, Settings } from 'lucide-react';
import { StatsPage } from '@/pages/StatsPage';
import { GamesPage } from '@/pages/GamesPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { PlanAnalysisPage } from '@/pages/PlanAnalysisPage';

export type GamesStatusFilter = 'all' | 'playing' | 'finished';

type PageKey = 'stats' | 'analysis' | 'games' | 'config';

const NAV = [
  { k: 'stats', label: '统计', icon: BarChart3 },
  { k: 'analysis', label: '样本分析', icon: LineChart },
  { k: 'games', label: '游戏局', icon: Gamepad2 },
  { k: 'config', label: '配置', icon: Settings },
] as const;

function isPageKey(value: string | null): value is PageKey {
  return NAV.some((item) => item.k === value);
}

export default function App() {
  const [page, setPage] = useState<PageKey>(() => {
    const savedPage = localStorage.getItem('admin_page');
    return isPageKey(savedPage) ? savedPage : 'stats';
  });
  const [gamesFilter, setGamesFilter] = useState<GamesStatusFilter>('all');

  useEffect(() => {
    localStorage.setItem('admin_page', page);
  }, [page]);

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
          {NAV.map(({ k, label, icon: Icon }) => {
            const active = page === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setPage(k)}
                className={`mb-[2px] flex w-full cursor-pointer items-center gap-[8px] rounded-[6px] border-0 px-[10px] py-[7px] text-left text-[0.7812rem] outline-none ${
                  active
                    ? 'bg-[var(--color-border)] font-semibold text-[var(--color-text)]'
                    : 'bg-transparent font-medium text-[var(--color-text-secondary)]'
                }`}
              >
                <span
                  className={`inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center ${
                    active ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-dimmest)]'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => {}}
          className="flex cursor-pointer items-center gap-[6px] border-0 border-t border-[var(--color-border)] px-[12px] py-[12px] text-[0.6875rem] text-[var(--color-text-dimmest)] outline-none"
        >
          <LogOut size={13} />
          <span>退出</span>
        </button>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {page === 'stats' && (
          <StatsPage
            onNavigateGames={(filter) => {
              setGamesFilter(filter);
              setPage('games');
            }}
            onNavigatePlanAnalysis={() => setPage('analysis')}
            onNavigatePlans={() => setPage('config')}
            onNavigateSequences={() => setPage('config')}
          />
        )}
        {page === 'analysis' && <PlanAnalysisPage />}
        {page === 'games' && (
          <GamesPage statusFilter={gamesFilter} onStatusFilterChange={setGamesFilter} />
        )}
        {page === 'config' && <ConfigPage />}
      </main>
    </div>
  );
}
