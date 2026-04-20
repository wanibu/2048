import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--color-primary)]/20 text-[var(--color-primary)]',
        success: 'border-transparent bg-[var(--color-success)]/20 text-[var(--color-success)]',
        warning: 'border-transparent bg-orange-500/20 text-orange-400',
        danger: 'border-transparent bg-[var(--color-danger)]/20 text-[var(--color-danger)]',
        outline: 'text-[var(--color-text-muted)] border-[var(--color-border)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
