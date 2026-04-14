'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
} from 'date-fns';
import { id } from 'date-fns/locale';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  pointerWithin,
} from '@dnd-kit/core';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  UserPlus,
  Trash2,
  RefreshCw,
  GripVertical,
  Users,
  X,
  Loader2,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type P20TShift = 'DAY' | 'NIGHT';
type P20TCategory = 'IT' | 'KKS' | 'ANTI_FRAUD';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Assignment {
  id: string;
  date: string;
  shift: P20TShift;
  category: P20TCategory;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface PoolUser {
  id: string;
  userId: string;
  user: User;
}

const CATEGORIES: { value: P20TCategory; label: string; shortLabel: string; color: string }[] = [
  { value: 'IT', label: 'IT', shortLabel: 'IT', color: 'bg-blue-500' },
  { value: 'KKS', label: 'KKS', shortLabel: 'KKS', color: 'bg-green-500' },
  { value: 'ANTI_FRAUD', label: 'Anti Fraud', shortLabel: 'AF', color: 'bg-orange-500' },
];

const SHIFT_INFO = {
  DAY: { label: 'Siang', time: '08:00-20:00', icon: Sun, color: 'text-amber-500' },
  NIGHT: { label: 'Malam', time: '20:00-08:00', icon: Moon, color: 'text-indigo-500' },
};

// Draggable User Card Component
function DraggableUser({ user, isInPool }: { user: User; isInPool?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `user-${user.id}`,
    data: { user, type: 'user' },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 p-2 rounded-md border bg-card cursor-grab active:cursor-grabbing',
        'hover:border-primary/50 hover:bg-accent transition-colors',
        isDragging && 'opacity-50',
        isInPool && 'border-primary/30'
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.name || user.email}</p>
        {user.name && (
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        )}
      </div>
    </div>
  );
}

// Droppable Calendar Slot Component
function CalendarSlot({
  date,
  shift,
  category,
  assignment,
  onRemove,
}: {
  date: Date;
  shift: P20TShift;
  category: P20TCategory;
  assignment?: Assignment;
  onRemove: (id: string) => void;
}) {
  const dropId = `slot-${format(date, 'yyyy-MM-dd')}-${shift}-${category}`;
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { date, shift, category, type: 'slot' },
  });

  const categoryInfo = CATEGORIES.find((c) => c.value === category)!;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'h-10 rounded border-2 border-dashed flex items-center justify-center text-xs transition-all',
        isOver && 'border-primary bg-primary/10 border-solid',
        assignment ? 'border-solid bg-muted/50' : 'border-muted-foreground/20'
      )}
    >
      {assignment ? (
        <div className="flex items-center gap-1 px-1 w-full">
          <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', categoryInfo.color)} />
          <span className="truncate flex-1 font-medium">
            {assignment.user.name?.split(' ')[0] || assignment.user.email.split('@')[0]}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(assignment.id);
            }}
            className="p-0.5 hover:bg-destructive/20 rounded"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      ) : (
        <span className="text-muted-foreground/50">{categoryInfo.shortLabel}</span>
      )}
    </div>
  );
}

// User Card Overlay for Drag
function UserDragOverlay({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md border bg-card shadow-lg cursor-grabbing">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{user.name || user.email}</p>
      </div>
    </div>
  );
}

