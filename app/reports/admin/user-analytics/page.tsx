'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ExportButton } from '@/components/reports/export-button';
import { ReportCharts } from '@/components/reports/report-charts';
import { Users, Activity, TrendingUp, Shield, Calendar, Download } from 'lucide-react';

interface UserAnalyticsData {
  summary: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    avgSessionDuration: number;
    systemAdoptionRate: number;
    engagementScore: number;
  };
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
    usersByBranch: Record<string, number>;
  };
  activityMetrics: {
    ticketCreationActivity: Array<{ date: string; count: number }>;
    loginActivity: Array<{ date: string; count: number }>;
    dailyActiveUsers: Array<{ date: string; count: number }>;
  };
  engagementMetrics: {
    avgTicketsPerUser: number;
    avgSessionDuration: number;
    featureUsage: Record<string, number>;
    userRetention: number;
  };
  adoptionMetrics: {
    systemAdoptionRate: number;
    featureAdoptionRates: Record<string, number>;
    trainingCompletionRate: number;
    supportTicketTrends: Array<{ month: string; count: number }>;
  };
  insights: {
    topActiveUsers: Array<{ name: string; email: string; ticketCount: number; role: string }>;
    leastActiveRoles: Array<{ role: string; avgActivity: number }>;
    branchEngagement: Array<{ branch: string; engagementScore: number; userCount: number }>;
  };
  recommendations: string[];
}

export default function UserAnalyticsReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<UserAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });
      
      const response = await fetch(`/api/reports/admin/user-analytics?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching user analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchData();
    }
  }, [session, startDate, endDate]);

  if (!session) {
    return <div className="p-6">Please log in to view this report.</div>;
  }

  if (session.user.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
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
    userGrowth: data.activityMetrics.dailyActiveUsers.map(item => ({
      date: item.date,
      value: item.count,
      label: 'Active Users'
    })),
    ticketActivity: data.activityMetrics.ticketCreationActivity.map(item => ({
      date: item.date,
      value: item.count,
      label: 'Tickets Created'
    })),
    roleDistribution: Object.entries(data.userMetrics.usersByRole).map(([role, count]) => ({
      name: role,
      value: count
    })),
    branchDistribution: Object.entries(data.userMetrics.usersByBranch).map(([branch, count]) => ({
      name: branch,
      value: count
    }))
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User & Access Analytics</h1>
          <p className="text-gray-600 mt-1">
            User engagement, role effectiveness, and system adoption patterns
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton 
            data={data} 
            filename={`user-analytics-${startDate}-to-${endDate}`}
            title="User Analytics Report"
          />
        </div>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full">
                Update Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Adoption</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.systemAdoptionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Overall adoption rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.engagementScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              User engagement index
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Activity Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.userGrowth}
              type="line"
              title="Daily Active Users"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.roleDistribution}
              type="pie"
              title="Users by Role"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.topActiveUsers.slice(0, 5).map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <Badge variant="outline" className="text-xs">{user.role}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{user.ticketCount}</div>
                    <div className="text-xs text-gray-500">tickets</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branch Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights.branchEngagement.slice(0, 5).map((branch, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{branch.branch}</div>
                    <div className="text-sm text-gray-500">{branch.userCount} users</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{branch.engagementScore.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">engagement</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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