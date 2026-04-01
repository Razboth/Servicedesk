'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ChecklistUnit = 'IT_OPERATIONS' | 'MONITORING';
type ChecklistShiftType = 'HARIAN_KANTOR' | 'STANDBY_LEMBUR' | 'SHIFT_MALAM' | 'SHIFT_SIANG_WEEKEND';

interface StaffProgress {
  userId: string;
  userName: string;
  checklistId: string;
  unit: ChecklistUnit;
  shiftType: ChecklistShiftType;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stats: {
    total: number;
    completed: number;
    failed: number;
    needsAttention: number;
    pending: number;
    locked: number;
  };
  lastActivity?: string;
}

interface SupervisorDashboardProps {
  unit: ChecklistUnit;
  shiftType: ChecklistShiftType;
  date?: string;
  onViewChecklist?: (checklistId: string) => void;
}

const UNIT_LABELS: Record<ChecklistUnit, string> = {
  IT_OPERATIONS: 'IT Operations',
  MONITORING: 'Monitoring',
};

const SHIFT_LABELS: Record<ChecklistShiftType, string> = {
  HARIAN_KANTOR: 'Harian Kantor',
  STANDBY_LEMBUR: 'Standby Lembur',
  SHIFT_MALAM: 'Shift Malam',
  SHIFT_SIANG_WEEKEND: 'Shift Siang Weekend',
};

export function SupervisorDashboard({
  unit,
  shiftType,
  date,
  onViewChecklist,
}: SupervisorDashboardProps) {
  const [staffProgress, setStaffProgress] = useState<StaffProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSupervisorData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null);

        const params = new URLSearchParams({
          unit,
          shiftType,
          ...(date && { date }),
        });

        const response = await fetch(`/api/v2/checklist/supervisor?${params}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch supervisor data');
        }

        const data = await response.json();
        setStaffProgress(data.staffProgress || []);
      } catch (err) {
        console.error('Error fetching supervisor data:', err);
        setError(err instanceof Error ? err.message : 'Gagal memuat data');
        toast.error('Gagal memuat data staff');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [unit, shiftType, date]
  );

  useEffect(() => {
    fetchSupervisorData();
  }, [fetchSupervisorData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!error) {
        fetchSupervisorData(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [error, fetchSupervisorData]);

  const getOverallStats = () => {
    const stats = {
      totalStaff: staffProgress.length,
      completed: staffProgress.filter((s) => s.status === 'COMPLETED').length,
      inProgress: staffProgress.filter((s) => s.status === 'IN_PROGRESS').length,
      pending: staffProgress.filter((s) => s.status === 'PENDING').length,
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
    };

    staffProgress.forEach((staff) => {
      stats.totalItems += staff.stats.total;
      stats.completedItems += staff.stats.completed;
      stats.failedItems += staff.stats.failed;
    });

    return stats;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchSupervisorData()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  const overallStats = getOverallStats();
  const overallProgress =
    overallStats.totalItems > 0
      ? Math.round((overallStats.completedItems / overallStats.totalItems) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Dashboard Supervisor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {UNIT_LABELS[unit]} - {SHIFT_LABELS[shiftType]}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSupervisorData(false)}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{overallStats.totalStaff}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{overallStats.completed}</p>
              <p className="text-sm text-muted-foreground">Selesai</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{overallStats.inProgress}</p>
              <p className="text-sm text-muted-foreground">Dalam Proses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{overallStats.failedItems}</p>
              <p className="text-sm text-muted-foreground">Item Gagal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress Keseluruhan</span>
              <span>
                {overallStats.completedItems}/{overallStats.totalItems} item ({overallProgress}%)
              </span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Staff Progress List */}
      {staffProgress.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Belum ada staff yang mengerjakan checklist</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {staffProgress.map((staff) => {
            const progress =
              staff.stats.total > 0
                ? Math.round((staff.stats.completed / staff.stats.total) * 100)
                : 0;

            return (
              <Card
                key={staff.userId}
                className={cn(
                  staff.status === 'COMPLETED' && 'border-green-200 dark:border-green-800'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{staff.userName}</h4>
                        <Badge
                          variant={
                            staff.status === 'COMPLETED'
                              ? 'default'
                              : staff.status === 'IN_PROGRESS'
                                ? 'secondary'
                                : 'outline'
                          }
                          className={cn(
                            staff.status === 'COMPLETED' &&
                              'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          )}
                        >
                          {staff.status === 'COMPLETED' ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Selesai
                            </>
                          ) : staff.status === 'IN_PROGRESS' ? (
                            'Dalam Proses'
                          ) : (
                            'Pending'
                          )}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 max-w-xs">
                          <Progress value={progress} className="h-2" />
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {staff.stats.completed}/{staff.stats.total} ({progress}%)
                        </span>
                      </div>

                      {/* Stats badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {staff.stats.failed > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {staff.stats.failed} gagal
                          </Badge>
                        )}
                        {staff.stats.needsAttention > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {staff.stats.needsAttention} perlu perhatian
                          </Badge>
                        )}
                        {staff.stats.locked > 0 && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                            {staff.stats.locked} terkunci
                          </Badge>
                        )}
                      </div>

                      {staff.lastActivity && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Aktivitas terakhir:{' '}
                          {format(new Date(staff.lastActivity), 'HH:mm', { locale: id })}
                        </p>
                      )}
                    </div>

                    {onViewChecklist && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewChecklist(staff.checklistId)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
