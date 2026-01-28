'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Calendar,
  Download,
  FileSpreadsheet,
  Search,
  Building,
  FileText,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface HolidayBranchTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  claimedAt: string | null;
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
  approvalStatus: string | null;
  approvedBy: string | null;
  approvalReason: string | null;
  fieldValues: {
    field: {
      name: string;
      label: string;
    };
    value: string;
  }[];
}

export default function HolidayBranchOperationReportPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<HolidayBranchTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchTickets();
  }, [dateFrom, dateTo, filterStatus]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/reports/holiday-branch-operation?${params}`);
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

  const getFieldValue = (ticket: HolidayBranchTicket, fieldName: string) => {
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

  const getApprovalBadge = (status: string | null) => {
    if (!status) return <span className="text-muted-foreground text-xs">-</span>;
    const approvalConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
      'PENDING': { variant: 'warning', label: 'Pending' },
      'APPROVED': { variant: 'success', label: 'Approved' },
      'REJECTED': { variant: 'destructive', label: 'Rejected' }
    };
    const config = approvalConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Collect all unique dynamic field names from tickets
  const dynamicFieldNames = Array.from(
    new Set(
      tickets.flatMap(t => t.fieldValues.map(fv => fv.field.name))
    )
  );
  const dynamicFieldLabels: Record<string, string> = {};
  tickets.forEach(t => {
    t.fieldValues.forEach(fv => {
      if (!dynamicFieldLabels[fv.field.name]) {
        dynamicFieldLabels[fv.field.name] = fv.field.label || fv.field.name;
      }
    });
  });

  const filteredTickets = tickets.filter(ticket => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      ticket.ticketNumber.toLowerCase().includes(searchLower) ||
      ticket.title.toLowerCase().includes(searchLower) ||
      ticket.createdBy.name.toLowerCase().includes(searchLower) ||
      ticket.branch.name.toLowerCase().includes(searchLower) ||
      (ticket.assignedTo?.name || '').toLowerCase().includes(searchLower) ||
      (ticket.approvedBy || '').toLowerCase().includes(searchLower) ||
      ticket.fieldValues.some(fv => fv.value.toLowerCase().includes(searchLower))
    );
  });

  const exportToExcel = () => {
    const exportData = filteredTickets.map(ticket => {
      const row: Record<string, string> = {
        'No. Tiket': ticket.ticketNumber,
        'Tanggal': format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: localeId }),
        'Cabang': `${ticket.branch.code} - ${ticket.branch.name}`,
        'Pemohon': ticket.createdBy.name,
        'Diklaim Oleh': ticket.assignedTo?.name || '-',
        'Waktu Klaim': ticket.claimedAt ? format(new Date(ticket.claimedAt), 'dd/MM/yyyy HH:mm', { locale: localeId }) : '-',
        'Status Approval': ticket.approvalStatus || '-',
        'Approved By': ticket.approvedBy || '-',
      };

      // Add dynamic fields
      dynamicFieldNames.forEach(fieldName => {
        const label = dynamicFieldLabels[fieldName] || fieldName;
        row[label] = getFieldValue(ticket, fieldName);
      });

      row['Status'] = ticket.status;
      row['Tanggal Selesai'] = ticket.resolvedAt ? format(new Date(ticket.resolvedAt), 'dd/MM/yyyy HH:mm', { locale: localeId }) : '-';

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pembukaan Hari Libur');

    // Set column widths
    const colWidths = [
      { wch: 15 }, // No. Tiket
      { wch: 18 }, // Tanggal
      { wch: 30 }, // Cabang
      { wch: 25 }, // Pemohon
      { wch: 25 }, // Diklaim Oleh
      { wch: 18 }, // Waktu Klaim
      { wch: 15 }, // Status Approval
      { wch: 25 }, // Approved By
      ...dynamicFieldNames.map(() => ({ wch: 25 })),
      { wch: 12 }, // Status
      { wch: 18 }, // Tanggal Selesai
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Pembukaan_Operasional_Hari_Libur_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const stats = {
    total: filteredTickets.length,
    open: filteredTickets.filter(t => t.status === 'OPEN').length,
    inProgress: filteredTickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: filteredTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length
  };

  const fixedColCount = 8 + dynamicFieldNames.length;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <PageHeader
        title="Laporan Pembukaan Operasional Cabang di Hari Libur"
        description="Rekap permintaan pembukaan operasional cabang pada hari libur"
        icon={<Calendar className="h-6 w-6" />}
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
          <div className="overflow-x-auto">
            <Table className="border-separate border-spacing-0">
              <TableHeader>
                <TableRow>
                  <TableHead>No. Tiket</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Pemohon</TableHead>
                  <TableHead>Diklaim Oleh / Waktu Klaim</TableHead>
                  <TableHead>Approval</TableHead>
                  {dynamicFieldNames.map(fieldName => (
                    <TableHead key={fieldName}>
                      {dynamicFieldLabels[fieldName] || fieldName}
                    </TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={fixedColCount} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={fixedColCount} className="text-center py-8 text-muted-foreground">
                      Tidak ada data permintaan pembukaan operasional cabang di hari libur
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
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {ticket.assignedTo?.name || '-'}
                          </span>
                          {ticket.claimedAt && (
                            <span className="text-muted-foreground text-xs block">
                              {format(new Date(ticket.claimedAt), 'dd/MM/yyyy HH:mm', { locale: localeId })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {getApprovalBadge(ticket.approvalStatus)}
                          {ticket.approvedBy && (
                            <span className="text-muted-foreground text-xs block mt-1">
                              {ticket.approvedBy}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {dynamicFieldNames.map(fieldName => (
                        <TableCell key={fieldName} className="max-w-[200px] truncate" title={getFieldValue(ticket, fieldName)}>
                          {getFieldValue(ticket, fieldName)}
                        </TableCell>
                      ))}
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
