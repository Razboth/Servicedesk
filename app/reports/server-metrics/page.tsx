'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Server,
  Activity,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Loader2,
  Cpu,
  MemoryStick,
} from 'lucide-react';
import { toast } from 'sonner';
import { ServerOverviewCards } from '@/components/server-metrics/server-overview-cards';
import { ServerTable } from '@/components/server-metrics/server-table';
import { StorageAlertsTable } from '@/components/server-metrics/storage-alerts-table';
import { UsageChart } from '@/components/server-metrics/usage-chart';

interface ServerData {
  id: string;
  ipAddress: string;
  serverName: string | null;
  description: string | null;
  category: string | null;
  status: 'healthy' | 'warning' | 'critical';
  latestMetrics: {
    cpuPercent: number | null;
    memoryPercent: number | null;
    maxStorageUsage: number;
    maxStoragePartition: string;
  } | null;
}

interface AnalyticsData {
  summary: {
    totalServers: number;
    avgCpu: number | null;
    avgMemory: number | null;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
  };
  topCpuServers: {
    serverId: string;
    ipAddress: string;
    serverName: string | null;
    cpuPercent: number | null;
  }[];
  topMemoryServers: {
    serverId: string;
    ipAddress: string;
    serverName: string | null;
    memoryPercent: number | null;
  }[];
  storageAlerts: {
    serverId: string;
    ipAddress: string;
    serverName: string | null;
    partition: string;
    usagePercent: number;
  }[];
  historicalTrends: {
    date: string;
    avgCpu: number | null;
    avgMemory: number | null;
    serverCount: number;
  }[];
  latestCollection: {
    fetchedAt: string;
    reportTimestamp: string;
  } | null;
}

const tabConfig = [
  { id: 'overview', label: 'Ringkasan', icon: Activity },
  { id: 'servers', label: 'Server', icon: Server },
  { id: 'analytics', label: 'Analitik', icon: BarChart3 },
  { id: 'alerts', label: 'Peringatan', icon: AlertTriangle },
];

export default function ServerMetricsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [servers, setServers] = useState<ServerData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState('7');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch servers and analytics in parallel
      const [serversRes, analyticsRes] = await Promise.all([
        fetch('/api/server-metrics'),
        fetch(`/api/server-metrics/analytics?days=${periodDays}`),
      ]);

      if (!serversRes.ok || !analyticsRes.ok) {
        throw new Error('Gagal memuat data');
      }

      const serversData = await serversRes.json();
      const analyticsData = await analyticsRes.json();

      setServers(serversData.data.servers);
      setAnalytics(analyticsData.data);

      // Extract unique categories
      const uniqueCategories = [...new Set(
        serversData.data.servers
          .map((s: ServerData) => s.category)
          .filter(Boolean)
      )] as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data metrik server');
    } finally {
      setIsLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6" />
            Metrik Server
          </h1>
          <p className="text-muted-foreground">
            Monitor kesehatan dan performa server
          </p>
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

      {/* Overview Cards */}
      {analytics && (
        <ServerOverviewCards
          summary={analytics.summary}
          latestCollection={analytics.latestCollection}
        />
      )}

      {/* Tabs */}
      <div className="w-full">
        <div className="border-b mb-6">
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
                  {tab.id === 'alerts' && analytics && analytics.storageAlerts.length > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {analytics.storageAlerts.length}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="space-y-6">
            {/* Top Usage */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Top CPU */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Top 5 CPU Tertinggi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topCpuServers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Tidak ada data</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.topCpuServers.map((server, index) => (
                        <div key={server.serverId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm w-5">{index + 1}.</span>
                            <div>
                              <p className="text-sm font-medium">
                                {server.serverName || server.ipAddress}
                              </p>
                              {server.serverName && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  {server.ipAddress}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`font-medium ${
                            (server.cpuPercent || 0) >= 90 ? 'text-red-600' :
                            (server.cpuPercent || 0) >= 75 ? 'text-yellow-600' : ''
                          }`}>
                            {server.cpuPercent?.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Memory */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MemoryStick className="h-4 w-4" />
                    Top 5 Memory Tertinggi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topMemoryServers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Tidak ada data</p>
                  ) : (
                    <div className="space-y-3">
                      {analytics.topMemoryServers.map((server, index) => (
                        <div key={server.serverId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm w-5">{index + 1}.</span>
                            <div>
                              <p className="text-sm font-medium">
                                {server.serverName || server.ipAddress}
                              </p>
                              {server.serverName && (
                                <p className="text-xs text-muted-foreground font-mono">
                                  {server.ipAddress}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`font-medium ${
                            (server.memoryPercent || 0) >= 90 ? 'text-red-600' :
                            (server.memoryPercent || 0) >= 75 ? 'text-yellow-600' : ''
                          }`}>
                            {server.memoryPercent?.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Storage Alerts Preview */}
            {analytics.storageAlerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Peringatan Storage
                  </CardTitle>
                  <CardDescription>
                    Partisi dengan penggunaan di atas 80%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StorageAlertsTable alerts={analytics.storageAlerts.slice(0, 5)} />
                  {analytics.storageAlerts.length > 5 && (
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setActiveTab('alerts')}
                    >
                      Lihat semua {analytics.storageAlerts.length} peringatan
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Servers Tab */}
        {activeTab === 'servers' && (
          <Card>
            <CardHeader>
              <CardTitle>Daftar Server</CardTitle>
              <CardDescription>
                Kelola dan pantau semua server yang dimonitor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServerTable
                servers={servers}
                onUpdate={fetchData}
                categories={categories}
              />
            </CardContent>
          </Card>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <UsageChart
              data={analytics.historicalTrends}
              title="Tren Rata-rata Penggunaan"
              description={`Data ${periodDays} hari terakhir`}
            />

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Rata-rata CPU</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.summary.avgCpu !== null
                      ? `${analytics.summary.avgCpu.toFixed(1)}%`
                      : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dari {analytics.summary.totalServers} server
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Rata-rata Memory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.summary.avgMemory !== null
                      ? `${analytics.summary.avgMemory.toFixed(1)}%`
                      : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dari {analytics.summary.totalServers} server
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.historicalTrends.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Koleksi dalam {periodDays} hari
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && analytics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Peringatan Storage
              </CardTitle>
              <CardDescription>
                Semua partisi dengan penggunaan di atas 80%
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StorageAlertsTable alerts={analytics.storageAlerts} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
