import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, HelpCircle } from 'lucide-react';
import { api } from '@/api/client';
import type { PlanStat, PlanStatsResp } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// 健康区间：绿=理想，黄=边缘，红=异常
type Band = 'green' | 'yellow' | 'red' | 'gray';
type Range = { green: [number, number]; yellow: [number, number] };

function band(v: number | null, r: Range): Band {
  if (v === null || !Number.isFinite(v)) return 'gray';
  if (v >= r.green[0] && v <= r.green[1]) return 'green';
  if (v >= r.yellow[0] && v <= r.yellow[1]) return 'yellow';
  return 'red';
}

const bandClass: Record<Band, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-amber-100 text-amber-800',
  red: 'bg-rose-100 text-rose-800',
  gray: 'text-[var(--color-text-muted)]',
};

function Cell({ value, format, range, suffix }: {
  value: number | null;
  format: (v: number) => string;
  range?: Range;
  suffix?: string;
}) {
  const b = range ? band(value, range) : 'gray';
  const text = value === null || !Number.isFinite(value) ? '-' : format(value) + (suffix || '');
  return (
    <span className={`inline-block px-2 py-0.5 rounded font-mono text-xs ${range ? bandClass[b] : bandClass.gray}`}>
      {text}
    </span>
  );
}

const fmt0 = (v: number) => Math.round(v).toLocaleString();
const fmt1 = (v: number) => v.toFixed(1);
const fmt2 = (v: number) => v.toFixed(2);
const fmtPct = (v: number) => (v * 100).toFixed(0) + '%';
const fmtSec = (v: number) => {
  if (v < 60) return v.toFixed(0) + 's';
  const m = Math.floor(v / 60);
  const s = Math.round(v % 60);
  return `${m}m${s}s`;
};

// 健康区间定义（基于游戏设计经验）
const RANGES = {
  duration_median: { green: [90, 180], yellow: [60, 300] } as Range,     // 局时长 p50: 1.5-3分钟理想
  score_median: { green: [1000, 3000], yellow: [500, 5000] } as Range,   // 分数 p50
  ceiling_ratio: { green: [2.5, 6], yellow: [1.8, 10] } as Range,        // p90/p50 长尾比
  score_cv: { green: [0.3, 0.6], yellow: [0.2, 0.9] } as Range,          // 变异系数
  first_step: { green: [10, 30], yellow: [5, 50] } as Range,             // 新手首局步数
  retry_rate: { green: [0.4, 1], yellow: [0.2, 1] } as Range,            // retry 比例
  gameover_share: { green: [0.7, 1], yellow: [0.5, 1] } as Range,        // 自然死亡占比
  learning_delta: { green: [0.2, 3], yellow: [0, 5] } as Range,          // 学习曲线：5局 vs 首局 ≥+20%
};

