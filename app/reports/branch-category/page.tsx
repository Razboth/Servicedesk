'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Download, CalendarIcon, Building2, Tags, ChevronDown, ChevronRight } from 'lucide-react';
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
} from 'recharts';
import * as XLSX from 'xlsx';

interface CategoryCount {
  categoryId: string;
  categoryName: string;
  count: number;
}

interface BranchData {
  branchId: string;
  branchName: string;
  branchCode: string;
  totalTickets: number;
  categories: CategoryCount[];
}

interface ReportData {
  dateRange: {
    start: string;
    end: string;
  };
  totalTickets: number;
  branchData: BranchData[];
  categorySummary: CategoryCount[];
  allCategories: { id: string; name: string }[];
}

const COLORS = [
  '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA',
  '#00ACC1', '#5E35B1', '#F4511E', '#3949AB', '#7CB342',
  '#C0CA33', '#039BE5', '#00897B', '#6D4C41', '#546E7A',
];

export default function BranchCategoryReportPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());

  // Date range state
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  // Quick date range presets
  const [datePreset, setDatePreset] = useState<string>('this-month');

  const applyDatePreset = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case 'this-month':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'last-3-months':
        setStartDate(startOfMonth(subMonths(now, 2)));
        setEndDate(endOfMonth(now));
        break;
      case 'last-6-months':
        setStartDate(startOfMonth(subMonths(now, 5)));
        setEndDate(endOfMonth(now));
        break;
      case 'this-year':
        setStartDate(new Date(now.getFullYear(), 0, 1));
        setEndDate(new Date(now.getFullYear(), 11, 31));
        break;
    }
    setDatePreset(preset);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });

      const response = await fetch(`/api/reports/branch-category?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
      // Expand first 5 branches by default
      const firstFive = result.data.branchData.slice(0, 5).map((b: BranchData) => b.branchId);
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
  }, [session, startDate, endDate]);

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

  const expandAll = () => {
    if (data) {
      setExpandedBranches(new Set(data.branchData.map((b) => b.branchId)));
    }
  };

  const collapseAll = () => {
    setExpandedBranches(new Set());
  };

  const exportToExcel = () => {
    if (!data) return;

    // Prepare data for Excel
    const rows: any[] = [];

    for (const branch of data.branchData) {
      for (const cat of branch.categories) {
        rows.push({
          'Branch': branch.branchName,
          'Branch Code': branch.branchCode,
          'Category': cat.categoryName,
          'Ticket Count': cat.count,
          'Percentage': branch.totalTickets > 0
            ? `${((cat.count / branch.totalTickets) * 100).toFixed(1)}%`
            : '0%',
        });
      }
      // Add subtotal row
      rows.push({
        'Branch': branch.branchName,
        'Branch Code': branch.branchCode,
        'Category': 'TOTAL',
        'Ticket Count': branch.totalTickets,
        'Percentage': '100%',
      });
      // Empty row for separation
      rows.push({});
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Branch Category Report');

    // Add summary sheet
    const summaryRows = data.categorySummary.map((cat) => ({
      'Category': cat.categoryName,
      'Total Tickets': cat.count,
      'Percentage': `${((cat.count / data.totalTickets) * 100).toFixed(1)}%`,
    }));
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Category Summary');

    const fileName = `Branch-Category-Report-${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Report exported successfully');
  };

  // Prepare chart data
  const topBranchesData = data?.branchData.slice(0, 10).map((b) => ({
    name: b.branchCode || b.branchName.substring(0, 15),
    fullName: b.branchName,
    tickets: b.totalTickets,
  })) || [];

  const categoryPieData = data?.categorySummary.slice(0, 8).map((c, i) => ({
    name: c.categoryName,
    value: c.count,
    color: COLORS[i % COLORS.length],
  })) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Ticket per Cabang & Kategori
          </h1>
          <p className="text-muted-foreground">
            Analisis distribusi tiket berdasarkan cabang dan kategori
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Preset */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Periode</label>
              <Select value={datePreset} onValueChange={applyDatePreset}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">Bulan Ini</SelectItem>
                  <SelectItem value="last-month">Bulan Lalu</SelectItem>
                  <SelectItem value="last-3-months">3 Bulan Terakhir</SelectItem>
                  <SelectItem value="last-6-months">6 Bulan Terakhir</SelectItem>
                  <SelectItem value="this-year">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dari Tanggal</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'dd MMM yyyy', { locale: idLocale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sampai Tanggal</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, 'dd MMM yyyy', { locale: idLocale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Ticket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.totalTickets.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cabang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.branchData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.categorySummary.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Branches Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Cabang</CardTitle>
              <CardDescription>Cabang dengan tiket terbanyak</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBranchesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString(), 'Tickets']}
                      labelFormatter={(label) => {
                        const item = topBranchesData.find((d) => d.name === label);
                        return item?.fullName || label;
                      }}
                    />
                    <Bar dataKey="tickets" fill="#E53935" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribusi Kategori</CardTitle>
              <CardDescription>Persentase tiket per kategori</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Branch Table */}
      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Detail per Cabang</CardTitle>
                <CardDescription>Klik cabang untuk melihat breakdown kategori</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Cabang</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead className="text-right">Total Ticket</TableHead>
                    <TableHead>Top Kategori</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.branchData.map((branch) => (
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
                        <TableCell>
                          {branch.categories.slice(0, 3).map((cat, i) => (
                            <Badge
                              key={cat.categoryId}
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
                          <TableCell colSpan={5} className="bg-muted/30 p-4">
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                              {branch.categories.map((cat, i) => (
                                <div
                                  key={cat.categoryId}
                                  className="flex items-center justify-between p-2 rounded-md bg-background border"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                    />
                                    <span className="text-sm">{cat.categoryName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">{cat.count}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({((cat.count / branch.totalTickets) * 100).toFixed(1)}%)
                                    </span>
                                  </div>
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
