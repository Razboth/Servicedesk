'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { TimeLockIndicator } from './time-lock-indicator';
import {
  Check,
  X,
  Minus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ItemStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'NOT_APPLICABLE' | 'NEEDS_ATTENTION';

export interface ChecklistItemData {
  id: string;
  itemNumber: number;
  title: string;
  description?: string | null;
  toolSystem?: string | null;
  timeSlot?: string | null;
  isRequired: boolean;
  status: ItemStatus;
  notes?: string | null;
  completedAt?: string | null;
  completedBy?: {
    id: string;
    name: string;
  } | null;
  isLocked?: boolean;
  lockMessage?: string | null;
}

interface ChecklistItemRowProps {
  item: ChecklistItemData;
  onStatusChange: (id: string, status: ItemStatus, notes?: string) => Promise<void>;
  readOnly?: boolean;
  showTimeSlot?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG: Record<ItemStatus, { icon: typeof Check; color: string; label: string }> = {
  PENDING: { icon: Minus, color: 'text-gray-400', label: 'Pending' },
  COMPLETED: { icon: Check, color: 'text-green-600 dark:text-green-400', label: 'Selesai' },
  FAILED: { icon: X, color: 'text-red-600 dark:text-red-400', label: 'Gagal' },
  NOT_APPLICABLE: { icon: Minus, color: 'text-gray-500', label: 'N/A' },
  NEEDS_ATTENTION: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', label: 'Perlu Perhatian' },
};

export function ChecklistItemRow({
  item,
  onStatusChange,
  readOnly = false,
  showTimeSlot = false,
  compact = false,
}: ChecklistItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);

  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;
  const isLocked = item.isLocked === true;
  const isDisabled = readOnly || isLocked || isUpdating;

  const handleStatusChange = async (newStatus: ItemStatus) => {
    if (isDisabled || newStatus === item.status) return;

    setIsUpdating(true);
    try {
      await onStatusChange(item.id, newStatus, notes || undefined);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotesSubmit = async () => {
    if (isDisabled) return;
    setIsUpdating(true);
    try {
      await onStatusChange(item.id, item.status, notes);
    } finally {
      setIsUpdating(false);
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-md border',
          item.status === 'COMPLETED' && 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
          item.status === 'FAILED' && 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
          item.status === 'NEEDS_ATTENTION' && 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
          item.status === 'PENDING' && 'bg-muted/30',
          isLocked && 'opacity-60'
        )}
      >
        <span className="text-xs text-muted-foreground w-6">{item.itemNumber}.</span>
        <span className={cn('flex-1 text-sm', item.status === 'COMPLETED' && 'line-through opacity-70')}>
          {item.title}
        </span>
        {isLocked ? (
          <TimeLockIndicator isLocked={true} unlockTime={item.timeSlot} variant="compact" />
        ) : (
          <div className="flex items-center gap-1">
            <StatusButton
              status="COMPLETED"
              currentStatus={item.status}
              onClick={() => handleStatusChange('COMPLETED')}
              disabled={isDisabled}
              size="sm"
            />
            <StatusButton
              status="FAILED"
              currentStatus={item.status}
              onClick={() => handleStatusChange('FAILED')}
              disabled={isDisabled}
              size="sm"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-colors',
        item.status === 'COMPLETED' && 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
        item.status === 'FAILED' && 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
        item.status === 'NEEDS_ATTENTION' && 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
        item.status === 'PENDING' && 'bg-card',
        isLocked && 'opacity-70'
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-sm font-medium">
          {item.itemNumber}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn('font-medium', item.status === 'COMPLETED' && 'line-through opacity-70')}>
                {item.title}
              </h4>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {showTimeSlot && item.timeSlot && (
                  <Badge variant="outline" className="text-xs">
                    {item.timeSlot}
                  </Badge>
                )}
                {item.toolSystem && (
                  <Badge variant="secondary" className="text-xs">
                    {item.toolSystem}
                  </Badge>
                )}
                {item.isRequired && (
                  <Badge variant="destructive" className="text-xs">
                    Wajib
                  </Badge>
                )}
              </div>
            </div>

            {isLocked ? (
              <TimeLockIndicator
                isLocked={true}
                unlockTime={item.timeSlot}
                lockMessage={item.lockMessage}
              />
            ) : (
              <div className="flex items-center gap-1">
                {isUpdating ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <StatusButton
                      status="COMPLETED"
                      currentStatus={item.status}
                      onClick={() => handleStatusChange('COMPLETED')}
                      disabled={isDisabled}
                    />
                    <StatusButton
                      status="FAILED"
                      currentStatus={item.status}
                      onClick={() => handleStatusChange('FAILED')}
                      disabled={isDisabled}
                    />
                    <StatusButton
                      status="NOT_APPLICABLE"
                      currentStatus={item.status}
                      onClick={() => handleStatusChange('NOT_APPLICABLE')}
                      disabled={isDisabled}
                    />
                    <StatusButton
                      status="NEEDS_ATTENTION"
                      currentStatus={item.status}
                      onClick={() => handleStatusChange('NEEDS_ATTENTION')}
                      disabled={isDisabled}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {(item.notes || item.completedBy) && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground mt-2 hover:text-foreground"
            >
              <MessageSquare className="h-3 w-3" />
              {item.notes ? 'Lihat catatan' : `Oleh: ${item.completedBy?.name}`}
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
          <div className="pt-3 space-y-3">
            {item.completedBy && (
              <p className="text-xs text-muted-foreground">
                Dikerjakan oleh: <strong>{item.completedBy.name}</strong>
                {item.completedAt && ` pada ${new Date(item.completedAt).toLocaleString('id-ID')}`}
              </p>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Catatan
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan..."
                rows={2}
                disabled={isDisabled}
                className="text-sm"
              />
              {notes !== (item.notes || '') && (
                <Button
                  size="sm"
                  onClick={handleNotesSubmit}
                  disabled={isDisabled}
                  className="mt-2"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Catatan'}
                </Button>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Tutup <ChevronUp className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatusButtonProps {
  status: ItemStatus;
  currentStatus: ItemStatus;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

function StatusButton({ status, currentStatus, onClick, disabled, size = 'default' }: StatusButtonProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isActive = status === currentStatus;

  const sizeClasses = size === 'sm' ? 'h-6 w-6 p-0' : 'h-8 w-8 p-0';

  return (
    <Button
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      className={cn(
        sizeClasses,
        isActive && status === 'COMPLETED' && 'bg-green-600 hover:bg-green-700',
        isActive && status === 'FAILED' && 'bg-red-600 hover:bg-red-700',
        isActive && status === 'NEEDS_ATTENTION' && 'bg-amber-600 hover:bg-amber-700',
        isActive && status === 'NOT_APPLICABLE' && 'bg-gray-600 hover:bg-gray-700',
        !isActive && config.color
      )}
      onClick={onClick}
      disabled={disabled}
      title={config.label}
    >
      <Icon className={cn('h-4 w-4', size === 'sm' && 'h-3.5 w-3.5')} />
    </Button>
  );
}
