import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { api } from '@/api/client';
import type { Stats } from '@/api/types';
import type { GamesStatusFilter } from '@/App';
import { toast } from 'react-toastify';

interface Props {
  onNavigateGames: (filter: GamesStatusFilter) => void;
  onNavigatePlanAnalysis: () => void;
  onNavigatePlans: () => void;
  onNavigateSequences: () => void;
}

export function StatsPage({
  onNavigateGames, onNavigatePlanAnalysis, onNavigatePlans, onNavigateSequences,
}: Props) {
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

  interface CardItem {
    label: string;
    value: number | string;
    color?: string;
    onClick?: () => void;
    hint?: string;
  }

  const items: CardItem[] = stats ? [
    {
      label: '总局数',
      value: stats.totalGames,
      onClick: () => onNavigateGames('all'),
      hint: '查看全部局',
    },
    {
      label: '进行中',
      value: stats.playingGames,
      color: 'text-orange-400',
      onClick: () => onNavigateGames('playing'),
      hint: '查看进行中的局',
    },
    {
      label: '已结束',
      value: stats.finishedGames,
      color: 'text-[var(--color-success)]',
      onClick: () => onNavigateGames('finished'),
      hint: '查看已结束的局',
    },
    {
      label: '独立玩家',
      value: stats.uniquePlayers,
      onClick: () => onNavigateGames('all'),
      hint: '查看玩家维度（全部局）',
    },
    {
      label: '最高分',
      value: stats.topScore,
      color: 'text-[var(--color-primary)]',
      onClick: onNavigatePlanAnalysis,
      hint: '按 Plan 维度对比分数、时长、留存等',
    },
    {
      label: '序列方案数',
      value: stats.sequencePlans,
      onClick: onNavigatePlans,
      hint: '管理 Plans',
    },
    {
      label: '生成序列数',
      value: stats.generatedSequences,
      onClick: onNavigateSequences,
      hint: '管理生成的 Sequences',
    },
  ] : [];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <h2 className="text-lg font-semibold">统计</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((it) => (
            <Card
              key={it.label}
              onClick={it.onClick}
              className={it.onClick ? 'cursor-pointer hover:border-[var(--color-primary)] hover:shadow-md transition' : ''}
              title={it.hint}
            >
              <CardHeader>
                <CardTitle className="text-xs font-normal text-[var(--color-text-muted)]">{it.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`text-2xl font-bold ${it.color || ''}`}>{it.value}</div>
                {it.hint && (
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-1">{it.hint} →</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
