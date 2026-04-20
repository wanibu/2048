import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Eye, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import type { Game, GameDetail, GamesResp } from '@/api/types';
import type { GamesStatusFilter } from '@/App';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';

interface Props {
  statusFilter: GamesStatusFilter;
  onStatusFilterChange: (f: GamesStatusFilter) => void;
}

export function GamesPage({ statusFilter, onStatusFilterChange }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<GamesResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [sequence, setSequence] = useState<Array<string | number>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  async function load(p = page, filter: GamesStatusFilter = statusFilter, size = pageSize) {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(p), limit: String(size) });
      if (filter !== 'all') q.set('status', filter);
      const res = await api<GamesResp>(`/api/admin/games?${q.toString()}`);
      setData(res);
      setPage(p);
      setSelected(new Set()); // 翻页/刷新清空选择
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1, statusFilter, pageSize); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter, pageSize]);

  function toggleOne(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    if (!data) return;
    const ids = data.games.map(g => g.game_id);
    const allSelected = ids.every(id => selected.has(id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) {
        ids.forEach(id => n.delete(id));
      } else {
        ids.forEach(id => n.add(id));
      }
      return n;
    });
  }
  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`确认批量删除 ${selected.size} 局（及对应分数记录）？不可恢复。`)) return;
    setBatchDeleting(true);
    try {
      const r = await api<{ success: boolean; deletedGames: number; deletedScores: number }>(
        '/api/admin/delete-games',
        { method: 'POST', body: { ids: Array.from(selected) } },
      );
      toast.success(`已删除 ${r.deletedGames} 局 / ${r.deletedScores} 条分数记录`);
      load(page);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  }

  async function showDetail(gameId: string) {
    try {
      const g = await api<GameDetail>(`/api/admin/game/${gameId}`);
      setDetail(g);
      let seq: unknown = g.sequence;
      if (typeof seq === 'string') {
        try { seq = JSON.parse(seq); } catch { seq = []; }
      }
      setSequence(Array.isArray(seq) ? seq as Array<string | number> : []);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载详情失败');
    }
  }

  async function deleteGame(gameId: string) {
    if (!confirm(`确认删除局 ${gameId}？`)) return;
    try {
      await api(`/api/admin/delete-game/${gameId}`, { method: 'DELETE' });
      toast.success('已删除');
      load(page);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <h2 className="text-lg font-semibold">游戏局列表</h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded border border-[var(--color-border)] overflow-hidden text-xs">
            {(['all', 'playing', 'finished'] as const).map(f => (
              <button
                key={f}
                onClick={() => onStatusFilterChange(f)}
                className={`px-3 py-1 cursor-pointer ${
                  statusFilter === f
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                    : 'hover:bg-[var(--color-surface-2)]'
                }`}
              >
                {f === 'all' ? '全部' : f === 'playing' ? '进行中' : '已结束'}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col p-6 gap-3">
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 rounded border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-sm">
            <span>已选 <span className="font-semibold">{selected.size}</span> 局</span>
            <Button
              size="sm"
              onClick={deleteSelected}
              disabled={batchDeleting}
              className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {batchDeleting ? '删除中…' : `批量删除 ${selected.size}`}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} disabled={batchDeleting}>
              清空选择
            </Button>
          </div>
        )}

        <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={!!data && data.games.length > 0 && data.games.every(g => selected.has(g.game_id))}
                    ref={(el) => {
                      if (!el || !data) return;
                      const ids = data.games.map(g => g.game_id);
                      const some = ids.some(id => selected.has(id));
                      const all = ids.length > 0 && ids.every(id => selected.has(id));
                      el.indeterminate = some && !all;
                    }}
                    onChange={toggleAll}
                    title="全选/反选本页"
                  />
                </TableHead>
                <TableHead>局号</TableHead>
                <TableHead>指纹</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>步数</TableHead>
                <TableHead>分数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>开局时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.games.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-[var(--color-text-muted)] py-8">
                    {loading ? '加载中...' : '暂无数据'}
                  </TableCell>
                </TableRow>
              ) : (
                data.games.map((g: Game) => (
                  <TableRow key={g.game_id} className={selected.has(g.game_id) ? 'bg-[var(--color-primary)]/5' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={selected.has(g.game_id)}
                        onChange={() => toggleOne(g.game_id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{g.game_id}</TableCell>
                    <TableCell className="font-mono text-xs">{g.fingerprint.slice(0, 12)}…</TableCell>
                    <TableCell className="text-xs">
                      {g.plan_name ? (
                        <span title={g.sequence_plan_id || ''}>{g.plan_name}</span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {g.generated_sequence_id
                        ? <span title={g.generated_sequence_id}>{g.generated_sequence_id.slice(0, 8)}…</span>
                        : <span className="text-[var(--color-text-muted)]">-</span>}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {g.sequence_length
                        ? `${g.sequence_index ?? 0} / ${g.sequence_length}`
                        : '-'}
                    </TableCell>
                    <TableCell>{g.step}</TableCell>
                    <TableCell className="font-semibold">{g.score}</TableCell>
                    <TableCell>
                      {g.status === 'playing'
                        ? <Badge variant="warning">进行中</Badge>
                        : <Badge variant="success">已结束</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(g.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => showDetail(g.game_id)} title="详情">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteGame(g.game_id)} title="删除">
                          <Trash2 className="h-4 w-4 text-[var(--color-danger)]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </CardContent>
        </Card>

        {data && (
          <Pagination
            page={page}
            totalPages={data.totalPages}
            total={data.total}
            onChange={(p) => load(p)}
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>局详情 — {detail?.game_id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <Row label="状态" value={detail.status === 'playing' ? '进行中' : '已结束'} />
                <Row label="结束原因" value={detail.end_reason || '-'} />
                <Row label="用户" value={detail.user_id || '-'} />
                <Row label="Seed" value={String(detail.seed)} />
                <Row label="步数 / 分数" value={`${detail.step} / ${detail.score}`} />
                <Row
                  label="序列进度"
                  value={detail.sequence_length
                    ? `${detail.sequence_index ?? 0} / ${detail.sequence_length}`
                    : '-'}
                />
                <Row label="开始" value={formatDateTime(detail.created_at)} />
                <Row label="结束" value={formatDateTime(detail.ended_at)} />
              </div>

              <div className="border-t border-[var(--color-border)] pt-3 space-y-1">
                <Row label="Plan" value={detail.plan_name || '-'} />
                <Row label="Plan ID" value={detail.sequence_plan_id || '-'} mono />
                <Row label="Sequence ID" value={detail.generated_sequence_id || '-'} mono />
                <Row label="指纹" value={detail.fingerprint} mono />
                <Row label="签名" value={detail.sign ? detail.sign.slice(0, 48) + '…' : '-'} mono />
              </div>

              {detail.stages && detail.stages.length > 0 && (
                <div className="border-t border-[var(--color-border)] pt-3">
                  <div className="text-xs text-[var(--color-text-muted)] mb-2">
                    Plan 阶段组成（{detail.stages.length} 个，按顺序）
                  </div>
                  <div className="space-y-1">
                    {detail.stages.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-start gap-2 p-2 bg-[var(--color-surface-2)] rounded text-xs"
                      >
                        <span className="font-mono text-[var(--color-text-muted)] w-6 shrink-0">
                          #{s.stage_order}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div>
                            <span className="font-medium">{s.name}</span>
                            <span className="text-[var(--color-text-muted)] ml-2">长度 {s.length}</span>
                          </div>
                          <div className="text-[var(--color-text-muted)] font-mono break-all">
                            {Object.entries(s.probabilities)
                              .map(([k, v]) => `${k}:${v}%`)
                              .join(' · ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-[var(--color-border)] pt-3">
                <div className="text-xs text-[var(--color-text-muted)] mb-1">
                  糖果序列（共 {sequence.length} 个{typeof detail.sequence_index === 'number' ? `，已用 ${detail.sequence_index}` : ''}）
                </div>
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto border border-[var(--color-border)] rounded p-2 bg-[var(--color-bg)]">
                  {sequence.length === 0 ? (
                    <span className="text-xs text-[var(--color-text-muted)]">（无）</span>
                  ) : sequence.map((c, i) => {
                    const consumed = typeof detail.sequence_index === 'number' && i < detail.sequence_index;
                    const isStone = c === 'stone' || c === -1;
                    return (
                      <span
                        key={i}
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isStone
                            ? 'bg-orange-200 text-orange-800'
                            : 'bg-[var(--color-surface-2)]'
                        } ${consumed ? 'opacity-40 line-through' : ''}`}
                        title={consumed ? '已消费' : '未消费'}
                      >
                        #{i + 1}: {c}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1 border-b border-[var(--color-border)]/40">
      <div className="w-24 text-xs text-[var(--color-text-muted)] shrink-0">{label}</div>
      <div className={`flex-1 min-w-0 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</div>
    </div>
  );
}
