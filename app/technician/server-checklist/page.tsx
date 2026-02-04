'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ServerAccessChecklist } from '@/components/technician/server-access-checklist';
import {
  Server,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Lock,
  Loader2,
  CalendarDays,
  UserCheck,
  Users,
  Hand,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
  unlockTime: string | null;
  isLocked: boolean;
  lockMessage: string | null;
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
  checklistType: string;
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

export default function ServerChecklistPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [checklist, setChecklist] = useState<ServerChecklist | null>(null);
  const [stats, setStats] = useState<ChecklistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Fetch checklist data
  const fetchChecklist = async () => {
    try {
      setLoading(true);
      setAccessError(null);
      const response = await fetch('/api/server-checklist');

      if (response.status === 403) {
        const data = await response.json();
        setHasAccess(false);
        setAccessError(data.error || 'Akses ditolak');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch checklist');
      }

      const data = await response.json();
      setChecklist(data);
      setStats(data.stats || null);
      setHasAccess(true);
    } catch (error) {
      console.error('Error fetching checklist:', error);
      toast.error('Gagal memuat checklist');
    } finally {
      setLoading(false);
    }
  };

  // Claim checklist
  const handleClaim = async () => {
    try {
      setClaiming(true);
      const response = await fetch('/api/server-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: checklist?.checklistType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengklaim checklist');
      }

      toast.success('Checklist berhasil diklaim');
      await fetchChecklist();
    } catch (error) {
      console.error('Error claiming checklist:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengklaim checklist');
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchChecklist();
    }
  }, [session]);

  // Auto-refresh every 60 seconds to update lock status
  useEffect(() => {
    const interval = setInterval(() => {
      if (session?.user?.id && hasAccess && checklist?.claimedByUser) {
        fetchChecklist();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [session, hasAccess, checklist?.claimedByUser]);

  // Handle item updates
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
        // Check for lock errors
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((err: { error: string }) => {
            toast.error(err.error);
          });
        } else {
          throw new Error(data.error || 'Failed to update');
        }
        return;
      }

      // Refresh checklist
      await fetchChecklist();
      toast.success('Checklist diperbarui');
    } catch (error) {
      console.error('Error updating items:', error);
      toast.error('Gagal memperbarui checklist');
    } finally {
      setUpdating(false);
    }
  };

  // Loading state
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Memuat checklist...</p>
        </div>
      </div>
    );
  }

  // No access
  if (hasAccess === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Akses Ditolak</CardTitle>
            <CardDescription>
              {accessError || 'Anda tidak memiliki akses server. Hubungi administrator untuk mendapatkan akses.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Not claimed yet - show claim UI
  if (checklist && !checklist.claimedByUser && checklist.canClaim) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-8 px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Server className="h-8 w-8 text-primary" />
                  Server Checklist
                </h1>
                <p className="text-muted-foreground mt-2">
                  Klaim checklist untuk memulai pemeriksaan server
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchChecklist()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Claim Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Hand className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Klaim Checklist {checklist.checklistType?.replace('_', ' ')}</CardTitle>
                  <CardDescription>
                    Checklist ini belum diklaim. Klik tombol di bawah untuk mengklaim.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                size="lg"
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
            </CardContent>
          </Card>

          {/* Shift Info */}
          {checklist.shiftInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informasi Shift</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Server Access</p>
                    <Badge variant={checklist.shiftInfo.hasServerAccess ? 'default' : 'destructive'}>
                      {checklist.shiftInfo.hasServerAccess ? 'Ya' : 'Tidak'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shift Saat Ini</p>
                    <Badge variant="secondary">
                      {checklist.shiftInfo.currentShiftType || 'Tidak ada shift'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

  // Calculate progress
  const progress = stats
    ? Math.round(((stats.completed + stats.skipped) / stats.total) * 100)
    : 0;

  const isCompleted = checklist?.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Server className="h-8 w-8 text-primary" />
                Server Checklist
              </h1>
              <p className="text-muted-foreground mt-2">
                Checklist harian untuk pemeliharaan server
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchChecklist()}
              disabled={loading || updating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date and Status Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {checklist?.date
                      ? format(new Date(checklist.date), 'EEEE, d MMMM yyyy', { locale: id })
                      : 'Hari Ini'}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <UserCheck className="h-3 w-3" />
                    Diklaim oleh: {checklist?.user?.name || session?.user?.name}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {checklist?.checklistType?.replace('_', ' ')}
                </Badge>
                <Badge
                  variant={isCompleted ? 'default' : 'secondary'}
                  className={isCompleted ? 'bg-green-500' : ''}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Selesai
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Dalam Proses
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {stats?.completed || 0} / {stats?.total || 0} selesai
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                  <div className="text-xs text-muted-foreground">Selesai</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.skipped}</div>
                  <div className="text-xs text-muted-foreground">Dilewati</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{stats.locked}</div>
                  <div className="text-xs text-muted-foreground">Terkunci</div>
                </div>
              </div>
            )}

            {/* Other claims info */}
            {checklist?.otherClaims && checklist.otherClaims.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">
                    {checklist.otherClaims.length} staff lain juga mengerjakan checklist ini
                  </span>
                </div>
              </div>
            )}

            {/* Locked items notice */}
            {stats && stats.locked > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {stats.locked} item masih terkunci dan akan tersedia pada waktu tertentu
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar Tugas</CardTitle>
            <CardDescription>
              Centang item yang sudah diselesaikan. Item dengan tanda kunci akan tersedia pada waktu yang ditentukan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checklist?.items && checklist.items.length > 0 ? (
              <ServerAccessChecklist
                items={checklist.items}
                onUpdateItems={handleUpdateItems}
                isLoading={updating}
                readOnly={isCompleted}
                groupByTimeSlot={checklist.checklistType === 'SERVER_SIANG' || checklist.checklistType === 'SERVER_MALAM'}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada item checklist tersedia</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed notice */}
        {isCompleted && (
          <Card className="mt-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Checklist Selesai
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    {checklist?.completedAt
                      ? `Diselesaikan pada ${format(
                          new Date(checklist.completedAt),
                          'HH:mm, d MMMM yyyy',
                          { locale: id }
                        )}`
                      : 'Semua item telah diselesaikan'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
