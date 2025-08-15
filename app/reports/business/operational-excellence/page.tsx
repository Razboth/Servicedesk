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
import { BarChart3, TrendingUp, DollarSign, Target, Calendar, Building } from 'lucide-react';

interface OperationalExcellenceData {
  summary: {
    totalTickets: number;
    resolutionRate: number;
    avgResolutionHours: number;
    slaCompliance: number;
    resourceUtilization: number;
    operationalScore: number;
  };
  operationalMetrics: {
    resolutionRate: number;
    avgResolutionTime: number;
    slaCompliance: number;
    firstCallResolution: number;
    customerSatisfaction: number;
  };
  resourceMetrics: {
    utilization: number;
    efficiency: number;
    workloadDistribution: Record<string, number>;
    capacityAnalysis: {
      currentCapacity: number;
      optimalCapacity: number;
      utilizationRate: number;
    };
  };
  costAnalysis: {
    totalCost: number;
    costPerTicket: number;
    costByCategory: Record<string, number>;
    costTrends: Array<{ date: string; cost: number }>;
    roi: number;
  };
  efficiencyMetrics: {
    byServiceCategory: Record<string, {
      avgResolutionTime: number;
      resolutionRate: number;
      cost: number;
      volume: number;
    }>;
    trends: Array<{ date: string; efficiency: number; volume: number }>;
  };
  branchPerformance: Record<string, {
    tickets: number;
    resolutionRate: number;
    avgResolutionTime: number;
    slaCompliance: number;
    cost: number;
    efficiency: number;
  }>;
  insights: {
    topPerformingBranches: Array<{ branch: string; score: number; tickets: number }>;
    improvementOpportunities: Array<{ area: string; impact: string; recommendation: string }>;
    costOptimization: Array<{ category: string; currentCost: number; potentialSaving: number }>;
  };
  trends: {
    daily: Array<{ date: string; tickets: number; resolved: number; cost: number }>;
    efficiency: Array<{ date: string; score: number }>;
  };
  recommendations: string[];
}

export default function OperationalExcellenceReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<OperationalExcellenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });
      
      if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      }
      
      const response = await fetch(`/api/reports/business/operational-excellence?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching operational excellence data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && ['MANAGER', 'ADMIN'].includes(session.user.role)) {
      fetchData();
    }
  }, [session, startDate, endDate, selectedBranch]);

  if (!session) {
    return <div className="p-6">Please log in to view this report.</div>;
  }

  if (!['MANAGER', 'ADMIN'].includes(session.user.role)) {
    return (
      <div className="p-6">
        <div className="text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
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
    operationalTrends: data.trends.daily.map(item => ({
      date: item.date,
      tickets: item.tickets,
      resolved: item.resolved,
      cost: item.cost
    })),
    costByCategory: Object.entries(data.costAnalysis.costByCategory).map(([category, cost]) => ({
      name: category,
      value: cost
    })),
    efficiencyTrends: data.trends.efficiency.map(item => ({
      date: item.date,
      value: item.score,
      label: 'Efficiency Score'
    })),
    workloadDistribution: Object.entries(data.resourceMetrics.workloadDistribution).map(([resource, load]) => ({
      name: resource,
      value: load
    }))
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operational Excellence Report</h1>
          <p className="text-gray-600 mt-1">
            Resource planning, cost analysis, and strategic planning insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton 
            data={data} 
            filename={`operational-excellence-${startDate}-to-${endDate}`}
            title="Operational Excellence Report"
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
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {Object.keys(data.branchPerformance).map(branch => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
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
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.resolutionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalTickets} total tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.slaCompliance.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Service level agreement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.costAnalysis.totalCost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${data.costAnalysis.costPerTicket.toFixed(2)} per ticket
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.operationalScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Overall excellence index
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operational Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.operationalTrends}
              type="line"
              title="Daily Operations"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.costByCategory}
              type="pie"
              title="Cost by Category"
            />
          </CardContent>
        </Card>
      </div>

      {/* Branch Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.branchPerformance).slice(0, 10).map(([branch, performance], index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="font-medium">{branch}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold">{performance.tickets}</div>
                      <div className="text-gray-500">tickets</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{performance.resolutionRate.toFixed(1)}%</div>
                      <div className="text-gray-500">resolution</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{performance.slaCompliance.toFixed(1)}%</div>
                      <div className="text-gray-500">SLA</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">${performance.cost.toLocaleString()}</div>
                      <div className="text-gray-500">cost</div>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${performance.efficiency}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Efficiency: {performance.efficiency.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Category Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle>Service Category Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.efficiencyMetrics.byServiceCategory).slice(0, 8).map(([category, metrics], index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{category}</div>
                  <div className="text-sm text-gray-500">{metrics.volume} tickets</div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold">{metrics.avgResolutionTime.toFixed(1)}h</div>
                    <div className="text-gray-500">avg time</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{metrics.resolutionRate.toFixed(1)}%</div>
                    <div className="text-gray-500">resolution</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">${metrics.cost.toLocaleString()}</div>
                    <div className="text-gray-500">cost</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.topPerformingBranches.slice(0, 5).map((branch, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{branch.branch}</div>
                    <div className="text-sm text-gray-500">{branch.tickets} tickets</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{branch.score.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">performance score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Optimization Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.costOptimization.slice(0, 5).map((opportunity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{opportunity.category}</div>
                    <div className="text-sm text-gray-500">
                      Current: ${opportunity.currentCost.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${opportunity.potentialSaving.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">potential saving</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Improvement Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.insights.improvementOpportunities.map((opportunity, index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{opportunity.area}</div>
                    <div className="text-sm text-gray-600 mt-1">{opportunity.recommendation}</div>
                  </div>
                  <Badge 
                    variant={opportunity.impact === 'High' ? 'destructive' : 
                            opportunity.impact === 'Medium' ? 'default' : 'secondary'}
                  >
                    {opportunity.impact} Impact
                  </Badge>
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
            <CardTitle>Strategic Recommendations</CardTitle>
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