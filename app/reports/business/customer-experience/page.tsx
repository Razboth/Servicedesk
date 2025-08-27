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
import { Heart, Clock, Star, Users, Calendar, Building } from 'lucide-react';

interface CustomerExperienceData {
  summary: {
    totalTickets: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    customerSatisfaction: number;
    firstCallResolution: number;
    experienceScore: number;
  };
  responseMetrics: {
    avgFirstResponse: number;
    avgResolutionTime: number;
    responseTimeDistribution: Record<string, number>;
    slaCompliance: {
      response: number;
      resolution: number;
    };
  };
  satisfactionMetrics: {
    overallSatisfaction: number;
    satisfactionByCategory: Record<string, number>;
    satisfactionTrends: Array<{ date: string; score: number; responses: number }>;
    npsScore: number;
    detractors: number;
    promoters: number;
    passives: number;
  };
  serviceQuality: {
    firstCallResolution: number;
    escalationRate: number;
    reopenRate: number;
    qualityScore: number;
    serviceReliability: number;
    qualityByCategory: Record<string, {
      resolution: number;
      satisfaction: number;
      escalation: number;
      reopen: number;
    }>;
  };
  customerJourney: {
    touchpoints: Array<{
      stage: string;
      avgTime: number;
      satisfaction: number;
      dropoffRate: number;
    }>;
    journeyEfficiency: number;
    bottlenecks: Array<{
      stage: string;
      impact: string;
      avgDelay: number;
    }>;
  };
  branchExperience: Record<string, {
    tickets: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    satisfaction: number;
    firstCallResolution: number;
    experienceScore: number;
  }>;
  insights: {
    topPerformingBranches: Array<{ branch: string; score: number; tickets: number }>;
    improvementAreas: Array<{ area: string; impact: string; currentScore: number; targetScore: number }>;
    customerFeedback: Array<{ category: string; sentiment: string; frequency: number }>;
  };
  trends: {
    daily: Array<{ date: string; tickets: number; satisfaction: number; responseTime: number }>;
    satisfaction: Array<{ date: string; score: number }>;
  };
  recommendations: string[];
}

