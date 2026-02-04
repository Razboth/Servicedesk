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
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type DailyChecklistType = 'HARIAN' | 'SERVER_SIANG' | 'SERVER_MALAM' | 'AKHIR_HARI';

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
  const [updating, setUpdating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = useCallback(async () => {
    try {
      setLoading(true);
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
    }
  }, [type, onStatsUpdate]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  // Auto-refresh every 60 seconds to update lock status
  useEffect(() => {
    const interval = setInterval(() => {
      if (checklist?.claimedByUser && !error) {
        fetchChecklist();
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
      await fetchChecklist();
    } catch (err) {
      console.error('Error claiming checklist:', err);
      toast.error(err instanceof Error ? err.message : 'Gagal mengklaim checklist');
    } finally {
      setClaiming(false);
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

      await fetchChecklist();
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

  // Not claimed yet - show claim UI
  if (checklist && !checklist.claimedByUser && checklist.canClaim) {
    return (
      <div className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Hand className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Checklist Belum Diklaim</p>
              <p className="text-sm text-muted-foreground">
                Klik tombol di bawah untuk mengklaim checklist ini
              </p>
            </div>
          </div>

          {/* Other claims info */}
          {checklist.otherClaims && checklist.otherClaims.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Staff lain yang sudah mengklaim:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {checklist.otherClaims.map((claim) => (
                  <Badge key={claim.userId} variant="secondary" className="text-xs">
                    <UserCheck className="h-3 w-3 mr-1" />
                    {claim.userName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleClaim}
            disabled={claiming}
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

  return (
    <div className="space-y-4">
      {/* Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg">
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
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => fetchChecklist()}
            disabled={loading || updating}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {stats && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {stats.completed + stats.skipped}/{stats.total} selesai
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {stats.locked > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {stats.locked} item masih terkunci
            </p>
          )}
        </div>
      )}

      {/* Other claims info */}
      {checklist.otherClaims && checklist.otherClaims.length > 0 && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Users className="h-4 w-4" />
            <span className="text-sm">
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
        readOnly={isCompleted}
        groupByTimeSlot={type === 'SERVER_SIANG' || type === 'SERVER_MALAM'}
      />

      {/* Completed Notice */}
      {isCompleted && (
        <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <div>
              <p className="font-medium">Checklist Selesai</p>
              {checklist.completedAt && (
                <p className="text-sm">
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
