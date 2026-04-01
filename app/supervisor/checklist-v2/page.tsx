'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SupervisorDashboard, ChecklistPanelV2 } from '@/components/checklist';
import {
  Users,
  Monitor,
  Server,
  Sun,
  Moon,
  Clock,
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

type ChecklistUnit = 'IT_OPERATIONS' | 'MONITORING';
type ChecklistShiftType = 'HARIAN_KANTOR' | 'STANDBY_LEMBUR' | 'SHIFT_MALAM' | 'SHIFT_SIANG_WEEKEND';

const UNIT_CONFIG = {
  IT_OPERATIONS: {
    label: 'IT Operations',
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  MONITORING: {
    label: 'Monitoring',
    icon: Monitor,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
  },
};

const SHIFT_CONFIG: Record<ChecklistShiftType, { label: string; icon: typeof Sun; time: string }> = {
  HARIAN_KANTOR: { label: 'Harian Kantor', icon: Sun, time: '08:00 - 17:00' },
  STANDBY_LEMBUR: { label: 'Standby Lembur', icon: Clock, time: '17:00 - 20:00' },
  SHIFT_MALAM: { label: 'Shift Malam', icon: Moon, time: '20:00 - 08:00' },
  SHIFT_SIANG_WEEKEND: { label: 'Shift Siang Weekend', icon: Sun, time: '08:00 - 20:00' },
};

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

export default function SupervisorChecklistPage() {
  const { data: session, status } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUnit, setSelectedUnit] = useState<ChecklistUnit>('IT_OPERATIONS');
  const [selectedShift, setSelectedShift] = useState<ChecklistShiftType>('HARIAN_KANTOR');
  const [viewingChecklistId, setViewingChecklistId] = useState<string | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      setLoading(false);
    }
  }, [session]);

  const handleDateChange = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/v2/checklist/assign?getAvailable=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleOpenAssignDialog = () => {
    fetchAvailableUsers();
    setShowAssignDialog(true);
  };

  const handleAssignUser = async (role: 'STAFF' | 'SUPERVISOR') => {
    if (!selectedUserId) {
      toast.error('Pilih user terlebih dahulu');
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch('/api/v2/checklist/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit: selectedUnit,
          shiftType: selectedShift,
          date: selectedDate,
          userId: selectedUserId,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign user');
      }

      toast.success(`User berhasil ditugaskan sebagai ${role}`);
      setShowAssignDialog(false);
      setSelectedUserId('');
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menugaskan user');
    } finally {
      setAssigning(false);
    }
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

  // Check if user has supervisor/manager role
  const allowedRoles = ['SUPERVISOR', 'MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.user.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-muted-foreground">
            Halaman ini hanya dapat diakses oleh Supervisor atau Manager.
          </p>
        </div>
      </div>
    );
  }

  const UnitIcon = UNIT_CONFIG[selectedUnit].icon;

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
              <h1 className="text-2xl font-semibold tracking-tight">Supervisor Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Pantau progress checklist tim Anda
              </p>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDateChange(-1)}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
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
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleOpenAssignDialog}>
                <UserPlus className="h-4 w-4 mr-2" />
                Tugaskan Staff
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
          </div>
        </div>

        {/* Unit Selection Tabs */}
        <Tabs
          value={selectedUnit}
          onValueChange={(v) => setSelectedUnit(v as ChecklistUnit)}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            {Object.entries(UNIT_CONFIG).map(([unit, config]) => {
              const Icon = config.icon;
              return (
                <TabsTrigger key={unit} value={unit} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {config.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Shift Selection */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3">Pilih Shift</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(SHIFT_CONFIG).map(([shift, config]) => {
              const Icon = config.icon;
              const isSelected = selectedShift === shift;

              return (
                <Button
                  key={shift}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`justify-start h-auto py-3 ${isSelected ? '' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectedShift(shift as ChecklistShiftType)}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs opacity-70">{config.time}</p>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Supervisor Dashboard */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${UNIT_CONFIG[selectedUnit].bgColor}`}>
                <UnitIcon className={`h-5 w-5 ${UNIT_CONFIG[selectedUnit].color}`} />
              </div>
              <div>
                <CardTitle>{UNIT_CONFIG[selectedUnit].label}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {SHIFT_CONFIG[selectedShift].label} • {SHIFT_CONFIG[selectedShift].time}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SupervisorDashboard
              unit={selectedUnit}
              shiftType={selectedShift}
              date={selectedDate}
              onViewChecklist={(checklistId) => setViewingChecklistId(checklistId)}
            />
          </CardContent>
        </Card>

        {/* View Checklist Dialog */}
        <Dialog open={!!viewingChecklistId} onOpenChange={() => setViewingChecklistId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detail Checklist
              </DialogTitle>
              <DialogDescription>
                Melihat detail checklist staff
              </DialogDescription>
            </DialogHeader>
            {viewingChecklistId && (
              <ChecklistPanelV2 unit={selectedUnit} shiftType={selectedShift} />
            )}
          </DialogContent>
        </Dialog>

        {/* Assign User Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Tugaskan Staff
              </DialogTitle>
              <DialogDescription>
                Pilih user untuk ditugaskan ke checklist {UNIT_CONFIG[selectedUnit].label} -{' '}
                {SHIFT_CONFIG[selectedShift].label}
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
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => handleAssignUser('STAFF')}
                  disabled={!selectedUserId || assigning}
                  className="flex-1"
                >
                  Tugaskan sebagai Staff
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleAssignUser('SUPERVISOR')}
                  disabled={!selectedUserId || assigning}
                  className="flex-1"
                >
                  Tugaskan sebagai Supervisor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
