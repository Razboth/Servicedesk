'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function ServicePerformanceReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchReport();
  }, [dateRange, categoryFilter]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      });

      if (categoryFilter !== 'all') {
        params.append('categoryId', categoryFilter);
      }

      const response = await fetch(`/api/reports/services/performance?${params}`);
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
      ['Service Name', 'Category', 'Support Group', 'Total Tickets', 'Resolution Rate', 'Avg Response Time', 'Avg Resolution Time', 'Performance'],
      ...data.services.map((s: any) => [
        s.name,
        s.category,
        s.supportGroup,
        s.totalTickets,
        `${s.resolutionRate}%`,
        `${s.avgResponseTime} mins`,
        `${s.avgResolutionTime} hrs`,
        s.performance.efficiency
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-performance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Performance Report</h1>
          <p className="text-muted-foreground">Analyze service efficiency and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalServices || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.summary.activeServices || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.summary.avgTicketsPerService || 0} per service
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.overallResolutionRate || 0}%</div>
            <Progress value={data?.summary.overallResolutionRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalResolved || 0}</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Services</CardTitle>
                <CardDescription>Services with highest resolution rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.topPerformers.map((service: any, idx: number) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{idx + 1}.</span>
                        <div>
                          <p className="text-sm font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">{service.resolutionRate}%</Badge>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Needs Attention */}
            <Card>
              <CardHeader>
                <CardTitle>Needs Attention</CardTitle>
                <CardDescription>Services requiring improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.needsAttention.map((service: any, idx: number) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{idx + 1}.</span>
                        <div>
                          <p className="text-sm font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{service.resolutionRate}%</Badge>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Most Used Services */}
          <Card>
            <CardHeader>
              <CardTitle>Most Used Services</CardTitle>
              <CardDescription>Services by ticket volume</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.mostUsed.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalTickets" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Details</CardTitle>
              <CardDescription>Comprehensive service performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Service</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-center p-2">Tickets</th>
                      <th className="text-center p-2">Open</th>
                      <th className="text-center p-2">Resolved</th>
                      <th className="text-center p-2">Resolution Rate</th>
                      <th className="text-center p-2">Avg Response</th>
                      <th className="text-center p-2">Avg Resolution</th>
                      <th className="text-center p-2">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.services.filter((s: any) => s.totalTickets > 0).map((service: any) => (
                      <tr key={service.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">{service.supportGroup}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <div>
                            <p className="text-sm">{service.category}</p>
                            {service.subcategory !== '-' && (
                              <p className="text-xs text-muted-foreground">{service.subcategory}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-2">{service.totalTickets}</td>
                        <td className="text-center p-2">{service.statusCounts.open + service.statusCounts.inProgress}</td>
                        <td className="text-center p-2">{service.statusCounts.resolved + service.statusCounts.closed}</td>
                        <td className="text-center p-2">
                          <Badge variant={service.resolutionRate > 80 ? 'success' : service.resolutionRate > 60 ? 'warning' : 'destructive'}>
                            {service.resolutionRate}%
                          </Badge>
                        </td>
                        <td className="text-center p-2">{service.avgResponseTime} min</td>
                        <td className="text-center p-2">{service.avgResolutionTime} hrs</td>
                        <td className="text-center p-2">
                          <Badge variant={
                            service.performance.efficiency === 'Excellent' ? 'success' :
                            service.performance.efficiency === 'Good' ? 'default' :
                            service.performance.efficiency === 'Fair' ? 'warning' : 'destructive'
                          }>
                            {service.performance.efficiency}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Service performance by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.categoryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.tickets}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="tickets"
                  >
                    {data?.categoryDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Resolution rates by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.categoryDistribution.map((category: any) => (
                  <div key={category.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {category.services} services | {category.tickets} tickets
                        </span>
                        <Badge>{category.avgResolutionRate}%</Badge>
                      </div>
                    </div>
                    <Progress value={category.avgResolutionRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
                <CardDescription>Tickets by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart 
                    data={[
                      { name: 'Low', value: data?.services.reduce((sum: number, s: any) => sum + s.priorityCounts.low, 0) || 0 },
                      { name: 'Medium', value: data?.services.reduce((sum: number, s: any) => sum + s.priorityCounts.medium, 0) || 0 },
                      { name: 'High', value: data?.services.reduce((sum: number, s: any) => sum + s.priorityCounts.high, 0) || 0 },
                      { name: 'Urgent', value: data?.services.reduce((sum: number, s: any) => sum + s.priorityCounts.urgent, 0) || 0 },
                      { name: 'Critical', value: data?.services.reduce((sum: number, s: any) => sum + s.priorityCounts.critical, 0) || 0 }
                    ]}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Current ticket status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Open', value: data?.services.reduce((sum: number, s: any) => sum + s.statusCounts.open, 0) || 0 },
                        { name: 'In Progress', value: data?.services.reduce((sum: number, s: any) => sum + s.statusCounts.inProgress, 0) || 0 },
                        { name: 'Resolved', value: data?.services.reduce((sum: number, s: any) => sum + s.statusCounts.resolved, 0) || 0 },
                        { name: 'Closed', value: data?.services.reduce((sum: number, s: any) => sum + s.statusCounts.closed, 0) || 0 },
                        { name: 'Pending', value: data?.services.reduce((sum: number, s: any) => sum + s.statusCounts.pending, 0) || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}