'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ChecklistProgressBarProps {
  total: number;
  completed: number;
  failed?: number;
  needsAttention?: number;
  locked?: number;
  className?: string;
  showLabel?: boolean;
}

export function ChecklistProgressBar({
  total,
  completed,
  failed = 0,
  needsAttention = 0,
  locked = 0,
  className,
  showLabel = true,
}: ChecklistProgressBarProps) {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground font-medium">Progress</span>
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              {completed}/{total} selesai ({progress}%)
            </span>
            {failed > 0 && (
              <span className="text-red-600 dark:text-red-400 text-xs">
                {failed} gagal
              </span>
            )}
            {needsAttention > 0 && (
              <span className="text-amber-600 dark:text-amber-400 text-xs">
                {needsAttention} perlu perhatian
              </span>
            )}
          </div>
        </div>
      )}
      <Progress value={progress} className="h-2.5" />
      {locked > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {locked} item masih terkunci (akan terbuka sesuai jadwal)
        </p>
      )}
    </div>
  );
}
