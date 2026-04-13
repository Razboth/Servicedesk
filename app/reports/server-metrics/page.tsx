'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, RefreshCw, Loader2, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SummaryCards } from '@/components/server-metrics-v2/summary-cards';
import { ServerTable } from '@/components/server-metrics-v2/server-table';
import { CollectionSelector } from '@/components/server-metrics-v2/collection-selector';
import { ExportButton } from '@/components/server-metrics-v2/export-button';

interface ServerData {
  id: string;
  serverName: string;
  instance: string;
  cpuPercent: number;
  memoryPercent: number;
  storagePercent: number;
  status: 'OK' | 'CAUTION' | 'WARNING';
}

interface MetricsData {
  id: string;
  metadata: {
    dashboard: string | null;
    source: string | null;
    fetchedAt: string;
    fetchedAtLocal: string | null;
    timeRange: string | null;
  };
  summary: {
    totalServers: number;
    warningCount: number;
    cautionCount: number;
    okCount: number;
  };
  servers: ServerData[];
  createdAt: string;
}

interface CollectionSummary {
  id: string;
  fetchedAt: string;
  fetchedAtLocal: string | null;
  totalServers: number;
  summary: {
    warning: number;
    caution: number;
    ok: number;
  };
}

export default function ServerMetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch collection history
  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/v2/server-metrics/history?limit=50');
      if (response.ok) {
        const result = await response.json();
        setCollections(result.data.collections);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  }, []);

  const fetchData = useCallback(async (collectionId: string | null = null, showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const url = collectionId
        ? `/api/v2/server-metrics/${collectionId}`
        : '/api/v2/server-metrics';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Gagal memuat data');
      }

      const result = await response.json();
      setData(result.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data metrik server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleCollectionSelect = (collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
    fetchData(collectionId, true);
  };

  const handleRefresh = () => {
    setSelectedCollectionId(null);
    fetchData(null, true);
    fetchCollections();
  };

  // Initial fetch
  useEffect(() => {
    fetchData();
    fetchCollections();
  }, [fetchData, fetchCollections]);

  // Auto-refresh every 5 minutes (only if viewing latest)
  useEffect(() => {
    if (selectedCollectionId) return; // Don't auto-refresh if viewing historical data

    const interval = setInterval(() => {
      fetchData(null, true);
      fetchCollections();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchData, fetchCollections, selectedCollectionId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Server className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-lg font-semibold">Tidak Ada Data</h2>
            <p className="text-muted-foreground">
              Belum ada data metrik server. Data akan muncul setelah sistem menerima data dari Grafana.
            </p>
          </div>
          <Button onClick={() => fetchData(null, true)} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Prepare CSV export data
  const exportData = data?.servers.map((server) => ({
    'Server': server.serverName,
    'Instance': server.instance,
    'CPU (%)': server.cpuPercent.toFixed(1),
    'Memory (%)': server.memoryPercent.toFixed(1),
    'Storage (%)': server.storagePercent.toFixed(1),
    'Status': server.status,
  }));

  return (
    <div className="container mx-auto py-6 space-y-6" id="report-content">
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
            {data.metadata.fetchedAtLocal && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Data: {data.metadata.fetchedAtLocal}
                {data.metadata.timeRange && ` (${data.metadata.timeRange})`}
              </p>
            )}
            {data.metadata.source && (
              <a
                href={data.metadata.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Sumber: Grafana
              </a>
            )}
            {selectedCollectionId && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                Melihat data historis
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CollectionSelector
            collections={collections}
            selectedId={selectedCollectionId}
            onSelect={handleCollectionSelect}
            isLoading={isRefreshing}
          />
          <ExportButton
            contentId="report-content"
            filename="server-metrics"
            title="Laporan Metrik Server"
            data={exportData}
          />
          {lastRefresh && (
            <span className="text-xs text-muted-foreground hidden lg:inline">
              Refresh: {lastRefresh.toLocaleTimeString('id-ID')}
            </span>
          )}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        totalServers={data.summary.totalServers}
        warningCount={data.summary.warningCount}
        cautionCount={data.summary.cautionCount}
        okCount={data.summary.okCount}
      />

      {/* Server Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Server</CardTitle>
          <CardDescription>
            Status dan penggunaan resource semua server yang dimonitor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServerTable servers={data.servers} />
        </CardContent>
      </Card>
    </div>
  );
}
