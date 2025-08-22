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
  Shield, 
  Target, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Award,
  BarChart3,
  Activity,
  Building2,
  Settings,
  Zap,
  Timer,
  Gauge
} from 'lucide-react';

interface SLAPerformanceData {
  summary: {
    totalSlaRecords: number;
    overallCompliance: number;
    responseCompliance: number;
    resolutionCompliance: number;
    responseBreaches: number;
    resolutionBreaches: number;
    avgResponseTime: number;
    avgResolutionTime: number;
  };
  excellence: {
    excellentPerformance: number;
    excellenceRate: number;
    criticalIncidents: number;
    criticalOnTime: number;
    criticalComplianceRate: number;
  };
  performance: {
    byPriority: Array<{
      priority: string;
      totalTickets: number;
      compliantTickets: number;
      complianceRate: number;
      avgResponseTime: number;
      responseBreaches: number;
      resolutionBreaches: number;
    }>;
    byCategory: Array<{
      category: string;
      totalTickets: number;
      compliantTickets: number;
      complianceRate: number;
      responseBreaches: number;
      resolutionBreaches: number;
      avgResponseTime: number;
    }>;
    byBranch: Array<{
      branch: string;
      totalTickets: number;
      compliantTickets: number;
      complianceRate: number;
      responseBreaches: number;
      resolutionBreaches: number;
    }>;
    topBranches: Array<{
      branch: string;
      complianceRate: number;
      totalTickets: number;
    }>;
    topCategories: Array<{
      category: string;
      complianceRate: number;
      totalTickets: number;
    }>;
  };
  trends: {
    daily: Array<{
      date: string;
      value: number;
      total: number;
      compliant: number;
      label: string;
    }>;
    monthly: Array<{
      date: string;
      value: number;
      total: number;
      compliant: number;
      label: string;
    }>;
    responseTime: Array<{
      label: string;
      value: number;
    }>;
  };
  improvements: {
    highBreachBranches: Array<{
      branch: string;
      complianceRate: number;
      totalTickets: number;
    }>;
    problematicCategories: Array<{
      category: string;
      complianceRate: number;
      totalTickets: number;
    }>;
    frequentBreaches: number;
    totalImprovementAreas: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function SLAPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<SLAPerformanceData | null>(null);
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

    if (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      router.push('/reports');
      return;
    }
  }, [session, status, router]);

  // Fetch data when filters change
  useEffect(() => {
    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') {
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

      const response = await fetch(`/api/reports/admin/sla-performance?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching SLA performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    const exportData = data.performance.byBranch.map(branch => ({
      'Branch': branch.branch,
      'Total Tickets': branch.totalTickets,
      'Compliant Tickets': branch.compliantTickets,
      'Compliance Rate': `${branch.complianceRate}%`,
      'Response Breaches': branch.responseBreaches,
      'Resolution Breaches': branch.resolutionBreaches
    }));

    const filename = exportUtils.generateFilename('sla-performance-excellence', format === 'xlsx' ? 'xlsx' : 'csv');
    
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

  const getComplianceBadgeVariant = (rate: number) => {
    if (rate >= 95) return 'default';
    if (rate >= 90) return 'secondary';
    if (rate >= 80) return 'secondary';
    return 'destructive';
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
            <p className="text-gray-600">Loading SLA performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN')) {
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
                    <h1 className="text-3xl font-bold text-gray-900">SLA & Performance Excellence</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Organization-wide service level compliance and performance excellence analytics
                    </p>
                  </div>
                </div>
                <ExportButton
                  onExport={handleExport}
                  disabled={!data}
                  reportName="sla-performance-excellence"
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
              {/* Key SLA Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Overall Compliance"
                  value={`${data.summary.overallCompliance}%`}
                  subtitle={`${data.summary.totalSlaRecords} SLA records`}
                  icon={<Shield className="h-5 w-5" />}
                  trend={{
                    value: data.summary.overallCompliance >= 90 ? 5 : -3,
                    label: data.summary.overallCompliance >= 90 ? 'Excellent' : 'Needs improvement',
                    isPositive: data.summary.overallCompliance >= 90
                  }}
                  badge={{
                    text: data.summary.overallCompliance >= 95 ? 'Excellent' : 
                          data.summary.overallCompliance >= 90 ? 'Good' : 
                          data.summary.overallCompliance >= 80 ? 'Fair' : 'Poor',
                    variant: data.summary.overallCompliance >= 95 ? 'default' : 
                             data.summary.overallCompliance >= 90 ? 'secondary' :
                             data.summary.overallCompliance >= 80 ? 'secondary' : 'destructive'
                  }}
                />
                
                <MetricCard
                  title="Response Compliance"
                  value={`${data.summary.responseCompliance}%`}
                  subtitle={`${data.summary.responseBreaches} breaches`}
                  icon={<Timer className="h-5 w-5" />}
                  badge={{
                    text: data.summary.responseCompliance >= 95 ? 'Excellent' : 
                          data.summary.responseCompliance >= 90 ? 'Good' : 'Fair',
                    variant: data.summary.responseCompliance >= 95 ? 'default' : 
                             data.summary.responseCompliance >= 90 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Resolution Compliance"
                  value={`${data.summary.resolutionCompliance}%`}
                  subtitle={`${data.summary.resolutionBreaches} breaches`}
                  icon={<Target className="h-5 w-5" />}
                  badge={{
                    text: data.summary.resolutionCompliance >= 95 ? 'Excellent' : 
                          data.summary.resolutionCompliance >= 90 ? 'Good' : 'Fair',
                    variant: data.summary.resolutionCompliance >= 95 ? 'default' : 
                             data.summary.resolutionCompliance >= 90 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Avg Response Time"
                  value={formatDuration(data.summary.avgResponseTime)}
                  subtitle="Organization average"
                  icon={<Clock className="h-5 w-5" />}
                  badge={{
                    text: data.summary.avgResponseTime <= 2 ? 'Fast' : 
                          data.summary.avgResponseTime <= 4 ? 'Good' : 'Slow',
                    variant: data.summary.avgResponseTime <= 2 ? 'default' : 
                             data.summary.avgResponseTime <= 4 ? 'secondary' : 'destructive'
                  }}
                />
              </div>

              {/* Performance Excellence Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  title="Excellence Rate"
                  value={`${data.excellence.excellenceRate}%`}
                  subtitle={`${data.excellence.excellentPerformance} tickets <50% SLA time`}
                  icon={<Award className="h-5 w-5" />}
                  badge={{
                    text: data.excellence.excellenceRate >= 20 ? 'Outstanding' : 
                          data.excellence.excellenceRate >= 10 ? 'Good' : 'Developing',
                    variant: data.excellence.excellenceRate >= 20 ? 'default' : 
                             data.excellence.excellenceRate >= 10 ? 'secondary' : 'outline'
                  }}
                />

                <MetricCard
                  title="Critical Incidents"
                  value={data.excellence.criticalIncidents}
                  subtitle="Urgent priority tickets"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  badge={{
                    text: 'Critical',
                    variant: 'destructive'
                  }}
                />

                <MetricCard
                  title="Critical SLA Rate"
                  value={`${data.excellence.criticalComplianceRate}%`}
                  subtitle={`${data.excellence.criticalOnTime} urgent tickets on time`}
                  icon={<Zap className="h-5 w-5" />}
                  badge={{
                    text: data.excellence.criticalComplianceRate >= 95 ? 'Excellent' : 
                          data.excellence.criticalComplianceRate >= 90 ? 'Good' : 'Critical',
                    variant: data.excellence.criticalComplianceRate >= 95 ? 'default' : 
                             data.excellence.criticalComplianceRate >= 90 ? 'secondary' : 'destructive'
                  }}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Compliance Trend */}
                <TimelineChart
                  title="Daily SLA Compliance Trend (Last 30 Days)"
                  data={data.trends.daily}
                />

                {/* Response Time Distribution */}
                <PieChart
                  title="Response Time Distribution"
                  data={data.trends.responseTime}
                />
              </div>

              {/* Monthly Performance Trend */}
              <TimelineChart
                title="Monthly SLA Compliance Trend (Last 6 Months)"
                data={data.trends.monthly}
              />

              {/* Priority Performance Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Gauge className="h-5 w-5" />
                    <span>SLA Performance by Priority</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.performance.byPriority.map((priority, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={getPriorityBadgeVariant(priority.priority)}
                            className="text-xs"
                          >
                            {priority.priority}
                          </Badge>
                          <div>
                            <div className="font-medium text-gray-900">{priority.totalTickets} tickets</div>
                            <div className="text-sm text-gray-500">
                              Avg response: {formatDuration(priority.avgResponseTime)} • 
                              {priority.responseBreaches} response breaches • 
                              {priority.resolutionBreaches} resolution breaches
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={getComplianceBadgeVariant(priority.complianceRate)}
                          className="text-xs"
                        >
                          {priority.complianceRate}% compliant
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Branch Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>SLA Performance by Branch</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.performance.byBranch.map((branch, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                            {branch.totalTickets}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{branch.branch}</div>
                            <div className="text-sm text-gray-500">
                              {branch.compliantTickets} compliant • {branch.responseBreaches} response breaches • {branch.resolutionBreaches} resolution breaches
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={getComplianceBadgeVariant(branch.complianceRate)}
                          className="text-xs"
                        >
                          {branch.complianceRate}% compliant
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>SLA Performance by Service Category</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.performance.byCategory.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-800">
                            {category.totalTickets}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{category.category}</div>
                            <div className="text-sm text-gray-500">
                              {category.compliantTickets} compliant • Avg response: {formatDuration(category.avgResponseTime)}
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={getComplianceBadgeVariant(category.complianceRate)}
                          className="text-xs"
                        >
                          {category.complianceRate}% compliant
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performing Branches */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span>Top Performing Branches</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.performance.topBranches.map((branch, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
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
                              <div className="font-medium text-gray-900">{branch.branch}</div>
                              <div className="text-sm text-gray-500">{branch.totalTickets} tickets</div>
                            </div>
                          </div>
                          <Badge variant="default" className="text-xs">
                            {branch.complianceRate}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performing Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Top Performing Categories</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.performance.topCategories.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
                              <div className="font-medium text-gray-900">{category.category}</div>
                              <div className="text-sm text-gray-500">{category.totalTickets} tickets</div>
                            </div>
                          </div>
                          <Badge variant="default" className="text-xs">
                            {category.complianceRate}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Improvement Areas */}
              {data.improvements.totalImprovementAreas > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Areas Requiring Attention</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.improvements.highBreachBranches.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Branches with High Breach Rates</h4>
                          <div className="space-y-2">
                            {data.improvements.highBreachBranches.map((branch, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div>
                                  <div className="font-medium text-gray-900">{branch.branch}</div>
                                  <div className="text-sm text-gray-500">{branch.totalTickets} tickets</div>
                                </div>
                                <Badge variant="destructive" className="text-xs">
                                  {branch.complianceRate}% compliant
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {data.improvements.problematicCategories.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Categories with Low Compliance</h4>
                          <div className="space-y-2">
                            {data.improvements.problematicCategories.map((category, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div>
                                  <div className="font-medium text-gray-900">{category.category}</div>
                                  <div className="text-sm text-gray-500">{category.totalTickets} tickets</div>
                                </div>
                                <Badge variant="destructive" className="text-xs">
                                  {category.complianceRate}% compliant
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Executive Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Executive Insights & Strategic Recommendations</h3>
                  <div className="space-y-3">
                    {data.summary.overallCompliance >= 95 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span>Outstanding organizational SLA compliance at {data.summary.overallCompliance}%. Service excellence is being delivered consistently.</span>
                      </div>
                    )}
                    
                    {data.excellence.excellenceRate >= 20 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Award className="h-4 w-4" />
                        <span>Exceptional performance with {data.excellence.excellenceRate}% of tickets resolved within 50% of SLA time. This demonstrates operational excellence.</span>
                      </div>
                    )}
                    
                    {data.excellence.criticalComplianceRate >= 95 && (
                      <div className="flex items-center space-x-2 text-sm text-purple-700 bg-purple-50 p-3 rounded-md">
                        <Zap className="h-4 w-4" />
                        <span>Critical incident handling is excellent with {data.excellence.criticalComplianceRate}% of urgent tickets meeting SLA.</span>
                      </div>
                    )}
                    
                    {data.improvements.totalImprovementAreas > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                        <span>
                          {data.improvements.totalImprovementAreas} area{data.improvements.totalImprovementAreas > 1 ? 's' : ''} identified for improvement. 
                          Focus on process optimization and additional training.
                        </span>
                      </div>
                    )}

                    {data.improvements.frequentBreaches > 10 && (
                      <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 p-3 rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          {data.improvements.frequentBreaches} tickets experienced both response and resolution breaches. 
                          Investigate root causes and implement process improvements.
                        </span>
                      </div>
                    )}

                    {data.summary.avgResponseTime <= 2 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <Timer className="h-4 w-4" />
                        <span>Outstanding response time of {formatDuration(data.summary.avgResponseTime)} demonstrates responsive customer service.</span>
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