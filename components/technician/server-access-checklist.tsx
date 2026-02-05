'use client';

import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GrafanaStatusInput, GrafanaStatusData } from './grafana-status-input';
import { ATMAlertList, ATMAlertData } from './atm-alert-list';
import { AppStatusInput, AppStatusData } from './app-status-input';
import { PendingTicketsDisplay, PendingTicketsData } from './pending-tickets-display';
import { AvailabilityStatusInput, AvailabilityStatusData } from './availability-status-input';
import { ServerMetricsInput, ServerMetricsData } from './server-metrics-input';

type ChecklistInputType =
  | 'CHECKBOX'
  | 'TIMESTAMP'
  | 'GRAFANA_STATUS'
  | 'ATM_ALERT'
  | 'PENDING_TICKETS'
  | 'APP_STATUS'
  | 'AVAILABILITY_STATUS'
  | 'SERVER_METRICS'
  | 'TEXT_INPUT';

type ChecklistItemData =
  | GrafanaStatusData
  | ATMAlertData
  | AppStatusData
  | PendingTicketsData
  | AvailabilityStatusData
  | ServerMetricsData
  | { timestamp: string }
  | { text: string }
  | null;

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
  inputType?: ChecklistInputType;
  data?: ChecklistItemData;
}

interface ServerAccessChecklistProps {
  items: ServerChecklistItem[];
  onUpdateItems: (
    items: { id: string; status?: string; notes?: string; data?: ChecklistItemData }[]
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
      // Group by category (which contains time slot like "08:00", "22:00")
      // The category field is used for time slots in the new checklist system
      const byTimeSlot: Record<string, ServerChecklistItem[]> = {};
      items.forEach(item => {
        // Use category as time slot (e.g., "08:00", "22:00")
        // Fall back to extracting from title for backwards compatibility
        const timeSlot = /^\d{2}:\d{2}$/.test(item.category)
          ? item.category
          : extractTimeSlot(item.title) || 'other';
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
      // Get all time slots present in the data
      const presentSlots = Object.keys(groupedItems).filter(slot => slot !== 'other');

      // Determine if this is a night checklist (has 22:00 or times < 08:00)
      const hasNightSlots = presentSlots.some(slot => {
        const hour = parseInt(slot.split(':')[0], 10);
        return hour >= 20 || hour < 8;
      });
      const hasDaySlots = presentSlots.some(slot => {
        const hour = parseInt(slot.split(':')[0], 10);
        return hour >= 8 && hour < 20;
      });
      const isNightOnly = hasNightSlots && !hasDaySlots;

      // Sort time slots
      const sortedSlots = presentSlots.sort((a, b) => {
        const aHour = parseInt(a.split(':')[0], 10);
        const bHour = parseInt(b.split(':')[0], 10);

        if (isNightOnly) {
          // For night checklists: 22:00 → 00:00 → 02:00 → 04:00 → 06:00
          const aAdjusted = aHour < 12 ? aHour + 24 : aHour;
          const bAdjusted = bHour < 12 ? bHour + 24 : bHour;
          return aAdjusted - bAdjusted;
        } else {
          // For day checklists: 08:00 → 10:00 → ... → 20:00
          return aHour - bHour;
        }
      });

      // Add 'other' at the end for non-periodic items
      if (groupedItems['other']) {
        sortedSlots.push('other');
      }
      return sortedSlots;
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

  // Handle data update for special input types
  const handleDataChange = async (itemId: string, data: ChecklistItemData) => {
    if (readOnly || isLoading) return;
    await onUpdateItems([{ id: itemId, data }]);
  };

  // Handle data submit with auto-complete
  const handleDataSubmit = async (itemId: string, data: ChecklistItemData) => {
    if (readOnly || isLoading) return;
    await onUpdateItems([{ id: itemId, data, status: 'COMPLETED' }]);
  };

  // Record timestamp for TIMESTAMP type
  const handleTimestamp = async (itemId: string) => {
    if (readOnly || isLoading) return;
    const timestamp = new Date().toISOString();
    await onUpdateItems([{ id: itemId, data: { timestamp }, status: 'COMPLETED' }]);
  };

  // Render special input component based on inputType
  const renderInputComponent = (item: ServerChecklistItem) => {
    const inputType = item.inputType || 'CHECKBOX';
    const isLocked = item.isLocked === true;
    const isDone = item.status === 'COMPLETED' || item.status === 'SKIPPED';

    if (isLocked) return null;

    // Get target time from category (e.g., "08:00", "22:00") or extract from title
    const targetTime = /^\d{2}:\d{2}$/.test(item.category)
      ? item.category
      : (item.title.match(/^\[(\d{2}:\d{2})\]/)?.[1] || '08:00');

    switch (inputType) {
      case 'GRAFANA_STATUS':
        return (
          <div className="mt-3">
            <GrafanaStatusInput
              value={item.data as GrafanaStatusData | undefined}
              onChange={(data) => handleDataChange(item.id, data)}
              onSubmit={(data) => handleDataSubmit(item.id, data)}
              readOnly={readOnly || isDone}
              isLoading={isLoading}
            />
          </div>
        );

      case 'ATM_ALERT':
        return (
          <div className="mt-3">
            <ATMAlertList
              targetTime={targetTime}
              value={item.data as ATMAlertData | undefined}
              onChange={(data) => handleDataChange(item.id, data)}
              onSubmit={(data) => handleDataSubmit(item.id, data)}
              readOnly={readOnly || isDone}
            />
          </div>
        );

      case 'PENDING_TICKETS':
        return (
          <div className="mt-3">
            <PendingTicketsDisplay
              value={item.data as PendingTicketsData | undefined}
              onChange={(data) => handleDataChange(item.id, data)}
              onSubmit={(data) => handleDataSubmit(item.id, data)}
              readOnly={readOnly || isDone}
            />
          </div>
        );

      case 'APP_STATUS':
        return (
          <div className="mt-3">
            <AppStatusInput
              value={item.data as AppStatusData | undefined}
              onChange={(data) => handleDataChange(item.id, data)}
              onSubmit={(data) => handleDataSubmit(item.id, data)}
              readOnly={readOnly || isDone}
              isLoading={isLoading}
            />
          </div>
        );

      case 'AVAILABILITY_STATUS':
        return (
          <div className="mt-3">
            <AvailabilityStatusInput
              value={item.data as AvailabilityStatusData | undefined}
              onChange={(data) => handleDataChange(item.id, data)}
              onSubmit={(data) => handleDataSubmit(item.id, data)}
              readOnly={readOnly || isDone}
              isLoading={isLoading}
            />
          </div>
        );

      case 'SERVER_METRICS':
        return (
          <div className="mt-3">
            <ServerMetricsInput
              value={item.data as ServerMetricsData | undefined}
              onChange={(data) => handleDataChange(item.id, data)}
              onSubmit={(data) => handleDataSubmit(item.id, data)}
              readOnly={readOnly || isDone}
              isLoading={isLoading}
            />
          </div>
        );

      case 'TIMESTAMP':
        const timestampData = item.data as { timestamp: string } | undefined;
        return (
          <div className="mt-3">
            {timestampData?.timestamp ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Tercatat</p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {new Date(timestampData.timestamp).toLocaleString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ) : !readOnly && !isDone ? (
              <Button
                size="sm"
                onClick={() => handleTimestamp(item.id)}
                disabled={isLoading}
              >
                <Clock className="h-4 w-4 mr-1" />
                Catat Waktu
              </Button>
            ) : null}
          </div>
        );

      case 'TEXT_INPUT':
        return (
          <div className="mt-3 space-y-2">
            <Textarea
              value={(item.data as { text: string } | undefined)?.text || ''}
              onChange={(e) => handleDataChange(item.id, { text: e.target.value })}
              placeholder="Tulis catatan..."
              className="text-sm min-h-[80px]"
              disabled={readOnly || isLoading || isDone}
            />
            {!readOnly && !isDone && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleDataSubmit(item.id, item.data!)}
                  disabled={isLoading || !(item.data as { text: string })?.text}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Simpan
                </Button>
              </div>
            )}
          </div>
        );

      case 'CHECKBOX':
      default:
        return null; // Checkbox is handled in the main row
    }
  };

  // Render a single checklist item
  const renderItem = (item: ServerChecklistItem) => {
    const isCompleted = item.status === 'COMPLETED';
    const isSkipped = item.status === 'SKIPPED';
    const isDone = isCompleted || isSkipped;
    const isLocked = item.isLocked === true;
    const displayTitle = groupByTimeSlot ? stripTimeSlot(item.title) : item.title;
    const inputType = item.inputType || 'CHECKBOX';
    const isCheckbox = inputType === 'CHECKBOX';

    return (
      <div
        key={item.id}
        className={cn(
          'px-4 py-3 transition-colors',
          isDone && 'bg-muted/30',
          isLocked && 'bg-amber-50/50 dark:bg-amber-950/20'
        )}
      >
        {/* Main row */}
        <div className="flex items-start gap-3">
          {/* Only show checkbox for CHECKBOX type */}
          <div className="pt-0.5">
            {isCheckbox ? (
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) =>
                  handleStatusChange(item.id, checked as boolean)
                }
                disabled={readOnly || isLoading || isSkipped || isLocked}
              />
            ) : (
              <div className="w-4 h-4 flex items-center justify-center">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : isLocked ? (
                  <Lock className="h-4 w-4 text-amber-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'text-sm font-medium leading-tight',
                  isDone && 'line-through text-muted-foreground',
                  isLocked && 'text-muted-foreground'
                )}
              >
                {displayTitle}
              </span>
              {item.isRequired && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                  Wajib
                </Badge>
              )}
              {isLocked && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500 text-amber-600 dark:text-amber-400">
                  Terkunci
                </Badge>
              )}
            </div>
            {item.description && !isLocked && (
              <p className="text-xs text-muted-foreground mt-1">
                {item.description}
              </p>
            )}
            {isLocked && item.lockMessage && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                {item.lockMessage}
              </p>
            )}

            {/* Render input component based on inputType */}
            {renderInputComponent(item)}
          </div>

          {/* Status indicator - only for checkbox type */}
          {isCheckbox && (
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
          )}
        </div>

        {/* Notes section - only for checkbox type */}
        {isCheckbox && (item.notes || editingNote === item.id) && (
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

        {/* Add note button - only for checkbox type */}
        {isCheckbox && !readOnly && !item.notes && editingNote !== item.id && !isLocked && (
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
    <div className="space-y-4">
      {orderedGroups.map((groupKey) => {
        const groupItems = groupedItems[groupKey];
        if (!groupItems || groupItems.length === 0) return null;

        const groupInfo = getGroupInfo(groupKey);
        const progress = getGroupProgress(groupItems);
        const Icon = groupInfo.icon;
        const isExpanded = expandedGroups[groupKey] ?? true;
        const isAllCompleted = progress.completed === progress.total;

        return (
          <div key={groupKey} className="border rounded-lg overflow-hidden shadow-sm">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(groupKey)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3',
                groupInfo.bg,
                isAllCompleted && 'opacity-75'
              )}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Icon className={cn('h-5 w-5', groupInfo.color)} />
                <div className="flex flex-col items-start">
                  <span className={cn('font-semibold text-sm', isAllCompleted && 'line-through')}>
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
                    'text-xs font-medium',
                    isAllCompleted && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  )}
                >
                  {progress.completed}/{progress.total}
                </Badge>
              </div>
            </button>

            {/* Group Items */}
            {isExpanded && (
              <div className="divide-y divide-border/50 bg-card">
                {groupItems.map(renderItem)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