export function PlanAnalysisPage() {
  const [data, setData] = useState<PlanStatsResp | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<PlanStatsResp>('/api/admin/plan-stats');
      setData(r);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Plan 分析</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            多维度对比每个 Plan 的实战数据，找出最适合玩家的平衡方案。
            <span className="mx-2">|</span>
            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 mr-1">绿</span>理想
            <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 mx-1">黄</span>边缘
            <span className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 mx-1">红</span>异常
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-[var(--color-surface)]">Plan</TableHead>
                <TableHead>样本</TableHead>
                <TableHead>独立玩家</TableHead>
                <TableHead title="Flow：局时长 p50 秒">
                  时长 p50 <HelpIcon title="游戏设计推荐 90-180s，超过就太长，低于就太短" />
                </TableHead>
                <TableHead>时长 p90</TableHead>
                <TableHead title="成就感">
                  分数 p50 <HelpIcon title="理想 1000-3000，反映『一般玩家的水平』" />
                </TableHead>
                <TableHead>分数 p90</TableHead>
                <TableHead title="天花板 = 高手与普通玩家的分差。长尾明显说明游戏有深度">
                  天花板比 <HelpIcon title="p90 / p50。≥2.5 说明顶部玩家有追求空间" />
                </TableHead>
                <TableHead title="变异系数 = std / avg。太小=太同质（无聊），太大=随机性过重">
                  分数 CV <HelpIcon title="0.3-0.6 理想；过小=运气低技巧也低，过大=纯运气" />
                </TableHead>
                <TableHead title="新玩家第 1 局能撑几步。过短=秒死劝退，过长=教程太水">
                  新手首局步数 <HelpIcon title="10-30 步理想" />
                </TableHead>
                <TableHead title="该 fp 连续开 ≥3 局的比例。高=玩家还想再来一把">
                  Retry 率 <HelpIcon title="≥40% 说明玩家有『再来一把』冲动" />
                </TableHead>
                <TableHead title="自然 game over 占比（vs timeout 等）">
                  gameover 占比 <HelpIcon title="≥70% 说明玩家在『玩到死』而非超时挂机" />
                </TableHead>
                <TableHead title="同一 fp 第 5 局 vs 第 1 局分数提升率">
                  学习曲线 <HelpIcon title="≥+20% 说明玩家技巧会明显提升（技巧型 vs 运气型）" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-[var(--color-text-muted)] py-8">
                    {loading ? '加载中...' : '暂无数据'}
                  </TableCell>
                </TableRow>
              ) : data.plans.map((p: PlanStat, i) => (
                <TableRow key={p.plan_id || `__none__${i}`}>
                  <TableCell className="sticky left-0 bg-[var(--color-surface)] font-medium">
                    {p.plan_name || <span className="text-[var(--color-text-muted)] italic">（无 Plan）</span>}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-mono">{p.games_finished} / {p.games_total}</div>
                    {p.games_playing > 0 && (
                      <div className="text-[10px] text-amber-600">{p.games_playing} 进行中</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.unique_players}</TableCell>
                  <TableCell>
                    <Cell value={p.duration_sec.median} format={fmtSec} range={RANGES.duration_median} />
                  </TableCell>
                  <TableCell>
                    <Cell value={p.duration_sec.p90} format={fmtSec} />
                  </TableCell>
                  <TableCell>
                    <Cell value={p.score.median} format={fmt0} range={RANGES.score_median} />
                  </TableCell>
                  <TableCell>
                    <Cell value={p.score.p90} format={fmt0} />
                  </TableCell>
                  <TableCell>
                    <Cell value={p.ceiling_ratio} format={fmt2} range={RANGES.ceiling_ratio} suffix="×" />
                  </TableCell>
                  <TableCell>
                    <Cell value={p.score.cv} format={fmt2} range={RANGES.score_cv} />
                  </TableCell>
                  <TableCell>
                    <Cell value={p.first_game.avg_step} format={fmt1} range={RANGES.first_step} />
                  </TableCell>
                  <TableCell>
                    <Cell value={p.retry_rate} format={fmtPct} range={RANGES.retry_rate} />
                  </TableCell>
                  <TableCell>
                    <Cell value={p.gameover_share} format={fmtPct} range={RANGES.gameover_share} />
                  </TableCell>
                  <TableCell>
                    {p.learning_curve.sample > 0 ? (
                      <span title={`样本：${p.learning_curve.sample} 个玩家`}>
                        <Cell value={p.learning_curve.avg_delta} format={fmtPct} range={RANGES.learning_delta} />
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)]">样本不足</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.plans.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 text-sm">end_reason 分布</h3>
            <div className="space-y-2">
              {data.plans.map((p, i) => {
                const total = Object.values(p.end_reasons).reduce((s, v) => s + v, 0);
                if (total === 0) return null;
                return (
                  <div key={p.plan_id || `er-${i}`} className="text-xs">
                    <div className="mb-1">
                      <span className="font-medium">{p.plan_name || '（无 Plan）'}</span>
                      <span className="text-[var(--color-text-muted)]"> · {total} finished</span>
                    </div>
                    <div className="flex h-4 rounded overflow-hidden border border-[var(--color-border)]">
                      {Object.entries(p.end_reasons).map(([reason, n]) => {
                        const pct = (n / total) * 100;
                        const color =
                          reason === 'gameover' ? 'bg-emerald-400' :
                          reason === 'timeout' ? 'bg-amber-400' :
                          reason === 'new_game' ? 'bg-sky-300' :
                          reason === 'sequence_force_deleted' ? 'bg-rose-400' :
                          'bg-gray-400';
                        return (
                          <div
                            key={reason}
                            className={color}
                            style={{ width: `${pct}%` }}
                            title={`${reason}: ${n} (${pct.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-1 text-[11px] text-[var(--color-text-muted)]">
                      {Object.entries(p.end_reasons).map(([reason, n]) => (
                        <span key={reason}>
                          {reason}: <span className="font-mono text-[var(--color-text)]">{n}</span>
                          <span className="ml-1">({((n / total) * 100).toFixed(0)}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HelpIcon({ title }: { title: string }) {
  return (
    <span title={title} className="inline-block align-middle ml-1 text-[var(--color-text-muted)] cursor-help">
      <HelpCircle className="h-3 w-3 inline" />
    </span>
  );
}
