'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTimeWITA } from '@/lib/export-utils';
import { Activity, Database, Server, AlertTriangle, Calendar, CheckCircle, XCircle, RefreshCw, HardDrive, Cpu, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface SystemHealthData {
  summary: {
    overallHealthScore: number;
    systemAvailability: number;
    totalSystemIssues: number;
    criticalIssues: number;
    avgResolutionHours: number;
    dataQualityScore: number;
  };
  systemHealth: {
    reliability: {
      totalSystemIssues: number;
      criticalSystemIssues: number;
      resolvedSystemIssues: number;
      openSystemIssues: number;
    };
    uptime: {
      incidentFrequency: number;
      avgResolutionTime: number;
      mttr: number;
      systemAvailability: number;
    };
    componentHealth: Record<string, number>;
    regionalHealth: Record<string, {
      issues: number;
      critical: number;
      resolved: number;
      resolutionRate: number;
      avgResolutionTime: number;
    }>;
  };
  dataQuality: {
    metrics: {
      ticketsWithoutDescription: number;
      unassignedTickets: number;
      uncategorizedTickets: number;
      usersWithoutBranch: number;
    };
    integrity: {
      orphanedTickets: number;
      invalidServiceReferences: number;
    };
    recordCounts: {
      tickets: number;
      users: number;
      services: number;
      branches: number;
    };
    qualityScore: number;
  };
  performance: {
    trends: Record<string, Record<string, number>>;
    resolutionTimes: number[];
    healthScores: {
      dataQuality: number;
      systemReliability: number;
      performance: number;
      dataIntegrity: number;
    };
  };
  insights: {
    topSystemIssues: Array<{ component: string; count: number }>;
    mostAffectedRegions: Array<{ region: string; issues: number; critical: number; resolutionRate: number }>;
  };
  recentIssues: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    branch: string;
    region: string;
    createdAt: string;
    resolvedAt: string | null;
    category: string;
  }>;
  recommendations: string[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export default function SystemHealthReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });

      const response = await fetch(`/api/reports/compliance/system-health?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching system health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;

    const rows = [
      ['System Health & Data Quality Report'],
      [`Date Range: ${startDate} to ${endDate}`],
      [`Generated: ${formatDateTimeWITA(new Date())}`],
      [''],
      ['Summary'],
      ['Metric', 'Value'],
      ['Overall Health Score', `${data.summary.overallHealthScore}%`],
      ['System Availability', `${data.summary.systemAvailability}%`],
      ['Total System Issues', data.summary.totalSystemIssues.toString()],
      ['Critical Issues', data.summary.criticalIssues.toString()],
      ['Avg Resolution Time (hrs)', data.summary.avgResolutionHours.toString()],
      ['Data Quality Score', `${data.summary.dataQualityScore}%`],
      [''],
      ['Data Quality Metrics'],
      ['Metric', 'Count'],
      ['Tickets Without Description', data.dataQuality.metrics.ticketsWithoutDescription.toString()],
      ['Unassigned Tickets', data.dataQuality.metrics.unassignedTickets.toString()],
      ['Uncategorized Tickets', data.dataQuality.metrics.uncategorizedTickets.toString()],
      ['Users Without Branch', data.dataQuality.metrics.usersWithoutBranch.toString()],
      [''],
      ['Database Record Counts'],
      ['Table', 'Count'],
      ['Tickets', data.dataQuality.recordCounts.tickets.toString()],
      ['Users', data.dataQuality.recordCounts.users.toString()],
      ['Services', data.dataQuality.recordCounts.services.toString()],
      ['Branches', data.dataQuality.recordCounts.branches.toString()],
      [''],
      ['Recent System Issues'],
      ['Title', 'Priority', 'Status', 'Branch', 'Created At', 'Resolved At'],
      ...data.recentIssues.map(issue => [
        issue.title,
        issue.priority,
        issue.status,
        issue.branch || '-',
        formatDateTimeWITA(issue.createdAt),
        issue.resolvedAt ? formatDateTimeWITA(issue.resolvedAt) : 'Not resolved'
      ])
    ];

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `system-health-${startDate}-to-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session, startDate, endDate]);

  if (!session) {
    return <div className="p-6">Please log in to view this report.</div>;
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="p-6">
        <div className="text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            Only administrators can view system health reports.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error loading report: {error}</div>
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6">No data available</div>;
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED': return 'default';
      case 'IN_PROGRESS': return 'secondary';
      case 'OPEN': return 'destructive';
      default: return 'secondary';
    }
  };

  // Prepare chart data
  const componentData = Object.entries(data.systemHealth.componentHealth || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const healthScoreData = Object.entries(data.performance.healthScores || {})
    .map(([name, value]) => ({
      name: name.replace(/([A-Z])/g, ' $1').trim(),
      value
    }));

  const regionalData = Object.entries(data.systemHealth.regionalHealth || {})
    .map(([region, info]) => ({
      region,
      issues: info.issues,
      critical: info.critical,
      resolutionRate: info.resolutionRate
    }))
    .sort((a, b) => b.issues - a.issues)
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health & Data Quality</h1>
          <p className="text-gray-600 mt-1">
            Monitor system performance, data quality, and infrastructure health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full">
                Update Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(data.summary.overallHealthScore)}`}>
              {data.summary.overallHealthScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall system health
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Availability</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(data.summary.systemAvailability)}`}>
              {data.summary.systemAvailability}%
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime percentage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalSystemIssues}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.criticalIssues} critical issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(data.summary.dataQualityScore)}`}>
              {data.summary.dataQualityScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              Data integrity score
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Health Overview</TabsTrigger>
          <TabsTrigger value="data">Data Quality</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="recent">Recent Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Health Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {healthScoreData.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="capitalize">{item.name}</span>
                      <span className={`font-bold ${getScoreColor(item.value)}`}>{item.value.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getScoreBg(item.value)}`}
                        style={{ width: `${Math.min(100, item.value)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Reliability Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{data.systemHealth.reliability.totalSystemIssues}</div>
                    <div className="text-sm text-gray-500">Total Issues</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-600">{data.systemHealth.reliability.criticalSystemIssues}</div>
                    <div className="text-sm text-gray-500">Critical</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{data.systemHealth.reliability.resolvedSystemIssues}</div>
                    <div className="text-sm text-gray-500">Resolved</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded">
                    <div className="text-2xl font-bold text-yellow-600">{data.systemHealth.reliability.openSystemIssues}</div>
                    <div className="text-sm text-gray-500">Open</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>MTTR (Mean Time To Resolution)</span>
                    <span className="font-bold">{data.systemHealth.uptime.mttr.toFixed(1)} hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {data.recommendations && data.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Regional Health */}
          <Card>
            <CardHeader>
              <CardTitle>Regional System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="issues" fill="#3b82f6" name="Total Issues" />
                    <Bar dataKey="critical" fill="#ef4444" name="Critical" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Quality Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Tickets Without Description</span>
                    <Badge variant={data.dataQuality.metrics.ticketsWithoutDescription > 0 ? 'destructive' : 'secondary'}>
                      {data.dataQuality.metrics.ticketsWithoutDescription}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Unassigned Active Tickets</span>
                    <Badge variant={data.dataQuality.metrics.unassignedTickets > 0 ? 'destructive' : 'secondary'}>
                      {data.dataQuality.metrics.unassignedTickets}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Uncategorized Tickets</span>
                    <Badge variant={data.dataQuality.metrics.uncategorizedTickets > 0 ? 'destructive' : 'secondary'}>
                      {data.dataQuality.metrics.uncategorizedTickets}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Users Without Branch</span>
                    <Badge variant={data.dataQuality.metrics.usersWithoutBranch > 0 ? 'destructive' : 'secondary'}>
                      {data.dataQuality.metrics.usersWithoutBranch}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Integrity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Orphaned Tickets</span>
                    <Badge variant={data.dataQuality.integrity.orphanedTickets > 0 ? 'destructive' : 'secondary'}>
                      {data.dataQuality.integrity.orphanedTickets}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Invalid Service References</span>
                    <Badge variant={data.dataQuality.integrity.invalidServiceReferences > 0 ? 'destructive' : 'secondary'}>
                      {data.dataQuality.integrity.invalidServiceReferences}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Database Record Counts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <HardDrive className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{data.dataQuality.recordCounts.tickets.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Tickets</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <Users className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <div className="text-2xl font-bold">{data.dataQuality.recordCounts.users.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Users</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <Cpu className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{data.dataQuality.recordCounts.services.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Services</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded">
                  <Server className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <div className="text-2xl font-bold">{data.dataQuality.recordCounts.branches.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Branches</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Issues by Component</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={componentData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="name" type="category" fontSize={12} width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Affected Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.insights.topSystemIssues.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="capitalize font-medium">{item.component}</span>
                      <Badge>{item.count} issues</Badge>
                    </div>
                  ))}
                  {data.insights.topSystemIssues.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No component issues found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Most Affected Regions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Region</TableHead>
                    <TableHead>Total Issues</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Resolution Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.insights.mostAffectedRegions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No regional issues found
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.insights.mostAffectedRegions.map((region, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{region.region}</TableCell>
                        <TableCell>{region.issues}</TableCell>
                        <TableCell>
                          <Badge variant={region.critical > 0 ? 'destructive' : 'secondary'}>
                            {region.critical}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getScoreColor(region.resolutionRate)}>
                            {region.resolutionRate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Resolved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentIssues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No system issues found in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentIssues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium max-w-[300px] truncate">
                          {issue.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadge(issue.priority)}>
                            {issue.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(issue.status)}>
                            {issue.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{issue.branch || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDateTimeWITA(issue.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {issue.resolvedAt ? formatDateTimeWITA(issue.resolvedAt) : (
                            <span className="text-yellow-600">Not resolved</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
