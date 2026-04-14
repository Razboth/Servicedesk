'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ServiceData {
  id: string;
  serviceName: string;
  groupName: string;
  status: 'OK' | 'DOWN' | 'IDLE' | 'NUMERIC';
}

interface ServiceTableProps {
  services: ServiceData[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'OK':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          UP
        </Badge>
      );
    case 'DOWN':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          DOWN
        </Badge>
      );
    case 'IDLE':
      return (
        <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
          IDLE
        </Badge>
      );
    case 'NUMERIC':
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          NUMERIC
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">{status}</Badge>
      );
  }
}

export function ServiceTable({ services }: ServiceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Layanan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((service) => (
            <div
              key={service.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                service.status === 'OK' && 'bg-green-50 border-green-200',
                service.status === 'DOWN' && 'bg-red-50 border-red-200',
                service.status === 'IDLE' && 'bg-gray-50 border-gray-200',
                service.status === 'NUMERIC' && 'bg-blue-50 border-blue-200'
              )}
            >
              <span className="text-sm font-medium truncate mr-2">
                {service.serviceName}
              </span>
              {getStatusBadge(service.status)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
