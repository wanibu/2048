import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { RefreshCw } from 'lucide-react';
import { api } from '@/api/client';
import type { GeneratedSequence, SequencesResp } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

export function SequencesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SequencesResp | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function onDelete(s: GeneratedSequence) {
    if (!confirm(`删除序列 ${s.id.slice(0, 8)}...？`)) return;
    try {
      await api(`/api/admin/generated-sequences/${s.id}`, { method: 'DELETE' });
      toast.success('已删除');
      load(page);
    } catch (err) {
      toast.error((err as { error?: string })?.error || '删除失败');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Generated Sequences（生成的序列）</h2>
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
    </div>
  );
}
