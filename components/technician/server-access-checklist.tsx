'use client';

import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Database,
  Server,
  Shield,
  Wrench,
  CheckCircle2,
  Circle,
  SkipForward,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Lock,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServerChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  order: number;
  isRequired: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  completedAt: string | null;
  notes: string | null;
  unlockTime?: string | null;
  isLocked?: boolean;
  lockMessage?: string | null;
}

interface ServerAccessChecklistProps {
  items: ServerChecklistItem[];
  onUpdateItems: (
    items: { id: string; status?: string; notes?: string }[]
  ) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
  groupByTimeSlot?: boolean; // For periodic checklists (SERVER_SIANG, SERVER_MALAM)
}

const categoryConfig = {
  BACKUP_VERIFICATION: {
    label: 'Verifikasi Backup',
    icon: Database,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  SERVER_HEALTH: {
    label: 'Kesehatan Server',
    icon: Server,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  SECURITY_CHECK: {
    label: 'Pemeriksaan Keamanan',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
  MAINTENANCE: {
    label: 'Pemeliharaan',
    icon: Wrench,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
};

// Extract time slot from title like "[08:00] Status Server" -> "08:00"
function extractTimeSlot(title: string): string | null {
  const match = title.match(/^\[(\d{2}:\d{2})\]/);
  return match ? match[1] : null;
}

// Remove time slot prefix from title for display
function stripTimeSlot(title: string): string {
  return title.replace(/^\[\d{2}:\d{2}\]\s*/, '');
}

// Time slot display configuration
const timeSlotConfig: Record<string, { label: string; period: string }> = {
  '08:00': { label: 'Pukul 08:00', period: 'Pagi' },
  '10:00': { label: 'Pukul 10:00', period: 'Pagi' },
  '12:00': { label: 'Pukul 12:00', period: 'Siang' },
  '14:00': { label: 'Pukul 14:00', period: 'Siang' },
  '16:00': { label: 'Pukul 16:00', period: 'Sore' },
  '18:00': { label: 'Pukul 18:00', period: 'Sore' },
  '20:00': { label: 'Pukul 20:00', period: 'Malam' },
  '22:00': { label: 'Pukul 22:00', period: 'Malam' },
  '00:00': { label: 'Pukul 00:00', period: 'Tengah Malam' },
  '02:00': { label: 'Pukul 02:00', period: 'Dini Hari' },
  '04:00': { label: 'Pukul 04:00', period: 'Subuh' },
  '06:00': { label: 'Pukul 06:00', period: 'Pagi' },
};

export function ServerAccessChecklist({
  items,
  onUpdateItems,
  isLoading = false,
  readOnly = false,
  groupByTimeSlot = false,
}: ServerAccessChecklistProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // Initialize all groups as expanded
    const initial: Record<string, boolean> = {
      BACKUP_VERIFICATION: true,
      SERVER_HEALTH: true,
      SECURITY_CHECK: true,
      MAINTENANCE: true,
    };
    // Also expand time slots
    Object.keys(timeSlotConfig).forEach(slot => {
      initial[slot] = true;
    });
    // Expand "other" group for non-periodic items
    initial['other'] = true;
    return initial;
  });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Group items by time slot or category
  const groupedItems = useMemo(() => {
    if (groupByTimeSlot) {
      // Group by time slot for periodic checklists
      const byTimeSlot: Record<string, ServerChecklistItem[]> = {};
      items.forEach(item => {
        const timeSlot = extractTimeSlot(item.title) || 'other';
        if (!byTimeSlot[timeSlot]) {
          byTimeSlot[timeSlot] = [];
        }
        byTimeSlot[timeSlot].push(item);
      });
      return byTimeSlot;
    } else {
      // Group by category for non-periodic checklists
      return items.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {} as Record<string, ServerChecklistItem[]>);
    }
  }, [items, groupByTimeSlot]);

  // Calculate progress per group
  const getGroupProgress = (groupItems: ServerChecklistItem[]) => {
    const completed = groupItems.filter(
      (i) => i.status === 'COMPLETED' || i.status === 'SKIPPED'
    ).length;
    return { completed, total: groupItems.length };
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

  const startEditNote = (item: ServerChecklistItem) => {
    setEditingNote(item.id);
    setNoteText(item.notes || '');
  };

  const saveNote = async (itemId: string) => {
    if (readOnly || isLoading) return;
    await onUpdateItems([{ id: itemId, notes: noteText }]);
    setEditingNote(null);
    setNoteText('');
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Get ordered group keys
  const orderedGroups = useMemo(() => {
    if (groupByTimeSlot) {
      // Order time slots chronologically
      const timeSlotOrder = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00', '06:00'];
      const orderedSlots = timeSlotOrder.filter(slot => groupedItems[slot]);
      // Add 'other' at the end for non-periodic items
      if (groupedItems['other']) {
        orderedSlots.push('other');
      }
      return orderedSlots;
    } else {
      // Category order
      const orderedCategories = ['BACKUP_VERIFICATION', 'SERVER_HEALTH', 'SECURITY_CHECK', 'MAINTENANCE'];
      return orderedCategories.filter(cat => groupedItems[cat]);
    }
  }, [groupedItems, groupByTimeSlot]);

  // Get group display info
  const getGroupInfo = (groupKey: string) => {
    if (groupByTimeSlot) {
      if (groupKey === 'other') {
        return {
          label: 'Item Lainnya',
          icon: Wrench,
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-50 dark:bg-gray-950/30',
        };
      }
      const slotConfig = timeSlotConfig[groupKey];
      return {
        label: slotConfig?.label || groupKey,
        sublabel: slotConfig?.period,
        icon: Clock,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
      };
    } else {
      const config = categoryConfig[groupKey as keyof typeof categoryConfig];
      return {
        label: config?.label || groupKey,
        icon: config?.icon || Server,
        color: config?.color || 'text-gray-600 dark:text-gray-400',
        bg: config?.bg || 'bg-muted/50',
      };
    }
  };

  // Render a single checklist item
  const renderItem = (item: ServerChecklistItem) => {
    const isCompleted = item.status === 'COMPLETED';
    const isSkipped = item.status === 'SKIPPED';
    const isDone = isCompleted || isSkipped;
    const isLocked = item.isLocked === true;
    const displayTitle = groupByTimeSlot ? stripTimeSlot(item.title) : item.title;

    return (
      <div
        key={item.id}
        className={cn(
          'px-3 py-2 transition-colors',
          isDone && 'bg-muted/30',
          isLocked && 'bg-amber-50/50 dark:bg-amber-950/20'
        )}
      >
        {/* Main row */}
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(checked) =>
              handleStatusChange(item.id, checked as boolean)
            }
            disabled={readOnly || isLoading || isSkipped || isLocked}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'text-sm',
                  isDone && 'line-through text-muted-foreground',
                  isLocked && 'text-muted-foreground'
                )}
              >
                {displayTitle}
              </span>
              {item.isRequired && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                  Wajib
                </Badge>
              )}
              {isLocked && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-500 text-amber-600 dark:text-amber-400">
                  Terkunci
                </Badge>
              )}
            </div>
            {item.description && !isLocked && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            )}
            {isLocked && item.lockMessage && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {item.lockMessage}
              </p>
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1">
            {isLocked && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Lock className="h-4 w-4" />
                {item.unlockTime && (
                  <span className="text-xs flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {item.unlockTime}
                  </span>
                )}
              </div>
            )}
            {!isLocked && isCompleted && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            {!isLocked && isSkipped && (
              <SkipForward className="h-4 w-4 text-yellow-500" />
            )}
            {!isLocked && !isDone && (
              <Circle className="h-4 w-4 text-muted-foreground/50" />
            )}

            {/* Skip button */}
            {!readOnly && !isDone && !item.isRequired && !isLocked && (
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

        {/* Notes section */}
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

        {/* Add note button */}
        {!readOnly && !item.notes && editingNote !== item.id && !isLocked && (
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
  };

  return (
    <div className="space-y-3">
      {orderedGroups.map((groupKey) => {
        const groupItems = groupedItems[groupKey];
        if (!groupItems || groupItems.length === 0) return null;

        const groupInfo = getGroupInfo(groupKey);
        const progress = getGroupProgress(groupItems);
        const Icon = groupInfo.icon;
        const isExpanded = expandedGroups[groupKey] ?? true;
        const isAllCompleted = progress.completed === progress.total;

        return (
          <div key={groupKey} className="border rounded-lg overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(groupKey)}
              className={cn(
                'w-full flex items-center justify-between p-3',
                groupInfo.bg,
                isAllCompleted && 'opacity-75'
              )}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Icon className={cn('h-4 w-4', groupInfo.color)} />
                <div className="flex flex-col items-start">
                  <span className={cn('font-medium text-sm', isAllCompleted && 'line-through')}>
                    {groupInfo.label}
                  </span>
                  {'sublabel' in groupInfo && groupInfo.sublabel && (
                    <span className="text-xs text-muted-foreground">
                      {groupInfo.sublabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAllCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs',
                    isAllCompleted && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  )}
                >
                  {progress.completed}/{progress.total}
                </Badge>
              </div>
            </button>

            {/* Group Items */}
            {isExpanded && (
              <div className="divide-y">
                {groupItems.map(renderItem)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
