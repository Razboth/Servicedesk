'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Download, TrendingUp, TrendingDown, Users, Clock, Calendar, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function ServiceUsageReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('quarter');
  const [groupBy, setGroupBy] = useState('service');

  useEffect(() => {
    fetchReport();
  }, [timeRange, groupBy]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        timeRange,
        groupBy
      });

      const response = await fetch(`/api/reports/services/usage?${params}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const csv = [
      ['Name', 'Category', 'Total Requests', 'Unique Users', 'Completion Rate', 'Avg Response Time', 'Avg Resolution Time'],
      ...data.usage.map((item: any) => [
        item.name,
        item.category,
        item.totalRequests,
        item.uniqueUsers,
        `${item.completionRate}%`,
        `${item.avgResponseTime} mins`,
        `${item.avgResolutionTime} hrs`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Usage Insights</h1>
          <p className="text-muted-foreground">Usage patterns, peak times, and demand analysis</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service">By Service</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
              <SelectItem value="branch">By Branch</SelectItem>
              <SelectItem value="supportGroup">By Support Group</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalRequests || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              {data?.summary.growthRate > 0 ? '+' : ''}{data?.summary.growthRate || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.summary.avgRequestsPerUser || 0} req/user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.activeServices || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.summary.avgRequestsPerService || 0} req/service
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.peakHour || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              Most active time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Busiest Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.busiestDay || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              Peak activity day
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Peak Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Usage Pattern</CardTitle>
                <CardDescription>Request distribution by hour of day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={data?.peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Day of Week */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Usage Pattern</CardTitle>
                <CardDescription>Request distribution by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data?.dayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Services/Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Most Used</CardTitle>
              <CardDescription>By total requests in selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.usage.slice(0, 10).map((item: any, idx: number) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-6">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category} • {item.uniqueUsers} users
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.totalRequests} requests</Badge>
                      <Badge variant={item.completionRate > 80 ? 'success' : item.completionRate > 60 ? 'warning' : 'destructive'}>
                        {item.completionRate}% complete
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Growth Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Growth Trend</CardTitle>
              <CardDescription>Monthly request volume and service adoption</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.growthTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="total" stroke="#3b82f6" name="Total Requests" />
                  <Line yAxisId="right" type="monotone" dataKey="services" stroke="#10b981" name="Active Services" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Growing Services */}
          <Card>
            <CardHeader>
              <CardTitle>Fastest Growing Services</CardTitle>
              <CardDescription>Services with highest growth rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.topGrowing.map((item: any, idx: number) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center">
                        {item.growthRate > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-2" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{item.totalRequests} requests</span>
                      <Badge variant={item.growthRate > 0 ? 'success' : 'destructive'}>
                        {item.growthRate > 0 ? '+' : ''}{Math.round(item.growthRate)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Requests by service category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.categoryUsage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.totalRequests}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalRequests"
                    >
                      {data?.categoryUsage.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Branch Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Branch Usage</CardTitle>
                <CardDescription>Service requests by branch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {data?.branchUsage.slice(0, 10).map((branch: any) => (
                    <div key={branch.name} className="flex items-center justify-between py-1">
                      <span className="text-sm">{branch.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{branch.serviceCount} services</span>
                        <Badge variant="outline">{branch.totalRequests}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Request Status Distribution</CardTitle>
              <CardDescription>Current status of all requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart 
                  data={[
                    { name: 'Open', value: data?.usage.reduce((sum: number, s: any) => sum + s.statusCounts.open, 0) || 0 },
                    { name: 'In Progress', value: data?.usage.reduce((sum: number, s: any) => sum + s.statusCounts.inProgress, 0) || 0 },
                    { name: 'Resolved', value: data?.usage.reduce((sum: number, s: any) => sum + s.statusCounts.resolved, 0) || 0 },
                    { name: 'Closed', value: data?.usage.reduce((sum: number, s: any) => sum + s.statusCounts.closed, 0) || 0 },
                    { name: 'Pending', value: data?.usage.reduce((sum: number, s: any) => sum + s.statusCounts.pending, 0) || 0 }
                  ]}
                  layout="horizontal"
                >
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {/* Detailed Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Usage Analysis</CardTitle>
              <CardDescription>Complete breakdown of service usage metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-center p-2">Requests</th>
                      <th className="text-center p-2">Users</th>
                      <th className="text-center p-2">Branches</th>
                      <th className="text-center p-2">Completion</th>
                      <th className="text-center p-2">Avg Response</th>
                      <th className="text-center p-2">Avg Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.usage.filter((item: any) => item.totalRequests > 0).map((item: any) => (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.supportGroup}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <div>
                            <p className="text-sm">{item.category}</p>
                            {item.subcategory && (
                              <p className="text-xs text-muted-foreground">{item.subcategory}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-2">{item.totalRequests}</td>
                        <td className="text-center p-2">{item.uniqueUsers}</td>
                        <td className="text-center p-2">{item.branchCount}</td>
                        <td className="text-center p-2">
                          <Badge variant={
                            item.completionRate > 80 ? 'success' :
                            item.completionRate > 60 ? 'warning' : 'destructive'
                          }>
                            {item.completionRate}%
                          </Badge>
                        </td>
                        <td className="text-center p-2">{item.avgResponseTime} min</td>
                        <td className="text-center p-2">{item.avgResolutionTime} hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}