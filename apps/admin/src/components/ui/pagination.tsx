import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

const DEFAULT_SIZES = [10, 20, 50, 100];

export function Pagination({
  page, totalPages, total, onChange,
  pageSize, onPageSizeChange, pageSizeOptions = DEFAULT_SIZES,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && !total && !onPageSizeChange) return null;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);

  return (
    <div className={cn('flex items-center justify-between gap-3 py-2', className)}>
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span>
          {total !== undefined ? `共 ${total} 条 · ` : ''}第 {page} / {totalPages || 1} 页
        </span>
        {pageSize !== undefined && onPageSizeChange && (
          <span className="flex items-center gap-1.5">
            每页
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
              className="h-7 px-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              {pageSizeOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            条
          </span>
        )}
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
