import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw, Plus, Pencil } from 'lucide-react';
import { api } from '@/api/client';
import type { Stage, StagesResp } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTime } from '@/lib/utils';

// 默认的概率分布 keys（游戏中可能的 token 值）
const DEFAULT_PROB_KEYS = ['2', '4', '8', '16', '32', '64', '128', 'stone'];

export function StagesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StagesResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Stage | null>(null); // null=新建, Stage=编辑
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load(p = page) {
    setLoading(true);
    try {
      const r = await api<StagesResp>(`/api/admin/stages?page=${p}&limit=20`);
      setData(r);
      setPage(p);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  async function onDelete(s: Stage) {
    if (!confirm(`删除 Stage "${s.name}"？`)) return;
    try {
      await api(`/api/admin/stages/${s.id}`, { method: 'DELETE' });
      toast.success('已删除');
      load(page);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(s: Stage) {
    setEditing(s);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Stages（阶段配置）</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新增 Stage
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
                <TableHead>长度</TableHead>
                <TableHead>概率分布</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.stages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[var(--color-text-muted)] py-8">
                    {loading ? '加载中...' : '暂无 Stage'}
                  </TableCell>
                </TableRow>
              ) : data.stages.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.length}</TableCell>
                  <TableCell className="text-xs font-mono max-w-md truncate">
                    {Object.entries(s.probabilities).map(([k, v]) => `${k}:${v}%`).join(' · ')}
                  </TableCell>
                  <TableCell className="text-xs">{formatDateTime(s.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="编辑">
                        <Pencil className="h-4 w-4" />
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

      <StageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        stage={editing}
        onDone={() => load(page)}
      />
    </div>
  );
}

export function StageDialog({
  open, onOpenChange, stage, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stage: Stage | null;
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [length, setLength] = useState(10);
  const [probabilities, setProbabilities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // 打开 / 切换编辑对象 时重置表单
  useEffect(() => {
    if (!open) return;
    if (stage) {
      setName(stage.name);
      setLength(stage.length);
      setProbabilities({ ...stage.probabilities });
    } else {
      setName('');
      setLength(10);
      const init: Record<string, number> = {};
      DEFAULT_PROB_KEYS.forEach(k => { init[k] = 0; });
      // 预设一个合理的默认（"2" = 100%）
      init['2'] = 100;
      setProbabilities(init);
    }
  }, [open, stage]);

  const total = Object.values(probabilities).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalValid = Math.abs(total - 100) < 0.01;

  function setProb(key: string, val: number) {
    setProbabilities(p => ({ ...p, [key]: val }));
  }

  async function submit() {
    if (!name.trim()) {
      toast.warn('请输入 Stage 名称');
      return;
    }
    if (!totalValid) {
      toast.warn(`概率总和必须等于 100（当前 ${total}）`);
      return;
    }
    // 过滤掉 0 的 key
    const cleaned: Record<string, number> = {};
    for (const [k, v] of Object.entries(probabilities)) {
      if (v > 0) cleaned[k] = v;
    }
    setSubmitting(true);
    try {
      if (stage) {
        await api(`/api/admin/stages/${stage.id}`, {
          method: 'PUT',
          body: { name: name.trim(), length, probabilities: cleaned },
        });
        toast.success('已更新');
      } else {
        await api('/api/admin/stages', {
          method: 'POST',
          body: { name: name.trim(), length, probabilities: cleaned },
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{stage ? `编辑 Stage：${stage.name}` : '新增 Stage'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>名称</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="如 early-game" />
            </div>
            <div className="space-y-2">
              <Label>长度</Label>
              <Input
                type="number"
                min={1}
                value={length}
                onChange={e => setLength(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>概率分布（总和需 = 100%）</Label>
              <span className={`text-xs font-mono ${totalValid ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                合计 {total}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_PROB_KEYS.map(k => (
                <div key={k} className="flex items-center gap-2">
                  <Label className="w-12 shrink-0">{k}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={probabilities[k] ?? 0}
                    onChange={e => setProb(k, Number(e.target.value) || 0)}
                  />
                  <span className="text-xs text-[var(--color-text-muted)]">%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={submit} disabled={submitting || !totalValid}>
            {submitting ? '提交中…' : stage ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
