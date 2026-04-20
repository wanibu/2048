import { useState, useEffect } from 'react';
import { LogOut, Gamepad2, Settings, BarChart3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getToken, clearToken } from '@/api/client';
import { LoginPage } from '@/pages/LoginPage';
import { StatsPage } from '@/pages/StatsPage';
import { GamesPage } from '@/pages/GamesPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { PlanAnalysisPage } from '@/pages/PlanAnalysisPage';

export type GamesStatusFilter = 'all' | 'playing' | 'finished';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState('stats');
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
    setTab('games');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold text-[var(--color-primary)]">Giant 2048 Admin</div>
          <div className="text-xs text-[var(--color-text-muted)]">v0.1.0</div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          退出
        </Button>
      </header>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-1" /> 统计
            </TabsTrigger>
            <TabsTrigger value="plan-analysis">
              <Sparkles className="h-4 w-4 mr-1" /> Plan 分析
            </TabsTrigger>
            <TabsTrigger value="games">
              <Gamepad2 className="h-4 w-4 mr-1" /> 游戏局
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-1" /> 配置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats">
            <StatsPage
              onNavigateGames={navigateToGames}
              onNavigatePlanAnalysis={() => setTab('plan-analysis')}
              onNavigatePlans={() => setTab('config')}
              onNavigateSequences={() => setTab('config')}
            />
          </TabsContent>
          <TabsContent value="plan-analysis"><PlanAnalysisPage /></TabsContent>
          <TabsContent value="games">
            <GamesPage statusFilter={gamesFilter} onStatusFilterChange={setGamesFilter} />
          </TabsContent>
          <TabsContent value="config"><ConfigPage /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
