'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

interface SummaryCardsProps {
  totalServices: number;
  okCount: number;
  downCount: number;
  inactiveCount: number;
}

export function SummaryCards({
  totalServices,
  okCount,
  downCount,
  inactiveCount,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Layanan</p>
              <p className="text-2xl font-bold">{totalServices}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">OK</p>
              <p className="text-2xl font-bold text-green-600">{okCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Down</p>
              <p className="text-2xl font-bold text-red-600">{downCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactive</p>
              <p className="text-2xl font-bold text-gray-500">{inactiveCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-gray-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
