'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  UserPlus,
  UserMinus,
  Calendar,
  Server,
  Monitor,
  Sun,
  Moon,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ChecklistUnit = 'IT_OPERATIONS' | 'MONITORING';
type ChecklistShiftType = 'HARIAN_KANTOR' | 'STANDBY_LEMBUR' | 'SHIFT_MALAM' | 'SHIFT_SIANG_WEEKEND';
type ChecklistRole = 'STAFF' | 'SUPERVISOR';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface Assignment {
  id: string;
  userId: string;
  role: ChecklistRole;
  assignedAt: string;
  user: User;
}

interface ChecklistWithAssignments {
  id: string;
  date: string;
  unit: ChecklistUnit;
  shiftType: ChecklistShiftType;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  assignments: Assignment[];
  stats: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  staffCount: number;
  hasSupervisor: boolean;
}

const UNIT_CONFIG: Record<ChecklistUnit, { label: string; icon: typeof Server; color: string }> = {
  IT_OPERATIONS: { label: 'IT Operations', icon: Server, color: 'text-blue-600' },
  MONITORING: { label: 'Monitoring', icon: Monitor, color: 'text-purple-600' },
};

const SHIFT_CONFIG: Record<ChecklistShiftType, { label: string; icon: typeof Sun; time: string }> = {
  HARIAN_KANTOR: { label: 'Harian Kantor', icon: Sun, time: '08:00 - 17:00' },
  STANDBY_LEMBUR: { label: 'Standby Lembur', icon: Clock, time: '17:00 - 20:00' },
  SHIFT_MALAM: { label: 'Shift Malam', icon: Moon, time: '20:00 - 08:00' },
  SHIFT_SIANG_WEEKEND: { label: 'Shift Siang Weekend', icon: Sun, time: '08:00 - 20:00' },
};

const UNIT_OPTIONS: ChecklistUnit[] = ['IT_OPERATIONS', 'MONITORING'];
const SHIFT_OPTIONS: ChecklistShiftType[] = ['HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_MALAM', 'SHIFT_SIANG_WEEKEND'];

