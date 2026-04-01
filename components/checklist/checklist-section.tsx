'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChecklistItemRow, ChecklistItemData, ItemStatus } from './checklist-item-row';
import { cn } from '@/lib/utils';

interface ChecklistSectionProps {
  section: string;
  sectionTitle: string;
  items: ChecklistItemData[];
  onStatusChange: (id: string, status: ItemStatus, notes?: string) => Promise<void>;
  readOnly?: boolean;
  defaultOpen?: boolean;
  showTimeSlots?: boolean;
}

export function ChecklistSection({
  section,
  sectionTitle,
  items,
  onStatusChange,
  readOnly = false,
  defaultOpen = true,
  showTimeSlots = false,
}: ChecklistSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.status === 'COMPLETED').length;
  const failedItems = items.filter((i) => i.status === 'FAILED').length;
  const needsAttentionItems = items.filter((i) => i.status === 'NEEDS_ATTENTION').length;
  const lockedItems = items.filter((i) => i.isLocked).length;

  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  const isAllCompleted = completedItems === totalItems && totalItems > 0;

  const getBadgeVariant = () => {
    if (failedItems > 0) return 'destructive';
    if (needsAttentionItems > 0) return 'secondary';
    if (isAllCompleted) return 'default';
    return 'outline';
  };

  return (
    <Card className={cn('overflow-hidden', isAllCompleted && 'border-green-200 dark:border-green-800')}>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors px-5 py-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-sm',
                isAllCompleted
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {isAllCompleted ? <CheckCircle2 className="h-5 w-5" /> : section}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{sectionTitle}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={progress} className="h-1.5 w-24" />
                <span className="text-xs text-muted-foreground">
                  {completedItems}/{totalItems}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={getBadgeVariant()} className="text-xs">
              {isAllCompleted ? (
                'Selesai'
              ) : (
                <>
                  {progress}%
                  {failedItems > 0 && ` • ${failedItems} gagal`}
                  {needsAttentionItems > 0 && ` • ${needsAttentionItems} perlu perhatian`}
                </>
              )}
            </Badge>
            {lockedItems > 0 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                {lockedItems} terkunci
              </Badge>
            )}
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="px-5 pb-5 pt-0">
          <div className="space-y-3">
            {items.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                onStatusChange={onStatusChange}
                readOnly={readOnly}
                showTimeSlot={showTimeSlots}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
