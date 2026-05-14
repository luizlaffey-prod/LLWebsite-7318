import { cn } from '@/lib/utils';

export function FormError({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p className={cn('text-xs text-error mt-1', className)} role="alert">
      {children}
    </p>
  );
}
