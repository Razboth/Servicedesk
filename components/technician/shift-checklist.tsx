'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Monitor,
  Ticket,
  ArrowRightLeft,
  CheckCircle2,
  Circle,
  Clock,
  SkipForward,
  MessageSquare,
} from 'lucide-react';

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
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  TICKET_MANAGEMENT: {
    label: 'Manajemen Tiket',
    icon: Ticket,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  HANDOVER_TASKS: {
    label: 'Serah Terima',
    icon: ArrowRightLeft,
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
};

const statusConfig = {
  PENDING: {
    label: 'Menunggu',
    icon: Circle,
    color: 'text-gray-500',
  },
  IN_PROGRESS: {
    label: 'Sedang Dikerjakan',
    icon: Clock,
    color: 'text-blue-500',
  },
  COMPLETED: {
    label: 'Selesai',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
  SKIPPED: {
    label: 'Dilewati',
    icon: SkipForward,
    color: 'text-yellow-500',
  },
};

export function ShiftChecklist({
  items,
  onUpdateItems,
  isLoading = false,
  readOnly = false,
}: ShiftChecklistProps) {
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Calculate progress per category
  const categoryProgress = Object.entries(itemsByCategory).reduce(
    (acc, [category, categoryItems]) => {
      const completed = categoryItems.filter(
        (i) => i.status === 'COMPLETED' || i.status === 'SKIPPED'
      ).length;
      acc[category] = {
        total: categoryItems.length,
        completed,
        percentage: Math.round((completed / categoryItems.length) * 100),
      };
      return acc;
    },
    {} as Record<string, { total: number; completed: number; percentage: number }>
  );

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

  const handleNotesChange = (itemId: string, notes: string) => {
    setEditingNotes((prev) => ({ ...prev, [itemId]: notes }));
  };

  const handleNotesSave = async (itemId: string) => {
    if (readOnly || isLoading) return;
    const notes = editingNotes[itemId];
    if (notes !== undefined) {
      await onUpdateItems([{ id: itemId, notes }]);
      setExpandedNotes((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={Object.keys(itemsByCategory)}>
        {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
          const config = categoryConfig[category as keyof typeof categoryConfig];
          const progress = categoryProgress[category];
          const Icon = config?.icon || Monitor;

          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${config?.color || ''}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">
                      {config?.label || category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <Progress value={progress.percentage} className="h-2" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {progress.completed}/{progress.total}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {categoryItems.map((item) => {
                    const statusInfo = statusConfig[item.status];
                    const StatusIcon = statusInfo.icon;
                    const isCompleted =
                      item.status === 'COMPLETED' || item.status === 'SKIPPED';

                    return (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-lg transition-colors ${
                          isCompleted
                            ? 'bg-muted/50 border-muted'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.status === 'COMPLETED'}
                            onCheckedChange={(checked) =>
                              handleStatusChange(item.id, checked as boolean)
                            }
                            disabled={readOnly || isLoading || item.status === 'SKIPPED'}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-medium ${
                                    isCompleted ? 'line-through text-muted-foreground' : ''
                                  }`}
                                >
                                  {item.title}
                                </span>
                                {item.isRequired && (
                                  <Badge variant="destructive" className="text-xs h-5">
                                    Wajib
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusIcon
                                  className={`h-4 w-4 ${statusInfo.color}`}
                                />
                                {!readOnly && item.status !== 'COMPLETED' && !item.isRequired && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={() => handleSkip(item.id)}
                                    disabled={isLoading || item.status === 'SKIPPED'}
                                  >
                                    Lewati
                                  </Button>
                                )}
                              </div>
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}

                            {/* Notes section */}
                            <div className="mt-2">
                              {item.notes && !expandedNotes[item.id] && (
                                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                  <MessageSquare className="h-3 w-3 inline mr-1" />
                                  {item.notes}
                                </p>
                              )}
                              {!readOnly && (
                                <div className="mt-2">
                                  {expandedNotes[item.id] ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        placeholder="Tambah catatan..."
                                        value={
                                          editingNotes[item.id] ?? item.notes ?? ''
                                        }
                                        onChange={(e) =>
                                          handleNotesChange(item.id, e.target.value)
                                        }
                                        className="text-sm min-h-[60px]"
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setExpandedNotes((prev) => ({
                                              ...prev,
                                              [item.id]: false,
                                            }))
                                          }
                                        >
                                          Batal
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleNotesSave(item.id)}
                                          disabled={isLoading}
                                        >
                                          Simpan
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs text-muted-foreground"
                                      onClick={() =>
                                        setExpandedNotes((prev) => ({
                                          ...prev,
                                          [item.id]: true,
                                        }))
                                      }
                                    >
                                      <MessageSquare className="h-3 w-3 mr-1" />
                                      {item.notes ? 'Edit catatan' : 'Tambah catatan'}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
