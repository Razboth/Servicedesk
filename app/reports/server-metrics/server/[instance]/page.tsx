'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Server,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { ServerDetailCharts } from '@/components/server-metrics-v2/server-detail-charts';
import { ExportButton } from '@/components/server-metrics-v2/export-button';

interface HistoryDataPoint {
  timestamp: string;
  timestampLocal: string | null;
  cpuPercent: number;
  memoryPercent: number;
  storagePercent: number;
  status: string;
}

interface ServerData {
  instance: string;
  serverName: string;
  currentStatus: string;
  current: {
    cpuPercent: number;
    memoryPercent: number;
    storagePercent: number;
    status: string;
  };
  history: HistoryDataPoint[];
  totalDataPoints: number;
}

export default function ServerDetailPage({
  params,
}: {
  params: Promise<{ instance: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [data, setData] = useState<ServerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const instance = decodeURIComponent(resolvedParams.instance);

  const fetchData = useCallback(async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch(
        `/api/v2/server-metrics/server/${encodeURIComponent(instance)}?limit=100`
      );

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
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [instance, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">OK</Badge>;
      case 'CAUTION':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">CAUTION</Badge>;
      case 'WARNING':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">WARNING</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMetricColor = (value: number, type: 'cpu' | 'memory' | 'storage') => {
    const thresholds = type === 'storage' ? { caution: 80, warning: 90 } : { caution: 75, warning: 90 };
    if (value >= thresholds.warning) return 'text-red-600';
    if (value >= thresholds.caution) return 'text-yellow-600';
    return 'text-green-600';
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
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Server className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-lg font-semibold">Server Tidak Ditemukan</h2>
            <p className="text-muted-foreground">
              Data untuk server {instance} tidak tersedia.
            </p>
          </div>
          <Button onClick={() => router.push('/reports/server-metrics')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  // Prepare export data
  const exportData = data.history.map((point) => ({
    'Timestamp': point.timestampLocal || point.timestamp,
    'CPU (%)': point.cpuPercent.toFixed(1),
    'Memory (%)': point.memoryPercent.toFixed(1),
    'Storage (%)': point.storagePercent.toFixed(1),
    'Status': point.status,
  }));

  return (
    <div className="container mx-auto py-6 space-y-6" id="server-report-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/reports/server-metrics')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-6 w-6" />
              {data.serverName}
            </h1>
            <p className="text-muted-foreground font-mono text-sm">{data.instance}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            contentId="server-report-content"
            filename={`server-${data.serverName}`}
            title={`Laporan Server: ${data.serverName}`}
            data={exportData}
          />
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status Saat Ini
            </span>
            {getStatusBadge(data.currentStatus)}
          </CardTitle>
          <CardDescription>
            Kondisi server berdasarkan data terbaru ({data.totalDataPoints} data point)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* CPU */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="p-3 rounded-full bg-blue-100">
                <Cpu className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPU Usage</p>
                <p className={`text-2xl font-bold ${getMetricColor(data.current.cpuPercent, 'cpu')}`}>
                  {data.current.cpuPercent.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Memory */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="p-3 rounded-full bg-green-100">
                <MemoryStick className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Memory Usage</p>
                <p className={`text-2xl font-bold ${getMetricColor(data.current.memoryPercent, 'memory')}`}>
                  {data.current.memoryPercent.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Storage */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <div className="p-3 rounded-full bg-amber-100">
                <HardDrive className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Storage Usage</p>
                <p className={`text-2xl font-bold ${getMetricColor(data.current.storagePercent, 'storage')}`}>
                  {data.current.storagePercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {data.history.length > 1 ? (
        <ServerDetailCharts history={data.history} serverName={data.serverName} />
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak cukup data untuk menampilkan grafik.</p>
              <p className="text-sm">Diperlukan minimal 2 data point untuk visualisasi trend.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
