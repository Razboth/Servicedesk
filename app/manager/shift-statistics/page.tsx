'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardList,
  Users,
  TrendingUp,
  Download,
  RefreshCw,
  Loader2,
  ChevronDown,
  Clock,
  Sun,
  Moon,
  ServerCog,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChecklistData {
  type: string;
  typeLabel: string;
  status: string;
  isComplete: boolean;
  progress: number;
  totalItems: number;
  completedItems: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    branch: { id: string; name: string } | null;
  };
  claims: {
    userId: string;
    userName: string | null;
    claimedAt: string;
  }[];
}

interface DateChecklist {
  date: string;
  checklists: ChecklistData[];
}

interface MissingChecklist {
  date: string;
  type: string;
  typeLabel: string;
  expectedUsers: { id: string; name: string | null }[];
}

interface Statistics {
  summary: {
    totalDays: number;
    totalChecklists: number;
    completedChecklists: number;
    incompleteChecklists: number;
    completionRate: number;
    completionByType: Record<string, { total: number; completed: number; rate: number }>;
    missingChecklistsCount: number;
  };
  checklistsByDate: DateChecklist[];
  missingChecklists: MissingChecklist[];
}

const checklistTypeConfig: Record<string, { label: string; icon: typeof Sun; color: string }> = {
  OPS_SIANG: { label: 'Ops Siang', icon: Sun, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  OPS_MALAM: { label: 'Ops Malam', icon: Moon, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
  MONITORING_SIANG: { label: 'Monitoring Siang', icon: ServerCog, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
  MONITORING_MALAM: { label: 'Monitoring Malam', icon: ServerCog, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
};

export default function ShiftStatisticsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [downloadingChecklist, setDownloadingChecklist] = useState<string | null>(null);

  // Date range - default to current week
  const today = new Date();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(oneWeekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    fetchStatistics();
  }, [startDate, endDate]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/manager/shift-statistics?startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch statistics');
      }

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal memuat statistik');
    } finally {
      setLoading(false);
    }
  };

  const setDateRange = (range: 'today' | 'week' | 'month' | 'custom') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (range) {
      case 'today':
        start = now;
        end = now;
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        end = now;
        break;
      case 'month':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        end = now;
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleDownloadChecklist = async (dateStr: string, checklistType: string) => {
    const downloadKey = `${dateStr}-${checklistType}`;
    setDownloadingChecklist(downloadKey);
    try {
      const url = `/api/server-checklist/export?date=${dateStr}&type=${checklistType}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const filename = `${checklistType}_${dateStr}.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Checklist berhasil diunduh');
    } catch (error) {
      console.error('Error downloading checklist:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengunduh checklist');
    } finally {
      setDownloadingChecklist(null);
    }
  };

  if (!session?.user?.role || !['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
          <p className="text-muted-foreground">Halaman ini hanya untuk Manager IT</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Statistik Shift & Checklist
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pantau penyelesaian checklist dan laporan shift
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatistics}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange('today')}
              >
                Hari Ini
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange('week')}
              >
                7 Hari
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange('month')}
              >
                30 Hari
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                  Dari
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                  Sampai
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : statistics ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Checklist</p>
                    <p className="text-2xl font-bold">{statistics.summary.totalChecklists}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selesai</p>
                    <p className="text-2xl font-bold">{statistics.summary.completedChecklists}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Belum Selesai</p>
                    <p className="text-2xl font-bold">{statistics.summary.incompleteChecklists}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tidak Dibuat</p>
                    <p className="text-2xl font-bold">{statistics.summary.missingChecklistsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Completion Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tingkat Penyelesaian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Overall Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Keseluruhan</span>
                    <span className="font-bold">{statistics.summary.completionRate}%</span>
                  </div>
                  <Progress
                    value={statistics.summary.completionRate}
                    className="h-3"
                  />
                </div>

                {/* By Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  {Object.entries(statistics.summary.completionByType).map(([type, data]) => {
                    const config = checklistTypeConfig[type];
                    const Icon = config?.icon || ClipboardList;
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${config?.color || ''}`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <span>{config?.label || type}</span>
                          </div>
                          <span className="font-medium">
                            {data.completed}/{data.total} ({data.rate}%)
                          </span>
                        </div>
                        <Progress value={data.rate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Details */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
              <TabsTrigger
                value="overview"
                className={cn(
                  "data-[state=active]:shadow-sm gap-2",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                )}
              >
                <Calendar className="h-4 w-4" />
                Per Tanggal
              </TabsTrigger>
              <TabsTrigger
                value="missing"
                className={cn(
                  "data-[state=active]:shadow-sm gap-2",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                Tidak Lengkap
                {statistics.summary.missingChecklistsCount > 0 && (
                  <Badge variant="destructive" className="ml-1 text-xs">
                    {statistics.summary.missingChecklistsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Per Date Tab */}
            <TabsContent value="overview">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Detail Checklist per Tanggal</CardTitle>
                  <CardDescription>
                    Daftar semua checklist yang telah dibuat
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statistics.checklistsByDate.length > 0 ? (
                    <div className="space-y-4">
                      {statistics.checklistsByDate.map((dateData) => (
                        <div
                          key={dateData.date}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{formatDate(dateData.date)}</h3>
                            <Badge variant="outline">
                              {dateData.checklists.length} checklist
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {dateData.checklists.map((checklist, idx) => {
                              const config = checklistTypeConfig[checklist.type];
                              const Icon = config?.icon || ClipboardList;
                              return (
                                <div
                                  key={`${dateData.date}-${checklist.type}-${idx}`}
                                  className={`p-3 rounded-lg border ${
                                    checklist.isComplete
                                      ? 'bg-green-50/50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                                      : 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1.5 rounded ${config?.color || ''}`}>
                                        <Icon className="h-4 w-4" />
                                      </div>
                                      <span className="font-medium text-sm">
                                        {checklist.typeLabel}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {checklist.isComplete ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Clock className="h-4 w-4 text-amber-600" />
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => handleDownloadChecklist(dateData.date, checklist.type)}
                                        disabled={downloadingChecklist === `${dateData.date}-${checklist.type}`}
                                        title="Download checklist PDF"
                                      >
                                        {downloadingChecklist === `${dateData.date}-${checklist.type}` ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Download className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <span>PIC:</span>
                                      <span className="font-medium text-foreground">
                                        {checklist.user.name || checklist.user.email}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                      <span>Progress:</span>
                                      <span className="font-medium text-foreground">
                                        {checklist.completedItems}/{checklist.totalItems} ({checklist.progress}%)
                                      </span>
                                    </div>
                                    {checklist.claims.length > 0 && (
                                      <div className="pt-1 border-t mt-1">
                                        <span className="text-xs text-muted-foreground">Klaim:</span>
                                        {checklist.claims.map((claim, cIdx) => (
                                          <div
                                            key={cIdx}
                                            className="text-xs flex items-center justify-between"
                                          >
                                            <span>{claim.userName}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Tidak ada data checklist untuk periode ini</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Missing Checklists Tab */}
            <TabsContent value="missing">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Checklist Tidak Dibuat
                  </CardTitle>
                  <CardDescription>
                    Daftar checklist yang seharusnya dibuat tapi tidak ada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {statistics.missingChecklists.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Tipe Checklist</TableHead>
                          <TableHead>Staff yang Seharusnya</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statistics.missingChecklists.map((missing, idx) => {
                          const config = checklistTypeConfig[missing.type];
                          const Icon = config?.icon || ClipboardList;
                          return (
                            <TableRow key={`${missing.date}-${missing.type}-${idx}`}>
                              <TableCell className="font-medium">
                                {formatDate(missing.date)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded ${config?.color || ''}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <span>{missing.typeLabel}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {missing.expectedUsers.map((user) => (
                                    <Badge
                                      key={user.id}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {user.name || 'Unknown'}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                      <p>Semua checklist yang diharapkan sudah dibuat</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3" />
          <p>Gagal memuat data statistik</p>
          <Button onClick={fetchStatistics} variant="outline" className="mt-4">
            Coba Lagi
          </Button>
        </div>
      )}
    </div>
  );
}
