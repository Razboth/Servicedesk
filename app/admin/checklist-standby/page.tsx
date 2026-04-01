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
  Server,
  Monitor,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ChecklistUnit = 'IT_OPERATIONS' | 'MONITORING';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface StandbyUser {
  id: string;
  userId: string;
  unit: ChecklistUnit;
  isActive: boolean;
  addedAt: string;
  user: User;
  addedBy: { name: string };
}

const UNIT_CONFIG: Record<ChecklistUnit, { label: string; icon: typeof Server; color: string; bgColor: string }> = {
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

export default function ChecklistStandbyPage() {
  const { data: session, status } = useSession();
  const [standbyUsers, setStandbyUsers] = useState<StandbyUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterUnit, setFilterUnit] = useState<ChecklistUnit | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<ChecklistUnit>('IT_OPERATIONS');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchStandbyUsers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      if (filterUnit) params.append('unit', filterUnit);

      const response = await fetch(`/api/v2/checklist/admin/standby?${params}`);
      if (response.ok) {
        const data = await response.json();
        setStandbyUsers(data.standbyUsers || []);
      } else {
        toast.error('Gagal memuat data');
      }
    } catch (error) {
      console.error('Error fetching standby users:', error);
      toast.error('Error loading data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterUnit]);

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/v2/checklist/admin/standby?getAvailable=true');
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchStandbyUsers();
    }
  }, [session, fetchStandbyUsers]);

  const handleOpenAddDialog = () => {
    fetchAvailableUsers();
    setSelectedUserId('');
    setSelectedUnit('IT_OPERATIONS');
    setShowAddDialog(true);
  };

  const handleAdd = async () => {
    if (!selectedUserId) {
      toast.error('Pilih user terlebih dahulu');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/v2/checklist/admin/standby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          unit: selectedUnit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add');
      }

      toast.success(data.message);
      setShowAddDialog(false);
      fetchStandbyUsers(false);
    } catch (error) {
      console.error('Error adding:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menambahkan user');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (standbyId: string, userName: string) => {
    if (!confirm(`Hapus ${userName} dari daftar standby?`)) return;

    setRemoving(standbyId);
    try {
      const response = await fetch(`/api/v2/checklist/admin/standby?id=${standbyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove');
      }

      toast.success(data.message);
      fetchStandbyUsers(false);
    } catch (error) {
      console.error('Error removing:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus');
    } finally {
      setRemoving(null);
    }
  };

  // Filter standby users by search query
  const filteredStandbyUsers = standbyUsers.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.user.name.toLowerCase().includes(query) ||
      s.user.username.toLowerCase().includes(query)
    );
  });

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

  const allowedRoles = ['MANAGER_IT', 'ADMIN'];
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
              <h1 className="text-2xl font-semibold tracking-tight">Staff Standby</h1>
              <p className="text-sm text-muted-foreground">
                Kelola daftar staff yang tersedia untuk ditugaskan ke checklist
              </p>
            </div>
          </div>
        </div>

        {/* Actions & Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cari nama atau username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-3 rounded-md border bg-background text-sm w-64"
                  />
                </div>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value as ChecklistUnit | '')}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">Semua Unit</option>
                  <option value="IT_OPERATIONS">IT Operations</option>
                  <option value="MONITORING">Monitoring</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchStandbyUsers(false)}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                </Button>
                <Button onClick={handleOpenAddDialog}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Tambah Staff Standby
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {(['IT_OPERATIONS', 'MONITORING'] as ChecklistUnit[]).map((unit) => {
            const config = UNIT_CONFIG[unit];
            const Icon = config.icon;
            const count = standbyUsers.filter((s) => s.unit === unit && s.isActive).length;

            return (
              <Card key={unit} className={cn('border-l-4', unit === 'IT_OPERATIONS' ? 'border-l-blue-500' : 'border-l-purple-500')}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg', config.bgColor)}>
                        <Icon className={cn('h-5 w-5', config.color)} />
                      </div>
                      <div>
                        <p className="font-medium">{config.label}</p>
                        <p className="text-sm text-muted-foreground">Staff Standby</p>
                      </div>
                    </div>
                    <div className="text-3xl font-bold">{count}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Standby Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Staff Standby</CardTitle>
            <CardDescription>
              Staff yang terdaftar di sini dapat ditugaskan ke checklist harian
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredStandbyUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Belum ada staff standby</p>
                <p className="text-muted-foreground mb-4">
                  Tambahkan staff untuk mulai membuat penugasan checklist
                </p>
                <Button onClick={handleOpenAddDialog}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Tambah Staff Standby
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Ditambahkan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStandbyUsers.map((standby) => {
                    const unitConfig = UNIT_CONFIG[standby.unit];
                    const UnitIcon = unitConfig.icon;

                    return (
                      <TableRow key={standby.id}>
                        <TableCell className="font-medium">{standby.user.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {standby.user.username}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{standby.user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UnitIcon className={cn('h-4 w-4', unitConfig.color)} />
                            <span className="text-sm">{unitConfig.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(standby.addedAt), 'd MMM yyyy', { locale: id })}
                          <br />
                          <span className="text-xs">oleh {standby.addedBy.name}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => handleRemove(standby.id, standby.user.name)}
                            disabled={removing === standby.id}
                          >
                            {removing === standby.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Tambah Staff Standby
              </DialogTitle>
              <DialogDescription>
                Pilih user dan unit untuk ditambahkan ke daftar standby
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
                      {user.name} ({user.username}) - {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Unit</label>
                <div className="flex gap-2">
                  {(['IT_OPERATIONS', 'MONITORING'] as ChecklistUnit[]).map((unit) => {
                    const config = UNIT_CONFIG[unit];
                    const Icon = config.icon;
                    return (
                      <Button
                        key={unit}
                        type="button"
                        variant={selectedUnit === unit ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setSelectedUnit(unit)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleAdd} disabled={!selectedUserId || adding}>
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Tambahkan
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
