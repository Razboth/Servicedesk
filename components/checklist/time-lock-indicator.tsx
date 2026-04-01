'use client';

import { Lock, Unlock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeLockIndicatorProps {
  isLocked: boolean;
  unlockTime?: string | null;
  lockMessage?: string | null;
  className?: string;
  variant?: 'badge' | 'inline' | 'compact';
}

export function TimeLockIndicator({
  isLocked,
  unlockTime,
  lockMessage,
  className,
  variant = 'badge',
}: TimeLockIndicatorProps) {
  if (!isLocked) {
    if (variant === 'compact') return null;
    return (
      <div className={cn('flex items-center gap-1 text-green-600 dark:text-green-400', className)}>
        <Unlock className="h-3.5 w-3.5" />
        {variant === 'badge' && <span className="text-xs">Tersedia</span>}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1 text-amber-600 dark:text-amber-400', className)}>
        <Lock className="h-3.5 w-3.5" />
        {unlockTime && <span className="text-xs font-mono">{unlockTime}</span>}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-1.5 text-amber-600 dark:text-amber-400', className)}>
        <Lock className="h-4 w-4" />
        <span className="text-sm">
          {lockMessage || (unlockTime ? `Terkunci sampai ${unlockTime}` : 'Terkunci')}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
        'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800',
        'text-amber-700 dark:text-amber-400',
        className
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">
        {lockMessage || (unlockTime ? `Pukul ${unlockTime}` : 'Terkunci')}
      </span>
    </div>
  );
}