export default function P20TAssignmentsPage() {
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedShift, setSelectedShift] = useState<P20TShift>('DAY');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [poolUsers, setPoolUsers] = useState<PoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [poolDialog, setPoolDialog] = useState(false);
  const [selectedPoolUsers, setSelectedPoolUsers] = useState<Set<string>>(new Set());
  const [poolSearch, setPoolSearch] = useState('');

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/v2/p20t/users');
      const data = await response.json();
      if (data.success) {
        setAllUsers(data.data);
      } else {
        console.error('Failed to fetch users:', data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchPoolUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/v2/p20t/pool');
      const data = await response.json();
      if (data.success) {
        setPoolUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching pool:', error);
      // If pool API doesn't exist yet, use all users as fallback
      setPoolUsers([]);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const response = await fetch(
        `/api/v2/p20t/assignments?startDate=${startDate}&endDate=${endDate}&shift=${selectedShift}`
      );
      const data = await response.json();
      if (data.success) {
        setAssignments(data.data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Gagal memuat data penugasan');
    } finally {
      setLoading(false);
    }
  }, [weekStart, selectedShift]);

  useEffect(() => {
    fetchAllUsers();
    fetchPoolUsers();
  }, [fetchAllUsers, fetchPoolUsers]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const getAssignment = (date: Date, shift: P20TShift, category: P20TCategory) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return assignments.find(
      (a) =>
        a.date.startsWith(dateStr) && a.shift === shift && a.category === category
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { user } = event.active.data.current as { user: User };
    setActiveUser(user);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveUser(null);
    const { active, over } = event;

    if (!over || !active.data.current || !over.data.current) return;

    const { user } = active.data.current as { user: User };
    const { date, shift, category, type } = over.data.current as {
      date: Date;
      shift: P20TShift;
      category: P20TCategory;
      type: string;
    };

    if (type !== 'slot') return;

    // Check if slot already has an assignment
    const existingAssignment = getAssignment(date, shift, category);
    if (existingAssignment) {
      toast.error('Slot ini sudah memiliki penugasan');
      return;
    }

    // Check if user already assigned to another category on this date/shift
    const dateStr = format(date, 'yyyy-MM-dd');
    const userExistingAssignment = assignments.find(
      (a) =>
        a.date.startsWith(dateStr) && a.shift === shift && a.userId === user.id
    );
    if (userExistingAssignment) {
      toast.error('User sudah ditugaskan ke kategori lain pada tanggal dan shift ini');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/v2/p20t/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          shift,
          category,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan penugasan');
      }

      toast.success('Penugasan berhasil disimpan');
      fetchAssignments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan penugasan');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!deleteDialog.id) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/v2/p20t/assignments/${deleteDialog.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Gagal menghapus penugasan');
      }

      toast.success('Penugasan berhasil dihapus');
      fetchAssignments();
    } catch (error) {
      toast.error('Gagal menghapus penugasan');
    } finally {
      setSaving(false);
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleSavePool = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/v2/p20t/pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedPoolUsers),
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan pool');
      }

      toast.success('Pool user berhasil disimpan');
      fetchPoolUsers();
      setPoolDialog(false);
    } catch (error) {
      toast.error('Gagal menyimpan pool user');
    } finally {
      setSaving(false);
    }
  };

  const openPoolDialog = async () => {
    setPoolDialog(true);
    setPoolSearch('');
    setSelectedPoolUsers(new Set(poolUsers.map((p) => p.userId)));
    // Refetch users when opening dialog to ensure fresh data
    await fetchAllUsers();
  };

  // Filter users based on search
  const filteredUsers = allUsers.filter((user) => {
    if (!poolSearch.trim()) return true;
    const search = poolSearch.toLowerCase();
    return (
      (user.name?.toLowerCase().includes(search)) ||
      user.email.toLowerCase().includes(search)
    );
  });

  // Get users to display in sidebar (only pool users - users flagged for P20T)
  const displayUsers = poolUsers.map((p) => p.user);

  const ShiftIcon = SHIFT_INFO[selectedShift].icon;

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="container mx-auto py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">P20T - Penugasan</h1>
            <p className="text-muted-foreground">
              Drag & drop user ke slot untuk assign
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={openPoolDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Kelola Pool User
            </Button>
            <Button variant="outline" size="icon" onClick={fetchAssignments}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* User Pool Sidebar */}
          <Card className="w-64 flex-shrink-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Pool User
                </CardTitle>
                <Badge variant="secondary">{displayUsers.length}</Badge>
              </div>
              <CardDescription>Drag user ke kalender</CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2 p-2">
                  {displayUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Belum ada user P20T</p>
                      <p className="text-xs mt-1">Klik tombol di atas untuk menambahkan user yang dapat ditugaskan</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={openPoolDialog}
                        className="mt-2"
                      >
                        Kelola Pool User
                      </Button>
                    </div>
                  ) : (
                    displayUsers.map((user) => (
                      <DraggableUser key={user.id} user={user} isInPool />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Calendar Area */}
          <div className="flex-1 space-y-4">
            {/* Navigation & Shift Toggle */}
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  {/* Week Navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center min-w-[200px]">
                      <p className="font-medium">
                        {format(weekStart, 'd MMM', { locale: id })} -{' '}
                        {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: id })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    >
                      Minggu Ini
                    </Button>
                  </div>

                  {/* Shift Toggle */}
                  <Tabs
                    value={selectedShift}
                    onValueChange={(v) => setSelectedShift(v as P20TShift)}
                  >
                    <TabsList>
                      <TabsTrigger value="DAY" className="gap-2">
                        <Sun className="h-4 w-4" />
                        Siang
                      </TabsTrigger>
                      <TabsTrigger value="NIGHT" className="gap-2">
                        <Moon className="h-4 w-4" />
                        Malam
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Grid */}
            <Card>
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Header Row */}
                    <div className="grid grid-cols-8 gap-2">
                      <div className="text-xs font-medium text-muted-foreground flex items-center">
                        <ShiftIcon className={cn('h-4 w-4 mr-1', SHIFT_INFO[selectedShift].color)} />
                        {SHIFT_INFO[selectedShift].time}
                      </div>
                      {weekDays.map((day) => (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            'text-center p-2 rounded-md',
                            isToday(day) && 'bg-primary/10 ring-1 ring-primary'
                          )}
                        >
                          <p className="text-xs text-muted-foreground">
                            {format(day, 'EEE', { locale: id })}
                          </p>
                          <p className={cn('text-lg font-bold', isToday(day) && 'text-primary')}>
                            {format(day, 'd')}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Category Rows */}
                    {CATEGORIES.map((category) => (
                      <div key={category.value} className="grid grid-cols-8 gap-2 items-center">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', category.color)} />
                          <span className="text-xs font-medium">{category.label}</span>
                        </div>
                        {weekDays.map((day) => (
                          <CalendarSlot
                            key={`${day.toISOString()}-${category.value}`}
                            date={day}
                            shift={selectedShift}
                            category={category.value}
                            assignment={getAssignment(day, selectedShift, category.value)}
                            onRemove={(id) => setDeleteDialog({ open: true, id })}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Kategori:</span>
              {CATEGORIES.map((cat) => (
                <div key={cat.value} className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', cat.color)} />
                  <span>{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeUser && <UserDragOverlay user={activeUser} />}
      </DragOverlay>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: open ? deleteDialog.id : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Penugasan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus penugasan ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAssignment}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pool User Dialog */}
      <Dialog open={poolDialog} onOpenChange={setPoolDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kelola Pool User P20T</DialogTitle>
            <DialogDescription>
              Pilih user yang tersedia untuk penugasan shift P20T
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email..."
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[400px]">
            {loadingUsers ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Users className="h-12 w-12 mb-2 opacity-50" />
                <p>{poolSearch ? 'Tidak ditemukan' : 'Tidak ada user tersedia'}</p>
              </div>
            ) : (
              <div className="space-y-1 pr-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"
                  >
                    <Checkbox
                      id={`pool-${user.id}`}
                      checked={selectedPoolUsers.has(user.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedPoolUsers);
                        if (checked) {
                          newSet.add(user.id);
                        } else {
                          newSet.delete(user.id);
                        }
                        setSelectedPoolUsers(newSet);
                      }}
                    />
                    <label
                      htmlFor={`pool-${user.id}`}
                      className="flex-1 cursor-pointer min-w-0"
                    >
                      <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                      {user.name && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                    </label>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {user.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="text-sm text-muted-foreground mr-auto">
              {selectedPoolUsers.size} user dipilih
            </div>
            <Button variant="outline" onClick={() => setPoolDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSavePool} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
