'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Server,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Save,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { UsageChart } from '@/components/server-metrics/usage-chart';

interface ServerData {
  id: string;
  ipAddress: string;
  serverName: string | null;
  description: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MetricSnapshot {
  id: string;
  cpuPercent: number | null;
  memoryPercent: number | null;
  storage: { partition: string; usagePercent: number }[] | null;
  timestamp: string;
  collectedAt: string;
  fetchedAt: string;
}

interface ServerDetailData {
  server: ServerData;
  metrics: {
    history: MetricSnapshot[];
    averages: {
      cpuPercent: number | null;
      memoryPercent: number | null;
    };
    peaks: {
      cpuPercent: number;
      memoryPercent: number;
    };
    periodDays: number;
    totalSnapshots: number;
  };
}

const defaultCategories = ['Production', 'Development', 'Database', 'Web Server', 'Application', 'Backup', 'Other'];

const tabConfig = [
  { id: 'overview', label: 'Ringkasan', icon: Server },
  { id: 'history', label: 'Riwayat', icon: Clock },
  { id: 'settings', label: 'Pengaturan', icon: Save },
];

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ServerDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [periodDays, setPeriodDays] = useState('7');

  // Edit form state
  const [formData, setFormData] = useState({
    serverName: '',
    description: '',
    category: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/server-metrics/${params.id}?days=${periodDays}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Server tidak ditemukan');
          router.push('/reports/server-metrics');
          return;
        }
        throw new Error('Gagal memuat data');
      }

      const result = await response.json();
      setData(result.data);

