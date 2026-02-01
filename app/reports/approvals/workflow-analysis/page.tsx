'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeWITA } from '@/lib/export-utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Clock, CheckCircle, XCircle, AlertCircle, Download,
  TrendingUp, Users, FileText, Building, AlertTriangle,
  LayoutDashboard, User, Settings, Hourglass, Activity, Calendar
} from 'lucide-react';

interface ApprovalData {
  summary: {
    totalApprovals: number;
    recentApprovals: number;
    pendingApprovals: number;
    approvedApprovals: number;
    rejectedApprovals: number;
    avgProcessingHours: number;
    avgProcessingMinutes: number;
    approvalRate: number;
    activeApprovers: number;
  };
  statusStats: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  recentStatusStats: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  approvers: Array<{
    name: string;
    email: string;
    role: string;
    branch: string;
    totalApprovals: number;
    approved: number;
    rejected: number;
    pending: number;
    avgProcessingHours: number;
    processedCount: number;
    recentApprovals: number;
    approvalRate: number;
  }>;
  services: Array<{
    serviceName: string;
    categoryName: string;
    totalApprovals: number;
    approved: number;
    rejected: number;
    pending: number;
    avgProcessingHours: number;
    processedCount: number;
    requiresApproval: boolean;
    approvalRate: number;
  }>;
  branches: Array<{
    branchName: string;
    branchCode: string;
    totalApprovals: number;
    approved: number;
    rejected: number;
    pending: number;
    avgProcessingHours: number;
    processedCount: number;
    approvalRate: number;
  }>;
  priorityDistribution: Record<string, number>;
  dailyTrend: Array<{
    date: string;
    created: number;
    processed: number;
    approved: number;
    rejected: number;
  }>;
  pendingApprovals: Array<{
    id: string;
    ticketId: string;
    ticketNumber: string;
    ticketTitle: string;
    serviceName: string;
    requesterName: string;
    requesterEmail: string;
    branchName: string;
    approverName: string;
    approverEmail: string;
    createdAt: string;
    daysPending: number;
    priority: string;
    comments?: string;
  }>;
}

const STATUS_COLORS = {
  'PENDING': '#f59e0b',
  'APPROVED': '#22c55e',
  'REJECTED': '#ef4444'
};

const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

const tabConfig = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'approvers', label: 'Approvers', icon: User },
  { id: 'services', label: 'Services', icon: Settings },
  { id: 'pending', label: 'Pending', icon: Hourglass },
  { id: 'trends', label: 'Trends', icon: Activity },
  { id: 'branches', label: 'Branches', icon: Building },
];

