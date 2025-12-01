'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { Download, RefreshCw, FileSpreadsheet, AlertTriangle, DollarSign, Clock, TrendingUp, Building2, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportData {
  summary: {
    totalTickets: number;
    totalAmount: number;
    avgResolutionTimeHours: number;
    resolvedCount: number;
    pendingCount: number;
  };
  statusBreakdown: Record<string, number>;
  atmBreakdown: Array<{ atm: string; count: number; totalAmount: number }>;
  discrepancyBreakdown: Array<{ type: string; count: number; totalAmount: number }>;
  branchBreakdown: Array<{ branch: string; count: number; totalAmount: number }>;
  monthlyTrend: Array<{ month: string; count: number; totalAmount: number }>;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    resolvedAt: string | null;
    closedAt: string | null;
    createdBy: { name: string; branch?: { name: string; code: string } } | null;
    assignedTo: { name: string } | null;
    branch: { name: string; code: string } | null;
    atmCode: string | null;
    atmLocation: string | null;
    discrepancyType: string | null;
    journalLog: string | null;
    transactionAmount: number | null;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  ON_HOLD: '#6b7280',
  RESOLVED: '#10b981',
  CLOSED: '#6366f1',
  CANCELLED: '#ef4444'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function ATMDiscrepancyReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('');
  const [atmCode, setAtmCode] = useState('');
  const [discrepancyType, setDiscrepancyType] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);
      if (atmCode) params.append('atmCode', atmCode);
      if (discrepancyType) params.append('discrepancyType', discrepancyType);

      const response = await fetch(`/api/reports/atm-discrepancy?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'default';
      case 'IN_PROGRESS': return 'secondary';
      case 'ON_HOLD': return 'outline';
      case 'RESOLVED': return 'default';
      case 'CLOSED': return 'default';
      case 'CANCELLED': return 'destructive';
      default: return 'outline';
    }
  };

  const exportToExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Laporan Penyelesaian Selisih ATM'],
      ['Periode', `${startDate} - ${endDate}`],
      [''],
      ['Ringkasan'],
      ['Total Tiket', data.summary.totalTickets],
      ['Total Nominal', data.summary.totalAmount],
      ['Rata-rata Waktu Penyelesaian (Jam)', data.summary.avgResolutionTimeHours],
      ['Tiket Terselesaikan', data.summary.resolvedCount],
      ['Tiket Pending', data.summary.pendingCount]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan');

    // Tickets detail sheet
    const ticketHeaders = [
      'No. Tiket',
      'Judul',
      'Status',
      'Prioritas',
      'Kode ATM',
      'Lokasi ATM',
      'Jenis Selisih',
      'Nominal Transaksi',
      'Log Jurnal',
      'Cabang',
      'Dibuat Oleh',
      'Ditugaskan Kepada',
      'Tanggal Dibuat',
      'Tanggal Selesai'
    ];
    const ticketRows = data.tickets.map(t => [
      t.ticketNumber,
      t.title,
      t.status,
      t.priority,
      t.atmCode || '-',
      t.atmLocation || '-',
      t.discrepancyType || '-',
      t.transactionAmount || 0,
      t.journalLog || '-',
      t.branch?.name || t.createdBy?.branch?.name || '-',
      t.createdBy?.name || '-',
      t.assignedTo?.name || '-',
      formatDate(t.createdAt),
      t.resolvedAt ? formatDate(t.resolvedAt) : '-'
    ]);
    const ticketsSheet = XLSX.utils.aoa_to_sheet([ticketHeaders, ...ticketRows]);
    XLSX.utils.book_append_sheet(wb, ticketsSheet, 'Detail Tiket');

    // ATM breakdown sheet
    const atmHeaders = ['Kode ATM', 'Jumlah Tiket', 'Total Nominal'];
    const atmRows = data.atmBreakdown.map(a => [a.atm, a.count, a.totalAmount]);
    const atmSheet = XLSX.utils.aoa_to_sheet([atmHeaders, ...atmRows]);
    XLSX.utils.book_append_sheet(wb, atmSheet, 'Berdasarkan ATM');

    // Discrepancy type breakdown sheet
    const typeHeaders = ['Jenis Selisih', 'Jumlah Tiket', 'Total Nominal'];
    const typeRows = data.discrepancyBreakdown.map(d => [d.type, d.count, d.totalAmount]);
    const typeSheet = XLSX.utils.aoa_to_sheet([typeHeaders, ...typeRows]);
    XLSX.utils.book_append_sheet(wb, typeSheet, 'Berdasarkan Jenis');

    // Branch breakdown sheet
    const branchHeaders = ['Cabang', 'Jumlah Tiket', 'Total Nominal'];
    const branchRows = data.branchBreakdown.map(b => [b.branch, b.count, b.totalAmount]);
    const branchSheet = XLSX.utils.aoa_to_sheet([branchHeaders, ...branchRows]);
    XLSX.utils.book_append_sheet(wb, branchSheet, 'Berdasarkan Cabang');

    // Monthly trend sheet
    const trendHeaders = ['Bulan', 'Jumlah Tiket', 'Total Nominal'];
    const trendRows = data.monthlyTrend.map(m => [m.month, m.count, m.totalAmount]);
    const trendSheet = XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]);
    XLSX.utils.book_append_sheet(wb, trendSheet, 'Tren Bulanan');

    // Download
    XLSX.writeFile(wb, `Laporan_Selisih_ATM_${startDate}_${endDate}.xlsx`);
  };

  const statusChartData = data ? Object.entries(data.statusBreakdown)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      color: STATUS_COLORS[status] || '#6b7280'
    })) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchReport}>Coba Lagi</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan Penyelesaian Selisih ATM</h1>
          <p className="text-muted-foreground">
            Permintaan Penyelesaian Selisih ATM - ATM Services &gt; Reporting & Reconciliation
          </p>
        </div>
        <Button onClick={exportToExcel} disabled={!data}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Status</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kode ATM</Label>
              <Input
                placeholder="Cari kode ATM..."
                value={atmCode}
                onChange={(e) => setAtmCode(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Terapkan Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tiket</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalTickets}</div>
              <p className="text-xs text-muted-foreground">
                {data.summary.pendingCount} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Nominal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Dari semua tiket
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terselesaikan</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{data.summary.resolvedCount}</div>
              <p className="text-xs text-muted-foreground">
                {data.summary.totalTickets > 0
                  ? `${Math.round((data.summary.resolvedCount / data.summary.totalTickets) * 100)}% tingkat penyelesaian`
                  : '0% tingkat penyelesaian'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Waktu</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.avgResolutionTimeHours}j</div>
              <p className="text-xs text-muted-foreground">
                Waktu penyelesaian
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ATM Terdampak</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.atmBreakdown.length}</div>
              <p className="text-xs text-muted-foreground">
                ATM unik
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tren Bulanan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'totalAmount') {
                          return [formatCurrency(value), 'Total Nominal'];
                        }
                        return [value, 'Jumlah Tiket'];
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="count"
                      name="Jumlah Tiket"
                      stroke="#3b82f6"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="totalAmount"
                      name="Total Nominal"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top ATMs and Discrepancy Types */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top ATMs */}
          <Card>
            <CardHeader>
              <CardTitle>ATM dengan Selisih Terbanyak</CardTitle>
              <CardDescription>Top 10 ATM berdasarkan jumlah tiket</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.atmBreakdown.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="atm"
                      type="category"
                      width={110}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'totalAmount') {
                          return [formatCurrency(value), 'Total Nominal'];
                        }
                        return [value, 'Jumlah'];
                      }}
                    />
                    <Bar dataKey="count" name="Jumlah" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Discrepancy Types */}
          <Card>
            <CardHeader>
              <CardTitle>Berdasarkan Jenis Selisih</CardTitle>
              <CardDescription>Distribusi berdasarkan jenis selisih</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.discrepancyBreakdown.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="type"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'totalAmount') {
                          return [formatCurrency(value), 'Total Nominal'];
                        }
                        return [value, 'Jumlah'];
                      }}
                    />
                    <Bar dataKey="count" name="Jumlah" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branch Breakdown */}
      {data && data.branchBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Berdasarkan Cabang</CardTitle>
            <CardDescription>Distribusi tiket per cabang</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.branchBreakdown.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="branch"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'totalAmount') {
                        return [formatCurrency(value), 'Total Nominal'];
                      }
                      return [value, 'Jumlah'];
                    }}
                  />
                  <Bar dataKey="count" name="Jumlah Tiket" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets Table */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>Detail Tiket</CardTitle>
            <CardDescription>
              Menampilkan {data.tickets.length} tiket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Tiket</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Kode ATM</TableHead>
                    <TableHead>Lokasi ATM</TableHead>
                    <TableHead>Jenis Selisih</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Dibuat Oleh</TableHead>
                    <TableHead>Ditugaskan</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">
                        <a
                          href={`/tickets/${ticket.ticketNumber}`}
                          className="text-blue-600 hover:underline"
                        >
                          {ticket.ticketNumber}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(ticket.status)}
                          style={{ backgroundColor: STATUS_COLORS[ticket.status], color: 'white' }}
                        >
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {ticket.atmCode || '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={ticket.atmLocation || ''}>
                        {ticket.atmLocation || '-'}
                      </TableCell>
                      <TableCell>{ticket.discrepancyType || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {ticket.transactionAmount ? formatCurrency(ticket.transactionAmount) : '-'}
                      </TableCell>
                      <TableCell>
                        {ticket.branch?.name || ticket.createdBy?.branch?.name || '-'}
                      </TableCell>
                      <TableCell>{ticket.createdBy?.name || '-'}</TableCell>
                      <TableCell>{ticket.assignedTo?.name || '-'}</TableCell>
                      <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {data.tickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Tidak ada data untuk periode ini
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
