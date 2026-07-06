import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export default function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const base = 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer';

  const variants: Record<string, string> = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'h-32 w-full rounded-xl',
  };

  return <div className={cn(base, variants[variant], className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-2/3" />
          <Skeleton className="w-1/3 h-3" />
        </div>
      </div>
      <Skeleton variant="rectangular" className="h-16 w-full" />
      <div className="flex justify-between">
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-24 h-3" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="w-24 h-4" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-50 flex gap-8">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="w-24 h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}