export default function ApprovalWorkflowAnalysisPage() {
  const [data, setData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/approvals/status');
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

  const exportToCsv = (type: 'approvers' | 'services' | 'pending') => {
    if (!data) return;

    let csvData: any[] = [];
    let filename = '';

    switch (type) {
      case 'approvers':
        csvData = data.approvers.map(approver => ({
          'Name': approver.name,
          'Email': approver.email,
          'Role': approver.role,
          'Branch': approver.branch,
          'Total Approvals': approver.totalApprovals,
          'Approved': approver.approved,
          'Rejected': approver.rejected,
          'Pending': approver.pending,
          'Approval Rate (%)': approver.approvalRate.toFixed(1),
          'Avg Processing Hours': approver.avgProcessingHours.toFixed(1),
          'Recent Approvals (30d)': approver.recentApprovals
        }));
        filename = `approver-performance-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'services':
        csvData = data.services.map(service => ({
          'Service Name': service.serviceName,
          'Category': service.categoryName,
          'Total Approvals': service.totalApprovals,
          'Approved': service.approved,
          'Rejected': service.rejected,
          'Pending': service.pending,
          'Approval Rate (%)': service.approvalRate.toFixed(1),
          'Avg Processing Hours': service.avgProcessingHours.toFixed(1),
          'Requires Approval': service.requiresApproval ? 'Yes' : 'No'
        }));
        filename = `service-approvals-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'pending':
        csvData = data.pendingApprovals.map(approval => ({
          'Ticket Number': approval.ticketNumber,
          'Title': approval.ticketTitle,
          'Service': approval.serviceName,
          'Requester': approval.requesterName,
          'Requester Email': approval.requesterEmail,
          'Branch': approval.branchName,
          'Approver': approval.approverName,
          'Approver Email': approval.approverEmail,
          'Priority': approval.priority,
          'Days Pending': approval.daysPending,
          'Created At': formatDateTimeWITA(approval.createdAt),
          'Comments': approval.comments || ''
        }));
        filename = `pending-approvals-${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'default';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
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

  const statusChartData = [
    { name: 'Pending', value: data.statusStats.pending, fill: STATUS_COLORS.PENDING },
    { name: 'Approved', value: data.statusStats.approved, fill: STATUS_COLORS.APPROVED },
    { name: 'Rejected', value: data.statusStats.rejected, fill: STATUS_COLORS.REJECTED }
  ];

  const priorityChartData = Object.entries(data.priorityDistribution).map(([priority, count]) => ({
    name: priority,
    value: count as number
  }));

  const approverPerformanceData = data.approvers.slice(0, 10).map(approver => ({
    name: approver.name.length > 12 ? approver.name.substring(0, 12) + '...' : approver.name,
    fullName: approver.name,
    totalApprovals: approver.totalApprovals,
    approvalRate: approver.approvalRate,
    avgProcessingHours: approver.avgProcessingHours,
    pending: approver.pending
  }));

  const serviceApprovalData = data.services.slice(0, 10).map(service => ({
    name: service.serviceName.length > 15 ? service.serviceName.substring(0, 15) + '...' : service.serviceName,
    fullName: service.serviceName,
    totalApprovals: service.totalApprovals,
    approvalRate: service.approvalRate,
    avgProcessingHours: service.avgProcessingHours
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Workflow Analysis</h1>
          <p className="text-muted-foreground">Comprehensive approval process monitoring and performance analysis</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportToCsv('pending')} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Pending
          </Button>
          <Button onClick={() => exportToCsv('approvers')} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approvals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalApprovals}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.summary.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.approvedApprovals}</div>
            <p className="text-xs text-muted-foreground">Successfully approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.rejectedApprovals}</div>
            <p className="text-xs text-muted-foreground">Rejected requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.approvalRate}%</div>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgProcessingHours}h</div>
            <p className="text-xs text-muted-foreground">{data.summary.avgProcessingMinutes} minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Approvers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.activeApprovers}</div>
            <p className="text-xs text-muted-foreground">Recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent (30d)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.recentApprovals}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
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

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Approval Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Approval Requests by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={priorityChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {priorityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'approvers' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Approver Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={approverPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      labelFormatter={(label) => {
                        const approver = approverPerformanceData.find(a => a.name === label);
                        return approver?.fullName || label;
                      }}
                    />
                    <Bar yAxisId="left" dataKey="totalApprovals" fill="#f59e0b" name="Total Approvals" />
                    <Bar yAxisId="right" dataKey="approvalRate" fill="#22c55e" name="Approval Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Individual Approver Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Individual Approver Performance</h3>
              <div className="grid gap-4">
                {data.approvers.slice(0, 10).map((approver) => (
                  <Card key={approver.email}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>{approver.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold">{approver.name}</h4>
                            <p className="text-sm text-muted-foreground">{approver.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{approver.role}</Badge>
                              <Badge variant="outline">{approver.branch}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={approver.approvalRate >= 80 ? "default" : "secondary"}>
                            {approver.approvalRate.toFixed(1)}% Approval Rate
                          </Badge>
                          {approver.pending > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {approver.pending} Pending
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{approver.totalApprovals}</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">{approver.approved}</div>
                          <div className="text-xs text-muted-foreground">Approved</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">{approver.rejected}</div>
                          <div className="text-xs text-muted-foreground">Rejected</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-yellow-600">{approver.pending}</div>
                          <div className="text-xs text-muted-foreground">Pending</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">{approver.avgProcessingHours.toFixed(1)}h</div>
                          <div className="text-xs text-muted-foreground">Avg Time</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">{approver.recentApprovals}</div>
                          <div className="text-xs text-muted-foreground">Recent</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Approval Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={serviceApprovalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => {
                        const service = serviceApprovalData.find(s => s.name === label);
                        return service?.fullName || label;
                      }}
                    />
                    <Bar dataKey="totalApprovals" fill="#f59e0b" name="Total Approvals" />
                    <Bar dataKey="approvalRate" fill="#22c55e" name="Approval Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Pending Approvals ({data.pendingApprovals.length})</h3>
                <Button onClick={() => exportToCsv('pending')} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Pending
                </Button>
              </div>

              {data.pendingApprovals.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">No Pending Approvals</h3>
                      <p className="text-muted-foreground">All approval requests have been processed.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {data.pendingApprovals.map((approval) => (
                    <Card key={approval.id} className={`${approval.daysPending > 3 ? 'border-red-200 bg-red-50' : approval.daysPending > 1 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{approval.ticketNumber}</h4>
                              <Badge variant={getPriorityBadgeColor(approval.priority)}>
                                {approval.priority}
                              </Badge>
                              {approval.daysPending > 3 && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">{approval.ticketTitle}</p>
                            <p className="text-xs text-muted-foreground mb-2">{approval.serviceName}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="font-medium">Requester:</span>
                                <p className="text-muted-foreground">{approval.requesterName}</p>
                              </div>
                              <div>
                                <span className="font-medium">Branch:</span>
                                <p className="text-muted-foreground">{approval.branchName}</p>
                              </div>
                              <div>
                                <span className="font-medium">Approver:</span>
                                <p className="text-muted-foreground">{approval.approverName || 'Unassigned'}</p>
                              </div>
                              <div>
                                <span className="font-medium">Created:</span>
                                <p className="text-muted-foreground">{new Date(approval.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>

                            {approval.comments && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <span className="font-medium">Comments:</span>
                                <p className="text-muted-foreground mt-1">{approval.comments}</p>
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">{approval.daysPending}</div>
                            <div className="text-xs text-muted-foreground">Days Pending</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Approval Trends (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={data.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="created" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Created" />
                    <Area type="monotone" dataKey="approved" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Approved" />
                    <Area type="monotone" dataKey="rejected" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Rejected" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Branch Approval Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.branches.map((branch) => (
                    <Card key={branch.branchName}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-brown-500 rounded-lg flex items-center justify-center">
                              <Building className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{branch.branchName}</h4>
                              <p className="text-sm text-muted-foreground">Code: {branch.branchCode}</p>
                            </div>
                          </div>
                          <Badge variant={branch.approvalRate >= 80 ? "default" : "secondary"}>
                            {branch.approvalRate.toFixed(1)}% Approval Rate
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="text-center">
                            <div className="text-lg font-semibold">{branch.totalApprovals}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">{branch.approved}</div>
                            <div className="text-xs text-muted-foreground">Approved</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-red-600">{branch.rejected}</div>
                            <div className="text-xs text-muted-foreground">Rejected</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-yellow-600">{branch.pending}</div>
                            <div className="text-xs text-muted-foreground">Pending</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">{branch.avgProcessingHours.toFixed(1)}h</div>
                            <div className="text-xs text-muted-foreground">Avg Time</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
