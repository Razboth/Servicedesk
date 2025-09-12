'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, TrendingDown, TrendingUp, Target, RefreshCw, FileDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';

interface PriorityData {
  priority: string;
  count: number;
  percentage: number;
  isHealthy: boolean;
}

interface ServiceIssue {
  serviceId: string;
  name: string;
  category: string;
  totalTickets: number;
  highPriorityPercent: number;
  healthScore: number;
}

interface ReportData {
  summary: {
    totalTickets: number;
    healthScore: number;
    timeRangeDays: number;
  };
  priorityDistribution: PriorityData[];
  idealDistribution: Record<string, number>;
  weeklyTrends: any[];
  problemServices: ServiceIssue[];
  branchAnalysis: any[];
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    action: string;
  }>;
  insights: {
    mostOverusedPriority: string;
    avgHighPriorityPercent: number;
    totalProblemServices: number;
  };
}

const PRIORITY_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  URGENT: '#dc2626',
  CRITICAL: '#991b1b'
};

export default function PriorityHealthReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30');
  const [branchId, setBranchId] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        timeRange,
        ...(branchId && { branchId })
      });
      
      const response = await fetch(`/api/reports/analytics/priority-health?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange, branchId]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Fair</Badge>;
    if (score >= 40) return <Badge className="bg-orange-100 text-orange-800">Poor</Badge>;
    return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
  };

  const exportData = () => {
    if (!data) return;
    
    const csvContent = [
      ['Priority Health Report', '', '', ''],
      ['Generated', new Date().toLocaleString(), '', ''],
      ['Health Score', data.summary.healthScore.toString(), '', ''],
      ['', '', '', ''],
      ['Priority', 'Count', 'Percentage', 'Ideal %'],
      ...data.priorityDistribution.map(p => [
        p.priority, 
        p.count.toString(), 
        p.percentage.toString(),
        data.idealDistribution[p.priority]?.toString() || '0'
      ])
    ];
    
    const csv = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `priority-health-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) return <div className="p-8">Loading priority health analysis...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-8">No data available</div>;

  // Prepare chart data
  const comparisonData = data.priorityDistribution.map(p => ({
    priority: p.priority,
    actual: p.percentage,
    ideal: data.idealDistribution[p.priority] || 0,
    count: p.count
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-8 w-8" />
            Priority Health Analysis
            {!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') && session?.user?.branchName && (
              <Badge variant="outline" className="text-sm font-normal">
                {session.user.branchName}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and analyze ticket priority distribution health across the organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analysis Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Branch Filter</label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All branches</SelectItem>
                  {/* Branch options would be populated from API */}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Score Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overall Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getHealthScoreColor(data.summary.healthScore)}`}>
              {data.summary.healthScore}/100
            </div>
            <div className="mt-2">{getHealthScoreBadge(data.summary.healthScore)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.summary.totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {data.summary.timeRangeDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High Priority %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {data.insights.avgHighPriorityPercent}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: 25%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Problem Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {data.insights.totalProblemServices}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Distribution Comparison */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current vs Ideal Distribution</CardTitle>
            <CardDescription>Comparison with industry best practices</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" fill="#ef4444" name="Current %" />
                <Bar dataKey="ideal" fill="#10b981" name="Target %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Priority Distribution</CardTitle>
            <CardDescription>Actual ticket distribution by priority</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.priorityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.priority}: ${entry.percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.priorityDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS] || '#8884d8'} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Trends (8 Weeks)</CardTitle>
          <CardDescription>Track priority distribution changes over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data.weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekStart" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="lowPercent" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Low %" />
              <Area type="monotone" dataKey="mediumPercent" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Medium %" />
              <Area type="monotone" dataKey="highPercent" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="High %" />
              <Area type="monotone" dataKey="urgentPercent" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} name="Urgent %" />
              <Area type="monotone" dataKey="criticalPercent" stackId="1" stroke="#991b1b" fill="#991b1b" fillOpacity={0.6} name="Critical %" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Problem Services */}
      {data.problemServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Services with Priority Issues
            </CardTitle>
            <CardDescription>Services with unusually high priority percentages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.problemServices.slice(0, 10).map((service, index) => (
                <div key={service.serviceId} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {service.category} • {service.totalTickets} tickets
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">{service.highPriorityPercent}%</div>
                    <div className="text-xs text-muted-foreground">High Priority</div>
                  </div>
                  <div className="ml-4">
                    {getHealthScoreBadge(service.healthScore)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Actions to improve priority health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recommendations.map((rec, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                rec.type === 'CRITICAL' ? 'bg-red-50 border-red-500' :
                rec.type === 'WARNING' ? 'bg-yellow-50 border-yellow-500' :
                'bg-green-50 border-green-500'
              }`}>
                <div className="flex items-start gap-3">
                  {rec.type === 'CRITICAL' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : rec.type === 'WARNING' ? (
                    <TrendingDown className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-medium">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    <p className="text-sm font-medium mt-2">{rec.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}