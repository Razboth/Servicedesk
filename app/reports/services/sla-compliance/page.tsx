'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Download, AlertCircle, CheckCircle, XCircle, Clock, TrendingUp, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function ServiceSLAComplianceReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supportGroupFilter, setSupportGroupFilter] = useState('all');

  useEffect(() => {
    fetchReport();
  }, [dateRange, categoryFilter, supportGroupFilter]);

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
      if (supportGroupFilter !== 'all') {
        params.append('supportGroupId', supportGroupFilter);
      }

      const response = await fetch(`/api/reports/services/sla-compliance?${params}`);
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
      ['Service Name', 'Category', 'Support Group', 'Total Tickets', 'Response Compliance', 'Resolution Compliance', 'Overall Compliance', 'Response Breaches', 'Resolution Breaches'],
      ...data.services.map((s: any) => [
        s.name,
        s.category,
        s.supportGroup,
        s.totalTickets,
        `${s.metrics.responseCompliance}%`,
        `${s.metrics.resolutionCompliance}%`,
        `${s.metrics.overallCompliance}%`,
        s.breaches.response,
        s.breaches.resolution
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla-compliance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 90) return '#10b981';
    if (compliance >= 75) return '#3b82f6';
    if (compliance >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service SLA Compliance Report</h1>
          <p className="text-muted-foreground">Monitor service level agreement performance and breaches</p>
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

      {/* Overall Compliance Status */}
      {data?.summary.overallCompliance < 90 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Overall SLA compliance is below target. {data?.summary.totalResponseBreaches + data?.summary.totalResolutionBreaches} breaches detected in the selected period.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: getComplianceColor(data?.summary.overallCompliance || 0) }}>
              {data?.summary.overallCompliance || 0}%
            </div>
            <Progress 
              value={data?.summary.overallCompliance || 0} 
              className="mt-2"
              style={{ '--progress-color': getComplianceColor(data?.summary.overallCompliance || 0) } as any}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.overallResponseCompliance || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {data?.summary.totalResponseBreaches || 0} breaches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.overallResolutionCompliance || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {data?.summary.totalResolutionBreaches || 0} breaches
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
              {data?.summary.activeServices || 0} active services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={
                data?.summary.complianceStatus === 'Excellent' ? 'success' :
                data?.summary.complianceStatus === 'Good' ? 'default' :
                data?.summary.complianceStatus === 'Fair' ? 'warning' : 'destructive'
              }
              className="text-lg px-3 py-1"
            >
              {data?.summary.complianceStatus || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="breaches">Breach Analysis</TabsTrigger>
          <TabsTrigger value="groups">By Group</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top SLA Performers</CardTitle>
                <CardDescription>Services with best SLA compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.topPerformers.map((service: any, idx: number) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.supportGroup} • {service.totalTickets} tickets
                          </p>
                        </div>
                      </div>
                      <Badge variant="success">{service.metrics.overallCompliance}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Needs Attention */}
            <Card>
              <CardHeader>
                <CardTitle>Needs Immediate Attention</CardTitle>
                <CardDescription>Services with poor SLA compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.needsAttention.map((service: any, idx: number) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {service.breaches.response + service.breaches.resolution} total breaches
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">{service.metrics.overallCompliance}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Overview</CardTitle>
              <CardDescription>Response vs Resolution compliance comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      name: 'Response',
                      compliance: data?.summary.overallResponseCompliance || 0,
                      breaches: data?.summary.totalResponseBreaches || 0
                    },
                    {
                      name: 'Resolution',
                      compliance: data?.summary.overallResolutionCompliance || 0,
                      breaches: data?.summary.totalResolutionBreaches || 0
                    }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="compliance" fill="#10b981" name="Compliance %" />
                  <Bar yAxisId="right" dataKey="breaches" fill="#ef4444" name="Breaches" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service SLA Details</CardTitle>
              <CardDescription>Comprehensive SLA performance by service</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Service</th>
                      <th className="text-left p-2">Category</th>
                      <th className="text-center p-2">Tickets</th>
                      <th className="text-center p-2">SLA Response</th>
                      <th className="text-center p-2">SLA Resolution</th>
                      <th className="text-center p-2">Response Comp.</th>
                      <th className="text-center p-2">Resolution Comp.</th>
                      <th className="text-center p-2">Overall Comp.</th>
                      <th className="text-center p-2">Status</th>
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
                        <td className="text-center p-2">{service.slaResponseTime || '-'} min</td>
                        <td className="text-center p-2">{service.slaResolutionTime || '-'} hrs</td>
                        <td className="text-center p-2">
                          <div className="flex flex-col items-center">
                            <span>{service.metrics.responseCompliance}%</span>
                            {service.breaches.response > 0 && (
                              <span className="text-xs text-red-500">({service.breaches.response} breaches)</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex flex-col items-center">
                            <span>{service.metrics.resolutionCompliance}%</span>
                            {service.breaches.resolution > 0 && (
                              <span className="text-xs text-red-500">({service.breaches.resolution} breaches)</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <Badge 
                            variant={
                              service.metrics.overallCompliance >= 90 ? 'success' :
                              service.metrics.overallCompliance >= 75 ? 'default' :
                              service.metrics.overallCompliance >= 60 ? 'warning' : 'destructive'
                            }
                          >
                            {service.metrics.overallCompliance}%
                          </Badge>
                        </td>
                        <td className="text-center p-2">
                          <div 
                            className="w-3 h-3 rounded-full mx-auto" 
                            style={{ backgroundColor: service.performance.color }}
                            title={service.performance.status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breaches" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Breach by Priority */}
            <Card>
              <CardHeader>
                <CardTitle>Breaches by Priority</CardTitle>
                <CardDescription>SLA breaches distributed by ticket priority</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data?.breachAnalysis.byPriority}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Breach Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Breach Patterns</CardTitle>
                <CardDescription>When breaches are most likely to occur</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Peak Breach Hour</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{data?.breachAnalysis.peakBreachHour}:00</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Peak Breach Day</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{data?.breachAnalysis.peakBreachDay}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Group Compliance</CardTitle>
              <CardDescription>SLA performance by support group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.supportGroupCompliance.sort((a: any, b: any) => b.avgCompliance - a.avgCompliance).map((group: any) => (
                  <div key={group.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {group.serviceCount} services | {group.totalTickets} tickets
                        </span>
                        <Badge 
                          variant={
                            group.avgCompliance >= 90 ? 'success' :
                            group.avgCompliance >= 75 ? 'default' :
                            group.avgCompliance >= 60 ? 'warning' : 'destructive'
                          }
                        >
                          {group.avgCompliance}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={group.avgCompliance} 
                      className="h-2"
                      style={{ '--progress-color': getComplianceColor(group.avgCompliance) } as any}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Compliance</CardTitle>
              <CardDescription>SLA performance by service category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.categoryCompliance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgCompliance" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
              <CardDescription>Breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.categoryCompliance.map((category: any) => (
                  <div key={category.name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.serviceCount} services • {category.totalTickets} tickets • {category.totalBreaches} breaches
                      </p>
                    </div>
                    <Badge 
                      variant={
                        category.avgCompliance >= 90 ? 'success' :
                        category.avgCompliance >= 75 ? 'default' :
                        category.avgCompliance >= 60 ? 'warning' : 'destructive'
                      }
                    >
                      {category.avgCompliance}% compliance
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);