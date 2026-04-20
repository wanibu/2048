import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw } from 'lucide-react';
import { api } from '@/api/client';
import type { Plan, PlansResp } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { formatDateTime } from '@/lib/utils';

export function PlansPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PlansResp | null>(null);
  const [loading, setLoading] = useState(false);

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
                <TableHead>名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>阶段数</TableHead>
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
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-[var(--color-text-muted)]">{p.description || '-'}</TableCell>
                  <TableCell>{p.stages.length}</TableCell>
                  <TableCell>{p.total_length}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(p.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(p)}>删除</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} onChange={load} />}
    </div>
  );
}
