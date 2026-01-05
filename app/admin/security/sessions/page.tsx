'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import {
  LogOut,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  AlertTriangle,
  Wifi,
  XCircle
} from 'lucide-react';
import Link from 'next/link';

interface Session {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    branch: { name: string; code: string } | null;
  };
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: {
    browser: string;
    os: string;
    deviceType: string;
  };
  location: string | null;
  loginAt: string;
  logoutAt: string | null;
  isActive: boolean;
  isNewDevice: boolean;
  logoutReason: string | null;
  duration: number;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  newDeviceLogins24h: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchSessions();
  }, [page, activeOnly]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        activeOnly: activeOnly.toString()
      });

      const response = await fetch(`/api/admin/sessions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');

      const data = await response.json();
      setSessions(data.sessions);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Gagal memuat data session');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      setActionLoading(sessionId);
      const response = await fetch(`/api/admin/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to end session');

      const result = await response.json();
      toast.success(result.message);
      fetchSessions();
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Gagal mengakhiri session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndAllSessions = async (userId: string, userName: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/sessions?userId=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to end sessions');

      const result = await response.json();
      toast.success(`${result.endedCount} session ${userName} berhasil diakhiri`);
      fetchSessions();
    } catch (error) {
      console.error('Error ending sessions:', error);
      toast.error('Gagal mengakhiri semua session');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} menit`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}j ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}h ${hours % 24}j`;
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/security" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Kembali ke Security Dashboard
          </Link>
          <PageHeader
            title="Session Management"
            description="Monitor dan kelola sesi pengguna yang aktif"
            icon={<LogOut className="h-6 w-6" />}
          />
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Wifi className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ended Sessions</CardTitle>
                <XCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Devices (24h)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.newDeviceLogins24h}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active-only"
                  checked={activeOnly}
                  onCheckedChange={setActiveOnly}
                />
                <Label htmlFor="active-only">Tampilkan session aktif saja</Label>
              </div>
              <Button variant="outline" onClick={fetchSessions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Daftar Session</CardTitle>
                <CardDescription>
                  Kelola sesi login pengguna
                </CardDescription>
              </div>
              {pagination && (
                <Badge variant="secondary">
                  {pagination.total} total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <LogOut className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">
                  Tidak ada session {activeOnly ? 'aktif' : ''} yang ditemukan
                </p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Login</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{session.user.name}</div>
                              <div className="text-xs text-muted-foreground">{session.user.email}</div>
                              <Badge variant="outline" className="text-xs mt-1">
                                {session.user.role}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(session.deviceInfo.deviceType)}
                              <div>
                                <div className="text-sm">{session.deviceInfo.browser}</div>
                                <div className="text-xs text-muted-foreground">{session.deviceInfo.os}</div>
                              </div>
                            </div>
                            {session.isNewDevice && (
                              <Badge variant="outline" className="text-xs mt-1 text-orange-600 border-orange-600">
                                New Device
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {session.ipAddress || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(session.loginAt).toLocaleString('id-ID')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatDuration(session.duration)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {session.isActive ? (
                              <Badge className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                            ) : (
                              <div>
                                <Badge variant="secondary">Ended</Badge>
                                {session.logoutReason && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {session.logoutReason}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {session.isActive && (
                              <div className="flex gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={actionLoading === session.id}
                                    >
                                      {actionLoading === session.id ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <XCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Akhiri Session</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Apakah Anda yakin ingin mengakhiri session untuk {session.user.name}?
                                        User tersebut akan logout dari perangkat ini.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleEndSession(session.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Akhiri Session
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive"
                                      disabled={actionLoading === session.user.id}
                                    >
                                      {actionLoading === session.user.id ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <LogOut className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Akhiri Semua Session</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Apakah Anda yakin ingin mengakhiri SEMUA session untuk {session.user.name}?
                                        User tersebut akan logout dari semua perangkat.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Batal</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleEndAllSessions(session.user.id, session.user.name)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Akhiri Semua Session
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Halaman {pagination.page} dari {pagination.pages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= pagination.pages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
