'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ServerEditDialog } from './server-edit-dialog';

interface ServerData {
  id: string;
  ipAddress: string;
  serverName: string | null;
  description: string | null;
  category: string | null;
  status: 'healthy' | 'warning' | 'critical';
  latestMetrics: {
    cpuPercent: number | null;
    memoryPercent: number | null;
    maxStorageUsage: number;
    maxStoragePartition: string;
  } | null;
}

interface ServerTableProps {
  servers: ServerData[];
  onUpdate: () => void;
  categories: string[];
}

const statusConfig = {
  healthy: { label: 'Sehat', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  warning: { label: 'Peringatan', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  critical: { label: 'Kritis', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

export function ServerTable({ servers, onUpdate, categories }: ServerTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingServer, setEditingServer] = useState<ServerData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filter servers
  let filteredServers = servers;

  if (search) {
    const searchLower = search.toLowerCase();
    filteredServers = filteredServers.filter(
      (s) =>
        s.ipAddress.toLowerCase().includes(searchLower) ||
        s.serverName?.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower)
    );
  }

  if (statusFilter !== 'all') {
    filteredServers = filteredServers.filter((s) => s.status === statusFilter);
  }

  if (categoryFilter !== 'all') {
    filteredServers = filteredServers.filter((s) => s.category === categoryFilter);
  }

  // Pagination
  const totalPages = Math.ceil(filteredServers.length / pageSize);
  const paginatedServers = filteredServers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatPercent = (value: number | null) => {
    if (value === null) return '-';
    return `${value.toFixed(1)}%`;
  };

  const getUsageColor = (value: number | null) => {
    if (value === null) return '';
    if (value >= 90) return 'text-red-600 font-medium';
    if (value >= 75) return 'text-yellow-600 font-medium';
    return '';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari IP, nama, atau deskripsi..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="healthy">Sehat</SelectItem>
            <SelectItem value="warning">Peringatan</SelectItem>
            <SelectItem value="critical">Kritis</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IP Address</TableHead>
              <TableHead>Nama Server</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">CPU</TableHead>
              <TableHead className="text-right">Memory</TableHead>
              <TableHead className="text-right">Max Storage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedServers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Tidak ada server yang ditemukan
                </TableCell>
              </TableRow>
            ) : (
              paginatedServers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-mono text-sm">{server.ipAddress}</TableCell>
                  <TableCell>
                    {server.serverName || (
                      <span className="text-muted-foreground italic">Belum dinamai</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {server.category || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right ${getUsageColor(server.latestMetrics?.cpuPercent ?? null)}`}>
                    {formatPercent(server.latestMetrics?.cpuPercent ?? null)}
                  </TableCell>
                  <TableCell className={`text-right ${getUsageColor(server.latestMetrics?.memoryPercent ?? null)}`}>
                    {formatPercent(server.latestMetrics?.memoryPercent ?? null)}
                  </TableCell>
                  <TableCell className={`text-right ${getUsageColor(server.latestMetrics?.maxStorageUsage ?? null)}`}>
                    {formatPercent(server.latestMetrics?.maxStorageUsage ?? null)}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[server.status].className}>
                      {statusConfig[server.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingServer(server)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, filteredServers.length)} dari{' '}
            {filteredServers.length} server
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingServer && (
        <ServerEditDialog
          server={editingServer}
          categories={categories}
          open={!!editingServer}
          onOpenChange={(open) => !open && setEditingServer(null)}
          onSuccess={() => {
            setEditingServer(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
