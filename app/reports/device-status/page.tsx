'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, RefreshCw, Loader2, Clock, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import { SummaryCards } from '@/components/device-status/summary-cards';
import { ServiceTable } from '@/components/device-status/service-table';
import { CollectionSelector } from '@/components/device-status/collection-selector';
import { ExportButton } from '@/components/device-status/export-button';

interface ServiceData {
  id: string;
  serviceName: string;
  groupName: string;
  status: 'OK' | 'DOWN' | 'IDLE' | 'NUMERIC';
}

interface StatusData {
  id: string;
  metadata: {
    dashboard: string | null;
    source: string | null;
    fetchedAt: string;
    fetchedAtLocal: string | null;
    timeRange: string | null;
  };
  summary: {
    totalServices: number;
    okCount: number;
    downCount: number;
    idleCount: number;
  };
  services: ServiceData[];
  createdAt: string;
}

interface CollectionSummary {
  id: string;
  fetchedAt: string;
  fetchedAtLocal: string | null;
  totalServices: number;
  summary: {
    ok: number;
    down: number;
    idle: number;
  };
}

export default function DeviceStatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch('/api/v2/device-status/history?limit=50');
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
        ? `/api/v2/device-status/${collectionId}`
        : '/api/v2/device-status';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Gagal memuat data');
      }

      const result = await response.json();
      setData(result.data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data status layanan');
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

  useEffect(() => {
    fetchData();
    fetchCollections();
  }, [fetchData, fetchCollections]);

  useEffect(() => {
    if (selectedCollectionId) return;

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
          <Activity className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h2 className="text-lg font-semibold">Tidak Ada Data</h2>
            <p className="text-muted-foreground">
              Belum ada data status layanan. Data akan muncul setelah sistem menerima data dari Grafana.
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

  const exportData = data?.services.map((service) => ({
    'Nama Layanan': service.serviceName,
    'Grup': service.groupName,
    'Status': service.status === 'OK' ? 'UP' : service.status,
  }));

  return (
    <div className="container mx-auto py-6 space-y-6" id="report-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Device Monitoring
          </h1>
          <p className="text-muted-foreground">
            Monitor status layanan transaksi ATM dan digital banking
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
            filename="device-status"
            title="Laporan Status Layanan"
            data={exportData}
            services={data.services}
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

      {/* Status Legend */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="flex flex-wrap gap-4 text-sm">
            <span><strong className="text-green-600">Up</strong> = Transaksi berhasil dalam 5 menit terakhir</span>
            <span><strong className="text-red-600">Down</strong> = Terjadi error dalam 5 menit terakhir</span>
            <span><strong className="text-gray-500">Idle</strong> = Tidak ada transaksi dalam 5 menit terakhir</span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <SummaryCards
        totalServices={data.summary.totalServices}
        okCount={data.summary.okCount}
        downCount={data.summary.downCount}
        idleCount={data.summary.idleCount}
      />

      {/* Service Table */}
      <ServiceTable services={data.services} />
    </div>
  );
}
