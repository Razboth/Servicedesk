'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  Tags,
  BarChart3,
  Calendar,
  Target,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import * as XLSX from 'xlsx';

interface QuarterlyData {
  period: {
    year: number;
    quarter: number;
    quarterLabel: string;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    overdueTickets: number;
    resolutionRate: number;
    avgResolutionHours: number;
    slaComplianceRate: number;
    comparison: {
      prevQuarterTickets: number;
      ticketGrowth: number;
    };
  };
  statusDistribution: { status: string; count: number; percentage: number }[];
  priorityDistribution: { priority: string; count: number; percentage: number }[];
  categoryBreakdown: { categoryId: string; categoryName: string; count: number; percentage: number }[];
  branchBreakdown: {
    branchId: string;
    branchName: string;
    branchCode: string;
    totalTickets: number;
    percentage: number;
    categories: { categoryName: string; count: number }[];
  }[];
  topTechnicians: {
    technicianId: string;
    technicianName: string;
    assignedTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
  }[];
  monthlyTrend: {
    month: string;
    monthNum: number;
    total: number;
    resolved: number;
    open: number;
  }[];
}

const COLORS = [
  '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA',
  '#00ACC1', '#5E35B1', '#F4511E', '#3949AB', '#7CB342',
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#1E88E5',
  IN_PROGRESS: '#FB8C00',
  PENDING: '#8E24AA',
  RESOLVED: '#43A047',
  CLOSED: '#546E7A',
  CANCELLED: '#E53935',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#E53935',
  HIGH: '#FB8C00',
  MEDIUM: '#1E88E5',
  LOW: '#43A047',
};

