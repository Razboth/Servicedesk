'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServerData {
  id: string;
  serverName: string;
  instance: string;
  cpuPercent: number;
  memoryPercent: number;
  storagePercent: number;
  status: 'OK' | 'CAUTION' | 'WARNING';
}

interface ServerTableProps {
  servers: ServerData[];
}

type SortField = 'serverName' | 'cpuPercent' | 'memoryPercent' | 'storagePercent' | 'status';
type SortDirection = 'asc' | 'desc';

const statusOrder = { WARNING: 0, CAUTION: 1, OK: 2 };

export function ServerTable({ servers }: ServerTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedServers = useMemo(() => {
    let result = [...servers];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.serverName.toLowerCase().includes(searchLower) ||
          s.instance.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'status') {
        comparison = statusOrder[a.status] - statusOrder[b.status];
      } else if (sortField === 'serverName') {
        comparison = a.serverName.localeCompare(b.serverName);
      } else {
        comparison = a[sortField] - b[sortField];
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [servers, search, statusFilter, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const getStatusBadge = (status: 'OK' | 'CAUTION' | 'WARNING') => {
    switch (status) {
      case 'OK':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">OK</Badge>;
      case 'CAUTION':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">CAUTION</Badge>;
      case 'WARNING':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">WARNING</Badge>;
    }
  };

  const getMetricColor = (value: number, type: 'cpu' | 'memory' | 'storage') => {
    const thresholds = type === 'storage' ? { caution: 80, warning: 90 } : { caution: 75, warning: 90 };
    if (value >= thresholds.warning) return 'text-red-600 font-semibold';
    if (value >= thresholds.caution) return 'text-yellow-600 font-medium';
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari server atau instance..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="CAUTION">Caution</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort('serverName')}
                >
                  Server
                  <SortIcon field="serverName" />
                </Button>
              </TableHead>
              <TableHead className="hidden md:table-cell">Instance</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort('cpuPercent')}
                >
                  CPU
                  <SortIcon field="cpuPercent" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort('memoryPercent')}
                >
                  Memory
                  <SortIcon field="memoryPercent" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort('storagePercent')}
                >
                  Storage
                  <SortIcon field="storagePercent" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-semibold hover:bg-transparent"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <SortIcon field="status" />
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedServers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {servers.length === 0 ? 'Tidak ada data server' : 'Tidak ada server yang cocok dengan filter'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedServers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.serverName}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">
                    {server.instance}
                  </TableCell>
                  <TableCell className={`text-right ${getMetricColor(server.cpuPercent, 'cpu')}`}>
                    {server.cpuPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell className={`text-right ${getMetricColor(server.memoryPercent, 'memory')}`}>
                    {server.memoryPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell className={`text-right ${getMetricColor(server.storagePercent, 'storage')}`}>
                    {server.storagePercent.toFixed(1)}%
                  </TableCell>
                  <TableCell>{getStatusBadge(server.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Menampilkan {filteredAndSortedServers.length} dari {servers.length} server
      </div>
    </div>
  );
}
