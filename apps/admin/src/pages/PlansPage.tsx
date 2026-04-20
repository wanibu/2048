import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Plus, Pencil, ArrowUp, ArrowDown, X } from 'lucide-react';
import { api } from '@/api/client';
import type { Plan, PlansResp, Stage, StagesResp } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';

export function PlansPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PlansResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load(p = page) {
    setLoading(true);
    try {
      const r = await api<PlansResp>(`/api/admin/sequence-plans?page=${p}&limit=20`);
      setData(r);
      setPage(p);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  async function onDelete(p: Plan) {
    if (!confirm(`删除 Plan "${p.name}"？`)) return;
    try {
      await api(`/api/admin/sequence-plans/${p.id}`, { method: 'DELETE' });
      toast.success('已删除');
      load(page);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sequence Plans（序列方案）</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            新增 Plan
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
                <TableHead>名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>阶段</TableHead>
                <TableHead>总长度</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[var(--color-text-muted)] py-8">
                    {loading ? '加载中...' : '暂无 Plan'}
                  </TableCell>
                </TableRow>
              ) : data.plans.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-[var(--color-text-muted)] max-w-xs truncate">{p.description || '-'}</TableCell>
                  <TableCell className="text-xs">
                    {p.stages.length > 0
                      ? p.stages.map(s => s.name).join(' → ')
                      : '-'}
                  </TableCell>
                  <TableCell>{p.total_length}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(p.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(p)}>删除</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={load} />}

      <PlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={editing}
        onDone={() => load(page)}
      />
    </div>
  );
}

interface StageRef { stage_id: string; stage_order: number }

export function PlanDialog({
  open, onOpenChange, plan, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: Plan | null;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allStages, setAllStages] = useState<Stage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickStageId, setPickStageId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await api<StagesResp>('/api/admin/stages?page=1&limit=200');
        setAllStages(r.stages);
      } catch {
        toast.error('加载 Stages 失败');
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setName(plan.name);
      setDescription(plan.description || '');
      setSelectedIds(plan.stages.sort((a, b) => a.stage_order - b.stage_order).map(s => s.id));
    } else {
      setName('');
      setDescription('');
      setSelectedIds([]);
      setPickStageId('');
    }
  }, [open, plan]);

  function add() {
    if (!pickStageId) {
      toast.warn('先从下拉里选一个 Stage');
      return;
    }
    if (selectedIds.includes(pickStageId)) {
      toast.info('已添加过该 Stage');
      return;
    }
    setSelectedIds(arr => [...arr, pickStageId]);
    setPickStageId('');
  }

  function remove(id: string) {
    setSelectedIds(arr => arr.filter(x => x !== id));
  }
  function moveUp(idx: number) {
    if (idx <= 0) return;
    setSelectedIds(arr => {
      const copy = [...arr];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  }
  function moveDown(idx: number) {
    setSelectedIds(arr => {
      if (idx >= arr.length - 1) return arr;
      const copy = [...arr];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return copy;
    });
  }

  const stageMap = new Map(allStages.map(s => [s.id, s]));
  const totalLength = selectedIds.reduce((sum, id) => sum + (stageMap.get(id)?.length || 0), 0);

  async function submit() {
    if (!name.trim()) {
      toast.warn('请输入 Plan 名称');
      return;
    }
    if (selectedIds.length === 0) {
      toast.warn('请至少选一个 Stage');
      return;
    }
    // stage_order 从 1 开始（数据库有 CHECK constraint: stage_order > 0）
    const stages: StageRef[] = selectedIds.map((stage_id, idx) => ({
      stage_id,
      stage_order: idx + 1,
    }));
    setSubmitting(true);
    try {
      if (plan) {
        await api(`/api/admin/sequence-plans/${plan.id}`, {
          method: 'PUT',
          body: { name: name.trim(), description: description.trim(), stages },
        });
        toast.success('已更新');
      } else {
        await api('/api/admin/sequence-plans', {
          method: 'POST',
          body: { name: name.trim(), description: description.trim(), stages },
        });
        toast.success('已创建');
      }
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error((err as { error?: string })?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  const availableStages = allStages.filter(s => !selectedIds.includes(s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{plan ? `编辑 Plan：${plan.name}` : '新增 Plan'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="如 normal-game" />
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="（可选）" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>组合 Stages（按顺序）</Label>
              <span className="text-xs text-[var(--color-text-muted)]">
                总长度 <span className="font-mono text-[var(--color-text)]">{totalLength}</span>
              </span>
            </div>

            {/* 已选列表 */}
            {selectedIds.length === 0 ? (
              <div className="text-xs text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded p-3 text-center">
                尚未添加 Stage
              </div>
            ) : (
              <div className="space-y-1">
                {selectedIds.map((id, idx) => {
                  const s = stageMap.get(id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 p-2 bg-[var(--color-surface-2)] rounded border border-[var(--color-border)]"
                    >
                      <span className="text-xs text-[var(--color-text-muted)] w-6 font-mono">#{idx + 1}</span>
                      <span className="flex-1 text-sm">{s ? s.name : <span className="text-[var(--color-text-muted)]">[已删除]</span>}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        长 {s?.length ?? '?'}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => moveUp(idx)} disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => moveDown(idx)} disabled={idx === selectedIds.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(id)}>
                        <X className="h-4 w-4 text-[var(--color-danger)]" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 添加下拉 */}
            {availableStages.length > 0 && (
              <div className="flex gap-2 pt-1">
                <div className="flex-1">
                  <Select value={pickStageId} onValueChange={setPickStageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选一个 Stage 加入" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStages.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}（长 {s.length}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={add} disabled={!pickStageId}>
                  <Plus className="h-4 w-4" />
                  添加
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit} disabled={submitting || selectedIds.length === 0 || !name.trim()}>
            {submitting ? '提交中…' : plan ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
