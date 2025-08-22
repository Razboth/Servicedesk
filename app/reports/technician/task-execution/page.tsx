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
  Clock, 
  Target, 
  TrendingUp,
  AlertTriangle,
  Zap,
  Calendar,
  ListTodo,
  Award,
  BarChart3,
  Timer,
  Activity
} from 'lucide-react';

interface TaskExecutionData {
  summary: {
    totalCompletedTasks: number;
    totalPendingTasks: number;
    avgEfficiencyRate: number;
    totalTimeVariance: number;
    onTimeCompletionRate: number;
    avgTasksPerDay: number;
    avgTimePerTask: number;
  };
  distributions: {
    complexity: Array<{ label: string; value: number }>;
    category: Array<{ label: string; value: number }>;
    priority: Array<{ label: string; value: number }>;
  };
  trends: {
    daily: Array<{
      date: string;
      value: number;
      label: string;
    }>;
  };
  performance: {
    byTemplate: Array<{
      template: string;
      count: number;
      avgTime: number;
      avgEstimated: number;
      efficiency: number;
    }>;
    improvements: Array<{
      taskTitle: string;
      ticketTitle: string;
      estimatedMinutes: number;
      actualMinutes: number;
      variance: number;
      category: string;
    }>;
  };
  pending: {
    total: number;
    tasks: Array<{
      id: string;
      title: string;
      ticketTitle: string;
      priority: string;
      estimatedMinutes: number;
      createdAt: string;
      ticketCreatedAt: string;
    }>;
  };
  recent: {
    tasks: Array<{
      id: string;
      title: string;
      ticketTitle: string;
      actualMinutes: number;
      estimatedMinutes: number;
      completedAt: string;
      efficiency: number;
    }>;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function TaskExecutionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<TaskExecutionData | null>(null);
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

      const response = await fetch(`/api/reports/technician/task-execution?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching task execution data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    const exportData = data.recent.tasks.map(task => ({
      'Task': task.title,
      'Ticket': task.ticketTitle,
      'Estimated (min)': task.estimatedMinutes,
      'Actual (min)': task.actualMinutes,
      'Efficiency': `${task.efficiency}%`,
      'Completed': new Date(task.completedAt).toLocaleDateString()
    }));

    const filename = exportUtils.generateFilename('task-execution', format === 'xlsx' ? 'xlsx' : 'csv');
    
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

  const getEfficiencyBadgeVariant = (efficiency: number) => {
    if (efficiency >= 100) return 'default';
    if (efficiency >= 80) return 'secondary';
    return 'destructive';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading task execution data...</p>
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
                    <h1 className="text-3xl font-bold text-gray-900">Task Execution Performance</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Task completion efficiency, productivity metrics, and improvement opportunities
                    </p>
                  </div>
                </div>
                <ExportButton
                  onExport={handleExport}
                  disabled={!data}
                  reportName="task-execution"
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
                  title="Tasks Completed"
                  value={data.summary.totalCompletedTasks}
                  subtitle="In selected period"
                  icon={<CheckCircle className="h-5 w-5" />}
                  badge={{
                    text: 'Completed',
                    variant: 'default'
                  }}
                />
                
                <MetricCard
                  title="Efficiency Rate"
                  value={`${data.summary.avgEfficiencyRate}%`}
                  subtitle="Estimated vs actual time"
                  icon={<Zap className="h-5 w-5" />}
                  trend={{
                    value: data.summary.avgEfficiencyRate >= 100 ? 5 : -3,
                    label: data.summary.avgEfficiencyRate >= 100 ? 'Efficient' : 'Room for improvement',
                    isPositive: data.summary.avgEfficiencyRate >= 100
                  }}
                  badge={{
                    text: data.summary.avgEfficiencyRate >= 110 ? 'Excellent' :
                          data.summary.avgEfficiencyRate >= 100 ? 'Good' : 'Developing',
                    variant: data.summary.avgEfficiencyRate >= 110 ? 'default' :
                             data.summary.avgEfficiencyRate >= 100 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="On-Time Rate"
                  value={`${data.summary.onTimeCompletionRate}%`}
                  subtitle="Within 20% of estimate"
                  icon={<Target className="h-5 w-5" />}
                  badge={{
                    text: data.summary.onTimeCompletionRate >= 80 ? 'Good' : 'Needs Focus',
                    variant: data.summary.onTimeCompletionRate >= 80 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Daily Average"
                  value={data.summary.avgTasksPerDay}
                  subtitle="Tasks per day"
                  icon={<Activity className="h-5 w-5" />}
                  badge={{
                    text: 'Productivity',
                    variant: 'outline'
                  }}
                />
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Pending Tasks"
                  value={data.summary.totalPendingTasks}
                  subtitle="Awaiting completion"
                  icon={<ListTodo className="h-5 w-5" />}
                  badge={{
                    text: data.summary.totalPendingTasks === 0 ? 'All Clear' : 'Active',
                    variant: data.summary.totalPendingTasks === 0 ? 'default' : 'secondary'
                  }}
                />

                <MetricCard
                  title="Time Variance"
                  value={`${data.summary.totalTimeVariance > 0 ? '+' : ''}${data.summary.totalTimeVariance}m`}
                  subtitle={data.summary.totalTimeVariance >= 0 ? 'Under budget' : 'Over budget'}
                  icon={<Timer className="h-5 w-5" />}
                  badge={{
                    text: data.summary.totalTimeVariance >= 0 ? 'Efficient' : 'Over Budget',
                    variant: data.summary.totalTimeVariance >= 0 ? 'default' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Avg Task Time"
                  value={formatDuration(data.summary.avgTimePerTask)}
                  subtitle="Average completion time"
                  icon={<Clock className="h-5 w-5" />}
                  badge={{
                    text: 'Performance',
                    variant: 'outline'
                  }}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Completion Trend */}
                <TimelineChart
                  title="Daily Task Completions (Last 14 Days)"
                  data={data.trends.daily}
                />

                {/* Task Complexity Distribution */}
                <PieChart
                  title="Tasks by Complexity"
                  data={data.distributions.complexity}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <BarChart
                  title="Tasks by Service Category"
                  data={data.distributions.category}
                />

                {/* Priority Distribution */}
                <PieChart
                  title="Tasks by Ticket Priority"
                  data={data.distributions.priority}
                />
              </div>

              {/* Task Template Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Performance by Task Template</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.performance.byTemplate.slice(0, 8).map((template, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                            {template.count}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{template.template}</div>
                            <div className="text-sm text-gray-500">
                              Avg: {formatDuration(template.avgTime)} (Est: {formatDuration(template.avgEstimated)})
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={getEfficiencyBadgeVariant(template.efficiency)}
                          className="text-xs"
                        >
                          {template.efficiency}% efficiency
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Tasks */}
              {data.pending.total > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>Pending Tasks ({data.pending.total})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.pending.tasks.map((task, index) => (
                        <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Timer className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">{task.title}</div>
                              <div className="text-sm text-gray-500">{task.ticketTitle}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant={getPriorityBadgeVariant(task.priority)}
                              className="text-xs"
                            >
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Est: {formatDuration(task.estimatedMinutes)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Completed Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Recent Completed Tasks</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.recent.tasks.map((task, index) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-500">{task.ticketTitle}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={getEfficiencyBadgeVariant(task.efficiency)}
                            className="text-xs"
                          >
                            {task.efficiency}%
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDuration(task.actualMinutes)} / {formatDuration(task.estimatedMinutes)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Improvement Opportunities */}
              {data.performance.improvements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Improvement Opportunities</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.performance.improvements.map((task, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">{task.taskTitle}</div>
                            <div className="text-sm text-gray-500">
                              {task.ticketTitle} • {task.category}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-amber-800">
                              +{formatDuration(task.variance)} over estimate
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDuration(task.actualMinutes)} vs {formatDuration(task.estimatedMinutes)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights & Tips</h3>
                  <div className="space-y-3">
                    {data.summary.avgEfficiencyRate >= 110 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <Award className="h-4 w-4" />
                        <span>Outstanding efficiency! You're completing tasks faster than estimated consistently.</span>
                      </div>
                    )}
                    
                    {data.summary.onTimeCompletionRate >= 90 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Target className="h-4 w-4" />
                        <span>Excellent time estimation accuracy. You're very predictable in your task completion times.</span>
                      </div>
                    )}
                    
                    {data.summary.totalPendingTasks > 5 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <ListTodo className="h-4 w-4" />
                        <span>Consider prioritizing your {data.summary.totalPendingTasks} pending tasks to maintain workflow efficiency.</span>
                      </div>
                    )}
                    
                    {data.performance.improvements.length > 3 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                        <span>Several tasks took longer than expected. Consider breaking down complex tasks or seeking guidance for efficiency.</span>
                      </div>
                    )}

                    {data.summary.avgTasksPerDay > 5 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <Activity className="h-4 w-4" />
                        <span>High productivity with {data.summary.avgTasksPerDay} tasks per day on average. Great work pace!</span>
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