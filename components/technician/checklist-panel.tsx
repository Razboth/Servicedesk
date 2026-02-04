'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ServerAccessChecklist } from './server-access-checklist';
import {
  Loader2,
  Clock,
  UserCheck,
  Users,
  Hand,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type DailyChecklistType =
  | 'HARIAN'
  | 'SERVER_SIANG'
  | 'SERVER_MALAM'
  | 'AKHIR_HARI'
  | 'OPS_SIANG'
  | 'OPS_MALAM'
  | 'MONITORING_SIANG'
  | 'MONITORING_MALAM';

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

interface OtherClaim {
  userId: string;
  userName: string;
  status: string;
}

interface ServerChecklist {
  id: string;
  userId: string;
  date: string;
  checklistType: DailyChecklistType;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  completedAt: string | null;
  notes: string | null;
  items: ServerChecklistItem[];
  user: {
    id: string;
    name: string;
    email: string;
  };
  claimed: boolean;
  claimedByUser: boolean;
  canClaim?: boolean;
  readOnly?: boolean;
  viewingOtherUser?: boolean;
  otherClaims?: OtherClaim[];
  serverTime?: {
    wita: string;
    witaHour: number;
    witaMinute: number;
    iso: string;
  };
  shiftInfo?: {
    hasServerAccess: boolean;
    isOnNightShift: boolean;
    isOnOpsShift: boolean;
    canAccessHarian: boolean;
    currentShiftType: string | null;
  };
}

interface ChecklistStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  skipped: number;
  locked: number;
}

interface ChecklistPanelProps {
  type: DailyChecklistType;
  onStatsUpdate?: (type: DailyChecklistType, stats: ChecklistStats | null) => void;
}