export default function CustomerExperienceReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<CustomerExperienceData | null>(null);
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
      
      const response = await fetch(`/api/reports/business/customer-experience?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching customer experience data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;
    
    const exportData = {
      reportTitle: 'Customer Experience Report',
      dateRange: `${startDate} to ${endDate}`,
      ...data,
      generatedAt: new Date().toISOString()
    };

    if (format === 'xlsx') {
      console.log('Exporting to Excel:', exportData);
    } else if (format === 'pdf') {
      console.log('Exporting to PDF:', exportData);
    } else if (format === 'csv') {
      console.log('Exporting to CSV:', exportData);
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
          <Heart className="mx-auto h-12 w-12 text-gray-400" />
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
    satisfactionTrends: data.trends.satisfaction.map(item => ({
      date: item.date,
      value: item.score,
      label: 'Satisfaction Score'
    })),
    responseTimeDistribution: Object.entries(data.responseMetrics.responseTimeDistribution).map(([range, count]) => ({
      name: range,
      value: count
    })),
    satisfactionByCategory: Object.entries(data.satisfactionMetrics.satisfactionByCategory).map(([category, score]) => ({
      name: category,
      value: score
    })),
    customerJourney: data.customerJourney.touchpoints.map(point => ({
      stage: point.stage,
      time: point.avgTime,
      satisfaction: point.satisfaction,
      dropoff: point.dropoffRate
    }))
  };

  const getSatisfactionColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSatisfactionBadge = (score: number) => {
    if (score >= 4.5) return 'default';
    if (score >= 3.5) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Experience Report</h1>
          <p className="text-gray-600 mt-1">
            Customer satisfaction, service quality, and experience optimization insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton 
            onExport={handleExport} 
            reportName="Customer Experience Report"
            disabled={!data} />
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
                  {Object.keys(data.branchExperience).map(branch => (
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
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSatisfactionColor(data.summary.customerSatisfaction)}`}>
              {data.summary.customerSatisfaction.toFixed(1)}/5.0
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.totalTickets} total tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgResponseTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Average first response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Call Resolution</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.firstCallResolution.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Resolved on first contact
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experience Score</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.experienceScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Overall experience index
            </p>
          </CardContent>
        </Card>
      </div>

      {/* NPS Score */}
      <Card>
        <CardHeader>
          <CardTitle>Net Promoter Score (NPS)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{data.satisfactionMetrics.npsScore}</div>
              <div className="text-sm text-gray-500">NPS Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.satisfactionMetrics.promoters}%</div>
              <div className="text-sm text-gray-500">Promoters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{data.satisfactionMetrics.passives}%</div>
              <div className="text-sm text-gray-500">Passives</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{data.satisfactionMetrics.detractors}%</div>
              <div className="text-sm text-gray-500">Detractors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.satisfactionTrends}
              type="line"
              title="Customer Satisfaction Over Time"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.responseTimeDistribution}
              type="bar"
              title="Response Time Ranges"
            />
          </CardContent>
        </Card>
      </div>

      {/* Customer Journey */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Journey Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Journey Efficiency: <span className="font-bold">{data.customerJourney.journeyEfficiency.toFixed(1)}%</span>
            </div>
            <div className="space-y-3">
              {data.customerJourney.touchpoints.map((point, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{point.stage}</div>
                      <div className="text-sm text-gray-500">
                        Avg Time: {point.avgTime.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className={`font-bold ${getSatisfactionColor(point.satisfaction)}`}>
                        {point.satisfaction.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">satisfaction</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600">{point.dropoffRate.toFixed(1)}%</div>
                      <div className="text-xs text-gray-500">dropoff</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Quality by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Service Quality by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.serviceQuality.qualityByCategory).slice(0, 8).map(([category, metrics], index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{category}</div>
                  <Badge variant={getSatisfactionBadge(metrics.satisfaction)}>
                    {metrics.satisfaction.toFixed(1)} satisfaction
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold">{metrics.resolution.toFixed(1)}%</div>
                    <div className="text-gray-500">resolution rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{metrics.escalation.toFixed(1)}%</div>
                    <div className="text-gray-500">escalation rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{metrics.reopen.toFixed(1)}%</div>
                    <div className="text-gray-500">reopen rate</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Branch Experience */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Experience Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.branchExperience).slice(0, 10).map(([branch, experience], index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span className="font-medium">{branch}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold">{experience.tickets}</div>
                      <div className="text-gray-500">tickets</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-bold ${getSatisfactionColor(experience.satisfaction)}`}>
                        {experience.satisfaction.toFixed(1)}
                      </div>
                      <div className="text-gray-500">satisfaction</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{experience.avgResponseTime.toFixed(1)}h</div>
                      <div className="text-gray-500">response time</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{experience.firstCallResolution.toFixed(1)}%</div>
                      <div className="text-gray-500">FCR</div>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(experience.experienceScore / 100) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Experience Score: {experience.experienceScore.toFixed(1)}
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
                    <div className="text-xs text-gray-500">experience score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Feedback Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.customerFeedback.slice(0, 5).map((feedback, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{feedback.category}</div>
                    <div className="text-sm text-gray-500">{feedback.frequency} mentions</div>
                  </div>
                  <Badge 
                    variant={feedback.sentiment === 'Positive' ? 'default' : 
                            feedback.sentiment === 'Neutral' ? 'secondary' : 'destructive'}
                  >
                    {feedback.sentiment}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Areas */}
      <Card>
        <CardHeader>
          <CardTitle>Improvement Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.insights.improvementAreas.map((area, index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{area.area}</div>
                  <Badge 
                    variant={area.impact === 'High' ? 'destructive' : 
                            area.impact === 'Medium' ? 'default' : 'secondary'}
                  >
                    {area.impact} Impact
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    Current Score: <span className="font-bold">{area.currentScore.toFixed(1)}</span>
                  </div>
                  <div>
                    Target Score: <span className="font-bold text-green-600">{area.targetScore.toFixed(1)}</span>
                  </div>
                  <div>
                    Improvement: <span className="font-bold text-blue-600">
                      +{(area.targetScore - area.currentScore).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Journey Bottlenecks */}
      {data.customerJourney.bottlenecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Journey Bottlenecks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.customerJourney.bottlenecks.map((bottleneck, index) => (
                <div key={index} className="p-4 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{bottleneck.stage}</div>
                      <div className="text-sm text-gray-500">
                        Average Delay: {bottleneck.avgDelay.toFixed(1)} hours
                      </div>
                    </div>
                    <Badge 
                      variant={bottleneck.impact === 'High' ? 'destructive' : 
                              bottleneck.impact === 'Medium' ? 'default' : 'secondary'}
                    >
                      {bottleneck.impact} Impact
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Experience Enhancement Recommendations</CardTitle>
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