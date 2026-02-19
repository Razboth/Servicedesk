'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Printer,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import Image from 'next/image';

interface ExecutiveSummaryData {
  period: { month: number; year: number; label: string };
  summary: {
    totalTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    openTickets: number;
    inProgressTickets: number;
    pendingTickets: number;
    avgResolutionHours: number;
    slaCompliancePercent: number;
    firstResponseAvgHours: number;
  };
  comparison: {
    ticketChange: number;
    slaChange: number;
    resolutionTimeChange: number;
  };
  byStatus: Array<{ status: string; count: number; percentage: number }>;
  byPriority: Array<{ priority: string; count: number; avgHours: number; slaCompliance: number }>;
  byService: Array<{ name: string; count: number; percentage: number }>;
  byCategory: Array<{ category: string; count: number; percentage: number }>;
  dailyTrend: Array<{ date: string; count: number; resolved: number }>;
  topPerformers: Array<{
    name: string;
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionHours: number;
    slaCompliance: number;
  }>;
  topServices: Array<{ name: string; count: number; percentage: number }>;
  highlights: string[];
}

const MONTHS = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const STATUS_COLORS = [
  '#22c55e', // green - resolved/closed
  '#3b82f6', // blue - in progress
  '#f59e0b', // amber - pending
  '#ef4444', // red - open
  '#8b5cf6', // purple - other
  '#06b6d4', // cyan
  '#ec4899', // pink
];

const PRIORITY_COLORS: Record<string, string> = {
  'Darurat': '#dc2626',
  'Kritis': '#ef4444',
  'Tinggi': '#f59e0b',
  'Sedang': '#3b82f6',
  'Rendah': '#22c55e',
};