      // Initialize form data
      setFormData({
        serverName: result.data.server.serverName || '',
        description: result.data.server.description || '',
        category: result.data.server.category || '',
      });
    } catch (error) {
      console.error('Error fetching server data:', error);
      toast.error('Gagal memuat data server');
    } finally {
      setIsLoading(false);
    }
  }, [params.id, periodDays, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/server-metrics/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverName: formData.serverName || null,
          description: formData.description || null,
          category: formData.category || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan');
      }

      toast.success('Server berhasil diperbarui');
      fetchData();
    } catch (error) {
      console.error('Error saving server:', error);
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (cpu: number | null, memory: number | null, storage: any[] | null) => {
    let maxStorage = 0;
    if (storage) {
      for (const s of storage) {
        if (s.usagePercent > maxStorage) maxStorage = s.usagePercent;
      }
    }

    const isCritical = (cpu && cpu >= 90) || (memory && memory >= 90) || maxStorage >= 90;
    const isWarning = (cpu && cpu >= 75) || (memory && memory >= 75) || maxStorage >= 75;

    if (isCritical) {
      return <Badge variant="destructive">Kritis</Badge>;
    }
    if (isWarning) {
      return <Badge className="bg-yellow-100 text-yellow-700">Peringatan</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700">Sehat</Badge>;
  };

  const getTrend = (current: number | null, average: number | null) => {
    if (current === null || average === null) return null;
    const diff = current - average;
    if (Math.abs(diff) < 1) return <Minus className="h-4 w-4 text-gray-400" />;
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <TrendingDown className="h-4 w-4 text-green-500" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">
          Server tidak ditemukan
        </div>
      </div>
    );
  }

  const { server, metrics } = data;
  const latestMetric = metrics.history[0] || null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/reports/server-metrics">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-6 w-6" />
              {server.serverName || server.ipAddress}
            </h1>
            <p className="text-muted-foreground font-mono">{server.ipAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 Jam</SelectItem>
              <SelectItem value="7">7 Hari</SelectItem>
              <SelectItem value="30">30 Hari</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {latestMetric?.cpuPercent?.toFixed(1) ?? '-'}%
              </span>
              {getTrend(latestMetric?.cpuPercent ?? null, metrics.averages.cpuPercent)}
            </div>
            <Progress value={latestMetric?.cpuPercent ?? 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              Memory Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">
                {latestMetric?.memoryPercent?.toFixed(1) ?? '-'}%
              </span>
              {getTrend(latestMetric?.memoryPercent ?? null, metrics.averages.memoryPercent)}
            </div>
            <Progress value={latestMetric?.memoryPercent ?? 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata ({periodDays} hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU:</span>
                <span className="font-medium">{metrics.averages.cpuPercent?.toFixed(1) ?? '-'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory:</span>
                <span className="font-medium">{metrics.averages.memoryPercent?.toFixed(1) ?? '-'}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Peak ({periodDays} hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU:</span>
                <span className="font-medium text-red-600">{metrics.peaks.cpuPercent?.toFixed(1) ?? '-'}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Memory:</span>
                <span className="font-medium text-red-600">{metrics.peaks.memoryPercent?.toFixed(1) ?? '-'}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4 overflow-x-auto" aria-label="Tabs">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                  ${isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Chart */}
          <UsageChart
            data={metrics.history.map((m) => ({
              date: m.timestamp,
              avgCpu: m.cpuPercent,
              avgMemory: m.memoryPercent,
              serverCount: 1,
            })).reverse()}
            title="Tren Penggunaan"
            description={`Data ${periodDays} hari terakhir`}
          />

          {/* Storage Info */}
          {latestMetric?.storage && latestMetric.storage.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Storage
                </CardTitle>
                <CardDescription>
                  Penggunaan partisi terakhir diperbarui{' '}
                  {format(new Date(latestMetric.collectedAt), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {latestMetric.storage.map((partition, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono">{partition.partition}</span>
                        <span className={partition.usagePercent >= 80 ? 'text-red-600 font-medium' : ''}>
                          {partition.usagePercent.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={partition.usagePercent}
                        className={`h-2 ${partition.usagePercent >= 90 ? '[&>div]:bg-red-500' : partition.usagePercent >= 80 ? '[&>div]:bg-yellow-500' : ''}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Server Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Server</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono">{server.ipAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama</p>
                  <p>{server.serverName || <span className="text-muted-foreground italic">Belum dinamai</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <p>{server.category || <span className="text-muted-foreground">-</span>}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(latestMetric?.cpuPercent ?? null, latestMetric?.memoryPercent ?? null, latestMetric?.storage ?? null)}
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Deskripsi</p>
                  <p>{server.description || <span className="text-muted-foreground italic">Tidak ada deskripsi</span>}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Metrik</CardTitle>
            <CardDescription>
              {metrics.totalSnapshots} data dalam {periodDays} hari terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead className="text-right">CPU</TableHead>
                    <TableHead className="text-right">Memory</TableHead>
                    <TableHead className="text-right">Max Storage</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.history.map((metric) => {
                      let maxStorage = 0;
                      if (metric.storage) {
                        for (const s of metric.storage) {
                          if (s.usagePercent > maxStorage) maxStorage = s.usagePercent;
                        }
                      }
                      return (
                        <TableRow key={metric.id}>
                          <TableCell>
                            {format(new Date(metric.timestamp), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                          </TableCell>
                          <TableCell className={`text-right ${(metric.cpuPercent ?? 0) >= 80 ? 'text-red-600 font-medium' : ''}`}>
                            {metric.cpuPercent?.toFixed(1) ?? '-'}%
                          </TableCell>
                          <TableCell className={`text-right ${(metric.memoryPercent ?? 0) >= 80 ? 'text-red-600 font-medium' : ''}`}>
                            {metric.memoryPercent?.toFixed(1) ?? '-'}%
                          </TableCell>
                          <TableCell className={`text-right ${maxStorage >= 80 ? 'text-red-600 font-medium' : ''}`}>
                            {maxStorage > 0 ? `${maxStorage.toFixed(1)}%` : '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(metric.cpuPercent, metric.memoryPercent, metric.storage)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Pengaturan Server</CardTitle>
            <CardDescription>
              Edit informasi server seperti nama, kategori, dan deskripsi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP Address</Label>
                <Input id="ipAddress" value={server.ipAddress} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverName">Nama Server</Label>
                <Input
                  id="serverName"
                  placeholder="Contoh: Web Server Production 1"
                  value={formData.serverName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serverName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category || '_none'}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value === '_none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Tidak ada kategori</SelectItem>
                    {defaultCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Deskripsi / Catatan</Label>
                <Textarea
                  id="description"
                  placeholder="Deskripsi atau catatan tentang server ini..."
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
