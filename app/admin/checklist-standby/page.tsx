'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
  Shield,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  UserCheck,
  UserCog,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ChecklistType = 'IT_INFRASTRUKTUR' | 'KEAMANAN_SIBER' | 'FRAUD_COMPLIANCE';

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  checklistType?: ChecklistType;
}

interface StandbyUser {
  id: string;
  userId: string;
  checklistType: ChecklistType;
  canBePrimary: boolean;
  canBeBuddy: boolean;
  isActive: boolean;
  addedAt: string;
  user: User;
  addedBy: { name: string };
}

const CHECKLIST_TYPE_CONFIG: Record<ChecklistType, { label: string; shortLabel: string; icon: typeof Server; color: string; bgColor: string; borderColor: string }> = {
  IT_INFRASTRUKTUR: {
    label: 'IT & Infrastruktur',
    shortLabel: 'IT',
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-l-blue-500',
  },
  KEAMANAN_SIBER: {
    label: 'Keamanan Siber (KKS)',
    shortLabel: 'KKS',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-l-red-500',
  },
  FRAUD_COMPLIANCE: {
    label: 'Fraud & Compliance',
    shortLabel: 'Fraud',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-l-amber-500',
  },
};

export default function ChecklistStandbyPage() {
  const { data: session, status } = useSession();
  const [standbyUsers, setStandbyUsers] = useState<StandbyUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<ChecklistType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedType, setSelectedType] = useState<ChecklistType>('IT_INFRASTRUKTUR');
  const [canBePrimary, setCanBePrimary] = useState(true);
  const [canBeBuddy, setCanBeBuddy] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchStandbyUsers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      const params = new URLSearchParams();
      if (filterType) params.append('checklistType', filterType);

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
  }, [filterType]);

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
    setSelectedType('IT_INFRASTRUKTUR');
    setCanBePrimary(true);
    setCanBeBuddy(true);
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
          checklistType: selectedType,
          canBePrimary,
          canBeBuddy,
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
              <h1 className="text-2xl font-semibold tracking-tight">Staff Standby Pool</h1>
              <p className="text-sm text-muted-foreground">
                Kelola daftar staff yang tersedia untuk ditugaskan ke checklist (Primary/Buddy)
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
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as ChecklistType | '')}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">Semua Tipe</option>
                  <option value="IT_INFRASTRUKTUR">IT & Infrastruktur</option>
                  <option value="KEAMANAN_SIBER">Keamanan Siber</option>
                  <option value="FRAUD_COMPLIANCE">Fraud & Compliance</option>
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
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {(['IT_INFRASTRUKTUR', 'KEAMANAN_SIBER', 'FRAUD_COMPLIANCE'] as ChecklistType[]).map((type) => {
            const config = CHECKLIST_TYPE_CONFIG[type];
            const Icon = config.icon;
            const typeUsers = standbyUsers.filter((s) => s.checklistType === type && s.isActive);
            const primaryCount = typeUsers.filter(s => s.canBePrimary).length;
            const buddyCount = typeUsers.filter(s => s.canBeBuddy).length;

            return (
              <Card key={type} className={cn('border-l-4', config.borderColor)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg', config.bgColor)}>
                        <Icon className={cn('h-5 w-5', config.color)} />
                      </div>
                      <div>
                        <p className="font-medium">{config.shortLabel}</p>
                        <p className="text-xs text-muted-foreground">{config.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{typeUsers.length}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="text-green-600">{primaryCount} Primary</span>
                        {' / '}
                        <span className="text-blue-600">{buddyCount} Buddy</span>
                      </div>
                    </div>
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
              Staff yang terdaftar dapat ditugaskan sebagai Primary atau Buddy per shift
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
                    <TableHead>Tipe Checklist</TableHead>
                    <TableHead>Kemampuan</TableHead>
                    <TableHead>Ditambahkan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStandbyUsers.map((standby) => {
                    const typeConfig = CHECKLIST_TYPE_CONFIG[standby.checklistType];
                    const TypeIcon = typeConfig.icon;

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
                            <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
                            <span className="text-sm">{typeConfig.shortLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {standby.canBePrimary && (
                              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                            {standby.canBeBuddy && (
                              <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                                <UserCog className="h-3 w-3 mr-1" />
                                Buddy
                              </Badge>
                            )}
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Tambah Staff Standby
              </DialogTitle>
              <DialogDescription>
                Pilih user dan tipe checklist untuk ditambahkan ke standby pool
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
                <label className="text-sm font-medium mb-2 block">Tipe Checklist</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['IT_INFRASTRUKTUR', 'KEAMANAN_SIBER', 'FRAUD_COMPLIANCE'] as ChecklistType[]).map((type) => {
                    const config = CHECKLIST_TYPE_CONFIG[type];
                    const Icon = config.icon;
                    return (
                      <Button
                        key={type}
                        type="button"
                        variant={selectedType === type ? 'default' : 'outline'}
                        className="flex-col h-auto py-3 px-2"
                        onClick={() => setSelectedType(type)}
                      >
                        <Icon className="h-5 w-5 mb-1" />
                        <span className="text-xs">{config.shortLabel}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Kemampuan</label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canBePrimary"
                      checked={canBePrimary}
                      onCheckedChange={(checked) => setCanBePrimary(checked as boolean)}
                    />
                    <label htmlFor="canBePrimary" className="text-sm flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      Dapat menjadi Primary (penanggung jawab utama)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canBeBuddy"
                      checked={canBeBuddy}
                      onCheckedChange={(checked) => setCanBeBuddy(checked as boolean)}
                    />
                    <label htmlFor="canBeBuddy" className="text-sm flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-blue-600" />
                      Dapat menjadi Buddy (backup/takeover)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleAdd} disabled={!selectedUserId || adding || (!canBePrimary && !canBeBuddy)}>
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
