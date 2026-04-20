import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Eye, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import type { Game, GamesResp } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';

export function GamesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GamesResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Game | null>(null);
  const [sequence, setSequence] = useState<Array<string | number>>([]);

  async function load(p = page) {
    setLoading(true);
    try {
      const res = await api<GamesResp>(`/api/admin/games?page=${p}&limit=20`);
      setData(res);
      setPage(p);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  async function showDetail(gameId: string) {
    try {
      const g = await api<Game & { sequence?: unknown }>(`/api/admin/game/${gameId}`);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">游戏局列表</h2>
        <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>局号</TableHead>
                <TableHead>指纹</TableHead>
                <TableHead>用户</TableHead>
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
                  <TableCell colSpan={8} className="text-center text-[var(--color-text-muted)] py-8">
                    {loading ? '加载中...' : '暂无数据'}
                  </TableCell>
                </TableRow>
              ) : (
                data.games.map((g) => (
                  <TableRow key={g.game_id}>
                    <TableCell className="font-mono text-xs">{g.game_id}</TableCell>
                    <TableCell className="font-mono text-xs">{g.fingerprint.slice(0, 16)}…</TableCell>
                    <TableCell>{g.user_id || '-'}</TableCell>
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
          onChange={load}
        />
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>局详情 — {detail?.game_id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <Row label="状态" value={detail.status === 'playing' ? '进行中' : '已结束'} />
              <Row label="结束原因" value={detail.end_reason || '-'} />
              <Row label="指纹" value={detail.fingerprint} mono />
              <Row label="用户" value={detail.user_id || '-'} />
              <Row label="Seed" value={String(detail.seed)} />
              <Row label="步数 / 分数" value={`${detail.step} / ${detail.score}`} />
              <Row label="开始" value={formatDateTime(detail.created_at)} />
              <Row label="结束" value={formatDateTime(detail.ended_at)} />
              <Row label="签名" value={detail.sign?.slice(0, 48) + '...'} mono />
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-1">糖果序列（{sequence.length}个）</div>
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto border border-[var(--color-border)] rounded p-2 bg-[var(--color-bg)]">
                  {sequence.length === 0 ? (
                    <span className="text-xs text-[var(--color-text-muted)]">（无）</span>
                  ) : sequence.map((c, i) => (
                    <span
                      key={i}
                      className={`text-xs px-1.5 py-0.5 rounded ${c === 'stone' || c === -1
                        ? 'bg-orange-800/40 text-orange-300'
                        : 'bg-[var(--color-surface-2)]'} ${i < detail.step ? 'opacity-40' : ''}`}
                    >
                      #{i + 1}: {c}
                    </span>
                  ))}
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
    <div className="flex items-center gap-4 py-1 border-b border-[var(--color-border)]/50">
      <div className="w-20 text-xs text-[var(--color-text-muted)] shrink-0">{label}</div>
      <div className={`flex-1 ${mono ? 'font-mono text-xs break-all' : ''}`}>{value}</div>
    </div>
  );
}
