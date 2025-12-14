'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Ticket,
  Search,
  Building2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import Link from 'next/link';

interface TicketData {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  service?: {
    name: string;
    category?: { name: string };
  };
  createdBy: {
    name: string;
    email: string;
    branchId: string;
  };
  assignedTo?: {
    name: string;
    email: string;
  };
  _count: {
    comments: number;
  };
}

interface TicketStats {
  total: number;
  pending_approval: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  avgResolutionTime: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function ManagerTicketsPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [branchInfo, setBranchInfo] = useState<{ name: string; code: string } | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, priorityFilter, page, limit]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter })
      });

      const response = await fetch(`/api/manager/tickets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch tickets');

      const data = await response.json();
      setTickets(data.tickets);
      setStats(data.stats);
      setBranchInfo(data.branch);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  // Reset page when filters change
  const handleFilterChange = (filterType: 'status' | 'priority' | 'search', value: string) => {
    setPage(1); // Reset to first page
    if (filterType === 'status') setStatusFilter(value);
    else if (filterType === 'priority') setPriorityFilter(value);
    else setSearch(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertCircle className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CLOSED':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'default';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Ticket className="h-8 w-8" />
          Tiket Cabang
        </h1>
        {branchInfo && (
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {branchInfo.name} ({branchInfo.code})
          </p>
        )}
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Tiket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600">Terbuka</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-600">Sedang Dikerjakan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.in_progress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">Selesai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Rata-rata Resolusi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResolutionTime} jam</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari berdasarkan judul atau deskripsi..."
                  value={search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange('status', v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="OPEN">Terbuka</SelectItem>
                <SelectItem value="IN_PROGRESS">Sedang Dikerjakan</SelectItem>
                <SelectItem value="RESOLVED">Selesai</SelectItem>
                <SelectItem value="CLOSED">Ditutup</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => handleFilterChange('priority', v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semua Prioritas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Prioritas</SelectItem>
                <SelectItem value="URGENT">Mendesak</SelectItem>
                <SelectItem value="HIGH">Tinggi</SelectItem>
                <SelectItem value="MEDIUM">Sedang</SelectItem>
                <SelectItem value="LOW">Rendah</SelectItem>
              </SelectContent>
            </Select>
            <Select value={limit.toString()} onValueChange={(v) => { setPage(1); setLimit(parseInt(v)); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Per Halaman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / halaman</SelectItem>
                <SelectItem value="20">20 / halaman</SelectItem>
                <SelectItem value="50">50 / halaman</SelectItem>
                <SelectItem value="100">100 / halaman</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Tiket</TableHead>
                <TableHead>Judul</TableHead>
                <TableHead>Pengguna</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioritas</TableHead>
                <TableHead>Ditugaskan Ke</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Memuat tiket...
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Tidak ada tiket ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-sm">
                      {ticket.ticketNumber}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <p className="font-medium truncate">{ticket.title}</p>
                        {ticket.service && (
                          <p className="text-xs text-gray-500">
                            {ticket.service.category?.name} - {ticket.service.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{ticket.createdBy.name}</p>
                        <p className="text-xs text-gray-500">{ticket.createdBy.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(ticket.status)}
                          {ticket.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{ticket.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Belum ditugaskan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(ticket.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/tickets/${ticket.id}`}>
                        <Button variant="outline" size="sm">
                          Lihat
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <div className="text-sm text-muted-foreground">
            Menampilkan {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total} tiket
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1 || loading}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 text-sm">
              <span>Halaman</span>
              <Input
                type="number"
                min={1}
                max={pagination.pages}
                value={page}
                onChange={(e) => {
                  const newPage = parseInt(e.target.value);
                  if (newPage >= 1 && newPage <= pagination.pages) {
                    setPage(newPage);
                  }
                }}
                className="w-16 h-8 text-center"
              />
              <span>dari {pagination.pages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.pages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(pagination.pages)}
              disabled={page === pagination.pages || loading}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}