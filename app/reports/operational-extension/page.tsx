'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import {
  Clock,
  Download,
  FileSpreadsheet,
  Search,
  Calendar,
  Building,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface OperationalExtensionTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  createdBy: {
    name: string;
    email: string;
  };
  branch: {
    name: string;
    code: string;
  };
  assignedTo: {
    name: string;
  } | null;
  fieldValues: {
    field: {
      name: string;
      label: string;
    };
    value: string;
  }[];
}

export default function OperationalExtensionReportPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<OperationalExtensionTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [branches, setBranches] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchBranches();
    fetchTickets();
  }, [dateFrom, dateTo, filterStatus, filterBranch]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('serviceName', 'Permintaan Perpanjangan Waktu Operasional');
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterBranch !== 'all') params.append('branchId', filterBranch);

      const response = await fetch(`/api/reports/operational-extension?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldValue = (ticket: OperationalExtensionTicket, fieldName: string) => {
    const fieldValue = ticket.fieldValues?.find(fv => fv.field.name === fieldName);
    return fieldValue?.value || '-';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
      'OPEN': { variant: 'warning', label: 'Open' },
      'IN_PROGRESS': { variant: 'default', label: 'In Progress' },
      'RESOLVED': { variant: 'success', label: 'Resolved' },
      'CLOSED': { variant: 'secondary', label: 'Closed' },
      'ON_HOLD': { variant: 'destructive', label: 'On Hold' }
    };
    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      ticket.ticketNumber.toLowerCase().includes(searchLower) ||
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.createdBy.name.toLowerCase().includes(searchLower) ||
      ticket.branch.name.toLowerCase().includes(searchLower) ||
      getFieldValue(ticket, 'nomor_surat_memo').toLowerCase().includes(searchLower) ||
      getFieldValue(ticket, 'alasan_operasional').toLowerCase().includes(searchLower)
    );
  });

  const exportToExcel = () => {
    const exportData = filteredTickets.map(ticket => ({
      'No. Tiket': ticket.ticketNumber,
      'Tanggal': format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: localeId }),
      'Cabang': `${ticket.branch.code} - ${ticket.branch.name}`,
      'Pemohon': ticket.createdBy.name,
      'Nomor Surat/Memo': getFieldValue(ticket, 'nomor_surat_memo'),
      'Jam Selesai': getFieldValue(ticket, 'jam_selesai'),
      'Alasan Operasional': getFieldValue(ticket, 'alasan_operasional'),
      'Status': ticket.status,
      'Ditugaskan Ke': ticket.assignedTo?.name || '-',
      'Tanggal Selesai': ticket.resolvedAt ? format(new Date(ticket.resolvedAt), 'dd/MM/yyyy HH:mm', { locale: localeId }) : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Perpanjangan Operasional');

    // Set column widths
    const colWidths = [
      { wch: 15 }, // No. Tiket
      { wch: 18 }, // Tanggal
      { wch: 30 }, // Cabang
      { wch: 25 }, // Pemohon
      { wch: 20 }, // Nomor Surat
      { wch: 15 }, // Jam Selesai
      { wch: 40 }, // Alasan
      { wch: 12 }, // Status
      { wch: 20 }, // Ditugaskan
      { wch: 18 }  // Tanggal Selesai
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Perpanjangan_Operasional_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const stats = {
    total: filteredTickets.length,
    open: filteredTickets.filter(t => t.status === 'OPEN').length,
    inProgress: filteredTickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: filteredTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Laporan Perpanjangan Waktu Operasional"
        description="Daftar permintaan perpanjangan waktu operasional cabang"
        icon={<Clock className="h-6 w-6" />}
        action={
          <Button onClick={exportToExcel} disabled={filteredTickets.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Permintaan</p>
              </div>
              <FileText className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-gradient-to-br from-warning/5 to-transparent dark:from-warning/10 dark:to-transparent shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.open}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
              <Clock className="h-8 w-8 text-warning/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-info/20 bg-gradient-to-br from-info/5 to-transparent dark:from-info/10 dark:to-transparent shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <RefreshCw className="h-8 w-8 text-info/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent dark:from-success/10 dark:to-transparent shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.resolved}</p>
                <p className="text-xs text-muted-foreground">Selesai</p>
              </div>
              <Building className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 shadow-sm border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari no. tiket, pemohon, cabang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          <Table className="border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                <TableHead>No. Tiket</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Pemohon</TableHead>
                <TableHead>No. Surat/Memo</TableHead>
                <TableHead>Jam Selesai</TableHead>
                <TableHead>Alasan</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Tidak ada data permintaan perpanjangan waktu operasional
                  </TableCell>
                </TableRow>
              ) : (
                filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      <a
                        href={`/tickets/${ticket.id}`}
                        className="text-primary hover:underline"
                      >
                        {ticket.ticketNumber}
                      </a>
                    </TableCell>
                    <TableCell>
                      {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: localeId })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{ticket.branch.code}</span>
                        <span className="text-muted-foreground text-xs block">
                          {ticket.branch.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{ticket.createdBy.name}</TableCell>
                    <TableCell>{getFieldValue(ticket, 'nomor_surat_memo')}</TableCell>
                    <TableCell>{getFieldValue(ticket, 'jam_selesai')}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={getFieldValue(ticket, 'alasan_operasional')}>
                      {getFieldValue(ticket, 'alasan_operasional')}
                    </TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
