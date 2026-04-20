import { useState, useEffect } from 'react';
import { LogOut, Gamepad2, LayoutGrid, Layers, ListOrdered, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getToken, clearToken } from '@/api/client';
import { LoginPage } from '@/pages/LoginPage';
import { StatsPage } from '@/pages/StatsPage';
import { GamesPage } from '@/pages/GamesPage';
import { StagesPage } from '@/pages/StagesPage';
import { PlansPage } from '@/pages/PlansPage';
import { SequencesPage } from '@/pages/SequencesPage';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

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
        <Tabs defaultValue="stats">
          <TabsList>
            <TabsTrigger value="stats">
              <BarChart3 className="h-4 w-4 mr-1" /> 统计
            </TabsTrigger>
            <TabsTrigger value="games">
              <Gamepad2 className="h-4 w-4 mr-1" /> 游戏局
            </TabsTrigger>
            <TabsTrigger value="stages">
              <LayoutGrid className="h-4 w-4 mr-1" /> Stages
            </TabsTrigger>
            <TabsTrigger value="plans">
              <Layers className="h-4 w-4 mr-1" /> Plans
            </TabsTrigger>
            <TabsTrigger value="sequences">
              <ListOrdered className="h-4 w-4 mr-1" /> Sequences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats"><StatsPage /></TabsContent>
          <TabsContent value="games"><GamesPage /></TabsContent>
          <TabsContent value="stages"><StagesPage /></TabsContent>
          <TabsContent value="plans"><PlansPage /></TabsContent>
          <TabsContent value="sequences"><SequencesPage /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
