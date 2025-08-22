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
  Layers, 
  TrendingUp, 
  Target, 
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings,
  Award,
  Calendar,
  Activity,
  Shield,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';

interface ServiceCatalogData {
  summary: {
    totalServices: number;
    activeServices: number;
    totalTickets: number;
    overallResolutionRate: number;
    avgServiceResolutionTime: number;
    overallSlaCompliance: number;
    topCategories: number;
  };
  performance: {
    byService: Array<{
      id: string;
      name: string;
      tier1Category: string;
      tier2Category: string;
      totalTickets: number;
      resolvedTickets: number;
      resolutionRate: number;
      avgResolutionTime: number;
      urgentTickets: number;
      highTickets: number;
      estimatedHours: number;
    }>;
    byCategory: Array<{
      category: string;
      totalTickets: number;
      resolvedTickets: number;
      resolutionRate: number;
      avgResolutionTime: number;
      serviceCount: number;
    }>;
    topPerforming: Array<{
      name: string;
      totalTickets: number;
      resolutionRate: number;
      avgResolutionTime: number;
      tier1Category: string;
    }>;
    underutilized: Array<{
      name: string;
      totalTickets: number;
      tier1Category: string;
      estimatedHours: number;
    }>;
    complexity: Array<{
      complexity: string;
      serviceCount: number;
      totalTickets: number;
      avgResolutionRate: number;
    }>;
  };
  trends: {
    monthly: Array<{
      date: string;
      value: number;
      resolved: number;
      label: string;
    }>;
    dayOfWeek: Array<{
      label: string;
      value: number;
    }>;
  };
  insights: {
    highVolumeServices: number;
    lowResolutionServices: number;
    zeroUsageServices: number;
    avgTicketsPerService: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function ServiceCatalogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<ServiceCatalogData | null>(null);
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

      const response = await fetch(`/api/reports/admin/service-catalog?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching service catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    const exportData = data.performance.byService.map(service => ({
      'Service Name': service.name,
      'Category': service.tier1Category,
      'Sub-Category': service.tier2Category,
      'Total Tickets': service.totalTickets,
      'Resolution Rate': `${service.resolutionRate}%`,
      'Avg Resolution Time': `${service.avgResolutionTime}h`,
      'Urgent Tickets': service.urgentTickets,
      'High Priority': service.highTickets
    }));

    const filename = exportUtils.generateFilename('service-catalog-performance', format === 'xlsx' ? 'xlsx' : 'csv');
    
    if (format === 'csv') {
      exportUtils.exportToCSV(exportData, filename);
    }
  };

  const getResolutionRateBadgeVariant = (rate: number) => {
    if (rate >= 90) return 'default';
    if (rate >= 80) return 'secondary';
    return 'destructive';
  };

  const getUsageBadgeVariant = (tickets: number) => {
    if (tickets >= 50) return 'default';
    if (tickets >= 10) return 'secondary';
    if (tickets >= 1) return 'outline';
    return 'destructive';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading service catalog data...</p>
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
                    <h1 className="text-3xl font-bold text-gray-900">Service Catalog Performance</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Service utilization, performance metrics, and optimization insights
                    </p>
                  </div>
                </div>
                <ExportButton
                  onExport={handleExport}
                  disabled={!data}
                  reportName="service-catalog-performance"
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
                  title="Total Services"
                  value={data.summary.totalServices}
                  subtitle={`${data.summary.activeServices} active`}
                  icon={<Layers className="h-5 w-5" />}
                  badge={{
                    text: 'Catalog',
                    variant: 'secondary'
                  }}
                />
                
                <MetricCard
                  title="Service Requests"
                  value={data.summary.totalTickets}
                  subtitle="Total in period"
                  icon={<Activity className="h-5 w-5" />}
                  badge={{
                    text: 'Volume',
                    variant: 'outline'
                  }}
                />

                <MetricCard
                  title="Overall Resolution"
                  value={`${data.summary.overallResolutionRate}%`}
                  subtitle="Across all services"
                  icon={<Target className="h-5 w-5" />}
                  trend={{
                    value: data.summary.overallResolutionRate >= 85 ? 5 : -3,
                    label: data.summary.overallResolutionRate >= 85 ? 'Good' : 'Needs improvement',
                    isPositive: data.summary.overallResolutionRate >= 85
                  }}
                  badge={{
                    text: data.summary.overallResolutionRate >= 90 ? 'Excellent' : 
                          data.summary.overallResolutionRate >= 80 ? 'Good' : 'Fair',
                    variant: data.summary.overallResolutionRate >= 90 ? 'default' : 
                             data.summary.overallResolutionRate >= 80 ? 'secondary' : 'destructive'
                  }}
                />

                <MetricCard
                  title="SLA Compliance"
                  value={`${data.summary.overallSlaCompliance}%`}
                  subtitle="Service level adherence"
                  icon={<Shield className="h-5 w-5" />}
                  badge={{
                    text: data.summary.overallSlaCompliance >= 95 ? 'Excellent' :
                          data.summary.overallSlaCompliance >= 90 ? 'Good' : 'Fair',
                    variant: data.summary.overallSlaCompliance >= 95 ? 'default' :
                             data.summary.overallSlaCompliance >= 90 ? 'secondary' : 'destructive'
                  }}
                />
              </div>

              {/* Service Insights */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                  title="High Volume Services"
                  value={data.insights.highVolumeServices}
                  subtitle=">50 requests each"
                  icon={<TrendingUp className="h-5 w-5" />}
                  badge={{
                    text: 'Popular',
                    variant: 'default'
                  }}
                />

                <MetricCard
                  title="Low Resolution Rate"
                  value={data.insights.lowResolutionServices}
                  subtitle="<70% resolution"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  badge={{
                    text: 'Attention',
                    variant: 'destructive'
                  }}
                />

                <MetricCard
                  title="Zero Usage"
                  value={data.insights.zeroUsageServices}
                  subtitle="No requests"
                  icon={<EyeOff className="h-5 w-5" />}
                  badge={{
                    text: 'Unused',
                    variant: 'outline'
                  }}
                />

                <MetricCard
                  title="Avg per Service"
                  value={data.insights.avgTicketsPerService}
                  subtitle="Requests per service"
                  icon={<BarChart3 className="h-5 w-5" />}
                  badge={{
                    text: 'Utilization',
                    variant: 'secondary'
                  }}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <TimelineChart
                  title="Service Requests Trend (Last 6 Months)"
                  data={data.trends.monthly}
                />

                {/* Day of Week Pattern */}
                <BarChart
                  title="Request Pattern by Day of Week"
                  data={data.trends.dayOfWeek}
                />
              </div>

              {/* Service Category Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Performance by Service Category</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.performance.byCategory.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-800">
                            {category.serviceCount}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{category.category}</div>
                            <div className="text-sm text-gray-500">
                              {category.totalTickets} requests • {category.serviceCount} services • Avg: {category.avgResolutionTime}h
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={getResolutionRateBadgeVariant(category.resolutionRate)}
                          className="text-xs"
                        >
                          {category.resolutionRate}% resolved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Service Complexity Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Services by Complexity Level</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.performance.complexity.map((complexity, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{complexity.serviceCount}</div>
                        <div className="text-sm font-medium text-gray-700">{complexity.complexity}</div>
                        <div className="text-xs text-gray-500">
                          {complexity.totalTickets} requests
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {complexity.avgResolutionRate}% resolved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Top Performing Services</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.performance.topPerforming.slice(0, 8).map((service, index) => (
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
                            <div className="font-medium text-gray-900">{service.name}</div>
                            <div className="text-sm text-gray-500">
                              {service.tier1Category} • {service.totalTickets} requests • {service.avgResolutionTime}h avg
                            </div>
                          </div>
                        </div>
                        <Badge variant="default" className="text-xs">
                          {service.resolutionRate}% resolved
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Underutilized Services */}
              {data.performance.underutilized.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <EyeOff className="h-5 w-5" />
                      <span>Underutilized Services</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.performance.underutilized.map((service, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Eye className="h-5 w-5 text-amber-600" />
                            <div>
                              <div className="font-medium text-gray-900">{service.name}</div>
                              <div className="text-sm text-gray-500">
                                {service.tier1Category} • Est: {service.estimatedHours}h
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={getUsageBadgeVariant(service.totalTickets)}
                            className="text-xs"
                          >
                            {service.totalTickets} requests
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Individual Service Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Layers className="h-5 w-5" />
                    <span>Individual Service Performance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.performance.byService.slice(0, 15).map((service, index) => (
                      <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-800">
                            {service.totalTickets}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{service.name}</div>
                            <div className="text-sm text-gray-500">
                              {service.tier1Category} • {service.tier2Category} • Avg: {service.avgResolutionTime}h
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {service.urgentTickets > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {service.urgentTickets} urgent
                            </Badge>
                          )}
                          <Badge 
                            variant={getResolutionRateBadgeVariant(service.resolutionRate)}
                            className="text-xs"
                          >
                            {service.resolutionRate}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Strategic Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Strategic Insights & Recommendations</h3>
                  <div className="space-y-3">
                    {data.summary.overallResolutionRate >= 90 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span>Excellent overall service resolution rate of {data.summary.overallResolutionRate}%. Service catalog is performing well.</span>
                      </div>
                    )}
                    
                    {data.insights.highVolumeServices > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                        <span>
                          {data.insights.highVolumeServices} high-volume services identified. Consider optimizing these for better efficiency.
                        </span>
                      </div>
                    )}
                    
                    {data.insights.zeroUsageServices > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <EyeOff className="h-4 w-4" />
                        <span>
                          {data.insights.zeroUsageServices} services have zero usage. Consider reviewing relevance or promoting awareness.
                        </span>
                      </div>
                    )}
                    
                    {data.insights.lowResolutionServices > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 p-3 rounded-md">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                          {data.insights.lowResolutionServices} services with low resolution rates need attention and process improvement.
                        </span>
                      </div>
                    )}

                    {data.summary.overallSlaCompliance >= 95 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Shield className="h-4 w-4" />
                        <span>Outstanding SLA compliance at {data.summary.overallSlaCompliance}%. Service delivery is meeting commitments.</span>
                      </div>
                    )}

                    {data.performance.topPerforming.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <Award className="h-4 w-4" />
                        <span>
                          Top performer: "{data.performance.topPerforming[0].name}" with {data.performance.topPerforming[0].resolutionRate}% resolution rate. 
                          Use as a benchmark for other services.
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