import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import type { Stats } from '@/api/types';
import type { GamesStatusFilter } from '@/App';
import { PageHeader } from '@/components/ui/page-header';
import { RefreshBtn } from '@/components/ui/refresh-btn';
import { toast } from 'react-toastify';

interface StatsPageProps {
  onNavigateGames: (filter: GamesStatusFilter) => void;
  onNavigatePlanAnalysis: () => void;
  onNavigatePlans: () => void;
  onNavigateSequences: () => void;
}

// TODO(Phase 2.1): 后端加时间序列接口后替换为实时数据
const TREND_GAMES = [18, 22, 20, 26, 24, 30, 28, 35, 33, 38, 36, 42];
const TREND_PLAYERS = [8, 9, 10, 11, 12, 10, 14, 13, 15, 17, 16, 18];
const TREND_SCORES = [2100, 2400, 2300, 2800, 2500, 3100, 2900, 3400, 3200, 3600, 3500, 3900];

function formatNumber(n: number) {
  return n.toLocaleString('en-US');
}

function Spark({
  label,
  value,
  delta,
  positive,
  data,
  color,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  data: number[];
  color: string;
}) {
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 200;
      const y = 40 - (v / max) * (40 - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div>
      <div
        style={{
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: 'Fredoka, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: '1.125rem',
            color: 'var(--color-text)',
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: '0.6875rem', color: positive ? '#1fa85a' : '#c83a3a' }}>{delta}</span>
      </div>
      <svg
        viewBox="0 0 200 40"
        preserveAspectRatio="none"
        width="100%"
        height={40}
        style={{ display: 'block' }}
      >
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
      </svg>
    </div>
  );
}

export function StatsPage({
  onNavigateGames,
  onNavigatePlanAnalysis,
  onNavigatePlans,
  onNavigateSequences,
}: StatsPageProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadStats() {
    setLoading(true);
    try {
      const nextStats = await api<Stats>('/api/admin/stats');
      setStats(nextStats);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  const cards = [
    {
      key: 'totalGames',
      label: '总局数',
      value: stats?.totalGames ?? null,
      hint: '点击查看游戏局',
      accent: '#5a7cff',
      onClick: () => onNavigateGames('all'),
    },
    {
      key: 'playingGames',
      label: '进行中',
      value: stats?.playingGames ?? null,
      hint: 'playing',
      accent: '#ffb93c',
      onClick: () => onNavigateGames('playing'),
    },
    {
      key: 'finishedGames',
      label: '已结束',
      value: stats?.finishedGames ?? null,
      hint: 'finished',
      accent: '#1fa85a',
      onClick: () => onNavigateGames('finished'),
    },
    {
      key: 'uniquePlayers',
      label: '独立玩家',
      value: stats?.uniquePlayers ?? null,
      hint: '按 user_id',
      accent: '#4ecd7a',
      onClick: () => onNavigateGames('all'),
    },
    {
      key: 'topScore',
      label: '最高分',
      value: stats?.topScore ?? null,
      hint: '全量记录',
      accent: '#c83a3a',
      onClick: onNavigatePlanAnalysis,
    },
    {
      key: 'sequencePlans',
      label: '序列方案数',
      value: stats?.sequencePlans ?? null,
      hint: 'Plans',
      accent: '#c14dff',
      onClick: onNavigatePlans,
    },
    {
      key: 'generatedSequences',
      label: '已生成序列',
      value: stats?.generatedSequences ?? null,
      hint: 'Sequences',
      accent: '#8e5dff',
      onClick: onNavigateSequences,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-bg)]">
      <PageHeader title="统计" right={<RefreshBtn onClick={() => void loadStats()} loading={loading} />} />

      <div className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto p-5">
        <div className="grid grid-cols-4 gap-[14px]">
          {cards.map((c) => (
            <div
              key={c.key}
              onClick={c.onClick}
              style={{
                position: 'relative',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                padding: '18px 20px',
                cursor: 'pointer',
                transition: 'box-shadow 150ms ease, transform 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: c.accent,
                  opacity: 0.65,
                  borderTopLeftRadius: 10,
                  borderBottomLeftRadius: 10,
                }}
              />
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: 10,
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: 'Fredoka, system-ui, sans-serif',
                  fontWeight: 600,
                  fontSize: '1.875rem',
                  color: 'var(--color-text)',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.1,
                  marginBottom: 6,
                }}
              >
                {typeof c.value === 'number' ? formatNumber(c.value) : '—'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-dimmest)' }}>{c.hint}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 12 }}>近 24 小时趋势</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <Spark label="新增局数" value="—" delta="—" positive data={TREND_GAMES} color="#5a7cff" />
            <Spark label="独立玩家" value="—" delta="—" positive data={TREND_PLAYERS} color="#4ecd7a" />
            <Spark label="平均得分" value="—" delta="—" positive data={TREND_SCORES} color="#c14dff" />
          </div>
        </div>
      </div>
    </div>
  );
}
