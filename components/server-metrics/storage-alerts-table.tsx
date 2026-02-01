'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { HardDrive } from 'lucide-react';

interface StorageAlert {
  serverId: string;
  ipAddress: string;
  serverName: string | null;
  partition: string;
  usagePercent: number;
}

interface StorageAlertsTableProps {
  alerts: StorageAlert[];
}

export function StorageAlertsTable({ alerts }: StorageAlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <HardDrive className="h-8 w-8 mb-2" />
        <p>Tidak ada peringatan storage</p>
        <p className="text-sm">Semua partisi dalam kondisi baik (&lt; 80%)</p>
      </div>
    );
  }

  const getSeverityBadge = (usage: number) => {
    if (usage >= 95) {
      return <Badge variant="destructive">Kritis</Badge>;
    }
    if (usage >= 90) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Tinggi</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Peringatan</Badge>;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Server</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Partisi</TableHead>
            <TableHead className="text-right">Penggunaan</TableHead>
            <TableHead>Tingkat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert, index) => (
            <TableRow key={`${alert.serverId}-${alert.partition}-${index}`}>
              <TableCell>
                {alert.serverName || (
                  <span className="text-muted-foreground italic">Tanpa nama</span>
                )}
              </TableCell>
              <TableCell className="font-mono text-sm">{alert.ipAddress}</TableCell>
              <TableCell className="font-mono text-sm">{alert.partition}</TableCell>
              <TableCell className="text-right font-medium text-red-600">
                {alert.usagePercent.toFixed(1)}%
              </TableCell>
              <TableCell>{getSeverityBadge(alert.usagePercent)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
