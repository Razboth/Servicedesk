'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area
} from 'recharts';
import { 
  Building, Users, Clock, CheckCircle, AlertTriangle, Download, 
  TrendingUp, MapPin, Phone, CreditCard 
} from 'lucide-react';

interface BranchPerformance {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  totalUsers: number;
  technicians: number;
  managers: number;
  regularUsers: number;
  activeUsers: number;
  atmCount: number;
  totalTickets: number;
  recentTickets: number;
  resolvedTickets: number;
  openTickets: number;
  overdueTickets: number;
  criticalTickets: number;
  atmTickets: number;
  resolutionRate: number;
  avgResolutionHours: number;
  avgFirstResponseHours: number;
  slaCompliance: number;
  userTicketCreation: number;
  serviceDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  technicianMetrics: Array<{
    name: string;
    totalTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
  }>;
  performance: {
    last7Days: number;
    last24Hours: number;
    weeklyTrend: Array<{ date: string; count: number }>;
  };
}

interface ReportData {
  summary: {
    totalBranches: number;
    avgTicketsPerBranch: number;
    avgResolutionRate: number;
    avgSlaCompliance: number;
    totalAtms: number;
  };
  branches: BranchPerformance[];
  topPerformers: BranchPerformance[];
  regionalAnalysis: Record<string, any>;
}

const COLORS = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'];