export default function QuarterlyReportPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<QuarterlyData | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  // Quarter selection
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const quarters = [1, 2, 3, 4];

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/reports/quarterly?year=${selectedYear}&quarter=${selectedQuarter}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
      // Expand first 5 branches by default
      const firstFive = result.data.branchBreakdown.slice(0, 5).map((b: any) => b.branchId);
      setExpandedBranches(new Set(firstFive));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, selectedYear, selectedQuarter]);

  const toggleBranch = (branchId: string) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) {
        next.delete(branchId);
      } else {
        next.add(branchId);
      }
      return next;
    });
  };

  const exportToExcel = () => {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Quarterly Report', data.period.quarterLabel],
      ['Period', `${format(new Date(data.period.startDate), 'dd MMM yyyy')} - ${format(new Date(data.period.endDate), 'dd MMM yyyy')}`],
      [],
      ['SUMMARY'],
      ['Total Tickets', data.summary.totalTickets],
      ['Resolved Tickets', data.summary.resolvedTickets],
      ['Open Tickets', data.summary.openTickets],
      ['Overdue Tickets', data.summary.overdueTickets],
      ['Resolution Rate', `${data.summary.resolutionRate}%`],
      ['Avg Resolution Time', `${data.summary.avgResolutionHours} hours`],
      ['SLA Compliance', `${data.summary.slaComplianceRate}%`],
      ['Previous Quarter', data.summary.comparison.prevQuarterTickets],
      ['Growth', `${data.summary.comparison.ticketGrowth}%`],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Category breakdown
    const categoryData = data.categoryBreakdown.map((c) => ({
      Category: c.categoryName,
      Count: c.count,
      Percentage: `${c.percentage.toFixed(1)}%`,
    }));
    const categoryWs = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, categoryWs, 'Categories');

    // Branch breakdown
    const branchRows: any[] = [];
    for (const branch of data.branchBreakdown) {
      for (const cat of branch.categories) {
        branchRows.push({
          Branch: branch.branchName,
          'Branch Code': branch.branchCode,
          Category: cat.categoryName,
          Count: cat.count,
        });
      }
      branchRows.push({
        Branch: branch.branchName,
        'Branch Code': branch.branchCode,
        Category: 'TOTAL',
        Count: branch.totalTickets,
      });
      branchRows.push({});
    }
    const branchWs = XLSX.utils.json_to_sheet(branchRows);
    XLSX.utils.book_append_sheet(wb, branchWs, 'Branch Breakdown');

    // Technicians
    const techData = data.topTechnicians.map((t) => ({
      Technician: t.technicianName,
      Assigned: t.assignedTickets,
      Resolved: t.resolvedTickets,
      'Resolution Rate': `${t.resolutionRate.toFixed(1)}%`,
    }));
    const techWs = XLSX.utils.json_to_sheet(techData);
    XLSX.utils.book_append_sheet(wb, techWs, 'Technicians');

    // Monthly trend
    const trendData = data.monthlyTrend.map((m) => ({
      Month: m.month,
      Total: m.total,
      Resolved: m.resolved,
      Open: m.open,
    }));
    const trendWs = XLSX.utils.json_to_sheet(trendData);
    XLSX.utils.book_append_sheet(wb, trendWs, 'Monthly Trend');

    const fileName = `Quarterly-Report-Q${selectedQuarter}-${selectedYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Report exported successfully');
  };

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours.toFixed(1)} jam`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} hari ${remainingHours.toFixed(0)} jam`;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Laporan Kuartal
          </h1>
          <p className="text-muted-foreground">
            Ringkasan performa dan statistik tiket per kuartal
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToExcel} disabled={!data}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Quarter Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tahun</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Kuartal</label>
              <Select
                value={selectedQuarter.toString()}
                onValueChange={(v) => setSelectedQuarter(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quarters.map((q) => (
                    <SelectItem key={q} value={q.toString()}>
                      Q{q} ({['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'][q - 1]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data && (
              <div className="text-sm text-muted-foreground">
                <Calendar className="inline h-4 w-4 mr-1" />
                {format(new Date(data.period.startDate), 'dd MMM yyyy', { locale: idLocale })} -{' '}
                {format(new Date(data.period.endDate), 'dd MMM yyyy', { locale: idLocale })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ticket</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalTickets.toLocaleString()}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {data.summary.comparison.ticketGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={data.summary.comparison.ticketGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {data.summary.comparison.ticketGrowth > 0 ? '+' : ''}{data.summary.comparison.ticketGrowth}%
                  </span>
                  <span className="ml-1">vs kuartal sebelumnya</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.resolutionRate}%</div>
                <Progress value={data.summary.resolutionRate} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.summary.resolvedTickets} dari {data.summary.totalTickets} ticket
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatHours(data.summary.avgResolutionHours)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Rata-rata waktu penyelesaian
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.slaComplianceRate}%</div>
                <Progress
                  value={data.summary.slaComplianceRate}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {data.summary.overdueTickets} ticket overdue
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trend Bulanan</CardTitle>
              <CardDescription>Jumlah tiket per bulan dalam kuartal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="total"
                      name="Total"
                      stroke="#1E88E5"
                      fill="#1E88E5"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      name="Resolved"
                      stroke="#43A047"
                      fill="#43A047"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="status"
                      >
                        {data.statusDistribution.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#888'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {data.statusDistribution.map((s) => (
                    <Badge
                      key={s.status}
                      variant="outline"
                      style={{ borderColor: STATUS_COLORS[s.status] }}
                    >
                      {s.status}: {s.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.priorityDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="priority"
                      >
                        {data.priorityDistribution.map((entry) => (
                          <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#888'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => value.toLocaleString()} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {data.priorityDistribution.map((p) => (
                    <Badge
                      key={p.priority}
                      variant="outline"
                      style={{ borderColor: PRIORITY_COLORS[p.priority] }}
                    >
                      {p.priority}: {p.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Kategori</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.categoryBreakdown.slice(0, 6).map((cat, i) => (
                    <div key={cat.categoryId} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="truncate">{cat.categoryName}</span>
                          <span className="font-medium ml-2">{cat.count}</span>
                        </div>
                        <Progress value={cat.percentage} className="h-1 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Technicians */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Technicians
              </CardTitle>
              <CardDescription>Teknisi dengan performa terbaik</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Resolved</TableHead>
                    <TableHead className="text-right">Resolution Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topTechnicians.map((tech, i) => (
                    <TableRow key={tech.technicianId}>
                      <TableCell>
                        <Badge variant={i < 3 ? 'default' : 'secondary'}>#{i + 1}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{tech.technicianName}</TableCell>
                      <TableCell className="text-right">{tech.assignedTickets}</TableCell>
                      <TableCell className="text-right">{tech.resolvedTickets}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={tech.resolutionRate} className="w-16 h-2" />
                          <span className="w-12 text-right">{tech.resolutionRate.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Branch Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Breakdown per Cabang
              </CardTitle>
              <CardDescription>Tiket per cabang dengan breakdown kategori</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Cabang</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead>Top Kategori</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.branchBreakdown.map((branch) => (
                      <>
                        <TableRow
                          key={branch.branchId}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleBranch(branch.branchId)}
                        >
                          <TableCell>
                            {expandedBranches.has(branch.branchId) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{branch.branchName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{branch.branchCode}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {branch.totalTickets.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {branch.percentage.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            {branch.categories.slice(0, 2).map((cat, i) => (
                              <Badge
                                key={cat.categoryName}
                                variant="secondary"
                                className="mr-1"
                                style={{ backgroundColor: `${COLORS[i % COLORS.length]}20` }}
                              >
                                {cat.categoryName}: {cat.count}
                              </Badge>
                            ))}
                          </TableCell>
                        </TableRow>
                        {expandedBranches.has(branch.branchId) && (
                          <TableRow key={`${branch.branchId}-expanded`}>
                            <TableCell colSpan={6} className="bg-muted/30 p-4">
                              <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                                {branch.categories.map((cat, i) => (
                                  <div
                                    key={cat.categoryName}
                                    className="flex items-center justify-between p-2 rounded-md bg-background border"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                      />
                                      <span className="text-sm truncate">{cat.categoryName}</span>
                                    </div>
                                    <span className="font-bold">{cat.count}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