export default function ChecklistAssignmentsPage() {
  const { data: session, status } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterUnit, setFilterUnit] = useState<ChecklistUnit | ''>('');
  const [filterShift, setFilterShift] = useState<ChecklistShiftType | ''>('');
  const [checklists, setChecklists] = useState<ChecklistWithAssignments[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    checklistId?: string;
    unit: ChecklistUnit;
    shiftType: ChecklistShiftType;
    date: string;
  } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ChecklistRole>('STAFF');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchChecklists = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams({ date: selectedDate });
      if (filterUnit) params.append('unit', filterUnit);
      if (filterShift) params.append('shiftType', filterShift);

      const response = await fetch(`/api/v2/checklist/admin/assignments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setChecklists(data.checklists || []);
      } else {
        toast.error('Gagal memuat data');
      }
    } catch (error) {
      console.error('Error fetching checklists:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, filterUnit, filterShift]);

  const fetchUsers = async (forUnit?: ChecklistUnit) => {
    try {
      const params = new URLSearchParams({ getUsers: 'true' });
      if (forUnit) params.append('forUnit', forUnit);

      const response = await fetch(`/api/v2/checklist/admin/assignments?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchChecklists();
    }
  }, [session, fetchChecklists]);

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    const newDate = days > 0 ? addDays(date, days) : subDays(date, Math.abs(days));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const handleOpenAssignDialog = (
    unit: ChecklistUnit,
    shiftType: ChecklistShiftType,
    checklistId?: string
  ) => {
    setAssignTarget({ unit, shiftType, date: selectedDate, checklistId });
    setSelectedUserId('');
    setSelectedRole('STAFF');
    fetchUsers(unit); // Fetch users for this specific unit
    setShowAssignDialog(true);
  };

  const handleAssign = async () => {
    if (!assignTarget || !selectedUserId) {
      toast.error('Pilih user terlebih dahulu');
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch('/api/v2/checklist/admin/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: assignTarget.date,
          unit: assignTarget.unit,
          shiftType: assignTarget.shiftType,
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign');
      }

      toast.success(data.message);
      setShowAssignDialog(false);
      fetchChecklists(false);
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menugaskan user');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, userName: string) => {
    if (!confirm(`Hapus penugasan ${userName}?`)) return;

    setRemoving(assignmentId);
    try {
      const response = await fetch(`/api/v2/checklist/admin/assignments?assignmentId=${assignmentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove');
      }

      toast.success(data.message);
      fetchChecklists(false);
    } catch (error) {
      console.error('Error removing:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus penugasan');
    } finally {
      setRemoving(null);
    }
  };

  // Get checklist for specific unit/shift or create placeholder
  const getChecklistForSlot = (unit: ChecklistUnit, shiftType: ChecklistShiftType) => {
    return checklists.find((c) => c.unit === unit && c.shiftType === shiftType);
  };

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
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Penugasan Checklist</h1>
              <p className="text-sm text-muted-foreground">
                Kelola penugasan Staff dan Supervisor untuk checklist harian
              </p>
            </div>
          </div>
        </div>

        {/* Date Navigation & Filters */}
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

              <div className="flex items-center gap-2">
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value as ChecklistUnit | '')}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">Semua Unit</option>
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {UNIT_CONFIG[unit].label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value as ChecklistShiftType | '')}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">Semua Shift</option>
                  {SHIFT_OPTIONS.map((shift) => (
                    <option key={shift} value={shift}>
                      {SHIFT_CONFIG[shift].label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchChecklists(false)}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold">
            {format(new Date(selectedDate), 'EEEE, d MMMM yyyy', { locale: id })}
          </h2>
        </div>

        {/* Checklist Grid */}
        <div className="space-y-6">
          {UNIT_OPTIONS.filter((unit) => !filterUnit || unit === filterUnit).map((unit) => (
            <Card key={unit}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = UNIT_CONFIG[unit].icon;
                    return <Icon className={cn('h-5 w-5', UNIT_CONFIG[unit].color)} />;
                  })()}
                  <CardTitle>{UNIT_CONFIG[unit].label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {SHIFT_OPTIONS.filter((shift) => !filterShift || shift === filterShift).map(
                    (shiftType) => {
                      const checklist = getChecklistForSlot(unit, shiftType);
                      const ShiftIcon = SHIFT_CONFIG[shiftType].icon;

                      return (
                        <Card key={shiftType} className="border-2">
                          <CardHeader className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ShiftIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">
                                    {SHIFT_CONFIG[shiftType].label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {SHIFT_CONFIG[shiftType].time}
                                  </p>
                                </div>
                              </div>
                              {checklist && (
                                <Badge
                                  variant={
                                    checklist.status === 'COMPLETED'
                                      ? 'default'
                                      : checklist.status === 'IN_PROGRESS'
                                        ? 'secondary'
                                        : 'outline'
                                  }
                                  className={cn(
                                    checklist.status === 'COMPLETED' &&
                                      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  )}
                                >
                                  {checklist.status === 'COMPLETED' && (
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                  )}
                                  {checklist.stats.completed}/{checklist.stats.total}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="py-3 px-4 space-y-3">
                            {/* Progress */}
                            {checklist && checklist.stats.total > 0 && (
                              <Progress
                                value={(checklist.stats.completed / checklist.stats.total) * 100}
                                className="h-1.5"
                              />
                            )}

                            {/* Assignments */}
                            <div className="space-y-2">
                              {checklist?.assignments.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className={cn(
                                    'flex items-center justify-between p-2 rounded-md',
                                    assignment.role === 'SUPERVISOR'
                                      ? 'bg-blue-50 dark:bg-blue-950/30'
                                      : 'bg-muted/50'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={
                                        assignment.role === 'SUPERVISOR' ? 'default' : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {assignment.role === 'SUPERVISOR' ? 'SPV' : 'Staff'}
                                    </Badge>
                                    <span className="text-sm font-medium">
                                      {assignment.user.name}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                                    onClick={() =>
                                      handleRemoveAssignment(assignment.id, assignment.user.name)
                                    }
                                    disabled={removing === assignment.id}
                                  >
                                    {removing === assignment.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <UserMinus className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              ))}

                              {/* Empty state or add button */}
                              {(!checklist || checklist.assignments.length === 0) && (
                                <p className="text-sm text-muted-foreground text-center py-2">
                                  Belum ada yang ditugaskan
                                </p>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() =>
                                  handleOpenAssignDialog(unit, shiftType, checklist?.id)
                                }
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Tambah Penugasan
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Assign Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Tambah Penugasan
              </DialogTitle>
              <DialogDescription>
                {assignTarget && (
                  <>
                    {UNIT_CONFIG[assignTarget.unit].label} -{' '}
                    {SHIFT_CONFIG[assignTarget.shiftType].label}
                    <br />
                    {format(new Date(assignTarget.date), 'EEEE, d MMMM yyyy', { locale: id })}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Pilih User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background"
                >
                  <option value="">-- Pilih User --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.username}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Role</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedRole === 'STAFF' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedRole('STAFF')}
                  >
                    Staff
                  </Button>
                  <Button
                    type="button"
                    variant={selectedRole === 'SUPERVISOR' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedRole('SUPERVISOR')}
                  >
                    Supervisor
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleAssign} disabled={!selectedUserId || assigning}>
                {assigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Tugaskan
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
