'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChecklistProgressBar } from './checklist-progress-bar';
import { ChecklistSection } from './checklist-section';
import { PeriodicChecklistGrid } from './periodic-checklist-grid';
import { ChecklistItemData, ItemStatus } from './checklist-item-row';
import {
  Loader2,
  Clock,
  UserCheck,
  Users,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type ChecklistUnit = 'IT_OPERATIONS' | 'MONITORING';
type ChecklistShiftType = 'HARIAN_KANTOR' | 'STANDBY_LEMBUR' | 'SHIFT_MALAM' | 'SHIFT_SIANG_WEEKEND';
type ChecklistRole = 'STAFF' | 'SUPERVISOR';

interface ChecklistAssignment {
  id: string;
  userId: string;
  role: ChecklistRole;
  user: {
    id: string;
    name: string;
    username: string;
  };
}

interface DailyChecklist {
  id: string;
  date: string;
  unit: ChecklistUnit;
  shiftType: ChecklistShiftType;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt: string | null;
  items: ChecklistItemData[];
  assignments: ChecklistAssignment[];
  serverTime?: {
    wita: string;
    witaHour: number;
    witaMinute: number;
    iso: string;
  };
}

interface ChecklistStats {
  total: number;
  completed: number;
  failed: number;
  needsAttention: number;
  pending: number;
  locked: number;
}

interface ChecklistPanelV2Props {
  unit: ChecklistUnit;
  shiftType: ChecklistShiftType;
  onStatsUpdate?: (stats: ChecklistStats | null) => void;
}

const SHIFT_LABELS: Record<ChecklistShiftType, string> = {
  HARIAN_KANTOR: 'Harian Kantor',
  STANDBY_LEMBUR: 'Standby Lembur',
  SHIFT_MALAM: 'Shift Malam',
  SHIFT_SIANG_WEEKEND: 'Shift Siang Weekend',
};

const UNIT_LABELS: Record<ChecklistUnit, string> = {
  IT_OPERATIONS: 'IT Operations',
  MONITORING: 'Monitoring',
};

// Periodic sections that should use grid view
const PERIODIC_SECTIONS = ['C'];
const PERIODIC_TIME_SLOTS: Record<ChecklistShiftType, string[]> = {
  HARIAN_KANTOR: ['08:00', '10:00', '12:00', '14:00', '16:00'],
  STANDBY_LEMBUR: ['17:00', '19:00'],
  SHIFT_MALAM: ['20:00', '22:00', '00:00', '02:00', '04:00', '06:00'],
  SHIFT_SIANG_WEEKEND: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
};

export function ChecklistPanelV2({ unit, shiftType, onStatsUpdate }: ChecklistPanelV2Props) {
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [stats, setStats] = useState<ChecklistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const calculateStats = useCallback((items: ChecklistItemData[]): ChecklistStats => {
    return {
      total: items.length,
      completed: items.filter((i) => i.status === 'COMPLETED').length,
      failed: items.filter((i) => i.status === 'FAILED').length,
      needsAttention: items.filter((i) => i.status === 'NEEDS_ATTENTION').length,
      pending: items.filter((i) => i.status === 'PENDING').length,
      locked: items.filter((i) => i.isLocked).length,
    };
  }, []);

  const fetchChecklist = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);

        const response = await fetch(`/api/v2/checklist?unit=${unit}&shiftType=${shiftType}&_t=${Date.now()}`, {
          cache: 'no-store',
        });

        if (response.status === 403) {
          const data = await response.json();
          setError(data.error || 'Akses ditolak');
          setChecklist(null);
          setStats(null);
          onStatsUpdate?.(null);
          return;
        }

        if (response.status === 404) {
          // No checklist exists yet - this is okay for creating new ones
          setChecklist(null);
          setStats(null);
          onStatsUpdate?.(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch checklist');
        }

        const data = await response.json();
        setChecklist(data.checklist);
        setCurrentUserId(data.currentUserId);

        if (data.checklist?.items) {
          const calculatedStats = calculateStats(data.checklist.items);
          setStats(calculatedStats);
          onStatsUpdate?.(calculatedStats);
        } else {
          setStats(null);
          onStatsUpdate?.(null);
        }
      } catch (err) {
        console.error('Error fetching checklist:', err);
        setError('Gagal memuat checklist');
        toast.error('Gagal memuat checklist');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [unit, shiftType, onStatsUpdate, calculateStats]
  );

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (checklist && !error) {
        fetchChecklist(false);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [checklist, error, fetchChecklist]);

  const handleStatusChange = async (id: string, status: ItemStatus, notes?: string) => {
    try {
      const response = await fetch('/api/v2/checklist/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklistId: checklist?.id,
          items: [{ itemId: id, status, notes }],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors?.length > 0) {
          data.errors.forEach((err: { error: string }) => toast.error(err.error));
        } else {
          throw new Error(data.error || 'Failed to update');
        }
        return;
      }

      // Refresh checklist to get updated data
      await fetchChecklist(false);
    } catch (err) {
      console.error('Error updating item:', err);
      toast.error('Gagal memperbarui item');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchChecklist()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  // No checklist available
  if (!checklist || !checklist.items || checklist.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Tidak ada checklist tersedia untuk shift ini</p>
        <p className="text-sm text-muted-foreground mt-1">
          {UNIT_LABELS[unit]} - {SHIFT_LABELS[shiftType]}
        </p>
      </div>
    );
  }

  const isCompleted = checklist.status === 'COMPLETED';
  const userAssignment = checklist.assignments.find((a) => a.userId === currentUserId);
  const isAssigned = !!userAssignment;
  const isSupervisor = userAssignment?.role === 'SUPERVISOR';
  const readOnly = isCompleted || !isAssigned || isSupervisor;

  // Group items by section
  const sectionMap = new Map<string, { title: string; items: ChecklistItemData[] }>();
  checklist.items.forEach((item) => {
    const existing = sectionMap.get(item.section);
    if (existing) {
      existing.items.push(item);
    } else {
      sectionMap.set(item.section, {
        title: item.sectionTitle,
        items: [item],
      });
    }
  });

  // Sort sections by key (A, B, C, D, E)
  const sortedSections = Array.from(sectionMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="flex flex-wrap items-center gap-3">
          {checklist.serverTime && (
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono font-medium">
                {String(checklist.serverTime.witaHour).padStart(2, '0')}:
                {String(checklist.serverTime.witaMinute).padStart(2, '0')} WITA
              </span>
            </div>
          )}
          <span className="text-muted-foreground hidden sm:inline">•</span>
          <Badge variant="outline">{UNIT_LABELS[unit]}</Badge>
          <Badge variant="secondary">{SHIFT_LABELS[shiftType]}</Badge>
        </div>

        <div className="flex items-center gap-2">
          {isAssigned && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              <span>{isSupervisor ? 'Supervisor' : 'Staff'}</span>
            </div>
          )}
          <Badge
            className={
              isCompleted
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : checklist.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : ''
            }
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Selesai
              </>
            ) : checklist.status === 'IN_PROGRESS' ? (
              'Dalam Proses'
            ) : (
              'Pending'
            )}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchChecklist(false)}
            disabled={loading || refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Assignment Info */}
      {checklist.assignments.length > 0 && (
        <div className="p-4 bg-muted/20 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Tim yang Ditugaskan</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {checklist.assignments.map((assignment) => (
              <Badge
                key={assignment.id}
                variant={assignment.role === 'SUPERVISOR' ? 'default' : 'secondary'}
              >
                {assignment.user.name}
                <span className="ml-1 text-xs opacity-75">
                  ({assignment.role === 'SUPERVISOR' ? 'SPV' : 'Staff'})
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {stats && (
        <div className="p-4 bg-muted/20 rounded-lg border">
          <ChecklistProgressBar
            total={stats.total}
            completed={stats.completed}
            failed={stats.failed}
            needsAttention={stats.needsAttention}
            locked={stats.locked}
          />
        </div>
      )}

      {/* Read-only notice for supervisors */}
      {isSupervisor && !isCompleted && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Sebagai Supervisor, Anda dapat melihat progress tetapi tidak dapat mengubah status item.
          </p>
        </div>
      )}

      {/* Checklist Sections */}
      <div className="space-y-4">
        {sortedSections.map(([section, data]) => {
          // Check if this section should use grid view
          const isPeriodic = PERIODIC_SECTIONS.includes(section);
          const hasTimeSlots = data.items.some((i) => i.timeSlot);

          if (isPeriodic && hasTimeSlots) {
            return (
              <PeriodicChecklistGrid
                key={section}
                sectionTitle={`${section}. ${data.title}`}
                items={data.items}
                timeSlots={PERIODIC_TIME_SLOTS[shiftType] || []}
                onStatusChange={handleStatusChange}
                readOnly={readOnly}
              />
            );
          }

          return (
            <ChecklistSection
              key={section}
              section={section}
              sectionTitle={data.title}
              items={data.items}
              onStatusChange={handleStatusChange}
              readOnly={readOnly}
              defaultOpen={section === 'A'}
              showTimeSlots={hasTimeSlots}
            />
          );
        })}
      </div>

      {/* Completed Notice */}
      {isCompleted && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">Checklist Selesai</p>
              {checklist.completedAt && (
                <p className="text-sm mt-0.5">
                  Diselesaikan pada{' '}
                  {format(new Date(checklist.completedAt), 'HH:mm, d MMMM yyyy', { locale: id })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
