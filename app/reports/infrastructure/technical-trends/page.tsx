'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportButton } from '@/components/reports/export-button';
import { ReportCharts } from '@/components/reports/report-charts';
import { Activity, AlertTriangle, TrendingUp, BarChart3, Calendar, Zap } from 'lucide-react';

interface TechnicalTrendsData {
  summary: {
    totalTechnicalIssues: number;
    criticalIssues: number;
    avgResolutionHours: number;
    recurringIssuesCount: number;
    errorPatternScore: number;
    trendDirection: string;
  };
  issueAnalysis: {
    totalIssues: number;
    resolvedIssues: number;
    avgResolutionTime: number;
    issuesByCategory: Record<string, number>;
    issuesBySeverity: Record<string, number>;
    issuesByRegion: Record<string, number>;
  };
  errorPatterns: {
    commonErrors: Array<{ error: string; count: number; category: string }>;
    errorTrends: Array<{ date: string; count: number; category: string }>;
    systemComponents: Record<string, number>;
  };
  performanceMetrics: {
    dailyTrends: Array<{ date: string; issues: number; resolved: number }>;
    resolutionAnalysis: {
      avgResolutionTime: number;
      fastestResolution: number;
      slowestResolution: number;
      resolutionTrends: Array<{ date: string; avgTime: number }>;
    };
  };
  recurringIssues: Array<{
    pattern: string;
    occurrences: number;
    lastOccurrence: string;
    avgResolutionTime: number;
    affectedSystems: string[];
  }>;
  insights: {
    topErrorCategories: Array<{ category: string; count: number; trend: string }>;
    mostAffectedRegions: Array<{ region: string; issueCount: number; resolutionRate: number }>;
    systemHealthIndicators: Array<{ component: string; healthScore: number; issueCount: number }>;
  };
  recentIssues: Array<{
    id: string;
    title: string;
    category: string;
    severity: string;
    status: string;
    region: string;
    createdAt: string;
    resolvedAt?: string;
  }>;
  recommendations: string[];
}

export default function TechnicalTrendsReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<TechnicalTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });
      
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      const response = await fetch(`/api/reports/infrastructure/technical-trends?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching technical trends data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && ['TECHNICIAN', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      fetchData();
    }
  }, [session, startDate, endDate, selectedCategory]);

  if (!session) {
    return <div className="p-6">Please log in to view this report.</div>;
  }

  if (!['TECHNICIAN', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to view this report.
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

  const chartData = {
    issueTrends: data.performanceMetrics.dailyTrends.map(item => ({
      date: item.date,
      issues: item.issues,
      resolved: item.resolved
    })),
    categoryDistribution: Object.entries(data.issueAnalysis.issuesByCategory).map(([category, count]) => ({
      name: category,
      value: count
    })),
    severityDistribution: Object.entries(data.issueAnalysis.issuesBySeverity).map(([severity, count]) => ({
      name: severity,
      value: count
    })),
    resolutionTrends: data.performanceMetrics.resolutionAnalysis.resolutionTrends.map(item => ({
      date: item.date,
      value: item.avgTime,
      label: 'Avg Resolution Time (hours)'
    }))
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Technical Problem Trends</h1>
          <p className="text-gray-600 mt-1">
            System errors, hardware failures, and network issue patterns
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton 
            data={data} 
            filename={`technical-trends-${startDate}-to-${endDate}`}
            title="Technical Trends Report"
          />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.keys(data.issueAnalysis.issuesByCategory).map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <CardTitle className="text-sm font-medium">Technical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalTechnicalIssues}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.criticalIssues} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgResolutionHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Average resolution time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring Issues</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.recurringIssuesCount}</div>
            <p className="text-xs text-muted-foreground">
              Pattern detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Pattern Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.errorPatternScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.trendDirection} trend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Issue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.issueTrends}
              type="line"
              title="Daily Issues vs Resolved"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issue Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.categoryDistribution}
              type="pie"
              title="Issues by Category"
            />
          </CardContent>
        </Card>
      </div>

      {/* Error Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Common Error Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.errorPatterns.commonErrors.slice(0, 10).map((error, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="font-medium">{error.error}</div>
                  <Badge variant="outline" className="text-xs mt-1">{error.category}</Badge>
                </div>
                <div className="text-right">
                  <div className="font-bold">{error.count}</div>
                  <div className="text-xs text-gray-500">occurrences</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recurring Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recurringIssues.slice(0, 5).map((issue, index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium">{issue.pattern}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Last occurrence: {new Date(issue.lastOccurrence).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{issue.occurrences}</div>
                    <div className="text-xs text-gray-500">times</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {issue.affectedSystems.map((system, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {system}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Health Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.systemHealthIndicators.slice(0, 5).map((indicator, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{indicator.component}</div>
                    <div className="text-sm text-gray-500">{indicator.issueCount} issues</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{indicator.healthScore.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">health score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Affected Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.mostAffectedRegions.slice(0, 5).map((region, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{region.region}</div>
                    <div className="text-sm text-gray-500">{region.issueCount} issues</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{region.resolutionRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">resolution rate</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Technical Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentIssues.slice(0, 10).map((issue, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{issue.title}</div>
                  <div className="text-sm text-gray-500">
                    {issue.category} • {issue.region}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={issue.severity === 'HIGH' || issue.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                  >
                    {issue.severity}
                  </Badge>
                  <Badge variant="outline">{issue.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}