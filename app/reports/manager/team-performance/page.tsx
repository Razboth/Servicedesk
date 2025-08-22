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
  Users, 
  Target, 
  Clock, 
  Award,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  UserCheck,
  Activity,
  Building2,
  CheckCircle
} from 'lucide-react';

interface TeamPerformanceData {
  summary: {
    totalTechnicians: number;
    totalTicketsHandled: number;
    avgResolutionRate: number;
    avgResponseTime: number;
    teamSlaCompliance: number;
    branchName: string;
  };
  technicians: Array<{
    id: string;
    name: string;
    email: string;
    supportGroup: string;
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    resolutionRate: number;
    avgResponseTime: number;
    slaCompliance: number;
  }>;
  workload: Array<{
    technician: string;
    activeTickets: number;
    totalAssigned: number;
    utilization: number;
  }>;
  performance: Array<{
    technician: string;
    resolutionRate: number;
    slaCompliance: number;
    avgResponseTime: number;
    score: number;
  }>;
  trends: Array<{
    date: string;
    value: number;
    resolved: number;
    label: string;
  }>;
  supportGroups: Array<{
    label: string;
    value: number;
    totalTickets: number;
    avgResolutionRate: number;
  }>;
  training: Array<{
    technician: string;
    areas: string[];
    priority: 'HIGH' | 'MEDIUM';
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function TeamPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<TeamPerformanceData | null>(null);
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

      const response = await fetch(`/api/reports/manager/team-performance?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching team performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    const exportData = data.technicians.map(tech => ({
      'Technician': tech.name,
      'Support Group': tech.supportGroup,
      'Total Tickets': tech.totalTickets,
      'Resolved Tickets': tech.resolvedTickets,
      'Resolution Rate': `${tech.resolutionRate}%`,
      'Avg Response Time': `${tech.avgResponseTime}h`,
      'SLA Compliance': `${tech.slaCompliance}%`
    }));

    const filename = exportUtils.generateFilename('team-performance', format === 'xlsx' ? 'xlsx' : 'csv');
    
    if (format === 'csv') {
      exportUtils.exportToCSV(exportData, filename);
    }
  };

  const getPerformanceBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    return 'destructive';
  };

  const getPriorityBadgeVariant = (priority: 'HIGH' | 'MEDIUM') => {
    return priority === 'HIGH' ? 'destructive' : 'secondary';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading team performance data...</p>
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

  const filterGroups = []; // No additional filters for this report

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
                    <h1 className="text-3xl font-bold text-gray-900">Team Performance Analytics</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Comprehensive team metrics and individual performance analysis
                      {data && ` • ${data.summary.branchName}`}
                    </p>
                  </div>
                </div>
                <ExportButton
                  onExport={handleExport}
                  disabled={!data}
                  reportName="team-performance"
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
              {/* Team Summary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <MetricCard
                  title="Team Size"
                  value={data.summary.totalTechnicians}
                  subtitle="Active technicians"
                  icon={<Users className="h-5 w-5" />}
                  badge={{
                    text: 'Team',
                    variant: 'secondary'
                  }}
                />
                
                <MetricCard
                  title="Tickets Handled"
                  value={data.summary.totalTicketsHandled}
                  subtitle="Total in period"
                  icon={<Activity className="h-5 w-5" />}
                  badge={{
                    text: 'Volume',
                    variant: 'outline'
                  }}
                />

                <MetricCard
                  title="Avg Resolution Rate"
                  value={`${data.summary.avgResolutionRate}%`}
                  subtitle="Team average"
                  icon={<Target className="h-5 w-5" />}
                  trend={{
                    value: data.summary.avgResolutionRate >= 85 ? 5 : -3,
                    label: data.summary.avgResolutionRate >= 85 ? 'Good' : 'Needs improvement',
                    isPositive: data.summary.avgResolutionRate >= 85
                  }}
                  badge={{
                    text: data.summary.avgResolutionRate >= 90 ? 'Excellent' : 
                          data.summary.avgResolutionRate >= 80 ? 'Good' : 'Fair',
                    variant: data.summary.avgResolutionRate >= 90 ? 'default' : 
                             data.summary.avgResolutionRate >= 80 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Avg Response Time"
                  value={`${data.summary.avgResponseTime}h`}
                  subtitle="Team average"
                  icon={<Clock className="h-5 w-5" />}
                  badge={{
                    text: data.summary.avgResponseTime <= 2 ? 'Fast' : 
                          data.summary.avgResponseTime <= 4 ? 'Good' : 'Slow',
                    variant: data.summary.avgResponseTime <= 2 ? 'default' : 
                             data.summary.avgResponseTime <= 4 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Team SLA Compliance"
                  value={`${data.summary.teamSlaCompliance}%`}
                  subtitle="Overall compliance"
                  icon={<Award className="h-5 w-5" />}
                  trend={{
                    value: data.summary.teamSlaCompliance >= 95 ? 10 : -5,
                    label: data.summary.teamSlaCompliance >= 95 ? 'Excellent' : 'Room for improvement',
                    isPositive: data.summary.teamSlaCompliance >= 95
                  }}
                  badge={{
                    text: data.summary.teamSlaCompliance >= 95 ? 'Excellent' :
                          data.summary.teamSlaCompliance >= 90 ? 'Good' : 'Fair',
                    variant: data.summary.teamSlaCompliance >= 95 ? 'default' :
                             data.summary.teamSlaCompliance >= 90 ? 'secondary' : 'destructive'
                  }}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Trends */}
                <TimelineChart
                  title="Team Activity Trends (Last 4 Weeks)"
                  data={data.trends}
                />

                {/* Support Group Distribution */}
                <PieChart
                  title="Team by Support Groups"
                  data={data.supportGroups}
                />
              </div>

              {/* Workload Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Current Workload Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart
                    title=""
                    data={data.workload.map(item => ({
                      label: item.technician,
                      value: item.activeTickets
                    }))}
                  />
                </CardContent>
              </Card>

              {/* Individual Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserCheck className="h-5 w-5" />
                    <span>Individual Performance Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.technicians.map((tech, index) => (
                      <div key={tech.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                            {tech.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{tech.name}</div>
                            <div className="text-sm text-gray-500">
                              {tech.supportGroup} • {tech.totalTickets} tickets assigned
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {tech.resolutionRate}% resolved
                            </div>
                            <div className="text-xs text-gray-500">
                              {tech.avgResponseTime}h avg response
                            </div>
                          </div>
                          <Badge 
                            variant={getPerformanceBadgeVariant(tech.slaCompliance)}
                            className="text-xs"
                          >
                            {tech.slaCompliance}% SLA
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                          >
                            {tech.openTickets} open
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Rankings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Performance Rankings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.performance.slice(0, 5).map((performer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{performer.technician}</div>
                            <div className="text-sm text-gray-500">
                              Performance Score: {performer.score}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right text-xs text-gray-600">
                            <div>{performer.resolutionRate}% resolution</div>
                            <div>{performer.slaCompliance}% SLA</div>
                          </div>
                          <Badge 
                            variant={getPerformanceBadgeVariant(performer.score)}
                            className="text-xs"
                          >
                            {performer.score >= 90 ? 'Top' : 
                             performer.score >= 80 ? 'Good' : 'Developing'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Training Needs */}
              {data.training.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5" />
                      <span>Training & Development Needs</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.training.map((need, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                          <div className="flex items-center space-x-3">
                            <BookOpen className="h-5 w-5 text-amber-600" />
                            <div>
                              <div className="font-medium text-gray-900">{need.technician}</div>
                              <div className="text-sm text-gray-600">
                                Focus Areas: {need.areas.join(', ')}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={getPriorityBadgeVariant(need.priority)}
                            className="text-xs"
                          >
                            {need.priority} Priority
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Management Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Management Insights & Recommendations</h3>
                  <div className="space-y-3">
                    {data.summary.avgResolutionRate >= 85 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span>Team is performing well with {data.summary.avgResolutionRate}% average resolution rate.</span>
                      </div>
                    )}
                    
                    {data.summary.teamSlaCompliance >= 95 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Award className="h-4 w-4" />
                        <span>Excellent team SLA compliance at {data.summary.teamSlaCompliance}%. Consider recognizing top performers.</span>
                      </div>
                    )}
                    
                    {data.training.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <BookOpen className="h-4 w-4" />
                        <span>
                          {data.training.length} team member{data.training.length > 1 ? 's' : ''} would benefit from additional training. 
                          Focus on {data.training.filter(t => t.priority === 'HIGH').length} high-priority development needs.
                        </span>
                      </div>
                    )}
                    
                    {data.summary.avgResponseTime > 4 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <Clock className="h-4 w-4" />
                        <span>Team response time is {data.summary.avgResponseTime}h. Consider workload redistribution or process improvements.</span>
                      </div>
                    )}

                    {data.workload.some(w => w.utilization > 80) && (
                      <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 p-3 rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          Some team members are handling high workloads. Consider redistributing tickets to prevent burnout.
                        </span>
                      </div>
                    )}

                    {data.performance.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                        <span>
                          Top performer: {data.performance[0].technician} with {data.performance[0].score} performance score. 
                          Consider using as a mentor for developing team members.
                        </span>
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