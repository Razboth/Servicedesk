'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Monitor,
  Ticket,
  ArrowRightLeft,
  CheckCircle2,
  Circle,
  SkipForward,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  order: number;
  isRequired: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  completedAt: string | null;
  notes: string | null;
}

interface ShiftChecklistProps {
  items: ChecklistItem[];
  onUpdateItems: (
    items: { id: string; status?: string; notes?: string }[]
  ) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

const categoryConfig = {
  SYSTEM_MONITORING: {
    label: 'Pemantauan Sistem',
    icon: Monitor,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  TICKET_MANAGEMENT: {
    label: 'Manajemen Tiket',
    icon: Ticket,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  HANDOVER_TASKS: {
    label: 'Serah Terima',
    icon: ArrowRightLeft,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
};

export function ShiftChecklist({
  items,
  onUpdateItems,
  isLoading = false,
  readOnly = false,
}: ShiftChecklistProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    SYSTEM_MONITORING: true,
    TICKET_MANAGEMENT: true,
    HANDOVER_TASKS: true,
  });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Calculate progress per category
  const getCategoryProgress = (categoryItems: ChecklistItem[]) => {
    const completed = categoryItems.filter(
      (i) => i.status === 'COMPLETED' || i.status === 'SKIPPED'
    ).length;
    return { completed, total: categoryItems.length };
  };

  const handleStatusChange = async (itemId: string, checked: boolean) => {
    if (readOnly || isLoading) return;
    await onUpdateItems([
      { id: itemId, status: checked ? 'COMPLETED' : 'PENDING' },
    ]);
  };

  const handleSkip = async (itemId: string) => {
    if (readOnly || isLoading) return;
    await onUpdateItems([{ id: itemId, status: 'SKIPPED' }]);
  };

  const startEditNote = (item: ChecklistItem) => {
    setEditingNote(item.id);
    setNoteText(item.notes || '');
  };

  const saveNote = async (itemId: string) => {
    if (readOnly || isLoading) return;
    await onUpdateItems([{ id: itemId, notes: noteText }]);
    setEditingNote(null);
    setNoteText('');
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <div className="space-y-3">
      {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig];
        const progress = getCategoryProgress(categoryItems);
        const Icon = config?.icon || Monitor;
        const isExpanded = expandedCategories[category];

        return (
          <div key={category} className="border rounded-lg overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className={cn(
                'w-full flex items-center justify-between p-3',
                config?.bg || 'bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Icon className={cn('h-4 w-4', config?.color)} />
                <span className="font-medium text-sm">
                  {config?.label || category}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {progress.completed}/{progress.total}
              </Badge>
            </button>

            {/* Category Items */}
            {isExpanded && (
              <div className="divide-y">
                {categoryItems.map((item) => {
                  const isCompleted = item.status === 'COMPLETED';
                  const isSkipped = item.status === 'SKIPPED';
                  const isDone = isCompleted || isSkipped;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'px-3 py-2 transition-colors',
                        isDone && 'bg-muted/30'
                      )}
                    >
                      {/* Main row */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={(checked) =>
                            handleStatusChange(item.id, checked as boolean)
                          }
                          disabled={readOnly || isLoading || isSkipped}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm',
                                isDone && 'line-through text-muted-foreground'
                              )}
                            >
                              {item.title}
                            </span>
                            {item.isRequired && (
                              <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                Wajib
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Status indicator */}
                        <div className="flex items-center gap-1">
                          {isCompleted && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {isSkipped && (
                            <SkipForward className="h-4 w-4 text-yellow-500" />
                          )}
                          {!isDone && (
                            <Circle className="h-4 w-4 text-muted-foreground/50" />
                          )}

                          {/* Skip button */}
                          {!readOnly && !isDone && !item.isRequired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => handleSkip(item.id)}
                              disabled={isLoading}
                            >
                              Lewati
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Notes section - simplified */}
                      {(item.notes || editingNote === item.id) && (
                        <div className="mt-2 ml-7">
                          {editingNote === item.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Tambah catatan..."
                                className="text-sm min-h-[60px]"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setEditingNote(null)}
                                >
                                  Batal
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => saveNote(item.id)}
                                  disabled={isLoading}
                                >
                                  Simpan
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p
                              className="text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded cursor-pointer hover:bg-muted"
                              onClick={() => !readOnly && startEditNote(item)}
                            >
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              {item.notes}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Add note button - only show if no notes and not editing */}
                      {!readOnly && !item.notes && editingNote !== item.id && (
                        <button
                          className="mt-1 ml-7 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          onClick={() => startEditNote(item)}
                        >
                          <MessageSquare className="h-3 w-3" />
                          Tambah catatan
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
