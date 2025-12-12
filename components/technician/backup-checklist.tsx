'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  CheckSquare,
  Square,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackupItem {
  id: string;
  databaseName: string;
  description: string | null;
  isChecked: boolean;
  checkedAt: string | null;
  notes: string | null;
  order: number;
}

interface BackupChecklistProps {
  items: BackupItem[];
  onUpdateItems: (items: { id: string; isChecked?: boolean; notes?: string }[]) => Promise<void>;
  onCheckAll: (checkAll: boolean) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function BackupChecklist({
  items,
  onUpdateItems,
  onCheckAll,
  isLoading = false,
  readOnly = false,
}: BackupChecklistProps) {
  const [localLoading, setLocalLoading] = useState(false);

  const checkedCount = items.filter((i) => i.isChecked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;
  const someChecked = checkedCount > 0 && checkedCount < items.length;

  const handleCheckAll = async () => {
    if (readOnly || isLoading || localLoading) return;
    setLocalLoading(true);
    try {
      await onCheckAll(!allChecked);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleItemCheck = async (itemId: string, checked: boolean) => {
    if (readOnly || isLoading || localLoading) return;
    setLocalLoading(true);
    try {
      await onUpdateItems([{ id: itemId, isChecked: checked }]);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with Check All button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-600" />
          <span className="font-medium text-sm">Laporan Backup Database</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {checkedCount}/{items.length}
          </Badge>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleCheckAll}
              disabled={isLoading || localLoading}
            >
              {allChecked ? (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  Hapus Semua
                </>
              ) : (
                <>
                  <CheckSquare className="h-3 w-3 mr-1" />
                  Centang Semua
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Checklist items */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 border-b">
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Status Backup Harian
          </span>
        </div>
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                'px-3 py-2 flex items-center gap-3 transition-colors',
                item.isChecked && 'bg-emerald-50/50 dark:bg-emerald-950/20'
              )}
            >
              <Checkbox
                checked={item.isChecked}
                onCheckedChange={(checked) =>
                  handleItemCheck(item.id, checked as boolean)
                }
                disabled={readOnly || isLoading || localLoading}
              />
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    'text-sm',
                    item.isChecked && 'text-muted-foreground'
                  )}
                >
                  {item.databaseName}
                </span>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                )}
              </div>
              {item.isChecked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
