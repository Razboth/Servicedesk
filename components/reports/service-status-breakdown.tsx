'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileDown,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface ServiceStatusData {
  serviceId: string;
  serviceName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  statusCounts: {
    OPEN: number;
    IN_PROGRESS: number;
    PENDING_APPROVAL: number;
    RESOLVED: number;
    CLOSED: number;
    CANCELLED: number;
  };
  totalCount: number;
}

interface CategoryData {
  categoryId: string;
  categoryName: string;
  services: ServiceStatusData[];
  totals: {
    OPEN: number;
    IN_PROGRESS: number;
    PENDING_APPROVAL: number;
    RESOLVED: number;
    CLOSED: number;
    CANCELLED: number;
    TOTAL: number;
  };
}

interface ReportData {
  report: CategoryData[];
  grandTotals: {
    OPEN: number;
    IN_PROGRESS: number;
    PENDING_APPROVAL: number;
    RESOLVED: number;
    CLOSED: number;
    CANCELLED: number;
    TOTAL: number;
  };
  metadata: {
    generatedAt: string;
    filters: {
      startDate?: string;
      endDate?: string;
      branchId?: string;
    };
    totalCategories: number;
    totalServices: number;
  };
}

export function ServiceStatusBreakdownReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    branchId: '',
  });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBranches();
    fetchReport();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.branchId) params.append('branchId', filters.branchId);

      const response = await fetch(`/api/reports/services/status-breakdown?${params}`);
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
        // Expand all categories by default
        setExpandedCategories(new Set(reportData.report.map((c: CategoryData) => c.categoryId)));
      } else {
        toast.error('Failed to fetch report data');
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('An error occurred while fetching the report');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'PENDING_APPROVAL': return <PauseCircle className="h-4 w-4 text-orange-500" />;
      case 'RESOLVED': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CLOSED': return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string, count: number) => {
    if (count === 0) return <span className="text-gray-400">-</span>;

    const colorMap: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
      RESOLVED: 'bg-green-100 text-green-700',
      CLOSED: 'bg-gray-100 text-gray-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={colorMap[status] || 'bg-gray-100 text-gray-700'}>
        {count}
      </Badge>
    );
  };

  const exportToExcel = () => {
    if (!data) return;

    const worksheetData: any[] = [];

    // Add headers
    worksheetData.push([
      'Category',
      'Service',
      'Subcategory',
      'OPEN',
      'IN PROGRESS',
      'PENDING APPROVAL',
      'RESOLVED',
      'CLOSED',
      'CANCELLED',
      'TOTAL',
    ]);

    // Add data rows
    data.report.forEach(category => {
      category.services.forEach(service => {
        worksheetData.push([
          category.categoryName,
          service.serviceName,
          service.subcategoryName || '',
          service.statusCounts.OPEN,
          service.statusCounts.IN_PROGRESS,
          service.statusCounts.PENDING_APPROVAL,
          service.statusCounts.RESOLVED,
          service.statusCounts.CLOSED,
          service.statusCounts.CANCELLED,
          service.totalCount,
        ]);
      });

      // Add category totals
      worksheetData.push([
        `${category.categoryName} - TOTAL`,
        '',
        '',
        category.totals.OPEN,
        category.totals.IN_PROGRESS,
        category.totals.PENDING_APPROVAL,
        category.totals.RESOLVED,
        category.totals.CLOSED,
        category.totals.CANCELLED,
        category.totals.TOTAL,
      ]);
    });

    // Add grand totals
    worksheetData.push([]);
    worksheetData.push([
      'GRAND TOTAL',
      '',
      '',
      data.grandTotals.OPEN,
      data.grandTotals.IN_PROGRESS,
      data.grandTotals.PENDING_APPROVAL,
      data.grandTotals.RESOLVED,
      data.grandTotals.CLOSED,
      data.grandTotals.CANCELLED,
      data.grandTotals.TOTAL,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Service Status Report');

    // Generate filename with date
    const fileName = `service_status_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.success('Report exported successfully');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle>Service Status Breakdown Report</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReport}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              disabled={!data || loading}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={filters.branchId || 'all'}
                onValueChange={(value) => setFilters({ ...filters, branchId: value === 'all' ? '' : value })}
              >
                <SelectTrigger id="branch">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading report...</p>
            </div>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Categories</p>
                      <p className="text-2xl font-bold">{data.metadata.totalCategories}</p>
                    </div>
                    <Package className="h-8 w-8 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Services</p>
                      <p className="text-2xl font-bold">{data.metadata.totalServices}</p>
                    </div>
                    <Layers className="h-8 w-8 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tickets</p>
                      <p className="text-2xl font-bold">{data.grandTotals.TOTAL}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Report Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Category / Service</TableHead>
                    <TableHead className="text-center">Open</TableHead>
                    <TableHead className="text-center">In Progress</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Resolved</TableHead>
                    <TableHead className="text-center">Closed</TableHead>
                    <TableHead className="text-center">Cancelled</TableHead>
                    <TableHead className="text-center font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.report.map((category) => (
                    <>
                      {/* Category Header Row */}
                      <TableRow
                        key={category.categoryId}
                        className="bg-gray-50 dark:bg-gray-800/50 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => toggleCategory(category.categoryId)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {expandedCategories.has(category.categoryId) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <Package className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{category.categoryName}</span>
                            <Badge variant="secondary" className="ml-2">
                              {category.services.length} services
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge('OPEN', category.totals.OPEN)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge('IN_PROGRESS', category.totals.IN_PROGRESS)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge('PENDING_APPROVAL', category.totals.PENDING_APPROVAL)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge('RESOLVED', category.totals.RESOLVED)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge('CLOSED', category.totals.CLOSED)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge('CANCELLED', category.totals.CANCELLED)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default">{category.totals.TOTAL}</Badge>
                        </TableCell>
                      </TableRow>

                      {/* Service Rows */}
                      {expandedCategories.has(category.categoryId) && category.services.map((service) => (
                        <TableRow key={service.serviceId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <TableCell className="pl-12">
                            <div className="flex flex-col">
                              <span className="text-sm">{service.serviceName}</span>
                              {service.subcategoryName && (
                                <span className="text-xs text-muted-foreground">{service.subcategoryName}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {service.statusCounts.OPEN > 0 ? (
                              <span className="font-medium">{service.statusCounts.OPEN}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {service.statusCounts.IN_PROGRESS > 0 ? (
                              <span className="font-medium">{service.statusCounts.IN_PROGRESS}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {service.statusCounts.PENDING_APPROVAL > 0 ? (
                              <span className="font-medium">{service.statusCounts.PENDING_APPROVAL}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {service.statusCounts.RESOLVED > 0 ? (
                              <span className="font-medium">{service.statusCounts.RESOLVED}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {service.statusCounts.CLOSED > 0 ? (
                              <span className="font-medium">{service.statusCounts.CLOSED}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {service.statusCounts.CANCELLED > 0 ? (
                              <span className="font-medium">{service.statusCounts.CANCELLED}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{service.totalCount}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}

                  {/* Grand Total Row */}
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>GRAND TOTAL</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-blue-600">
                        {data.grandTotals.OPEN}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-yellow-600">
                        {data.grandTotals.IN_PROGRESS}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-orange-600">
                        {data.grandTotals.PENDING_APPROVAL}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-green-600">
                        {data.grandTotals.RESOLVED}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-gray-600">
                        {data.grandTotals.CLOSED}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-red-600">
                        {data.grandTotals.CANCELLED}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-primary text-lg px-3 py-1">
                        {data.grandTotals.TOTAL}
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Report Metadata */}
            <div className="text-xs text-muted-foreground text-right mt-4">
              Generated at: {data.metadata.generatedAt ? format(new Date(data.metadata.generatedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}