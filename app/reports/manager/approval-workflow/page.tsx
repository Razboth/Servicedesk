'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportFilters, type ReportFilters as ReportFiltersType } from '@/components/reports/report-filters';
import { MetricCard, BarChart, PieChart, TimelineChart } from '@/components/reports/report-charts';
import { ExportButton, exportUtils } from '@/components/reports/export-button';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  FileCheck,
  Timer,
  Users,
  Target,
  BarChart3,
  Calendar,
  Hourglass,
  Building2
} from 'lucide-react';

interface ApprovalWorkflowData {
  branch: {
    name: string;
    code: string;
  };
  summary: {
    totalApprovals: number;
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
    approvalRate: number;
    avgResponseTime: number;
  };
  breakdown: {
    byType: Array<{
      type: string;
      total: number;
      approved: number;
      rejected: number;
      pending: number;
      approvalRate: number;
    }>;
    byRequesterRole: Array<{
      role: string;
      total: number;
      approved: number;
      rejected: number;
      approvalRate: number;
      avgResponseTime: number;
    }>;
    byCategory: Array<{
      category: string;
      total: number;
      approved: number;
      rejected: number;
      approvalRate: number;
    }>;
    byPriority: Array<{
      priority: string;
      total: number;
      approved: number;
      approvalRate: number;
      avgResponseTime: number;
    }>;
  };
  trends: {
    daily: Array<{
      date: string;
      value: number;
      approved: number;
      label: string;
    }>;
    responseTime: Array<{
      label: string;
      value: number;
    }>;
  };
  performance: {
    bottlenecks: Array<{
      id: string;
      type: string;
      ticketTitle: string;
      requesterName: string;
      responseTime: number;
      status: string;
      createdAt: string;
    }>;
    pending: Array<{
      id: string;
      type: string;
      ticketTitle: string;
      requesterName: string;
      priority: string;
      createdAt: string;
      daysPending: number;
    }>;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function ApprovalWorkflowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<ApprovalWorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters with last 30 days
  const [filters, setFilters] = useState<ReportFiltersType>({
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    },
    selectedFilters: {}
  });

