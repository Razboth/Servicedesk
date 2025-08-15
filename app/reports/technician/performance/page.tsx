'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ReportFilters, type ReportFilters as ReportFiltersType } from '@/components/reports/report-filters';
import { MetricCard, BarChart, PieChart, TimelineChart } from '@/components/reports/report-charts';
import { ExportButton, exportUtils } from '@/components/reports/export-button';
import { 
  ArrowLeft, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Activity,
  Award
} from 'lucide-react';

interface PerformanceData {
  summary: {
    totalAssignedTickets: number;
    resolvedTickets: number;
    openTickets: number;
    overdueTickets: number;
    resolutionRate: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    slaCompliance: number;
  };
  distributions: {
    priority: Array<{ label: string; value: number }>;
    status: Array<{ label: string; value: number }>;
    category: Array<{ label: string; value: number }>;
  };
  timeline: Array<{
    date: string;
    value: number;
    label: string;
  }>;
  tasks: {
    totalCompleted: number;
    avgCompletionTime: number;
    efficiency: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function TechnicianPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<PerformanceData | null>(null);
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

    if (session.user?.role !== 'TECHNICIAN') {
      router.push('/reports');
      return;
    }
  }, [session, status, router]);

  // Fetch data when filters change
  useEffect(() => {
    if (session?.user?.role === 'TECHNICIAN') {
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

      const response = await fetch(`/api/reports/technician/performance?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    const exportData = [
      {
        'Metric': 'Total Assigned Tickets',
        'Value': data.summary.totalAssignedTickets
      },
      {
        'Metric': 'Resolved Tickets',
        'Value': data.summary.resolvedTickets
      },
      {
        'Metric': 'Resolution Rate',
        'Value': `${data.summary.resolutionRate}%`
      },
      {
        'Metric': 'Average Response Time',
        'Value': `${data.summary.avgResponseTime} hours`
      },
      {
        'Metric': 'Average Resolution Time',
        'Value': `${data.summary.avgResolutionTime} hours`
      },
      {
        'Metric': 'SLA Compliance',
        'Value': `${data.summary.slaCompliance}%`
      }
    ];

    const filename = exportUtils.generateFilename('technician-performance', format === 'xlsx' ? 'xlsx' : 'csv');
    
    if (format === 'csv') {
      exportUtils.exportToCSV(exportData, filename);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'TECHNICIAN') {
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

  const filterGroups = []; // No additional filters for personal dashboard

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
                    <h1 className="text-3xl font-bold text-gray-900">My Performance Dashboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Personal KPIs and performance metrics for {session.user?.name}
                    </p>
                  </div>
                </div>
                <ExportButton
                  onExport={handleExport}
                  disabled={!data}
                  reportName="technician-performance"
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
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Assigned"
                  value={data.summary.totalAssignedTickets}
                  subtitle="Tickets in period"
                  icon={<Target className="h-5 w-5" />}
                  badge={{
                    text: 'Assigned',
                    variant: 'secondary'
                  }}
                />
                
                <MetricCard
                  title="Resolution Rate"
                  value={`${data.summary.resolutionRate}%`}
                  subtitle={`${data.summary.resolvedTickets} resolved`}
                  icon={<CheckCircle className="h-5 w-5" />}
                  trend={{
                    value: data.summary.resolutionRate >= 80 ? 5 : -5,
                    label: data.summary.resolutionRate >= 80 ? 'Good' : 'Needs improvement',
                    isPositive: data.summary.resolutionRate >= 80
                  }}
                  badge={{
                    text: data.summary.resolutionRate >= 90 ? 'Excellent' : 
                          data.summary.resolutionRate >= 80 ? 'Good' : 'Fair',
                    variant: data.summary.resolutionRate >= 90 ? 'default' : 
                             data.summary.resolutionRate >= 80 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Avg Response Time"
                  value={`${data.summary.avgResponseTime}h`}
                  subtitle="Response to tickets"
                  icon={<Clock className="h-5 w-5" />}
                  badge={{
                    text: data.summary.avgResponseTime <= 2 ? 'Fast' : 
                          data.summary.avgResponseTime <= 4 ? 'Good' : 'Slow',
                    variant: data.summary.avgResponseTime <= 2 ? 'default' : 
                             data.summary.avgResponseTime <= 4 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="SLA Compliance"
                  value={`${data.summary.slaCompliance}%`}
                  subtitle="Within SLA targets"
                  icon={<Award className="h-5 w-5" />}
                  trend={{
                    value: data.summary.slaCompliance >= 95 ? 10 : -3,
                    label: data.summary.slaCompliance >= 95 ? 'Excellent' : 'Room for improvement',
                    isPositive: data.summary.slaCompliance >= 95
                  }}
                  badge={{
                    text: data.summary.slaCompliance >= 95 ? 'Excellent' :
                          data.summary.slaCompliance >= 90 ? 'Good' : 'Fair',
                    variant: data.summary.slaCompliance >= 95 ? 'default' :
                             data.summary.slaCompliance >= 90 ? 'secondary' : 'destructive'
                  }}
                />
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Open Tickets"
                  value={data.summary.openTickets}
                  subtitle="Currently assigned"
                  icon={<Activity className="h-5 w-5" />}
                  badge={{
                    text: 'Active',
                    variant: 'outline'
                  }}
                />
                
                <MetricCard
                  title="Overdue Tickets"
                  value={data.summary.overdueTickets}
                  subtitle="Past SLA deadline"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  badge={{
                    text: data.summary.overdueTickets === 0 ? 'Good' : 'Attention Required',
                    variant: data.summary.overdueTickets === 0 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Task Efficiency"
                  value={`${data.tasks.efficiency}%`}
                  subtitle={`${data.tasks.totalCompleted} tasks completed`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  badge={{
                    text: data.tasks.efficiency >= 100 ? 'Efficient' : 'Learning',
                    variant: data.tasks.efficiency >= 100 ? 'default' : 'secondary'
                  }}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timeline Chart */}
                <TimelineChart
                  title="Tickets Resolved (Last 7 Days)"
                  data={data.timeline}
                />

                {/* Priority Distribution */}
                <PieChart
                  title="Tickets by Priority"
                  data={data.distributions.priority}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <BarChart
                  title="Tickets by Status"
                  data={data.distributions.status}
                />

                {/* Category Distribution */}
                <BarChart
                  title="Tickets by Category"
                  data={data.distributions.category}
                />
              </div>

              {/* Performance Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
                  <div className="space-y-3">
                    {data.summary.resolutionRate >= 90 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span>Excellent resolution rate! You're consistently closing tickets effectively.</span>
                      </div>
                    )}
                    
                    {data.summary.slaCompliance >= 95 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Award className="h-4 w-4" />
                        <span>Outstanding SLA compliance! You're meeting service level agreements consistently.</span>
                      </div>
                    )}
                    
                    {data.summary.overdueTickets > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <span>You have {data.summary.overdueTickets} overdue ticket{data.summary.overdueTickets > 1 ? 's' : ''}. Consider prioritizing these for resolution.</span>
                      </div>
                    )}
                    
                    {data.summary.avgResponseTime > 4 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <Clock className="h-4 w-4" />
                        <span>Response time could be improved. Consider checking tickets more frequently to respond faster.</span>
                      </div>
                    )}

                    {data.tasks.efficiency > 110 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                        <span>Great task efficiency! You're completing tasks faster than estimated.</span>
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