export default function BranchDetailedPerformancePage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/branch/detailed-performance');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = () => {
    if (!data) return;

    const csvData = data.branches.map(branch => ({
      'Branch Code': branch.code,
      'Branch Name': branch.name,
      'Address': branch.address || '',
      'Phone': branch.phone || '',
      'Total Users': branch.totalUsers,
      'Technicians': branch.technicians,
      'Managers': branch.managers,
      'Regular Users': branch.regularUsers,
      'Active Users': branch.activeUsers,
      'ATM Count': branch.atmCount,
      'Total Tickets': branch.totalTickets,
      'Resolved Tickets': branch.resolvedTickets,
      'Open Tickets': branch.openTickets,
      'Overdue Tickets': branch.overdueTickets,
      'Critical Tickets': branch.criticalTickets,
      'ATM Tickets': branch.atmTickets,
      'Resolution Rate (%)': branch.resolutionRate,
      'Avg Resolution Hours': branch.avgResolutionHours,
      'Avg First Response Hours': branch.avgFirstResponseHours,
      'SLA Compliance (%)': branch.slaCompliance
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `branch-performance-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading report: {error}</p>
            <Button onClick={fetchData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const performanceChartData = data.branches.map(branch => ({
    name: branch.code,
    fullName: branch.name,
    totalTickets: branch.totalTickets,
    resolvedTickets: branch.resolvedTickets,
    resolutionRate: branch.resolutionRate,
    slaCompliance: branch.slaCompliance,
    avgResolutionHours: branch.avgResolutionHours,
    atmCount: branch.atmCount,
    technicians: branch.technicians
  }));

  const regionalChartData = Object.entries(data.regionalAnalysis).map(([region, stats]) => ({
    region: `Region ${region}`,
    branches: stats.branches,
    totalTickets: stats.totalTickets,
    avgResolutionRate: stats.avgResolutionRate,
    totalUsers: stats.totalUsers,
    totalAtms: stats.totalAtms
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Branch Performance Report</h1>
          <p className="text-muted-foreground">Comprehensive performance analysis for all branches</p>
        </div>
        <Button onClick={exportToCsv} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalBranches}</div>
            <p className="text-xs text-muted-foreground">Active branches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tickets/Branch</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgTicketsPerBranch}</div>
            <p className="text-xs text-muted-foreground">Average workload</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgResolutionRate}%</div>
            <p className="text-xs text-muted-foreground">Network average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg SLA Compliance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgSlaCompliance}%</div>
            <p className="text-xs text-muted-foreground">Network average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ATMs</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalAtms}</div>
            <p className="text-xs text-muted-foreground">Across all branches</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="individual">Branch Details</TabsTrigger>
          <TabsTrigger value="regional">Regional Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Performing Branches</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topPerformers.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'resolutionRate' ? `${value}%` : value,
                        name === 'resolutionRate' ? 'Resolution Rate' : 'Total Tickets'
                      ]}
                    />
                    <Bar dataKey="resolutionRate" fill="#f59e0b" name="Resolution Rate" />
                    <Bar dataKey="totalTickets" fill="#d97706" name="Total Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={regionalChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ region, branches }) => `${region} (${branches})`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="branches"
                    >
                      {regionalChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid gap-4">
            {data.branches.map((branch) => (
              <Card key={branch.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-brown-500 rounded-lg flex items-center justify-center">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{branch.name}</h3>
                        <p className="text-sm text-muted-foreground">Code: {branch.code}</p>
                        {branch.address && (
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{branch.address}</p>
                          </div>
                        )}
                        {branch.phone && (
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{branch.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={branch.resolutionRate >= 80 ? "default" : "destructive"}>
                        {branch.resolutionRate.toFixed(1)}% Resolution Rate
                      </Badge>
                      <div className="mt-2">
                        <Badge variant="outline">
                          {branch.slaCompliance.toFixed(1)}% SLA
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Staff Information */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold text-blue-600">{branch.totalUsers}</div>
                      <div className="text-xs text-muted-foreground">Total Users</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold text-green-600">{branch.technicians}</div>
                      <div className="text-xs text-muted-foreground">Technicians</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold text-purple-600">{branch.managers}</div>
                      <div className="text-xs text-muted-foreground">Managers</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-semibold text-orange-600">{branch.atmCount}</div>
                      <div className="text-xs text-muted-foreground">ATMs</div>
                    </div>
                  </div>

                  {/* Ticket Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{branch.totalTickets}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{branch.resolvedTickets}</div>
                      <div className="text-xs text-muted-foreground">Resolved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{branch.openTickets}</div>
                      <div className="text-xs text-muted-foreground">Open</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{branch.overdueTickets}</div>
                      <div className="text-xs text-muted-foreground">Overdue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-600">{branch.criticalTickets}</div>
                      <div className="text-xs text-muted-foreground">Critical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">{branch.atmTickets}</div>
                      <div className="text-xs text-muted-foreground">ATM Issues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{branch.avgResolutionHours}h</div>
                      <div className="text-xs text-muted-foreground">Avg Resolution</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{branch.performance.last7Days}</div>
                      <div className="text-xs text-muted-foreground">Last 7 Days</div>
                    </div>
                  </div>

                  {/* Technician Performance */}
                  {branch.technicianMetrics.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Technician Performance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {branch.technicianMetrics.map((tech, index) => (
                          <div key={index} className="text-sm p-2 bg-muted rounded">
                            <div className="font-medium">{tech.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {tech.resolvedTickets}/{tech.totalTickets} tickets ({tech.resolutionRate.toFixed(1)}%)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="regional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regional Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={regionalChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="branches" fill="#f59e0b" name="Branches" />
                  <Bar dataKey="totalTickets" fill="#d97706" name="Total Tickets" />
                  <Bar dataKey="totalUsers" fill="#b45309" name="Total Users" />
                  <Bar dataKey="totalAtms" fill="#92400e" name="Total ATMs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resolution Rate vs SLA Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={performanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(label) => {
                      const branch = performanceChartData.find(b => b.name === label);
                      return branch?.fullName || label;
                    }}
                  />
                  <Line type="monotone" dataKey="resolutionRate" stroke="#f59e0b" name="Resolution Rate %" />
                  <Line type="monotone" dataKey="slaCompliance" stroke="#d97706" name="SLA Compliance %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Ticket Trends (Sample Branch)</CardTitle>
            </CardHeader>
            <CardContent>
              {data.branches[0] && (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={data.branches[0].performance.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}