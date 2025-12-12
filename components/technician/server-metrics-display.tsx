'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Clock,
  AlertCircle,
  Server,
} from 'lucide-react';

interface ServerMetrics {
  cpuUsagePercent: number | null;
  cpuCores: number | null;
  cpuLoadAvg1m: number | null;
  cpuLoadAvg5m: number | null;
  cpuLoadAvg15m: number | null;
  ramTotalGB: number | null;
  ramUsedGB: number | null;
  ramUsagePercent: number | null;
  diskTotalGB: number | null;
  diskUsedGB: number | null;
  diskUsagePercent: number | null;
  networkInBytesPerSec: number | null;
  networkOutBytesPerSec: number | null;
  uptimeSeconds: number | null;
  lastBootTime: string | null;
  collectedAt: string;
}

interface ServerMetricsDisplayProps {
  metrics: ServerMetrics | null;
  available: boolean;
  isStale?: boolean;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '-';
  if (bytes < 1024) return `${bytes.toFixed(0)} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days} hari ${hours} jam`;
  }
  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  }
  return `${minutes} menit`;
}

function getUsageColor(percentage: number | null): string {
  if (percentage === null) return 'bg-gray-300';
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getUsageStatus(percentage: number | null): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (percentage === null) return { label: 'N/A', variant: 'outline' };
  if (percentage >= 90) return { label: 'Kritis', variant: 'destructive' };
  if (percentage >= 75) return { label: 'Tinggi', variant: 'secondary' };
  return { label: 'Normal', variant: 'default' };
}

export function ServerMetricsDisplay({
  metrics,
  available,
  isStale = false,
}: ServerMetricsDisplayProps) {
  if (!available || !metrics) {
    return (
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            Metrik Server
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>Laporan metrik tidak tersedia</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cpuStatus = getUsageStatus(metrics.cpuUsagePercent);
  const ramStatus = getUsageStatus(metrics.ramUsagePercent);
  const diskStatus = getUsageStatus(metrics.diskUsagePercent);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            Metrik Server
          </CardTitle>
          {isStale && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Data tidak aktual
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Terakhir diperbarui:{' '}
          {new Date(metrics.collectedAt).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CPU */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">CPU</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {metrics.cpuUsagePercent?.toFixed(1) || '-'}%
              </span>
              <Badge variant={cpuStatus.variant} className="text-xs">
                {cpuStatus.label}
              </Badge>
            </div>
          </div>
          <Progress
            value={metrics.cpuUsagePercent || 0}
            className="h-2"
          />
          {metrics.cpuLoadAvg1m !== null && (
            <p className="text-xs text-muted-foreground">
              Load: {metrics.cpuLoadAvg1m?.toFixed(2)} / {metrics.cpuLoadAvg5m?.toFixed(2)} / {metrics.cpuLoadAvg15m?.toFixed(2)}
              {metrics.cpuCores && ` (${metrics.cpuCores} cores)`}
            </p>
          )}
        </div>

        {/* RAM */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">RAM</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {metrics.ramUsagePercent?.toFixed(1) || '-'}%
              </span>
              <Badge variant={ramStatus.variant} className="text-xs">
                {ramStatus.label}
              </Badge>
            </div>
          </div>
          <Progress
            value={metrics.ramUsagePercent || 0}
            className="h-2"
          />
          {metrics.ramUsedGB !== null && metrics.ramTotalGB !== null && (
            <p className="text-xs text-muted-foreground">
              {metrics.ramUsedGB.toFixed(1)} GB / {metrics.ramTotalGB.toFixed(1)} GB
            </p>
          )}
        </div>

        {/* Disk */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Disk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {metrics.diskUsagePercent?.toFixed(1) || '-'}%
              </span>
              <Badge variant={diskStatus.variant} className="text-xs">
                {diskStatus.label}
              </Badge>
            </div>
          </div>
          <Progress
            value={metrics.diskUsagePercent || 0}
            className="h-2"
          />
          {metrics.diskUsedGB !== null && metrics.diskTotalGB !== null && (
            <p className="text-xs text-muted-foreground">
              {metrics.diskUsedGB.toFixed(1)} GB / {metrics.diskTotalGB.toFixed(1)} GB
            </p>
          )}
        </div>

        {/* Network & Uptime */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          {/* Network */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Jaringan</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="flex justify-between">
                <span>In:</span>
                <span>{formatBytes(metrics.networkInBytesPerSec)}</span>
              </div>
              <div className="flex justify-between">
                <span>Out:</span>
                <span>{formatBytes(metrics.networkOutBytesPerSec)}</span>
              </div>
            </div>
          </div>

          {/* Uptime */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Uptime</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatUptime(metrics.uptimeSeconds)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
