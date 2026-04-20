import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, onChange, className }: PaginationProps) {
  if (totalPages <= 1 && !total) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // 生成页码按钮（当前 ± 2）
  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);

  return (
    <div className={cn('flex items-center justify-between gap-3 py-2', className)}>
      <div className="text-xs text-[var(--color-text-muted)]">
        {total !== undefined ? `共 ${total} 条 · ` : ''}第 {page} / {totalPages || 1} 页
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          上一页
        </Button>
        {pages[0] > 1 && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onChange(1)}>1</Button>
            {pages[0] > 2 && <span className="px-1 text-[var(--color-text-muted)]">…</span>}
          </>
        )}
        {pages.map(p => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-[var(--color-text-muted)]">…</span>}
            <Button variant="ghost" size="sm" onClick={() => onChange(totalPages)}>{totalPages}</Button>
          </>
        )}
        <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onChange(page + 1)}>
          下一页
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
