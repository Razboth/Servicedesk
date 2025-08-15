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
  Building2, 
  Users, 
  Target, 
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  BarChart3,
  Shield,
  MapPin,
  Calendar,
  Zap,
  Settings
} from 'lucide-react';

interface BranchOperationsData {
  branch: {
    name: string;
    code: string;
    city: string;
  };
  summary: {
    totalTickets: number;
    resolvedTickets: number;
    openTickets: number;
    overdueTickets: number;
    resolutionRate: number;
    overdueRate: number;
    avgResolutionTime: number;
    slaCompliance: number;
    avgResponseTime: number;
  };
  team: {
    totalUsers: number;
    technicians: number;
    agents: number;
    workloadBalance: number;
  };
  serviceDelivery: Array<{
    category: string;
    totalTickets: number;
    resolvedTickets: number;
    resolutionRate: number;
    avgResolutionTime: number;
  }>;
  workload: Array<{
    technician: string;
    activeTickets: number;
    totalAssigned: number;
    urgentTickets: number;
    highPriorityTickets: number;
    workloadScore: number;
  }>;
  trends: {
    daily: Array<{
      date: string;
      value: number;
      label: string;
    }>;
    priority: Array<{
      label: string;
      value: number;
    }>;
    peakHours: Array<{
      hour: number;
      count: number;
      label: string;
    }>;
  };
  utilization: {
    ticketsPerTechnician: number;
    ticketsPerAgent: number;
    teamEfficiency: number;
  };
  specialServices: {
    atmTickets: number;
    atmResolved: number;
    atmResolutionRate: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function BranchOperationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<BranchOperationsData | null>(null);
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

      const response = await fetch(`/api/reports/manager/branch-operations?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching branch operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    const exportData = data.serviceDelivery.map(service => ({
      'Service Category': service.category,
      'Total Tickets': service.totalTickets,
      'Resolved Tickets': service.resolvedTickets,
      'Resolution Rate': `${service.resolutionRate}%`,
      'Avg Resolution Time': `${service.avgResolutionTime}h`
    }));

    const filename = exportUtils.generateFilename('branch-operations', format === 'xlsx' ? 'xlsx' : 'csv');
    
    if (format === 'csv') {
      exportUtils.exportToCSV(exportData, filename);
    }
  };

  const getWorkloadBadgeVariant = (score: number, maxScore: number) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    if (percentage >= 80) return 'destructive';
    if (percentage >= 60) return 'secondary';
    return 'default';
  };

  const getPerformanceBadgeVariant = (rate: number) => {
    if (rate >= 90) return 'default';
    if (rate >= 80) return 'secondary';
    return 'destructive';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading branch operations data...</p>
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
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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

  const maxWorkloadScore = data ? Math.max(...data.workload.map(w => w.workloadScore)) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
                    <h1 className="text-3xl font-bold text-gray-900">Branch Operations Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500 flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>{data?.branch.name} ({data?.branch.code})</span>
                      <MapPin className="h-4 w-4 ml-2" />
                      <span>{data?.branch.city}</span>
                    </p>
                  </div>
                </div>
                <ExportButton
                  onExport={handleExport}
                  disabled={!data}
                  reportName="branch-operations"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <MetricCard
                  title="Total Tickets"
                  value={data.summary.totalTickets}
                  subtitle="In selected period"
                  icon={<Activity className="h-5 w-5" />}
                  badge={{
                    text: 'Volume',
                    variant: 'secondary'
                  }}
                />
                
                <MetricCard
                  title="Resolution Rate"
                  value={`${data.summary.resolutionRate}%`}
                  subtitle={`${data.summary.resolvedTickets} resolved`}
                  icon={<Target className="h-5 w-5" />}
                  trend={{
                    value: data.summary.resolutionRate >= 85 ? 5 : -3,
                    label: data.summary.resolutionRate >= 85 ? 'Good' : 'Needs improvement',
                    isPositive: data.summary.resolutionRate >= 85
                  }}
                  badge={{
                    text: data.summary.resolutionRate >= 90 ? 'Excellent' : 
                          data.summary.resolutionRate >= 80 ? 'Good' : 'Fair',
                    variant: data.summary.resolutionRate >= 90 ? 'default' : 
                             data.summary.resolutionRate >= 80 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="SLA Compliance"
                  value={`${data.summary.slaCompliance}%`}
                  subtitle="Within SLA targets"
                  icon={<Shield className="h-5 w-5" />}
                  badge={{
                    text: data.summary.slaCompliance >= 95 ? 'Excellent' :
                          data.summary.slaCompliance >= 90 ? 'Good' : 'Fair',
                    variant: data.summary.slaCompliance >= 95 ? 'default' :
                             data.summary.slaCompliance >= 90 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Avg Resolution Time"
                  value={`${data.summary.avgResolutionTime}h`}
                  subtitle="Per ticket"
                  icon={<Clock className="h-5 w-5" />}
                  badge={{
                    text: data.summary.avgResolutionTime <= 4 ? 'Fast' : 
                          data.summary.avgResolutionTime <= 8 ? 'Good' : 'Slow',
                    variant: data.summary.avgResolutionTime <= 4 ? 'default' : 
                             data.summary.avgResolutionTime <= 8 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Team Size"
                  value={data.team.totalUsers}
                  subtitle={`${data.team.technicians} tech, ${data.team.agents} agents`}
                  icon={<Users className="h-5 w-5" />}
                  badge={{
                    text: 'Active Staff',
                    variant: 'outline'
                  }}
                />
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Open Tickets"
                  value={data.summary.openTickets}
                  subtitle="Currently active"
                  icon={<Activity className="h-5 w-5" />}
                  badge={{
                    text: 'Active',
                    variant: 'secondary'
                  }}
                />

                <MetricCard
                  title="Overdue Tickets"
                  value={data.summary.overdueTickets}
                  subtitle={`${data.summary.overdueRate}% of total`}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  badge={{
                    text: data.summary.overdueTickets === 0 ? 'Good' : 
                          data.summary.overdueRate <= 5 ? 'Fair' : 'Critical',
                    variant: data.summary.overdueTickets === 0 ? 'default' : 
                             data.summary.overdueRate <= 5 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Workload Balance"
                  value={`${data.team.workloadBalance}%`}
                  subtitle="Team distribution"
                  icon={<BarChart3 className="h-5 w-5" />}
                  badge={{
                    text: data.team.workloadBalance >= 80 ? 'Balanced' : 'Uneven',
                    variant: data.team.workloadBalance >= 80 ? 'default' : 'destructive'
                  }}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Volume Trend */}
                <TimelineChart
                  title="Daily Ticket Volume (Last 30 Days)"
                  data={data.trends.daily}
                />

                {/* Priority Distribution */}
                <PieChart
                  title="Tickets by Priority"
                  data={data.trends.priority}
                />
              </div>

              {/* Service Delivery Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Service Delivery Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.serviceDelivery.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                            {service.totalTickets}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{service.category}</div>
                            <div className="text-sm text-gray-500">
                              {service.resolvedTickets} resolved • Avg: {service.avgResolutionTime}h
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={getPerformanceBadgeVariant(service.resolutionRate)}
                          className="text-xs"
                        >
                          {service.resolutionRate}% resolved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Team Workload Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Team Workload Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.workload.map((tech, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-800">
                            {tech.technician.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{tech.technician}</div>
                            <div className="text-sm text-gray-500">
                              {tech.totalAssigned} assigned this period • {tech.activeTickets} currently active
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {tech.urgentTickets > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {tech.urgentTickets} urgent
                            </Badge>
                          )}
                          {tech.highPriorityTickets > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {tech.highPriorityTickets} high
                            </Badge>
                          )}
                          <Badge 
                            variant={getWorkloadBadgeVariant(tech.workloadScore, maxWorkloadScore)}
                            className="text-xs"
                          >
                            Load: {tech.workloadScore}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resource Utilization */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Tickets per Technician"
                  value={data.utilization.ticketsPerTechnician}
                  subtitle="Average load"
                  icon={<Zap className="h-5 w-5" />}
                  badge={{
                    text: 'Tech Utilization',
                    variant: 'outline'
                  }}
                />

                <MetricCard
                  title="Tickets per Agent"
                  value={data.utilization.ticketsPerAgent}
                  subtitle="Average load"
                  icon={<Activity className="h-5 w-5" />}
                  badge={{
                    text: 'Agent Utilization',
                    variant: 'outline'
                  }}
                />

                <MetricCard
                  title="Team Efficiency"
                  value={data.utilization.teamEfficiency}
                  subtitle="Resolved per person"
                  icon={<TrendingUp className="h-5 w-5" />}
                  badge={{
                    text: 'Efficiency',
                    variant: 'default'
                  }}
                />
              </div>

              {/* Peak Hours Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Peak Hours Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.trends.peakHours.map((hour, index) => (
                      <div key={hour.hour} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
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
                            <div className="font-medium text-gray-900">{hour.label}</div>
                            <div className="text-sm text-gray-500">Peak activity period</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {hour.count} tickets
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Special Services */}
              {data.specialServices.atmTickets > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5" />
                      <span>ATM Services Performance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{data.specialServices.atmTickets}</div>
                        <div className="text-sm text-gray-500">ATM Tickets</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{data.specialServices.atmResolved}</div>
                        <div className="text-sm text-gray-500">Resolved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{data.specialServices.atmResolutionRate}%</div>
                        <div className="text-sm text-gray-500">Resolution Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Operational Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Operational Insights & Recommendations</h3>
                  <div className="space-y-3">
                    {data.summary.resolutionRate >= 90 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span>Excellent branch performance with {data.summary.resolutionRate}% resolution rate.</span>
                      </div>
                    )}
                    
                    {data.summary.slaCompliance >= 95 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Shield className="h-4 w-4" />
                        <span>Outstanding SLA compliance at {data.summary.slaCompliance}%. Your team is meeting service commitments consistently.</span>
                      </div>
                    )}
                    
                    {data.summary.overdueTickets > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          {data.summary.overdueTickets} overdue tickets ({data.summary.overdueRate}% of total). 
                          Focus on resolving these to improve SLA compliance.
                        </span>
                      </div>
                    )}
                    
                    {data.team.workloadBalance < 70 && (
                      <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 p-3 rounded-md">
                        <Users className="h-4 w-4" />
                        <span>
                          Workload imbalance detected ({data.team.workloadBalance}% balance). 
                          Consider redistributing tickets to prevent technician burnout.
                        </span>
                      </div>
                    )}

                    {data.trends.peakHours.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Peak activity: {data.trends.peakHours[0].label} with {data.trends.peakHours[0].count} tickets. 
                          Consider adjusting staffing during these hours.
                        </span>
                      </div>
                    )}

                    {data.utilization.teamEfficiency > 10 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                        <span>High team efficiency with {data.utilization.teamEfficiency} resolved tickets per person. Excellent productivity!</span>
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