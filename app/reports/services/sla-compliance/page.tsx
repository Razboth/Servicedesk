'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Download, AlertCircle, CheckCircle, XCircle, Clock, TrendingUp, Shield, Users, Calendar, LayoutDashboard, List, AlertTriangle, Layers } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface TechnicianSLA {
  id: string;
  name: string;
  branch: string;
  supportGroups: string[];
  totalTickets: number;
  resolvedTickets: number;
  responseBreaches: number;
  resolutionBreaches: number;
  slaCompliance: number;
  avgResponseMinutes: number;
  avgResolutionHours: number;
}

const tabConfig = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'services', label: 'Services', icon: List },
  { id: 'technicians', label: 'Technician SLA', icon: Users },
  { id: 'breaches', label: 'Breach Analysis', icon: AlertTriangle },
  { id: 'groups-categories', label: 'Categories & Groups', icon: Layers },
];

export default function ServiceSLAComplianceReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supportGroupFilter, setSupportGroupFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

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
        endDate: new Date().toISOString(),
      });
      if (categoryFilter !== 'all') params.append('categoryId', categoryFilter);
      if (supportGroupFilter !== 'all') params.append('supportGroupId', supportGroupFilter);

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
        s.name, s.category, s.supportGroup, s.totalTickets,
        `${s.metrics.responseCompliance}%`, `${s.metrics.resolutionCompliance}%`, `${s.metrics.overallCompliance}%`,
        s.breaches.response, s.breaches.resolution,
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla-compliance-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 90) return '#10b981';
    if (compliance >= 75) return '#3b82f6';
    if (compliance >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getComplianceBadge = (compliance: number): "success" | "default" | "warning" | "destructive" => {
    if (compliance >= 90) return 'success';
    if (compliance >= 75) return 'default';
    if (compliance >= 60) return 'warning';
    return 'destructive';
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    return `${Math.round((hours / 24) * 10) / 10}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading SLA compliance data...</p>
        </div>
      </div>
    );
  }

  // Prepare breach by hour/day chart data
  const breachByHourData = (data?.breachAnalysis?.byHour || []).map((count: number, idx: number) => ({
    hour: HOUR_LABELS[idx],
    breaches: count,
  }));

  const breachByDayData = (data?.breachAnalysis?.byDayOfWeek || []).map((count: number, idx: number) => ({
    day: DAY_LABELS[idx],
    breaches: count,
  }));

  // Technician data
  const technicians: TechnicianSLA[] = data?.technicians || [];

  // Radar chart data for top 5 technicians
  const top5Techs = technicians.slice(0, 5);
  const radarData = top5Techs.length > 0 ? [
    { metric: 'SLA %', ...Object.fromEntries(top5Techs.map(t => [t.name, t.slaCompliance])) },
    {
      metric: 'Resolution %',
      ...Object.fromEntries(top5Techs.map(t => [t.name, t.totalTickets > 0 ? Math.round((t.resolvedTickets / t.totalTickets) * 100) : 0])),
    },
    {
      metric: 'Resp Speed',
      ...Object.fromEntries(top5Techs.map(t => [t.name, Math.max(0, 100 - Math.min(t.avgResponseMinutes, 100))])),
    },
  ] : [];

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

      {/* Overall Compliance Alert */}
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
            <Progress value={data?.summary.overallCompliance || 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.overallResponseCompliance || 0}%</div>
            <p className="text-xs text-muted-foreground">{data?.summary.totalResponseBreaches || 0} breaches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.overallResolutionCompliance || 0}%</div>
            <p className="text-xs text-muted-foreground">{data?.summary.totalResolutionBreaches || 0} breaches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.summary.totalTickets || 0}</div>
            <p className="text-xs text-muted-foreground">{data?.summary.activeServices || 0} active services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={getComplianceBadge(data?.summary.overallCompliance || 0)}
              className="text-lg px-3 py-1"
            >
              {data?.summary.complianceStatus || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="border-b mb-6">
          <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
            {tabConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                    ${isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ====== TAB 1: OVERVIEW ====== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top SLA Performers</CardTitle>
                  <CardDescription>Services with best SLA compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data?.topPerformers?.map((service: any) => (
                      <div key={service.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {service.supportGroup} - {service.totalTickets} tickets
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
                    {data?.needsAttention?.map((service: any) => (
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

            {/* Compliance Overview Chart */}
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
                        breaches: data?.summary.totalResponseBreaches || 0,
                      },
                      {
                        name: 'Resolution',
                        compliance: data?.summary.overallResolutionCompliance || 0,
                        breaches: data?.summary.totalResolutionBreaches || 0,
                      },
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
          </div>
        )}

        {/* ====== TAB 2: SERVICES ====== */}
        {activeTab === 'services' && (
          <div className="space-y-4">
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
                        <th className="text-center p-2">Overall</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.services?.filter((s: any) => s.totalTickets > 0).map((service: any) => (
                        <tr key={service.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <p className="font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">{service.supportGroup}</p>
                          </td>
                          <td className="p-2">
                            <p className="text-sm">{service.category}</p>
                            {service.subcategory !== '-' && (
                              <p className="text-xs text-muted-foreground">{service.subcategory}</p>
                            )}
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
                            <Badge variant={getComplianceBadge(service.metrics.overallCompliance)}>
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
          </div>
        )}

        {/* ====== TAB 3: TECHNICIAN SLA (NEW) ====== */}
        {activeTab === 'technicians' && (
          <div className="space-y-4">
            {/* Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{technicians.length}</div>
                  <p className="text-xs text-muted-foreground">With assigned tickets</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg SLA Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {technicians.length > 0
                      ? Math.round(technicians.reduce((s, t) => s + t.slaCompliance, 0) / technicians.length)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">Across all technicians</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {technicians.length > 0
                      ? Math.round(technicians.reduce((s, t) => s + t.avgResponseMinutes, 0) / technicians.length)
                      : 0} min
                  </div>
                  <p className="text-xs text-muted-foreground">Average first response</p>
                </CardContent>
              </Card>
            </div>

            {/* Top 10 Technicians BarChart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top 10 Technicians by SLA Compliance
                </CardTitle>
                <CardDescription>Ranked by overall SLA compliance percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={technicians.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="slaCompliance" name="SLA Compliance %" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart - Top 5 Comparison */}
            {radarData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Technician Comparison</CardTitle>
                  <CardDescription>Multi-dimensional performance comparison (SLA, Resolution, Response Speed)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      {top5Techs.map((tech, idx) => (
                        <Radar
                          key={tech.id}
                          name={tech.name}
                          dataKey={tech.name}
                          stroke={COLORS[idx]}
                          fill={COLORS[idx]}
                          fillOpacity={0.15}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Technician Detail List */}
            <Card>
              <CardHeader>
                <CardTitle>Technician Details</CardTitle>
                <CardDescription>Individual technician SLA metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {technicians.map((tech) => (
                    <div key={tech.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tech.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tech.branch}
                            {tech.supportGroups.length > 0 ? ` - ${tech.supportGroups[0]}` : ''}
                            {' '}- {tech.totalTickets} tickets ({tech.resolvedTickets} resolved)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Resp: {tech.avgResponseMinutes}m avg - Res: {formatDuration(tech.avgResolutionHours)} avg -
                            Breaches: {tech.responseBreaches} resp / {tech.resolutionBreaches} res
                          </p>
                        </div>
                      </div>
                      <Badge variant={getComplianceBadge(tech.slaCompliance)}>
                        {tech.slaCompliance}%
                      </Badge>
                    </div>
                  ))}
                  {technicians.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">No technician data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ====== TAB 4: BREACH ANALYSIS (ENHANCED) ====== */}
        {activeTab === 'breaches' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Breach by Priority */}
              <Card>
                <CardHeader>
                  <CardTitle>Breaches by Priority</CardTitle>
                  <CardDescription>SLA breaches distributed by ticket priority</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data?.breachAnalysis?.byPriority}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="priority" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" name="Breaches" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Peak Breach Times */}
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
                        <span className="text-2xl font-bold">{data?.breachAnalysis?.peakBreachHour ?? 0}:00</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Peak Breach Day</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-2xl font-bold">{data?.breachAnalysis?.peakBreachDay || '-'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Breaches by Hour of Day */}
            <Card>
              <CardHeader>
                <CardTitle>Breaches by Hour of Day</CardTitle>
                <CardDescription>Distribution of SLA breaches across hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={breachByHourData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="breaches" fill="#f59e0b" name="Breaches" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Breaches by Day of Week */}
            <Card>
              <CardHeader>
                <CardTitle>Breaches by Day of Week</CardTitle>
                <CardDescription>Which days see the most SLA breaches</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={breachByDayData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="breaches" fill="#8b5cf6" name="Breaches" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ====== TAB 5: CATEGORIES & GROUPS ====== */}
        {activeTab === 'groups-categories' && (
          <div className="space-y-4">
            {/* Category Compliance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Category Compliance</CardTitle>
                <CardDescription>SLA performance by service category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.categoryCompliance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="avgCompliance" fill="#3b82f6" name="Avg Compliance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Details */}
            <Card>
              <CardHeader>
                <CardTitle>Category Details</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.categoryCompliance?.map((category: any) => (
                    <div key={category.name} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.serviceCount} services - {category.totalTickets} tickets - {category.totalBreaches} breaches
                        </p>
                      </div>
                      <Badge variant={getComplianceBadge(category.avgCompliance)}>
                        {category.avgCompliance}% compliance
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Support Group Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>Support Group Compliance</CardTitle>
                <CardDescription>SLA performance by support group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.supportGroupCompliance?.sort((a: any, b: any) => b.avgCompliance - a.avgCompliance).map((group: any) => (
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
                          <Badge variant={getComplianceBadge(group.avgCompliance)}>
                            {group.avgCompliance}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={group.avgCompliance} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
