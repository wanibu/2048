import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Plus } from 'lucide-react';
import { api } from '@/api/client';
import type { GeneratedSequence, Plan, PlansResp, SequencesResp } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';

export function SequencesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SequencesResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GeneratedSequence | null>(null);

  async function load(p = page) {
    setLoading(true);
    try {
      const r = await api<SequencesResp>(`/api/admin/generated-sequences?page=${p}&limit=20`);
      setData(r);
      setPage(p);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  async function toggleStatus(s: GeneratedSequence) {
    const next = s.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await api(`/api/admin/generated-sequences/${s.id}`, { method: 'PUT', body: { status: next } });
      toast.success(`已${next === 'enabled' ? '启用' : '禁用'}`);
      load(page);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '切换失败');
    }
  }

  function onDelete(s: GeneratedSequence) {
    setDeleteTarget(s);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Generated Sequences（生成的序列）</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4" />
            生成序列
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>所属 Plan</TableHead>
                <TableHead>长度</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.sequences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[var(--color-text-muted)] py-8">
                    {loading ? '加载中...' : '暂无序列'}
                  </TableCell>
                </TableRow>
              ) : data.sequences.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}…</TableCell>
                  <TableCell>{s.plan_name || '-'}</TableCell>
                  <TableCell>{s.sequence_length}</TableCell>
                  <TableCell>
                    {s.status === 'enabled'
                      ? <Badge variant="success">启用</Badge>
                      : <Badge variant="outline">禁用</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{formatDateTime(s.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => toggleStatus(s)}>
                        {s.status === 'enabled' ? '禁用' : '启用'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(s)}>删除</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={load} />}

      <GenerateSequenceDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onDone={() => load(1)}
      />

      <DeleteSequenceDialog
        target={deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null); }}
        onDone={() => load(page)}
      />
    </div>
  );
}

export function DeleteSequenceDialog({
  target, onOpenChange, onDone,
}: {
  target: GeneratedSequence | null;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [refInfo, setRefInfo] = useState<{ refCount: number; playingCount: number } | null>(null);

  useEffect(() => {
    if (!target) setRefInfo(null);
  }, [target]);

  async function doDelete(force: boolean) {
    if (!target) return;
    setSubmitting(true);
    try {
      const url = force
        ? `/api/admin/generated-sequences/${target.id}?force=true`
        : `/api/admin/generated-sequences/${target.id}`;
      const r = await api<{ success: boolean; stoppedGames: number }>(url, { method: 'DELETE' });
      toast.success(
        force && r.stoppedGames
          ? `已强制删除，停止了 ${r.stoppedGames} 场比赛`
          : r.stoppedGames
            ? `已删除（同时停止 ${r.stoppedGames} 场比赛）`
            : '已删除',
      );
      onOpenChange(false);
      onDone();
    } catch (err) {
      const e = err as { error?: string; refCount?: number; playingCount?: number };
      if (!force && typeof e?.refCount === 'number' && e.refCount > 0) {
        // 更新 refInfo，提示用户走强制删除
        setRefInfo({ refCount: e.refCount, playingCount: e.playingCount ?? 0 });
      } else {
        toast.error(e?.error || (force ? '强制删除失败' : '删除失败'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const open = target !== null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>删除序列</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            序列 ID：<span className="font-mono">{target?.id.slice(0, 8)}…</span>
          </div>
          <div>所属 Plan：{target?.plan_name || '-'}</div>

          {refInfo && (
            <div className="rounded border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-3 space-y-1">
              <div className="font-medium text-[var(--color-danger)]">该序列已被引用</div>
              <div>引用比赛数：<span className="font-mono">{refInfo.refCount}</span></div>
              <div>进行中比赛：<span className="font-mono">{refInfo.playingCount}</span></div>
              {refInfo.playingCount > 0 ? (
                <div className="text-xs text-[var(--color-text-muted)]">
                  强制删除将立刻结束这 {refInfo.playingCount} 场进行中的比赛（end_reason = sequence_force_deleted）。
                </div>
              ) : (
                <div className="text-xs text-[var(--color-text-muted)]">
                  历史比赛均已结束；强制删除后，它们的 generated_sequence_id 会成为悬空引用。
                </div>
              )}
            </div>
          )}

          {!refInfo && (
            <div className="text-[var(--color-text-muted)] text-xs">
              若序列未被任何比赛引用，点击「普通删除」即可移除；若被引用，系统会提示，届时可选择「强制删除」。
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            关闭
          </Button>
          <Button
            variant="outline"
            onClick={() => doDelete(false)}
            disabled={submitting}
          >
            普通删除
          </Button>
          <Button
            onClick={() => doDelete(true)}
            disabled={submitting}
            className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white"
          >
            {submitting ? '处理中…' : '强制删除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GenerateSequenceDialog({
  open, onOpenChange, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string>('');
  const [count, setCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await api<PlansResp>('/api/admin/sequence-plans?page=1&limit=200');
        setPlans(r.plans);
        if (r.plans.length > 0 && !planId) setPlanId(r.plans[0].id);
      } catch {
        toast.error('加载 Plans 失败');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    if (!planId) {
      toast.warn('请选择一个 Plan');
      return;
    }
    setSubmitting(true);
    try {
      await api('/api/admin/generate-sequence', {
        method: 'POST',
        body: { sequence_plan_id: planId, count },
      });
      toast.success(`已生成 ${count} 条序列`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '生成失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>生成序列</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>选择 Plan</Label>
            {plans.length === 0 ? (
              <div className="text-xs text-[var(--color-text-muted)]">（无可用 Plan，请先在 Plans 页新建）</div>
            ) : (
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="选择一个 Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}（{p.stages.length} 阶段 / 总长 {p.total_length}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label>生成数量</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit} disabled={submitting || !planId}>
            {submitting ? '生成中…' : '生成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
