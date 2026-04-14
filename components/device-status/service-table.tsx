'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ServiceData {
  id: string;
  serviceName: string;
  groupName: string;
  status: 'OK' | 'DOWN' | 'INACTIVE' | 'NUMERIC';
}

interface ServiceTableProps {
  services: ServiceData[];
  groups: Record<string, ServiceData[]>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'OK':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          OK
        </Badge>
      );
    case 'DOWN':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          DOWN
        </Badge>
      );
    case 'INACTIVE':
      return (
        <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
          INACTIVE
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

function getStatusDot(status: string) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full mr-2',
        status === 'OK' && 'bg-green-500',
        status === 'DOWN' && 'bg-red-500',
        status === 'INACTIVE' && 'bg-gray-400',
        status === 'NUMERIC' && 'bg-blue-500'
      )}
    />
  );
}

export function ServiceTable({ services, groups }: ServiceTableProps) {
  const groupNames = Object.keys(groups).sort();

  return (
    <div className="space-y-6">
      {groupNames.map((groupName) => {
        const groupServices = groups[groupName];
        const okCount = groupServices.filter((s) => s.status === 'OK').length;
        const downCount = groupServices.filter((s) => s.status === 'DOWN').length;
        const inactiveCount = groupServices.filter((s) => s.status === 'INACTIVE').length;

        return (
          <Card key={groupName}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{groupName}</CardTitle>
                <div className="flex gap-2 text-sm">
                  {okCount > 0 && (
                    <span className="flex items-center text-green-600">
                      {getStatusDot('OK')}
                      {okCount} OK
                    </span>
                  )}
                  {downCount > 0 && (
                    <span className="flex items-center text-red-600">
                      {getStatusDot('DOWN')}
                      {downCount} Down
                    </span>
                  )}
                  {inactiveCount > 0 && (
                    <span className="flex items-center text-gray-500">
                      {getStatusDot('INACTIVE')}
                      {inactiveCount} Inactive
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupServices.map((service) => (
                  <div
                    key={service.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      service.status === 'OK' && 'bg-green-50 border-green-200',
                      service.status === 'DOWN' && 'bg-red-50 border-red-200',
                      service.status === 'INACTIVE' && 'bg-gray-50 border-gray-200',
                      service.status === 'NUMERIC' && 'bg-blue-50 border-blue-200'
                    )}
                  >
                    <span className="text-sm font-medium truncate mr-2">
                      {service.serviceName.replace(`${groupName.split(' / ')[0]} - `, '')}
                    </span>
                    {getStatusBadge(service.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
