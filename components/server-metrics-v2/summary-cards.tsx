'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SummaryCardsProps {
  totalServers: number;
  warningCount: number;
  cautionCount: number;
  okCount: number;
}

export function SummaryCards({
  totalServers,
  warningCount,
  cautionCount,
  okCount,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Server</CardTitle>
          <Server className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalServers}</div>
          <p className="text-xs text-muted-foreground">Server yang dimonitor</p>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">OK</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{okCount}</div>
          <p className="text-xs text-muted-foreground">Server dalam kondisi normal</p>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Caution</CardTitle>
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{cautionCount}</div>
          <p className="text-xs text-muted-foreground">Perlu perhatian</p>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Warning</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{warningCount}</div>
          <p className="text-xs text-muted-foreground">Perlu tindakan segera</p>
        </CardContent>
      </Card>
    </div>
  );
}
