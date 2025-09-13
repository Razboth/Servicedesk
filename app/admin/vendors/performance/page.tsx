'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  BarChart3,
  FileText,
  Download,
  Users,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

export default function VendorPerformanceReportPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('3months');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [reportData, setReportData] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    fetchPerformanceData();
  }, [period, selectedVendor]);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/vendors');
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period,
        ...(selectedVendor !== 'all' && { vendorId: selectedVendor })
      });
      
      const response = await fetch(`/api/reports/vendor-performance?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;
    
    const csvContent = [
      ['Vendor Performance Report'],
      [`Period: ${reportData.period.label}`],
      [''],
      ['Vendor', 'Total Tickets', 'Resolved', 'Pending', 'Resolution Rate', 'Avg Response (hrs)', 'Avg Resolution (hrs)', 'SLA Compliance'],
      ...reportData.vendors.map((v: any) => [
        v.vendor.name,
        v.metrics.totalTickets,
        v.metrics.resolvedTickets,
        v.metrics.pendingTickets,
        `${v.metrics.resolutionRate}%`,
        v.metrics.avgResponseTimeHours,
        v.metrics.avgResolutionTimeHours,
        `${v.metrics.slaComplianceRate}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-performance-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No performance data available</p>
      </div>
    );
  }

  // Prepare chart data
  const resolutionRateData = reportData.vendors.map((v: any) => ({
    name: v.vendor.name,
    rate: v.metrics.resolutionRate
  }));

  const slaComplianceData = reportData.vendors.map((v: any) => ({
    name: v.vendor.name,
    compliant: v.metrics.slaCompliant,
    breach: v.metrics.slaBreach
  }));

  const ticketVolumeData = reportData.vendors.map((v: any) => ({
    name: v.vendor.name,
    resolved: v.metrics.resolvedTickets,
    pending: v.metrics.pendingTickets,
    cancelled: v.metrics.cancelledTickets
  }));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Performance Report</h1>
          <p className="text-gray-600 mt-1">Analyze vendor performance metrics and SLA compliance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-amber-500" />
              <span className="text-2xl font-bold">{reportData.overall.totalVendors}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold">{reportData.overall.totalTickets}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <span className="text-2xl font-bold">{reportData.overall.totalResolved}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-yellow-500" />
              <span className="text-2xl font-bold">{reportData.overall.totalPending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-purple-500" />
              <span className="text-2xl font-bold">{reportData.overall.avgResolutionRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-indigo-500" />
              <span className="text-2xl font-bold">{reportData.overall.avgSlaCompliance}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resolution Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Resolution Rates by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resolutionRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="rate" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ticket Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Volume by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="resolved" stackId="a" fill="#10b981" />
                <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
                <Bar dataKey="cancelled" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-center">Total Tickets</TableHead>
                <TableHead className="text-center">Resolved</TableHead>
                <TableHead className="text-center">Pending</TableHead>
                <TableHead className="text-center">Resolution Rate</TableHead>
                <TableHead className="text-center">Avg Response</TableHead>
                <TableHead className="text-center">Avg Resolution</TableHead>
                <TableHead className="text-center">SLA Compliance</TableHead>
                <TableHead className="text-center">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.vendors.map((vendor: any) => {
                const performanceScore = (vendor.metrics.resolutionRate + vendor.metrics.slaComplianceRate) / 2;
                return (
                  <TableRow key={vendor.vendor.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold">{vendor.vendor.name}</p>
                        <p className="text-xs text-gray-500">{vendor.vendor.code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{vendor.metrics.totalTickets}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="success">
                        {vendor.metrics.resolvedTickets}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="warning">
                        {vendor.metrics.pendingTickets}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {vendor.metrics.resolutionRate >= 80 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : vendor.metrics.resolutionRate >= 60 ? (
                          <Activity className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span>{vendor.metrics.resolutionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {vendor.metrics.avgResponseTimeHours}h
                    </TableCell>
                    <TableCell className="text-center">
                      {vendor.metrics.avgResolutionTimeHours}h
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {vendor.metrics.slaComplianceRate >= 90 ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : vendor.metrics.slaComplianceRate >= 70 ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>{vendor.metrics.slaComplianceRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={
                          performanceScore >= 80 ? 'success' :
                          performanceScore >= 60 ? 'warning' : 'destructive'
                        }
                      >
                        {performanceScore >= 80 ? 'Excellent' :
                         performanceScore >= 60 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}