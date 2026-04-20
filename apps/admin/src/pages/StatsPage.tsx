import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { api } from '@/api/client';
import type { Stats } from '@/api/types';
import { toast } from 'react-toastify';

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const s = await api<Stats>('/api/admin/stats');
      setStats(s);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const items: { label: string; value: number | string; color?: string }[] = stats ? [
    { label: '总局数', value: stats.totalGames },
    { label: '进行中', value: stats.playingGames, color: 'text-orange-400' },
    { label: '已结束', value: stats.finishedGames, color: 'text-[var(--color-success)]' },
    { label: '独立玩家', value: stats.uniquePlayers },
    { label: '最高分', value: stats.topScore, color: 'text-[var(--color-primary)]' },
    { label: '序列方案数', value: stats.sequencePlans },
    { label: '生成序列数', value: stats.generatedSequences },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">统计</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((it) => (
          <Card key={it.label}>
            <CardHeader>
              <CardTitle className="text-xs font-normal text-[var(--color-text-muted)]">{it.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-2xl font-bold ${it.color || ''}`}>{it.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
