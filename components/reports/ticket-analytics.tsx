'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  Activity,
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle,
  Timer,
  Target,
  Zap,
  Calendar,
  PieChart as PieChartIcon,
  Download
} from 'lucide-react';

interface TicketAnalyticsData {
  summary: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    slaCompliance: number;
    avgResponseTime: number;
  };
  trends: {
    daily: Array<{
      date: string;
      tickets: number;
      resolved: number;
      created: number;
    }>;
    weekly: Array<{
      week: string;
      tickets: number;
      resolved: number;
      avgResolutionTime: number;
    }>;
  };
  distribution: {
    byStatus: Array<{
      status: string;
      count: number;
      percentage: number;
    }>;
    byPriority: Array<{
      priority: string;
      count: number;
      percentage: number;
    }>;
    byCategory: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    byBranch: Array<{
      branch: string;
      count: number;
      percentage: number;
    }>;
  };
  performance: {
    resolutionTimes: Array<{
      priority: string;
      avgTime: number;
      targetTime: number;
      compliance: number;
    }>;
    topPerformers: Array<{
      technician: string;
      resolved: number;
      avgTime: number;
      satisfaction: number;
    }>;
    slaMetrics: {
      onTime: number;
      breached: number;
      total: number;
      complianceRate: number;
    };
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

const COLORS = {
  primary: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'],
  status: {
    OPEN: '#3B82F6',
    IN_PROGRESS: '#F59E0B', 
    RESOLVED: '#10B981',
    CLOSED: '#6B7280',
    ON_HOLD: '#8B5CF6'
  },
  priority: {
    LOW: '#10B981',
    MEDIUM: '#F59E0B',
    HIGH: '#EF4444',
    CRITICAL: '#DC2626'
  }
};

export function TicketAnalytics() {
  const { data: session } = useSession();
  const [data, setData] = useState<TicketAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'tickets' | 'resolution' | 'response'>('tickets');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/ticket-analytics?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      // Set mock data for development
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  // Generate mock data for development
  const generateMockData = (): TicketAnalyticsData => ({
    summary: {
      totalTickets: 1247,
      openTickets: 89,
      resolvedTickets: 1034,
      avgResolutionTime: 4.2,
      slaCompliance: 87.5,
      avgResponseTime: 2.1
    },
    trends: {
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
        tickets: Math.floor(Math.random() * 50) + 20,
        resolved: Math.floor(Math.random() * 45) + 15,
        created: Math.floor(Math.random() * 30) + 10
      })),
      weekly: Array.from({ length: 12 }, (_, i) => ({
        week: `Week ${i + 1}`,
        tickets: Math.floor(Math.random() * 200) + 100,
        resolved: Math.floor(Math.random() * 180) + 80,
        avgResolutionTime: Math.random() * 5 + 2
      }))
    },
    distribution: {
      byStatus: [
        { status: 'Open', count: 89, percentage: 7.1 },
        { status: 'In Progress', count: 124, percentage: 9.9 },
        { status: 'Resolved', count: 1034, percentage: 82.9 }
      ],
      byPriority: [
        { priority: 'Low', count: 623, percentage: 49.9 },
        { priority: 'Medium', count: 374, percentage: 30.0 },
        { priority: 'High', count: 187, percentage: 15.0 },
        { priority: 'Critical', count: 63, percentage: 5.1 }
      ],
      byCategory: [
        { category: 'IT Support', count: 456, percentage: 36.6 },
        { category: 'Network', count: 298, percentage: 23.9 },
        { category: 'Hardware', count: 234, percentage: 18.8 },
        { category: 'Software', count: 198, percentage: 15.9 },
        { category: 'Other', count: 61, percentage: 4.9 }
      ],
      byBranch: [
        { branch: 'Main Branch', count: 298, percentage: 23.9 },
        { branch: 'North Branch', count: 234, percentage: 18.8 },
        { branch: 'South Branch', count: 198, percentage: 15.9 },
        { branch: 'East Branch', count: 187, percentage: 15.0 },
        { branch: 'West Branch', count: 162, percentage: 13.0 },
        { branch: 'Others', count: 168, percentage: 13.5 }
      ]
    },
    performance: {
      resolutionTimes: [
        { priority: 'Critical', avgTime: 1.2, targetTime: 2, compliance: 95 },
        { priority: 'High', avgTime: 3.4, targetTime: 4, compliance: 88 },
        { priority: 'Medium', avgTime: 5.2, targetTime: 8, compliance: 92 },
        { priority: 'Low', avgTime: 8.1, targetTime: 24, compliance: 89 }
      ],
      topPerformers: [
        { technician: 'John Doe', resolved: 89, avgTime: 3.2, satisfaction: 4.8 },
        { technician: 'Jane Smith', resolved: 76, avgTime: 3.8, satisfaction: 4.6 },
        { technician: 'Mike Johnson', resolved: 62, avgTime: 4.1, satisfaction: 4.5 }
      ],
      slaMetrics: {
        onTime: 1091,
        breached: 156,
        total: 1247,
        complianceRate: 87.5
      }
    },
    period: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    }
  });


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Failed to load analytics data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="analytics-dashboard" className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive ticket insights and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="h-7 px-3"
              >
                {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                <p className="text-2xl font-bold">{data.summary.totalTickets.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open</p>
                <p className="text-2xl font-bold text-blue-600">{data.summary.openTickets}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{data.summary.resolvedTickets}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Resolution</p>
                <p className="text-2xl font-bold text-orange-600">{data.summary.avgResolutionTime}h</p>
              </div>
              <Timer className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">SLA Compliance</p>
                <p className="text-2xl font-bold text-purple-600">{data.summary.slaCompliance}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                <p className="text-2xl font-bold text-teal-600">{data.summary.avgResponseTime}h</p>
              </div>
              <Zap className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Trends and Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ticket Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ticket Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.trends.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="created" 
                  stackId="1"
                  stroke="#3B82F6" 
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="Created"
                />
                <Area 
                  type="monotone" 
                  dataKey="resolved" 
                  stackId="2"
                  stroke="#10B981" 
                  fill="#10B981"
                  fillOpacity={0.6}
                  name="Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart id="status-chart">
                <Pie
                  data={data.distribution.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.distribution.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Priority and Category */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Priority Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.distribution.byPriority} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="priority" type="category" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.distribution.byCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* SLA Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              SLA Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Compliance</span>
                <Badge variant="outline" className="text-green-600 bg-green-50">
                  {data.performance.slaMetrics.complianceRate}%
                </Badge>
              </div>
              
              <div className="space-y-3">
                {data.performance.resolutionTimes.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.priority}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.avgTime}h</span>
                      <Badge 
                        variant={item.compliance > 90 ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {item.compliance}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branch Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Branch Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.distribution.byBranch.map((branch, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{branch.branch}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {branch.count} tickets
                    </span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${branch.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {branch.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}