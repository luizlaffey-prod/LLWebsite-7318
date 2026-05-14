import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-teal/30 bg-teal/10 text-teal',
        secondary: 'border-border bg-elevated text-text-secondary',
        outline: 'border-border text-text-secondary',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        success: 'border-success/30 bg-success/10 text-success',
        violet: 'border-violet/30 bg-violet/10 text-violet',
        info: 'border-info/30 bg-info/10 text-info',
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