  // Redirect if not authorized
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user?.role !== 'MANAGER') {
      router.push('/reports');
      return;
    }
  }, [session, status, router]);

  // Fetch data when filters change
  useEffect(() => {
    if (session?.user?.role === 'MANAGER') {
      fetchData();
    }
  }, [filters, session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: filters.dateRange.startDate.toISOString(),
        endDate: filters.dateRange.endDate.toISOString()
      });

      const response = await fetch(`/api/reports/manager/approval-workflow?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching approval workflow data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    const exportData = data.breakdown.byType.map(type => ({
      'Approval Type': type.type,
      'Total Requests': type.total,
      'Approved': type.approved,
      'Rejected': type.rejected,
      'Pending': type.pending,
      'Approval Rate': `${type.approvalRate}%`
    }));

    const filename = exportUtils.generateFilename('approval-workflow', format === 'xlsx' ? 'xlsx' : 'csv');
    
    if (format === 'csv') {
      exportUtils.exportToCSV(exportData, filename);
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getApprovalRateBadgeVariant = (rate: number) => {
    if (rate >= 90) return 'default';
    if (rate >= 70) return 'secondary';
    return 'destructive';
  };

  const getDaysPendingBadgeVariant = (days: number) => {
    if (days >= 7) return 'destructive';
    if (days >= 3) return 'secondary';
    return 'default';
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    return `${Math.round(hours / 24 * 10) / 10}d`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading approval workflow data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'MANAGER') {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchData}>Try Again</Button>
          </div>
        </main>
      </div>
    );
  }

  const filterGroups: any[] = []; // No additional filters for this report

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link href="/reports">
                    <Button variant="outline" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Reports
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Approval Workflow Analytics</h1>
                    <p className="mt-1 text-sm text-gray-500 flex items-center space-x-2">
                      <FileCheck className="h-4 w-4" />
                      <span>Approval performance and process optimization insights</span>
                      {data && (
                        <>
                          <Building2 className="h-4 w-4 ml-2" />
                          <span>{data.branch.name} ({data.branch.code})</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <ExportButton
                  onExport={handleExport}
                  disabled={!data}
                  reportName="approval-workflow"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <ReportFilters
            filters={filters}
            onChange={setFilters}
            filterGroups={filterGroups}
            isLoading={loading}
          />

          {data && (
            <>
              {/* Key Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Approvals"
                  value={data.summary.totalApprovals}
                  subtitle="Requests handled"
                  icon={<FileCheck className="h-5 w-5" />}
                  badge={{
                    text: 'Volume',
                    variant: 'secondary'
                  }}
                />
                
                <MetricCard
                  title="Approval Rate"
                  value={`${data.summary.approvalRate}%`}
                  subtitle={`${data.summary.approvedCount} approved`}
                  icon={<CheckCircle className="h-5 w-5" />}
                  trend={{
                    value: data.summary.approvalRate >= 70 ? 5 : -3,
                    label: data.summary.approvalRate >= 70 ? 'Good' : 'Low approval rate',
                    isPositive: data.summary.approvalRate >= 70
                  }}
                  badge={{
                    text: data.summary.approvalRate >= 90 ? 'High' : 
                          data.summary.approvalRate >= 70 ? 'Good' : 'Low',
                    variant: data.summary.approvalRate >= 90 ? 'default' : 
                             data.summary.approvalRate >= 70 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Avg Response Time"
                  value={formatDuration(data.summary.avgResponseTime)}
                  subtitle="Decision speed"
                  icon={<Timer className="h-5 w-5" />}
                  badge={{
                    text: data.summary.avgResponseTime <= 4 ? 'Fast' : 
                          data.summary.avgResponseTime <= 24 ? 'Good' : 'Slow',
                    variant: data.summary.avgResponseTime <= 4 ? 'default' : 
                             data.summary.avgResponseTime <= 24 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Pending Approvals"
                  value={data.summary.pendingCount}
                  subtitle="Awaiting decision"
                  icon={<Hourglass className="h-5 w-5" />}
                  badge={{
                    text: data.summary.pendingCount === 0 ? 'All Clear' : 
                          data.summary.pendingCount <= 5 ? 'Normal' : 'High',
                    variant: data.summary.pendingCount === 0 ? 'default' : 
                             data.summary.pendingCount <= 5 ? 'secondary' : 'destructive'
                  }}
                />
              </div>

              {/* Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Approved"
                  value={data.summary.approvedCount}
                  subtitle="Positive decisions"
                  icon={<CheckCircle className="h-5 w-5" />}
                  badge={{
                    text: 'Approved',
                    variant: 'default'
                  }}
                />

                <MetricCard
                  title="Rejected"
                  value={data.summary.rejectedCount}
                  subtitle="Negative decisions"
                  icon={<XCircle className="h-5 w-5" />}
                  badge={{
                    text: 'Rejected',
                    variant: 'destructive'
                  }}
                />

                <MetricCard
                  title="Decision Rate"
                  value={`${data.summary.totalApprovals > 0 ? Math.round(((data.summary.approvedCount + data.summary.rejectedCount) / data.summary.totalApprovals) * 100) : 0}%`}
                  subtitle="Completed vs pending"
                  icon={<Target className="h-5 w-5" />}
                  badge={{
                    text: 'Efficiency',
                    variant: 'outline'
                  }}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Approval Trends */}
                <TimelineChart
                  title="Daily Approval Activity (Last 14 Days)"
                  data={data.trends.daily}
                />

                {/* Response Time Distribution */}
                <PieChart
                  title="Response Time Distribution"
                  data={data.trends.responseTime}
                />
              </div>

              {/* Approval Types Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Performance by Approval Type</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.breakdown.byType.map((type, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-800">
                            {type.total}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{type.type}</div>
                            <div className="text-sm text-gray-500">
                              {type.approved} approved • {type.rejected} rejected • {type.pending} pending
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={getApprovalRateBadgeVariant(type.approvalRate)}
                          className="text-xs"
                        >
                          {type.approvalRate}% approval rate
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Requester Role Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Analysis by Requester Role</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.breakdown.byRequesterRole.map((role, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                            {role.role.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{role.role}</div>
                            <div className="text-sm text-gray-500">
                              {role.total} requests • Avg response: {formatDuration(role.avgResponseTime)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {role.approved}/{role.total}
                          </Badge>
                          <Badge 
                            variant={getApprovalRateBadgeVariant(role.approvalRate)}
                            className="text-xs"
                          >
                            {role.approvalRate}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Priority Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Priority-Based Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.breakdown.byPriority.map((priority, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={getPriorityBadgeVariant(priority.priority)}
                            className="text-xs"
                          >
                            {priority.priority}
                          </Badge>
                          <div>
                            <div className="font-medium text-gray-900">{priority.total} requests</div>
                            <div className="text-sm text-gray-500">
                              Avg response: {formatDuration(priority.avgResponseTime)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {priority.approvalRate}% approved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Approvals */}
              {data.performance.pending.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Pending Approvals Requiring Attention</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.performance.pending.map((approval, index) => (
                        <div key={approval.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Hourglass className="h-5 w-5 text-amber-600" />
                            <div>
                              <div className="font-medium text-gray-900">{approval.type}</div>
                              <div className="text-sm text-gray-500">
                                {approval.ticketTitle} • Requested by {approval.requesterName}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={getPriorityBadgeVariant(approval.priority)}
                              className="text-xs"
                            >
                              {approval.priority}
                            </Badge>
                            <Badge 
                              variant={getDaysPendingBadgeVariant(approval.daysPending)}
                              className="text-xs"
                            >
                              {approval.daysPending} days pending
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bottlenecks Analysis */}
              {data.performance.bottlenecks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Process Bottlenecks (Slow Responses)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.performance.bottlenecks.map((bottleneck, index) => (
                        <div key={bottleneck.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <div>
                              <div className="font-medium text-gray-900">{bottleneck.type}</div>
                              <div className="text-sm text-gray-500">
                                {bottleneck.ticketTitle} • {bottleneck.requesterName}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={bottleneck.status === 'APPROVED' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {bottleneck.status}
                            </Badge>
                            <Badge variant="destructive" className="text-xs">
                              {formatDuration(bottleneck.responseTime)} response
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Process Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Process Insights & Recommendations</h3>
                  <div className="space-y-3">
                    {data.summary.approvalRate >= 80 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span>High approval rate of {data.summary.approvalRate}% indicates good alignment between requests and policies.</span>
                      </div>
                    )}
                    
                    {data.summary.avgResponseTime <= 4 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Timer className="h-4 w-4" />
                        <span>Excellent response time of {formatDuration(data.summary.avgResponseTime)}. You're providing timely decisions.</span>
                      </div>
                    )}
                    
                    {data.summary.pendingCount > 5 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <Hourglass className="h-4 w-4" />
                        <span>
                          {data.summary.pendingCount} approvals are pending. Consider reviewing these to prevent process delays.
                        </span>
                      </div>
                    )}
                    
                    {data.performance.bottlenecks.length > 3 && (
                      <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 p-3 rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          Several slow responses detected. Consider streamlining approval processes or delegation for efficiency.
                        </span>
                      </div>
                    )}

                    {data.breakdown.byType.some(type => type.approvalRate < 50) && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                        <span>
                          Some approval types have low approval rates. Review criteria and provide clearer guidance to requesters.
                        </span>
                      </div>
                    )}

                    {data.trends.daily.some(day => day.value > 10) && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Calendar className="h-4 w-4" />
                        <span>High approval volume detected on some days. Consider workload balancing during peak periods.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}