export default function ExecutiveSummaryPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [data, setData] = useState<ExecutiveSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/reports/executive-summary?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Gagal memuat data');
      const result = await res.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat laporan ringkasan eksekutif');
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/reports/executive-summary/export?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Gagal mengekspor PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Executive-Summary-${data?.period.label || `${month}-${year}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF berhasil diunduh');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Gagal mengekspor PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const renderChangeIndicator = (value: number, inverse = false) => {
    const isPositive = inverse ? value < 0 : value > 0;
    const isNegative = inverse ? value > 0 : value < 0;

    if (value === 0) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }

    return isPositive ? (
      <span className="flex items-center text-green-600">
        <ArrowUpRight className="h-4 w-4" />
        {Math.abs(value).toFixed(1)}%
      </span>
    ) : (
      <span className="flex items-center text-red-600">
        <ArrowDownRight className="h-4 w-4" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12 text-muted-foreground">
          Tidak ada data tersedia
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .executive-summary-page {
            width: 210mm;
            min-height: 297mm;
            padding: 10mm 15mm;
            margin: 0 auto;
            background: white !important;
          }
          .page-break {
            page-break-before: always;
          }
          .avoid-break {
            break-inside: avoid;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      <div className="container mx-auto py-6 space-y-6 executive-summary-page" ref={reportRef}>
        {/* Print Header */}
        <div className="print-only border-b-2 border-[#c81e1e] pb-4 mb-6">
          <div className="flex items-center justify-between">
            <Image
              src="/logo-bsg.png"
              alt="Bank SulutGo"
              width={120}
              height={40}
              className="object-contain"
            />
            <div className="text-right">
              <h1 className="text-xl font-bold text-[#c81e1e]">EXECUTIVE SUMMARY REPORT</h1>
              <p className="text-sm text-gray-600">IT Service Desk</p>
              <p className="text-sm font-medium">{data.period.label}</p>
            </div>
          </div>
        </div>

        {/* Screen Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Ringkasan Eksekutif
            </h1>
            <p className="text-muted-foreground">
              Laporan kinerja bulanan IT Service Desk
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting}>
              <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
              Export PDF
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 avoid-break">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Tiket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.summary.totalTickets}</div>
              <div className="flex items-center gap-1 text-sm mt-1">
                {renderChangeIndicator(data.comparison.ticketChange)}
                <span className="text-muted-foreground ml-1">vs bulan lalu</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tiket Selesai
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.summary.resolvedTickets + data.summary.closedTickets}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {data.summary.totalTickets > 0
                  ? Math.round(((data.summary.resolvedTickets + data.summary.closedTickets) / data.summary.totalTickets) * 100)
                  : 0}% dari total tiket
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#c81e1e]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                SLA Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.summary.slaCompliancePercent}%</div>
              <div className="flex items-center gap-1 text-sm mt-1">
                {renderChangeIndicator(data.comparison.slaChange)}
                <span className="text-muted-foreground ml-1">vs bulan lalu</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Waktu Resolusi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.summary.avgResolutionHours} <span className="text-lg font-normal">jam</span></div>
              <div className="flex items-center gap-1 text-sm mt-1">
                {renderChangeIndicator(data.comparison.resolutionTimeChange, true)}
                <span className="text-muted-foreground ml-1">vs bulan lalu</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2 avoid-break">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribusi Status</CardTitle>
              <CardDescription>Breakdown tiket berdasarkan status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.byStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ status, percentage }) => `${status}: ${percentage}%`}
                      labelLine={false}
                    >
                      {data.byStatus.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, 'Tiket']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {data.byStatus.map((item, index) => (
                  <div key={item.status} className="flex items-center gap-1 text-xs">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }}
                    />
                    <span>{item.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tren Harian</CardTitle>
              <CardDescription>Tiket masuk dan selesai per hari</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('id-ID', { dateStyle: 'medium' });
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Tiket Masuk"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      name="Tiket Selesai"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority & Category Row */}
        <div className="grid gap-6 lg:grid-cols-2 avoid-break">
          {/* By Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tiket per Prioritas</CardTitle>
              <CardDescription>Jumlah dan SLA compliance per level prioritas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byPriority} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="priority" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Jumlah" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {data.byPriority.map((item) => (
                  <div key={item.priority} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.priority}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        Avg: {item.avgHours}j
                      </span>
                      <Badge
                        variant={item.slaCompliance >= 90 ? 'default' : item.slaCompliance >= 75 ? 'secondary' : 'destructive'}
                      >
                        SLA: {item.slaCompliance}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* By Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tiket per Kategori</CardTitle>
              <CardDescription>Distribusi tiket berdasarkan kategori layanan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byCategory.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="category"
                      type="category"
                      width={120}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => value.length > 18 ? value.slice(0, 18) + '...' : value}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="Jumlah" fill="#c81e1e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Services */}
        <Card className="avoid-break">
          <CardHeader>
            <CardTitle className="text-base">Top 10 Layanan Paling Banyak</CardTitle>
            <CardDescription>Layanan dengan jumlah tiket terbanyak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Layanan</th>
                    <th className="text-right py-2 px-2">Jumlah</th>
                    <th className="text-right py-2 px-2">Persentase</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topServices.map((service, index) => (
                    <tr key={service.name} className="border-b">
                      <td className="py-2 px-2 text-muted-foreground">{index + 1}</td>
                      <td className="py-2 px-2">{service.name}</td>
                      <td className="py-2 px-2 text-right font-medium">{service.count}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#c81e1e] rounded-full"
                              style={{ width: `${service.percentage}%` }}
                            />
                          </div>
                          <span className="w-12 text-right">{service.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="avoid-break">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top Performer
            </CardTitle>
            <CardDescription>Teknisi dengan kinerja terbaik bulan ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Nama</th>
                    <th className="text-right py-2 px-2">Tiket</th>
                    <th className="text-right py-2 px-2">Selesai</th>
                    <th className="text-right py-2 px-2">Rata-rata</th>
                    <th className="text-right py-2 px-2">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPerformers.slice(0, 10).map((tech, index) => (
                    <tr key={tech.name} className="border-b">
                      <td className="py-2 px-2 text-muted-foreground">{index + 1}</td>
                      <td className="py-2 px-2 font-medium">{tech.name}</td>
                      <td className="py-2 px-2 text-right">{tech.totalTickets}</td>
                      <td className="py-2 px-2 text-right">{tech.resolvedTickets}</td>
                      <td className="py-2 px-2 text-right">{tech.avgResolutionHours}j</td>
                      <td className="py-2 px-2 text-right">
                        <Badge
                          variant={tech.slaCompliance >= 90 ? 'default' : tech.slaCompliance >= 75 ? 'secondary' : 'destructive'}
                        >
                          {tech.slaCompliance}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Highlights */}
        <Card className="avoid-break border-l-4 border-l-[#c81e1e]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Catatan & Highlights
            </CardTitle>
            <CardDescription>Insight dan temuan penting bulan ini</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.highlights.map((highlight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-[#c81e1e] font-bold mt-0.5">•</span>
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Print Footer */}
        <div className="print-only border-t pt-4 mt-8 text-center text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Bank SulutGo IT Service Desk</span>
            <span>Halaman 1</span>
            <span>Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
          </div>
        </div>
      </div>
    </>
  );
}
