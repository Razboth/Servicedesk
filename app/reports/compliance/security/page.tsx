'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTimeWITA } from '@/lib/export-utils';
import { Shield, AlertTriangle, Lock, Users, Calendar, Activity, CheckCircle, XCircle, RefreshCw, ShieldAlert, ClipboardCheck, UserCog, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface SecurityData {
  summary: {
    totalSecurityIncidents: number;
    openSecurityIncidents: number;
    criticalSecurityIncidents: number;
    avgResponseTimeMinutes: number;
    overallComplianceScore: number;
    securityResolutionRate: number;
  };
  compliance: {
    scores: {
      securityIncidentResponse: number;
      accessManagement: number;
      changeManagement: number;
      incidentResolution: number;
    };
    accessManagement: {
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
      newUsers: number;
    };
    roleDistribution: Record<string, number>;
    changeManagement: {
      totalRequests: number;
      approvedChanges: number;
      approvalRate: number;
    };
  };
  security: {
    incidentsByType: [string, number][];
    severityDistribution: Record<string, number>;
    regionalAnalysis: Record<string, { incidents: number; critical: number; resolved: number; resolutionRate: number }>;
    responseMetrics: {
      avgResponseTime: number;
      responseRate: number;
    };
  };
  trends: {
    dailyIncidents: Record<string, number>;
    userActivity: {
      newUsers: number;
      activeUsers: number;
      inactiveUsers: number;
    };
  };
  recentIncidents: Array<{
    id: string;
    title: string;
    priority: string;
    status: string;
    branch: string;
    region: string;
    assignedTo: string;
    createdAt: string;
    category: string;
  }>;
  recommendations: string[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export default function SecurityComplianceReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [activeTab, setActiveTab] = useState('incidents');

  const tabConfig = [
    { id: 'incidents', label: 'Security Incidents', icon: ShieldAlert },
    { id: 'compliance', label: 'Compliance Scores', icon: ClipboardCheck },
    { id: 'access', label: 'Access Management', icon: UserCog },
    { id: 'recent', label: 'Recent Incidents', icon: History },
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });

      const response = await fetch(`/api/reports/compliance/security?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching security compliance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) return;

    const rows = [
      ['Security & Compliance Report'],
      [`Date Range: ${startDate} to ${endDate}`],
      [`Generated: ${formatDateTimeWITA(new Date())}`],
      [''],
      ['Summary'],
      ['Metric', 'Value'],
      ['Total Security Incidents', data.summary.totalSecurityIncidents.toString()],
      ['Open Incidents', data.summary.openSecurityIncidents.toString()],
      ['Critical Incidents', data.summary.criticalSecurityIncidents.toString()],
      ['Avg Response Time (min)', data.summary.avgResponseTimeMinutes.toString()],
      ['Compliance Score', `${data.summary.overallComplianceScore}%`],
      ['Resolution Rate', `${data.summary.securityResolutionRate}%`],
      [''],
      ['Incidents by Type'],
      ['Type', 'Count'],
      ...data.security.incidentsByType.map(([type, count]) => [type, count.toString()]),
      [''],
      ['Severity Distribution'],
      ['Severity', 'Count'],
      ...Object.entries(data.security.severityDistribution).map(([severity, count]) => [severity, count.toString()]),
      [''],
      ['Access Management'],
      ['Metric', 'Value'],
      ['Total Users', data.compliance.accessManagement.totalUsers.toString()],
      ['Active Users', data.compliance.accessManagement.activeUsers.toString()],
      ['Inactive Users', data.compliance.accessManagement.inactiveUsers.toString()],
      ['New Users (30d)', data.compliance.accessManagement.newUsers.toString()],
      [''],
      ['Recent Incidents'],
      ['Title', 'Priority', 'Status', 'Branch', 'Created At'],
      ...data.recentIncidents.map(incident => [
        incident.title,
        incident.priority,
        incident.status,
        incident.branch || '-',
        formatDateTimeWITA(incident.createdAt)
      ])
    ];

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-compliance-${startDate}-to-${endDate}.csv`;
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
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            Only administrators can view security compliance reports.
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
  const incidentTrendsData = Object.entries(data.trends.dailyIncidents || {})
    .map(([date, count]) => ({ date, incidents: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const severityData = Object.entries(data.security.severityDistribution || {})
    .map(([name, value]) => ({ name, value }));

  const incidentTypeData = (data.security.incidentsByType || [])
    .map(([name, value]) => ({ name, value }));

  const roleData = Object.entries(data.compliance.roleDistribution || {})
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security & Compliance Report</h1>
          <p className="text-gray-600 mt-1">
            Security incidents, compliance monitoring, and access management
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
            <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalSecurityIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.openSecurityIncidents} open, {data.summary.criticalSecurityIncidents} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(data.summary.overallComplianceScore)}`}>
              {data.summary.overallComplianceScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall compliance rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(data.summary.securityResolutionRate)}`}>
              {data.summary.securityResolutionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Incidents resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.avgResponseTimeMinutes} min
            </div>
            <p className="text-xs text-muted-foreground">
              Average first response
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="border-b mb-6">
          <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {activeTab === 'incidents' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Incident Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={incidentTrendsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Severity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {severityData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Incidents by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incidentTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="name" type="category" fontSize={12} width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(data.compliance.scores).map(([key, score]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className={`font-bold ${getScoreColor(score)}`}>{score.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, score)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{data.compliance.changeManagement.totalRequests}</div>
                      <div className="text-sm text-gray-500">Total Requests</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{data.compliance.changeManagement.approvedChanges}</div>
                      <div className="text-sm text-gray-500">Approved</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${getScoreColor(data.compliance.changeManagement.approvalRate)}`}>
                        {data.compliance.changeManagement.approvalRate}%
                      </div>
                      <div className="text-sm text-gray-500">Approval Rate</div>
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
          </div>
        )}

        {activeTab === 'access' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Access Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">{data.compliance.accessManagement.totalUsers}</div>
                      <div className="text-sm text-gray-500">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">{data.compliance.accessManagement.activeUsers}</div>
                      <div className="text-sm text-gray-500">Active Users</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded">
                      <div className="text-2xl font-bold text-yellow-600">{data.compliance.accessManagement.inactiveUsers}</div>
                      <div className="text-sm text-gray-500">Inactive Users</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">{data.compliance.accessManagement.newUsers}</div>
                      <div className="text-sm text-gray-500">New Users (30d)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Role Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roleData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {roleData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentIncidents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No security incidents found in this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.recentIncidents.map((incident) => (
                        <TableRow key={incident.id}>
                          <TableCell className="font-medium max-w-[300px] truncate">
                            {incident.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadge(incident.priority)}>
                              {incident.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(incident.status)}>
                              {incident.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{incident.branch || '-'}</TableCell>
                          <TableCell>{incident.assignedTo || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDateTimeWITA(incident.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
