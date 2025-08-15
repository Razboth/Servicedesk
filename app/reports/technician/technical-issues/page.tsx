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
  AlertTriangle, 
  BookOpen, 
  Lightbulb,
  TrendingUp,
  Cpu,
  Wifi,
  HardDrive,
  Shield,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface TechnicalIssuesData {
  summary: {
    totalTechnicalIssues: number;
    resolvedTechnicalIssues: number;
    technicalResolutionRate: number;
    avgResolutionTime: number;
    recurringIssuesCount: number;
  };
  breakdown: {
    byClassification: Array<{ label: string; value: number }>;
    byResolutionSpeed: Array<{ label: string; value: number }>;
  };
  patterns: {
    rootCauses: Array<{
      rootCause: string;
      count: number;
      classification: string | null;
      affectedCategories: string[];
    }>;
    recurring: Array<{
      service: string;
      category: string;
      classification: string | null;
      count: number;
      lastOccurrence: string;
    }>;
    atmTrend: Array<{
      month: string;
      count: number;
    }>;
  };
  learning: {
    knowledgeOpportunities: Array<{
      topic: string;
      frequency: number;
      classification: string | null;
      categories: string[];
      priority: 'HIGH' | 'MEDIUM';
    }>;
    monthlyTrend: Array<{
      date: string;
      value: number;
      label: string;
    }>;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function TechnicalIssuesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [data, setData] = useState<TechnicalIssuesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize filters with last 90 days
  const [filters, setFilters] = useState<ReportFiltersType>({
    dateRange: {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
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

      const response = await fetch(`/api/reports/technician/technical-issues?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching technical issues data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    const exportData = data.patterns.rootCauses.map(cause => ({
      'Root Cause': cause.rootCause,
      'Frequency': cause.count,
      'Classification': cause.classification || 'Unknown',
      'Affected Categories': cause.affectedCategories.join(', ')
    }));

    const filename = exportUtils.generateFilename('technical-issues-analysis', format === 'xlsx' ? 'xlsx' : 'csv');
    
    if (format === 'csv') {
      exportUtils.exportToCSV(exportData, filename);
    }
  };

  const getClassificationIcon = (classification: string | null) => {
    switch (classification) {
      case 'SYSTEM_ERROR': return <Cpu className="h-4 w-4" />;
      case 'HARDWARE_FAILURE': return <HardDrive className="h-4 w-4" />;
      case 'NETWORK_ISSUE': return <Wifi className="h-4 w-4" />;
      case 'SECURITY_INCIDENT': return <Shield className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
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
            <p className="text-gray-600">Loading technical issues analysis...</p>
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

  const filterGroups = []; // No additional filters for this report

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
                    <h1 className="text-3xl font-bold text-gray-900">Technical Issue Intelligence</h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Error patterns, knowledge discovery, and solution effectiveness analysis
                    </p>
                  </div>
                </div>
                <ExportButton
                  onExport={handleExport}
                  disabled={!data}
                  reportName="technical-issues-analysis"
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
                  title="Technical Issues"
                  value={data.summary.totalTechnicalIssues}
                  subtitle="Total handled"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  badge={{
                    text: 'Technical',
                    variant: 'secondary'
                  }}
                />
                
                <MetricCard
                  title="Resolution Rate"
                  value={`${data.summary.technicalResolutionRate}%`}
                  subtitle={`${data.summary.resolvedTechnicalIssues} resolved`}
                  icon={<CheckCircle className="h-5 w-5" />}
                  trend={{
                    value: data.summary.technicalResolutionRate >= 85 ? 5 : -3,
                    label: data.summary.technicalResolutionRate >= 85 ? 'Good' : 'Needs improvement',
                    isPositive: data.summary.technicalResolutionRate >= 85
                  }}
                />

                <MetricCard
                  title="Avg Resolution Time"
                  value={`${data.summary.avgResolutionTime}h`}
                  subtitle="For technical issues"
                  icon={<TrendingUp className="h-5 w-5" />}
                  badge={{
                    text: data.summary.avgResolutionTime <= 4 ? 'Fast' : 'Slow',
                    variant: data.summary.avgResolutionTime <= 4 ? 'default' : 'destructive'
                  }}
                />

                <MetricCard
                  title="Recurring Issues"
                  value={data.summary.recurringIssuesCount}
                  subtitle="Pattern identified"
                  icon={<RefreshCw className="h-5 w-5" />}
                  badge={{
                    text: data.summary.recurringIssuesCount > 5 ? 'High' : 'Normal',
                    variant: data.summary.recurringIssuesCount > 5 ? 'destructive' : 'secondary'
                  }}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Issue Classification */}
                <PieChart
                  title="Technical Issues by Type"
                  data={data.breakdown.byClassification}
                />

                {/* Resolution Speed */}
                <PieChart
                  title="Resolution Speed Distribution"
                  data={data.breakdown.byResolutionSpeed}
                />
              </div>

              {/* Monthly Trend */}
              <TimelineChart
                title="Technical Issues Trend (Last 6 Months)"
                data={data.learning.monthlyTrend}
              />

              {/* Root Causes Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Common Root Causes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.patterns.rootCauses.slice(0, 8).map((cause, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getClassificationIcon(cause.classification)}
                          <div>
                            <div className="font-medium text-gray-900">{cause.rootCause}</div>
                            <div className="text-sm text-gray-500">
                              {cause.classification?.replace('_', ' ')} • {cause.affectedCategories.join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {cause.count} occurrences
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recurring Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RefreshCw className="h-5 w-5" />
                    <span>Recurring Issue Patterns</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.patterns.recurring.slice(0, 6).map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getClassificationIcon(pattern.classification)}
                          <div>
                            <div className="font-medium text-gray-900">{pattern.service}</div>
                            <div className="text-sm text-gray-500">
                              {pattern.category} • {pattern.classification?.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={pattern.count >= 5 ? 'destructive' : 'secondary'} 
                            className="text-xs"
                          >
                            {pattern.count} times
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Last: {new Date(pattern.lastOccurrence).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Knowledge Opportunities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>Knowledge Base Opportunities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.learning.knowledgeOpportunities.map((opportunity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Lightbulb className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-medium text-gray-900">{opportunity.topic}</div>
                            <div className="text-sm text-gray-600">
                              Affects: {opportunity.categories.join(', ')} • 
                              Type: {opportunity.classification?.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={getPriorityBadgeVariant(opportunity.priority)}
                            className="text-xs"
                          >
                            {opportunity.priority} Priority
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {opportunity.frequency} occurrences
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {data.learning.knowledgeOpportunities.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Lightbulb className="mx-auto h-8 w-8 mb-2 text-gray-300" />
                        <p>No specific knowledge base opportunities identified.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Learning Insights */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Technical Insights & Recommendations</h3>
                  <div className="space-y-3">
                    {data.summary.technicalResolutionRate >= 90 && (
                      <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        <span>Excellent technical resolution rate! You're effectively solving complex issues.</span>
                      </div>
                    )}
                    
                    {data.summary.recurringIssuesCount > 5 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <RefreshCw className="h-4 w-4" />
                        <span>High number of recurring issues detected. Consider documenting solutions for common problems.</span>
                      </div>
                    )}
                    
                    {data.learning.knowledgeOpportunities.filter(o => o.priority === 'HIGH').length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <BookOpen className="h-4 w-4" />
                        <span>
                          {data.learning.knowledgeOpportunities.filter(o => o.priority === 'HIGH').length} high-priority 
                          knowledge base articles would help reduce resolution time.
                        </span>
                      </div>
                    )}
                    
                    {data.summary.avgResolutionTime > 6 && (
                      <div className="flex items-center space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                        <TrendingUp className="h-4 w-4" />
                        <span>Technical issue resolution time is above average. Focus on the most common root causes first.</span>
                      </div>
                    )}

                    {data.patterns.rootCauses.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                        <Lightbulb className="h-4 w-4" />
                        <span>
                          Top issue: "{data.patterns.rootCauses[0].rootCause}" occurred {data.patterns.rootCauses[0].count} times. 
                          Consider creating a solution template.
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