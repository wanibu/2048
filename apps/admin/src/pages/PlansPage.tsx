import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Plus, Pencil } from 'lucide-react';
import { api } from '@/api/client';
import type { Plan, PlansResp, InlineStageInput } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ProbabilityGrid, type StageDraft } from '@/components/ui/probability-grid';
import { formatDateTime } from '@/lib/utils';

// 新增 Stage 时默认均分 5 档
function defaultProbabilities(): Record<string, number> {
  return { '2': 20, '4': 20, '8': 20, '16': 20, '32': 20 };
}

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
    if (!confirm(`删除 Plan "${p.name}"？（其 stages 也会一起删除）`)) return;
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
  const [stages, setStages] = useState<StageDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (plan) {
      setName(plan.name);
      setDescription(plan.description || '');
      const ordered = [...plan.stages].sort((a, b) => a.stage_order - b.stage_order);
      setStages(ordered.map(s => ({
        name: s.name,
        length: s.length,
        probabilities: { ...s.probabilities },
      })));
    } else {
      setName('');
      setDescription('');
      setStages([]);
    }
  }, [open, plan]);

  function addStage() {
    setStages(arr => [
      ...arr,
      {
        name: `Stage ${arr.length + 1}`,
        length: 30,
        probabilities: defaultProbabilities(),
      },
    ]);
  }

  const totalLength = stages.reduce((sum, s) => sum + (s.length || 0), 0);
  const allStagesValid = stages.every(s => {
    if (!s.name.trim() || !s.length || s.length <= 0) return false;
    if (Object.keys(s.probabilities).length === 0) return false;
    const sum = Object.values(s.probabilities).reduce((a: number, b: number) => a + b, 0);
    return Math.abs(sum - 100) < 0.01;
  });

  async function submit() {
    if (!name.trim()) {
      toast.warn('请输入 Plan 名称');
      return;
    }
    if (stages.length === 0) {
      toast.warn('请至少添加一个 Stage');
      return;
    }
    if (!allStagesValid) {
      toast.warn('有 stage 名称/长度/概率不合法（概率总和需为 100）');
      return;
    }
    const payload: InlineStageInput[] = stages.map((s, idx) => ({
      name: s.name.trim(),
      length: s.length,
      probabilities: s.probabilities,
      stage_order: idx + 1,
    }));
    setSubmitting(true);
    try {
      if (plan) {
        await api(`/api/admin/sequence-plans/${plan.id}`, {
          method: 'PUT',
          body: { name: name.trim(), description: description.trim(), stages: payload },
        });
        toast.success('已更新');
      } else {
        await api('/api/admin/sequence-plans', {
          method: 'POST',
          body: { name: name.trim(), description: description.trim(), stages: payload },
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center justify-between pr-10">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">PLAN</span>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Plan 名称"
                className="h-8 max-w-sm"
              />
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="描述（可选）"
                className="h-8 flex-1 max-w-md"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              总长度 <span className="font-mono text-[var(--color-text)]">{totalLength}</span>
            </div>
          </div>
          <SheetTitle className="sr-only">{plan ? `编辑 Plan：${plan.name}` : '新增 Plan'}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <ProbabilityGrid stages={stages} onStagesChange={setStages} onAdd={addStage} />
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit} disabled={submitting || stages.length === 0 || !name.trim() || !allStagesValid}>
            {submitting ? '提交中…' : plan ? '保存' : '创建'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
