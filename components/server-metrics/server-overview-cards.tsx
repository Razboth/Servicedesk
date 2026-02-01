'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Cpu, MemoryStick, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface ServerOverviewCardsProps {
  summary: {
    totalServers: number;
    avgCpu: number | null;
    avgMemory: number | null;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
  };
  latestCollection: {
    fetchedAt: string;
    reportTimestamp: string;
  } | null;
}

export function ServerOverviewCards({ summary, latestCollection }: ServerOverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Server</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalServers}</div>
          <p className="text-xs text-muted-foreground">
            Server yang dimonitor
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rata-rata CPU</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.avgCpu !== null ? `${summary.avgCpu.toFixed(1)}%` : '-'}
          </div>
          <p className="text-xs text-muted-foreground">
            Penggunaan CPU rata-rata
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rata-rata Memory</CardTitle>
          <MemoryStick className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.avgMemory !== null ? `${summary.avgMemory.toFixed(1)}%` : '-'}
          </div>
          <p className="text-xs text-muted-foreground">
            Penggunaan memory rata-rata
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status Kesehatan</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="font-medium">{summary.healthyCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{summary.warningCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium">{summary.criticalCount}</span>
            </div>
          </div>
          {latestCollection && (
            <p className="text-xs text-muted-foreground mt-2">
              Update: {new Date(latestCollection.reportTimestamp).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
