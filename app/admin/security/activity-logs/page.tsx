'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import {
  History,
  Download,
  FileSpreadsheet,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  User,
  Activity,
  FileText
} from 'lucide-react';
import Link from 'next/link';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    branch: { name: string; code: string } | null;
  } | null;
}

interface Stats {
  total: number;
  actionStats: { action: string; count: number }[];
  entityStats: { entity: string; count: number }[];
  activeUsers: { user: any; count: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const actionColors: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-800',
  LOGOUT: 'bg-blue-100 text-blue-800',
  LOGIN_FAILED: 'bg-red-100 text-red-800',
  CREATE: 'bg-purple-100 text-purple-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  PASSWORD_CHANGE: 'bg-orange-100 text-orange-800',
  PASSWORD_RESET: 'bg-orange-100 text-orange-800',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [days, setDays] = useState('7');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [page, action, entity, days]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        days,
        ...(action && { action }),
        ...(entity && { entity }),
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/activity-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');

      const data = await response.json();
      setLogs(data.logs);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Gagal memuat activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(format);
      const params = new URLSearchParams({
        export: format,
        days,
        ...(action && { action }),
        ...(entity && { entity }),
        ...(search && { search })
      });

      const response = await fetch(`/api/admin/activity-logs?${params}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Activity logs berhasil diexport ke ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Gagal export activity logs');
    } finally {
      setExporting(null);
    }
  };

  const getActionBadgeClass = (actionType: string) => {
    for (const [key, value] of Object.entries(actionColors)) {
      if (actionType.includes(key)) return value;
    }
    return 'bg-gray-100 text-gray-800';
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
            title="Activity Logs"
            description="Monitor semua aktivitas sistem dan pengguna"
            icon={<History className="h-6 w-6" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pencarian</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Cari user, action..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button size="icon" onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Periode</Label>
                  <Select value={days} onValueChange={setDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Hari</SelectItem>
                      <SelectItem value="7">7 Hari</SelectItem>
                      <SelectItem value="14">14 Hari</SelectItem>
                      <SelectItem value="30">30 Hari</SelectItem>
                      <SelectItem value="90">90 Hari</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Entity</Label>
                  <Select value={entity} onValueChange={setEntity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Semua Entity</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="TICKET">Ticket</SelectItem>
                      <SelectItem value="SERVICE">Service</SelectItem>
                      <SelectItem value="BRANCH">Branch</SelectItem>
                      <SelectItem value="SESSION">Session</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSearch('');
                    setAction('');
                    setEntity('');
                    setDays('7');
                    setPage(1);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Filter
                </Button>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleExport('csv')}
                  disabled={exporting === 'csv'}
                  className="w-full justify-start"
                >
                  {exporting === 'csv' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Export ke CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('xlsx')}
                  disabled={exporting === 'xlsx'}
                  className="w-full justify-start"
                >
                  {exporting === 'xlsx' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Export ke Excel
                </Button>
              </CardContent>
            </Card>

            {/* Statistics */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Statistik
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Log</p>
                    <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Top Actions</p>
                    <div className="space-y-1">
                      {stats.actionStats.slice(0, 5).map((stat) => (
                        <div key={stat.action} className="flex justify-between text-sm">
                          <span className="truncate">{stat.action}</span>
                          <span className="font-medium">{stat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Top Entities</p>
                    <div className="space-y-1">
                      {stats.entityStats.slice(0, 5).map((stat) => (
                        <div key={stat.entity} className="flex justify-between text-sm">
                          <span>{stat.entity}</span>
                          <span className="font-medium">{stat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Logs Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Log Aktivitas</CardTitle>
                  {pagination && (
                    <Badge variant="secondary">
                      {pagination.total.toLocaleString()} total
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      Tidak ada activity log untuk filter yang dipilih
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Waktu</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>IP Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('id-ID')}
                              </TableCell>
                              <TableCell>
                                {log.user ? (
                                  <div>
                                    <div className="font-medium">{log.user.name}</div>
                                    <div className="text-xs text-muted-foreground">{log.user.email}</div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">System</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={getActionBadgeClass(log.action)}>
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div>{log.entity}</div>
                                  {log.entityId && (
                                    <div className="text-xs text-muted-foreground font-mono">
                                      {log.entityId.substring(0, 8)}...
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {log.ipAddress || '-'}
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
      </div>
    </div>
  );
}