export function ChecklistPanel({ type, onStatsUpdate }: ChecklistPanelProps) {
  const [checklist, setChecklist] = useState<ServerChecklist | null>(null);
  const [stats, setStats] = useState<ChecklistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      const response = await fetch(`/api/server-checklist?type=${type}`);

      if (response.status === 403) {
        const data = await response.json();
        setError(data.error || 'Akses ditolak');
        setChecklist(null);
        setStats(null);
        onStatsUpdate?.(type, null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch checklist');
      }

      const data = await response.json();
      setChecklist(data);

      // Calculate stats from items
      if (data.items) {
        const calculatedStats: ChecklistStats = {
          total: data.items.length,
          completed: data.items.filter((i: ServerChecklistItem) => i.status === 'COMPLETED').length,
          pending: data.items.filter((i: ServerChecklistItem) => i.status === 'PENDING').length,
          inProgress: data.items.filter((i: ServerChecklistItem) => i.status === 'IN_PROGRESS').length,
          skipped: data.items.filter((i: ServerChecklistItem) => i.status === 'SKIPPED').length,
          locked: data.items.filter((i: ServerChecklistItem) => i.isLocked === true).length,
        };
        setStats(calculatedStats);
        onStatsUpdate?.(type, calculatedStats);
      } else {
        setStats(null);
        onStatsUpdate?.(type, null);
      }
    } catch (err) {
      console.error('Error fetching checklist:', err);
      setError('Gagal memuat checklist');
      toast.error('Gagal memuat checklist');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type, onStatsUpdate]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Auto-refresh every 60 seconds to update lock status
  useEffect(() => {
    const interval = setInterval(() => {
      if (checklist?.claimedByUser && !error) {
        fetchChecklist(false); // Silent refresh, don't show loading spinner
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [checklist?.claimedByUser, error, fetchChecklist]);

  const handleClaim = async () => {
    try {
      setClaiming(true);
      const response = await fetch('/api/server-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengklaim checklist');
      }

      toast.success('Checklist berhasil diklaim');

      // Update state directly from the claim response instead of re-fetching
      // This avoids the loading spinner and provides instant UI update
      setChecklist(data);

      // Calculate and update stats from the response
      if (data.items) {
        const calculatedStats: ChecklistStats = {
          total: data.items.length,
          completed: data.items.filter((i: ServerChecklistItem) => i.status === 'COMPLETED').length,
          pending: data.items.filter((i: ServerChecklistItem) => i.status === 'PENDING').length,
          inProgress: data.items.filter((i: ServerChecklistItem) => i.status === 'IN_PROGRESS').length,
          skipped: data.items.filter((i: ServerChecklistItem) => i.status === 'SKIPPED').length,
          locked: data.items.filter((i: ServerChecklistItem) => i.isLocked === true).length,
        };
        setStats(calculatedStats);
        onStatsUpdate?.(type, calculatedStats);
      }
    } catch (err) {
      console.error('Error claiming checklist:', err);
      toast.error(err instanceof Error ? err.message : 'Gagal mengklaim checklist');
    } finally {
      setClaiming(false);
    }
  };

  const handleRelease = async () => {
    if (!checklist?.id) return;

    // Confirm before release
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin melepaskan checklist ini?\n\nAnda hanya dapat melepaskan checklist jika belum ada item yang dikerjakan.'
    );

    if (!confirmed) return;

    try {
      setReleasing(true);
      const response = await fetch(`/api/server-checklist?id=${checklist.id}&type=${type}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal melepaskan checklist');
      }

      toast.success('Checklist berhasil dilepaskan');

      // Re-fetch without showing loading spinner to get the unclaimed state
      // This will show the claim UI smoothly
      await fetchChecklist(false);
    } catch (err) {
      console.error('Error releasing checklist:', err);
      toast.error(err instanceof Error ? err.message : 'Gagal melepaskan checklist');
    } finally {
      setReleasing(false);
    }
  };

  const handleUpdateItems = async (
    items: { id: string; status?: string; notes?: string }[]
  ) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/server-checklist/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((err: { error: string }) => {
            toast.error(err.error);
          });
        } else {
          throw new Error(data.error || 'Failed to update');
        }
        return;
      }

      // Silent refresh to update checklist status and stats without loading spinner
      await fetchChecklist(false);
      toast.success('Checklist diperbarui');
    } catch (err) {
      console.error('Error updating items:', err);
      toast.error('Gagal memperbarui checklist');
    } finally {
      setUpdating(false);
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
      </div>
    );
  }

  // Not claimed yet and no one else has claimed - show claim UI
  if (checklist && !checklist.claimedByUser && checklist.canClaim && !checklist.viewingOtherUser) {
    return (
      <div className="space-y-4">
        <div className="p-6 border rounded-lg bg-muted/30">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Hand className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Checklist Belum Diklaim</p>
              <p className="text-sm text-muted-foreground mt-1">
                Klik tombol di bawah untuk mengklaim dan mulai mengerjakan checklist ini
              </p>
            </div>
          </div>

          <Button
            onClick={handleClaim}
            disabled={claiming}
            size="lg"
            className="w-full"
          >
            {claiming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mengklaim...
              </>
            ) : (
              <>
                <Hand className="h-4 w-4 mr-2" />
                Klaim Checklist
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // No checklist available
  if (!checklist || !checklist.items || checklist.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Tidak ada item checklist tersedia</p>
      </div>
    );
  }

  // Calculate progress
  const progress = stats
    ? Math.round(((stats.completed + stats.skipped) / stats.total) * 100)
    : 0;
  const isCompleted = checklist.status === 'COMPLETED';
  const isViewingOther = checklist.viewingOtherUser === true;
  const isReadOnly = isCompleted || isViewingOther || checklist.readOnly === true;

  return (
    <div className="space-y-5">
      {/* Read-only notice when viewing other user's checklist */}
      {isViewingOther && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Mode Hanya Lihat
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Anda melihat checklist milik <strong>{checklist.user.name}</strong>
                </p>
              </div>
            </div>
            {checklist.canClaim && (
              <Button
                onClick={handleClaim}
                disabled={claiming}
                variant="outline"
                size="sm"
                className="border-amber-500 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/50"
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengklaim...
                  </>
                ) : (
                  <>
                    <Hand className="h-4 w-4 mr-2" />
                    Klaim Checklist Sendiri
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-3">
          {/* Server Time */}
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
          {/* PIC */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCheck className="h-4 w-4" />
            <span>{checklist.user.name}</span>
            {isViewingOther && (
              <Badge variant="outline" className="text-[10px] ml-1">
                PIC
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isViewingOther && (
            <Badge variant="outline" className="text-amber-600 border-amber-500">
              Hanya Lihat
            </Badge>
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
            disabled={loading || updating || refreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          {/* Release button - only show when user has claimed, not completed, and no items done */}
          {checklist.claimedByUser && !isCompleted && stats?.completed === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRelease}
              disabled={loading || updating || releasing}
              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
              title="Lepaskan checklist"
            >
              {releasing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {stats && (
        <div className="space-y-2 p-4 bg-muted/20 rounded-lg border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-semibold">
              {stats.completed + stats.skipped}/{stats.total} selesai
            </span>
          </div>
          <Progress value={progress} className="h-2.5" />
          {stats.locked > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {stats.locked} item masih terkunci (akan terbuka sesuai jadwal)
            </p>
          )}
        </div>
      )}

      {/* Other claims info - only show when user has claimed */}
      {checklist.claimedByUser && checklist.otherClaims && checklist.otherClaims.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">
              {checklist.otherClaims.length} staff lain juga mengerjakan checklist ini
            </span>
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <ServerAccessChecklist
        items={checklist.items}
        onUpdateItems={handleUpdateItems}
        isLoading={updating}
        readOnly={isReadOnly}
        groupByTimeSlot={type === 'SERVER_SIANG' || type === 'SERVER_MALAM' || type === 'MONITORING_SIANG' || type === 'MONITORING_MALAM' || type === 'OPS_SIANG' || type === 'OPS_MALAM'}
      />

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
