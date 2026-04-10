'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  UserMinus,
  Calendar,
  Server,
  Shield,
  Sun,
  Moon,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserCog,
  ArrowRightLeft,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ChecklistType = 'IT_INFRASTRUKTUR' | 'KEAMANAN_SIBER' | 'FRAUD_COMPLIANCE';
type ChecklistShiftType = 'SHIFT_SIANG' | 'SHIFT_MALAM';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  checklistType?: ChecklistType;
  canBePrimary?: boolean;
  canBeBuddy?: boolean;
  standbyChecklistType?: ChecklistType;
}

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: ChecklistShiftType;
  primaryUserId: string;
  primaryType: ChecklistType;
  buddyUserId?: string;
  buddyType?: ChecklistType;
  takenOver: boolean;
  takenOverAt?: string;
  takenOverReason?: string;
  isActive: boolean;
  createdAt: string;
  primaryUser: User;
  buddyUser?: User;
  createdBy: User;
}

const CHECKLIST_TYPE_CONFIG: Record<ChecklistType, { label: string; shortLabel: string; icon: typeof Server; color: string; bgColor: string }> = {
  IT_INFRASTRUKTUR: {
    label: 'IT & Infrastruktur',
    shortLabel: 'IT',
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  KEAMANAN_SIBER: {
    label: 'Keamanan Siber (KKS)',
    shortLabel: 'KKS',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
  },
  FRAUD_COMPLIANCE: {
    label: 'Fraud & Compliance',
    shortLabel: 'Fraud',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
};

const SHIFT_CONFIG: Record<ChecklistShiftType, { label: string; icon: typeof Sun; time: string; color: string }> = {
  SHIFT_SIANG: { label: 'Shift Siang', icon: Sun, time: '08:00 - 20:00', color: 'text-amber-500' },
  SHIFT_MALAM: { label: 'Shift Malam', icon: Moon, time: '20:00 - 08:00', color: 'text-indigo-500' },
};

const SHIFT_OPTIONS: ChecklistShiftType[] = ['SHIFT_SIANG', 'SHIFT_MALAM'];
const CHECKLIST_TYPE_OPTIONS: ChecklistType[] = ['IT_INFRASTRUKTUR', 'KEAMANAN_SIBER', 'FRAUD_COMPLIANCE'];

export default function ChecklistAssignmentsPage() {
  const { data: session, status } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<ChecklistShiftType | null>(null);
  const [existingAssignment, setExistingAssignment] = useState<ShiftAssignment | null>(null);
  const [primaryUserId, setPrimaryUserId] = useState('');
  const [primaryType, setPrimaryType] = useState<ChecklistType>('IT_INFRASTRUKTUR');
  const [buddyUserId, setBuddyUserId] = useState('');
  const [buddyType, setBuddyType] = useState<ChecklistType | ''>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAssignments = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams({ date: selectedDate });
      const response = await fetch(`/api/v2/checklist/shift?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      } else {
        toast.error('Gagal memuat data');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/v2/checklist/admin/assignments?getUsers=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchAssignments();
    }
  }, [session, fetchAssignments]);

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    const newDate = days > 0 ? addDays(date, days) : subDays(date, Math.abs(days));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const handleOpenAssignDialog = (shiftType: ChecklistShiftType, assignment?: ShiftAssignment) => {
    setEditingShift(shiftType);
    setExistingAssignment(assignment || null);

    if (assignment) {
      setPrimaryUserId(assignment.primaryUserId);
      setPrimaryType(assignment.primaryType);
      setBuddyUserId(assignment.buddyUserId || '');
      setBuddyType(assignment.buddyType || '');
    } else {
      setPrimaryUserId('');
      setPrimaryType('IT_INFRASTRUKTUR');
      setBuddyUserId('');
      setBuddyType('');
    }

    fetchAvailableUsers();
    setShowAssignDialog(true);
  };

  const handleSaveAssignment = async () => {
    if (!primaryUserId || !editingShift) {
      toast.error('Pilih primary user terlebih dahulu');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/v2/checklist/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          shiftType: editingShift,
          primaryUserId,
          primaryType,
          buddyUserId: buddyUserId || undefined,
          buddyType: buddyType || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      toast.success(data.message);
      setShowAssignDialog(false);
      fetchAssignments(false);
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan penugasan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Hapus penugasan shift ini?')) return;

    setDeleting(assignmentId);
    try {
      const response = await fetch(`/api/v2/checklist/shift?id=${assignmentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      toast.success(data.message);
      fetchAssignments(false);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus');
    } finally {
      setDeleting(null);
    }
  };

  const getAssignmentForShift = (shiftType: ChecklistShiftType) => {
    return assignments.find((a) => a.shiftType === shiftType);
  };

  // Filter users for primary (canBePrimary) and buddy (canBeBuddy)
  const primaryUsers = availableUsers.filter(u => u.canBePrimary !== false);
  const buddyUsers = availableUsers.filter(u => u.canBeBuddy !== false && u.id !== primaryUserId);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-8 px-4 md:px-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-muted-foreground">Silakan login untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  const allowedRoles = ['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.user.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-muted-foreground">Halaman ini hanya untuk Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 md:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Penugasan Shift</h1>
              <p className="text-sm text-muted-foreground">
                Kelola penugasan Primary dan Buddy untuk setiap shift harian
              </p>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDateChange(-1)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-0 focus:outline-none focus:ring-0 font-medium"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDateChange(1)}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="text-xs"
                >
                  Hari Ini
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAssignments(false)}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Date Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold">
            {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: id })}
          </h2>
        </div>

        {/* Shift Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {SHIFT_OPTIONS.map((shiftType) => {
            const assignment = getAssignmentForShift(shiftType);
            const shiftConfig = SHIFT_CONFIG[shiftType];
            const ShiftIcon = shiftConfig.icon;

            return (
              <Card key={shiftType} className="overflow-hidden">
                <CardHeader className={cn(
                  'py-4',
                  shiftType === 'SHIFT_SIANG' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-indigo-50 dark:bg-indigo-950/30'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        shiftType === 'SHIFT_SIANG' ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-indigo-100 dark:bg-indigo-900/50'
                      )}>
                        <ShiftIcon className={cn('h-5 w-5', shiftConfig.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{shiftConfig.label}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {shiftConfig.time}
                        </CardDescription>
                      </div>
                    </div>
                    {assignment?.takenOver && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <ArrowRightLeft className="h-3 w-3" />
                        Takeover
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="py-4 space-y-4">
                  {assignment ? (
                    <>
                      {/* Primary User */}
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                              <UserCheck className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Primary</p>
                              <p className="font-semibold">{assignment.primaryUser.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {(() => {
                                  const config = CHECKLIST_TYPE_CONFIG[assignment.primaryType];
                                  const Icon = config.icon;
                                  return (
                                    <Badge variant="outline" className={cn('text-xs', config.color)}>
                                      <Icon className="h-3 w-3 mr-1" />
                                      {config.shortLabel}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Buddy User */}
                      {assignment.buddyUser ? (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                                <UserCog className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Buddy</p>
                                <p className="font-semibold">{assignment.buddyUser.name}</p>
                                {assignment.buddyType && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {(() => {
                                      const config = CHECKLIST_TYPE_CONFIG[assignment.buddyType];
                                      const Icon = config.icon;
                                      return (
                                        <Badge variant="outline" className={cn('text-xs', config.color)}>
                                          <Icon className="h-3 w-3 mr-1" />
                                          {config.shortLabel}
                                        </Badge>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-muted/50 border border-dashed text-center">
                          <p className="text-sm text-muted-foreground">Tidak ada buddy ditugaskan</p>
                        </div>
                      )}

                      {/* Takeover Info */}
                      {assignment.takenOver && assignment.takenOverAt && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                          <p className="text-xs text-red-600 font-medium">Takeover oleh Buddy</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(assignment.takenOverAt), 'd MMM yyyy HH:mm', { locale: id })}
                          </p>
                          {assignment.takenOverReason && (
                            <p className="text-sm mt-1">{assignment.takenOverReason}</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenAssignDialog(shiftType, assignment)}
                        >
                          Edit Penugasan
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          disabled={deleting === assignment.id}
                        >
                          {deleting === assignment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">Belum ada penugasan</p>
                      <Button onClick={() => handleOpenAssignDialog(shiftType)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Buat Penugasan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Assign Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {existingAssignment ? 'Edit' : 'Buat'} Penugasan Shift
              </DialogTitle>
              <DialogDescription>
                {editingShift && (
                  <>
                    {SHIFT_CONFIG[editingShift].label} - {SHIFT_CONFIG[editingShift].time}
                    <br />
                    {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: id })}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Primary User */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <label className="text-sm font-medium">Primary (Penanggung Jawab)</label>
                </div>
                <select
                  value={primaryUserId}
                  onChange={(e) => setPrimaryUserId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">-- Pilih Primary --</option>
                  {primaryUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.username})
                      {user.standbyChecklistType && ` - ${CHECKLIST_TYPE_CONFIG[user.standbyChecklistType].shortLabel}`}
                    </option>
                  ))}
                </select>

                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Tipe Checklist yang Diisi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CHECKLIST_TYPE_OPTIONS.map((type) => {
                      const config = CHECKLIST_TYPE_CONFIG[type];
                      const Icon = config.icon;
                      return (
                        <Button
                          key={type}
                          type="button"
                          variant={primaryType === type ? 'default' : 'outline'}
                          className="flex-col h-auto py-2 px-2"
                          onClick={() => setPrimaryType(type)}
                        >
                          <Icon className="h-4 w-4 mb-1" />
                          <span className="text-xs">{config.shortLabel}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <hr />

              {/* Buddy User */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-blue-600" />
                  <label className="text-sm font-medium">Buddy (Backup/Takeover)</label>
                  <span className="text-xs text-muted-foreground">(opsional)</span>
                </div>
                <select
                  value={buddyUserId}
                  onChange={(e) => setBuddyUserId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">-- Tidak Ada Buddy --</option>
                  {buddyUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.username})
                      {user.standbyChecklistType && ` - ${CHECKLIST_TYPE_CONFIG[user.standbyChecklistType].shortLabel}`}
                    </option>
                  ))}
                </select>

                {buddyUserId && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Tipe Checklist Buddy</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CHECKLIST_TYPE_OPTIONS.map((type) => {
                        const config = CHECKLIST_TYPE_CONFIG[type];
                        const Icon = config.icon;
                        return (
                          <Button
                            key={type}
                            type="button"
                            variant={buddyType === type ? 'default' : 'outline'}
                            className="flex-col h-auto py-2 px-2"
                            onClick={() => setBuddyType(type)}
                          >
                            <Icon className="h-4 w-4 mb-1" />
                            <span className="text-xs">{config.shortLabel}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveAssignment} disabled={!primaryUserId || saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Simpan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
