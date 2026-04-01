'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Lock, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ItemStatus, ChecklistItemData } from './checklist-item-row';

interface PeriodicChecklistGridProps {
  sectionTitle: string;
  items: ChecklistItemData[];
  timeSlots: string[];
  onStatusChange: (id: string, status: ItemStatus, notes?: string) => Promise<void>;
  readOnly?: boolean;
}

interface GridItem {
  itemTitle: string;
  itemNumber: number;
  toolSystem?: string | null;
  description?: string | null;
  slots: Record<string, ChecklistItemData | undefined>;
}

export function PeriodicChecklistGrid({
  sectionTitle,
  items,
  timeSlots,
  onStatusChange,
  readOnly = false,
}: PeriodicChecklistGridProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Group items by title to create grid rows
  const groupedItems: GridItem[] = [];
  const titleMap = new Map<string, GridItem>();

  items.forEach((item) => {
    const existing = titleMap.get(item.title);
    if (existing) {
      if (item.timeSlot) {
        existing.slots[item.timeSlot] = item;
      }
    } else {
      const newRow: GridItem = {
        itemTitle: item.title,
        itemNumber: item.itemNumber,
        toolSystem: item.toolSystem,
        description: item.description,
        slots: {},
      };
      if (item.timeSlot) {
        newRow.slots[item.timeSlot] = item;
      }
      titleMap.set(item.title, newRow);
      groupedItems.push(newRow);
    }
  });

  const handleStatusToggle = async (item: ChecklistItemData) => {
    if (readOnly || item.isLocked || updatingId) return;

    setUpdatingId(item.id);
    try {
      const newStatus: ItemStatus =
        item.status === 'COMPLETED' ? 'PENDING' :
        item.status === 'FAILED' ? 'PENDING' :
        'COMPLETED';
      await onStatusChange(item.id, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (item: ChecklistItemData, status: ItemStatus) => {
    if (readOnly || item.isLocked || updatingId) return;

    setUpdatingId(item.id);
    try {
      await onStatusChange(item.id, status, notes[item.id]);
    } finally {
      setUpdatingId(null);
    }
  };

  const getSlotStats = () => {
    const stats = { total: 0, completed: 0, failed: 0, locked: 0 };
    items.forEach((item) => {
      stats.total++;
      if (item.status === 'COMPLETED') stats.completed++;
      if (item.status === 'FAILED') stats.failed++;
      if (item.isLocked) stats.locked++;
    });
    return stats;
  };

  const stats = getSlotStats();
  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{sectionTitle}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={progress === 100 ? 'default' : 'outline'}>
              {stats.completed}/{stats.total} ({progress}%)
            </Badge>
            {stats.locked > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-500">
                {stats.locked} terkunci
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground min-w-[200px]">
                  Item
                </th>
                {timeSlots.map((slot) => (
                  <th
                    key={slot}
                    className="text-center py-2 px-2 text-sm font-medium text-muted-foreground w-16"
                  >
                    {slot}
                  </th>
                ))}
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {groupedItems.map((row) => (
                <>
                  <tr key={row.itemTitle} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground">{row.itemNumber}.</span>
                        <div>
                          <p className="text-sm font-medium">{row.itemTitle}</p>
                          {row.toolSystem && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {row.toolSystem}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    {timeSlots.map((slot) => {
                      const slotItem = row.slots[slot];
                      if (!slotItem) {
                        return (
                          <td key={slot} className="text-center py-3 px-2">
                            <span className="text-muted-foreground">-</span>
                          </td>
                        );
                      }

                      const isUpdating = updatingId === slotItem.id;

                      return (
                        <td key={slot} className="text-center py-3 px-2">
                          <GridCell
                            item={slotItem}
                            isUpdating={isUpdating}
                            readOnly={readOnly}
                            onClick={() => handleStatusToggle(slotItem)}
                            onRightClick={(e) => {
                              e.preventDefault();
                              if (!slotItem.isLocked && !readOnly) {
                                handleStatusChange(slotItem, 'FAILED');
                              }
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="py-3 px-2">
                      <button
                        onClick={() =>
                          setExpandedItem(expandedItem === row.itemTitle ? null : row.itemTitle)
                        }
                        className="p-1 hover:bg-muted rounded"
                      >
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                  {expandedItem === row.itemTitle && (
                    <tr className="bg-muted/30">
                      <td colSpan={timeSlots.length + 2} className="p-4">
                        <div className="space-y-3">
                          {row.description && (
                            <p className="text-sm text-muted-foreground">{row.description}</p>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {timeSlots.map((slot) => {
                              const slotItem = row.slots[slot];
                              if (!slotItem) return null;

                              return (
                                <div key={slot} className="space-y-1">
                                  <label className="text-xs font-medium">{slot}</label>
                                  <Textarea
                                    value={notes[slotItem.id] ?? slotItem.notes ?? ''}
                                    onChange={(e) =>
                                      setNotes((prev) => ({ ...prev, [slotItem.id]: e.target.value }))
                                    }
                                    placeholder="Catatan..."
                                    rows={2}
                                    disabled={readOnly || slotItem.isLocked}
                                    className="text-xs"
                                  />
                                  {notes[slotItem.id] !== undefined &&
                                    notes[slotItem.id] !== (slotItem.notes ?? '') && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleStatusChange(slotItem, slotItem.status)
                                        }
                                        disabled={readOnly || slotItem.isLocked || !!updatingId}
                                        className="text-xs h-7"
                                      >
                                        Simpan
                                      </Button>
                                    )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded flex items-center justify-center">
              <Check className="h-3 w-3 text-white" />
            </div>
            <span>Selesai</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded flex items-center justify-center">
              <X className="h-3 w-3 text-white" />
            </div>
            <span>Gagal (klik kanan)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded flex items-center justify-center">
              <Lock className="h-3 w-3 text-amber-600" />
            </div>
            <span>Terkunci</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface GridCellProps {
  item: ChecklistItemData;
  isUpdating: boolean;
  readOnly: boolean;
  onClick: () => void;
  onRightClick: (e: React.MouseEvent) => void;
}

function GridCell({ item, isUpdating, readOnly, onClick, onRightClick }: GridCellProps) {
  if (isUpdating) {
    return (
      <div className="w-8 h-8 mx-auto flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (item.isLocked) {
    return (
      <div
        className={cn(
          'w-8 h-8 mx-auto rounded border-2',
          'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
          'flex items-center justify-center cursor-not-allowed'
        )}
        title={item.lockMessage || `Terkunci sampai ${item.timeSlot}`}
      >
        <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
    );
  }

  const baseClasses = 'w-8 h-8 mx-auto rounded border-2 flex items-center justify-center transition-all';
  const interactiveClasses = !readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default';

  switch (item.status) {
    case 'COMPLETED':
      return (
        <button
          className={cn(baseClasses, interactiveClasses, 'bg-green-500 border-green-600 text-white')}
          onClick={onClick}
          onContextMenu={onRightClick}
          disabled={readOnly}
          title="Selesai - klik untuk batal"
        >
          <Check className="h-4 w-4" />
        </button>
      );
    case 'FAILED':
      return (
        <button
          className={cn(baseClasses, interactiveClasses, 'bg-red-500 border-red-600 text-white')}
          onClick={onClick}
          onContextMenu={onRightClick}
          disabled={readOnly}
          title="Gagal - klik untuk batal"
        >
          <X className="h-4 w-4" />
        </button>
      );
    case 'NEEDS_ATTENTION':
      return (
        <button
          className={cn(baseClasses, interactiveClasses, 'bg-amber-500 border-amber-600 text-white')}
          onClick={onClick}
          onContextMenu={onRightClick}
          disabled={readOnly}
          title="Perlu perhatian"
        >
          <AlertTriangle className="h-4 w-4" />
        </button>
      );
    default:
      return (
        <button
          className={cn(
            baseClasses,
            interactiveClasses,
            'bg-muted border-muted-foreground/20 hover:border-primary hover:bg-primary/10'
          )}
          onClick={onClick}
          onContextMenu={onRightClick}
          disabled={readOnly}
          title="Klik untuk selesai, klik kanan untuk gagal"
        />
      );
  }
}
