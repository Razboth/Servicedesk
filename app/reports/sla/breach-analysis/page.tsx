'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTimeWITA } from '@/lib/export-utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Clock, AlertTriangle, CheckCircle, XCircle, Download,
  TrendingDown, Target, Timer, Activity, FileText, AlertCircle,
  LayoutDashboard, Settings, ListOrdered, ShieldAlert, TrendingUp, Crosshair
} from 'lucide-react';

interface SlaBreachData {
  summary: {
    totalTickets: number;
    responseBreaches: number;
    resolutionBreaches: number;
    totalBreaches: number;
    responseComplianceRate: number;
    resolutionComplianceRate: number;
    overallComplianceRate: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    currentActiveBreaches: number;
    recentTotalTickets: number;
    recentTotalBreaches: number;
  };
  serviceBreaches: Array<{
    serviceName: string;
    categoryName: string;
    totalTickets: number;
    responseBreaches: number;
    resolutionBreaches: number;
    totalBreaches: number;
    avgResponseHours: number;
    avgResolutionHours: number;
    responseComplianceRate: number;
    resolutionComplianceRate: number;
    overallComplianceRate: number;
  }>;
  priorityBreaches: Array<{
    priority: string;
    totalTickets: number;
    responseBreaches: number;
    resolutionBreaches: number;
    totalBreaches: number;
  }>;
  branchBreaches: Array<{
    branchName: string;
    branchCode: string;
    totalTickets: number;
    responseBreaches: number;
    resolutionBreaches: number;
    totalBreaches: number;
    complianceRate: number;
  }>;
  currentBreaches: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    priority: string;
    status: string;
    serviceName: string;
    createdBy: string;
    assignedTo: string;
    branchName: string;
    createdAt: string;
    responseSlaHours: number;
    resolutionSlaHours: number;
    actualResponseHours: number;
    actualResolutionHours: number;
    responseBreached: boolean;
    resolutionBreached: boolean;
    breachSeverity: string;
    daysSinceCreated: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    totalTickets: number;
    breaches: number;
    complianceRate: number;
  }>;
  slaTargets: Record<string, { response: number; resolution: number }>;
}

const PRIORITY_COLORS = {
  'CRITICAL': '#dc2626',
  'HIGH': '#ea580c',
  'MEDIUM': '#d97706',
  'LOW': '#65a30d'
};

const SEVERITY_COLORS = {
  'SEVERE': '#dc2626',
  'MODERATE': '#ea580c',
  'MINOR': '#f59e0b',
  'NONE': '#22c55e'
};

const tabConfig = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'services', label: 'Services', icon: Settings },
  { id: 'priority', label: 'Priority', icon: ListOrdered },
  { id: 'breaches', label: 'Breaches', icon: ShieldAlert },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'targets', label: 'Targets', icon: Crosshair },
];

export default function SlaBreachAnalysisPage() {
  const [data, setData] = useState<SlaBreachData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/sla/breach-analysis');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportToCsv = (type: 'services' | 'breaches' | 'summary') => {
    if (!data) return;

    let csvData: any[] = [];
    let filename = '';

    switch (type) {
      case 'services':
        csvData = data.serviceBreaches.map(service => ({
          'Service Name': service.serviceName,
          'Category': service.categoryName,
          'Total Tickets': service.totalTickets,
          'Response Breaches': service.responseBreaches,
          'Resolution Breaches': service.resolutionBreaches,
          'Total Breaches': service.totalBreaches,
          'Response Compliance (%)': service.responseComplianceRate.toFixed(1),
          'Resolution Compliance (%)': service.resolutionComplianceRate.toFixed(1),
          'Overall Compliance (%)': service.overallComplianceRate.toFixed(1),
          'Avg Response Hours': service.avgResponseHours.toFixed(1),
          'Avg Resolution Hours': service.avgResolutionHours.toFixed(1)
        }));
        filename = `sla-service-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'breaches':
        csvData = data.currentBreaches.map(breach => ({
          'Ticket Number': breach.ticketNumber,
          'Title': breach.title,
          'Priority': breach.priority,
          'Status': breach.status,
          'Service': breach.serviceName,
          'Created By': breach.createdBy,
          'Assigned To': breach.assignedTo,
          'Branch': breach.branchName,
          'Days Since Created': breach.daysSinceCreated,
          'Response SLA (Hours)': breach.responseSlaHours,
          'Resolution SLA (Hours)': breach.resolutionSlaHours,
          'Actual Response (Hours)': breach.actualResponseHours,
          'Actual Resolution (Hours)': breach.actualResolutionHours,
          'Response Breached': breach.responseBreached ? 'Yes' : 'No',
          'Resolution Breached': breach.resolutionBreached ? 'Yes' : 'No',
          'Breach Severity': breach.breachSeverity,
          'Created At': formatDateTimeWITA(breach.createdAt)
        }));
        filename = `sla-current-breaches-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'summary':
        csvData = [{
          'Total Tickets': data.summary.totalTickets,
          'Response Breaches': data.summary.responseBreaches,
          'Resolution Breaches': data.summary.resolutionBreaches,
          'Total Breaches': data.summary.totalBreaches,
          'Response Compliance (%)': data.summary.responseComplianceRate,
          'Resolution Compliance (%)': data.summary.resolutionComplianceRate,
          'Overall Compliance (%)': data.summary.overallComplianceRate,
          'Avg Response Time (Hours)': data.summary.avgResponseTime,
          'Avg Resolution Time (Hours)': data.summary.avgResolutionTime,
          'Current Active Breaches': data.summary.currentActiveBreaches
        }];
        filename = `sla-summary-${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'default';
      case 'MEDIUM': return 'secondary';
      case 'LOW': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'SEVERE': return 'destructive';
      case 'MODERATE': return 'default';
      case 'MINOR': return 'secondary';
      case 'NONE': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading report: {error}</p>
            <Button onClick={fetchData}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const complianceData = [
    { name: 'Response', compliance: data.summary.responseComplianceRate, breaches: data.summary.responseBreaches },
    { name: 'Resolution', compliance: data.summary.resolutionComplianceRate, breaches: data.summary.resolutionBreaches }
  ];

  const priorityBreachData = data.priorityBreaches.map(priority => ({
    name: priority.priority,
    totalTickets: priority.totalTickets,
    breaches: priority.totalBreaches,
    complianceRate: priority.totalTickets > 0 ?
      ((priority.totalTickets - priority.totalBreaches) / priority.totalTickets) * 100 : 100
  }));

  const serviceBreachData = data.serviceBreaches.slice(0, 10).map(service => ({
    name: service.serviceName.length > 15 ? service.serviceName.substring(0, 15) + '...' : service.serviceName,
    fullName: service.serviceName,
    totalTickets: service.totalTickets,
    breaches: service.totalBreaches,
    complianceRate: service.overallComplianceRate
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SLA Breach Analysis</h1>
          <p className="text-muted-foreground">Detailed SLA compliance monitoring and breach analysis</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => exportToCsv('breaches')} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Breaches
          </Button>
          <Button onClick={() => exportToCsv('services')} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Services
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalTickets}</div>
            <p className="text-xs text-muted-foreground">All tickets tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.totalBreaches}</div>
            <p className="text-xs text-muted-foreground">Response + Resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.overallComplianceRate}%</div>
            <p className="text-xs text-muted-foreground">All SLA metrics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Compliance</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.summary.responseComplianceRate}%</div>
            <p className="text-xs text-muted-foreground">First response SLA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Compliance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.resolutionComplianceRate}%</div>
            <p className="text-xs text-muted-foreground">Resolution SLA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgResponseTime}h</div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgResolutionTime}h</div>
            <p className="text-xs text-muted-foreground">Average resolution time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Breaches</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.currentActiveBreaches}</div>
            <p className="text-xs text-muted-foreground">Currently breached</p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
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

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={complianceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'compliance' ? `${value}%` : value,
                          name === 'compliance' ? 'Compliance Rate' : 'Breaches'
                        ]}
                      />
                      <Bar dataKey="compliance" fill="#22c55e" name="Compliance %" />
                      <Bar dataKey="breaches" fill="#ef4444" name="Breaches" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Breach Analysis by Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={priorityBreachData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalTickets" fill="#f59e0b" name="Total Tickets" />
                      <Bar dataKey="breaches" fill="#ef4444" name="Breaches" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service SLA Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={serviceBreachData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      labelFormatter={(label) => {
                        const service = serviceBreachData.find(s => s.name === label);
                        return service?.fullName || label;
                      }}
                    />
                    <Bar yAxisId="left" dataKey="breaches" fill="#ef4444" name="Breaches" />
                    <Bar yAxisId="right" dataKey="complianceRate" fill="#22c55e" name="Compliance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service SLA Details</h3>
              <div className="grid gap-4">
                {data.serviceBreaches.slice(0, 10).map((service) => (
                  <Card key={service.serviceName}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{service.serviceName}</h4>
                          <p className="text-sm text-muted-foreground">{service.categoryName}</p>
                          <Badge variant={service.overallComplianceRate >= 90 ? "default" : service.overallComplianceRate >= 80 ? "secondary" : "destructive"} className="mt-2">
                            {service.overallComplianceRate.toFixed(1)}% Overall Compliance
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">{service.totalBreaches}</div>
                          <div className="text-xs text-muted-foreground">Total Breaches</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{service.totalTickets}</div>
                          <div className="text-xs text-muted-foreground">Total Tickets</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">{service.responseBreaches}</div>
                          <div className="text-xs text-muted-foreground">Response Breaches</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">{service.resolutionBreaches}</div>
                          <div className="text-xs text-muted-foreground">Resolution Breaches</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">{service.responseComplianceRate.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Response SLA</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">{service.resolutionComplianceRate.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Resolution SLA</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">{service.avgResolutionHours.toFixed(1)}h</div>
                          <div className="text-xs text-muted-foreground">Avg Resolution</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'priority' && (
          <div className="space-y-6">
            <div className="grid gap-4">
              {data.priorityBreaches.map((priority) => (
                <Card key={priority.priority}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full`} style={{ backgroundColor: PRIORITY_COLORS[priority.priority as keyof typeof PRIORITY_COLORS] }}></div>
                        <div>
                          <h4 className="font-semibold">{priority.priority} Priority</h4>
                          <Badge variant={getPriorityBadgeColor(priority.priority)}>
                            {priority.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{priority.totalBreaches}</div>
                        <div className="text-xs text-muted-foreground">Breaches</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mt-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{priority.totalTickets}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">{priority.responseBreaches}</div>
                        <div className="text-xs text-muted-foreground">Response</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">{priority.resolutionBreaches}</div>
                        <div className="text-xs text-muted-foreground">Resolution</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                          {priority.totalTickets > 0 ? (((priority.totalTickets - priority.totalBreaches) / priority.totalTickets) * 100).toFixed(1) : 100}%
                        </div>
                        <div className="text-xs text-muted-foreground">Compliance</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'breaches' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Current Active Breaches ({data.currentBreaches.length})</h3>
                <Button onClick={() => exportToCsv('breaches')} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Current Breaches
                </Button>
              </div>

              {data.currentBreaches.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">No Active SLA Breaches</h3>
                      <p className="text-muted-foreground">All tickets are within SLA compliance.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {data.currentBreaches.map((breach) => (
                    <Card key={breach.id} className={`${breach.breachSeverity === 'SEVERE' ? 'border-red-500 bg-red-50' : breach.breachSeverity === 'MODERATE' ? 'border-orange-400 bg-orange-50' : 'border-yellow-400 bg-yellow-50'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{breach.ticketNumber}</h4>
                              <Badge variant={getPriorityBadgeColor(breach.priority)}>
                                {breach.priority}
                              </Badge>
                              <Badge variant={getSeverityBadgeColor(breach.breachSeverity)}>
                                {breach.breachSeverity}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium mb-1">{breach.title}</p>
                            <p className="text-xs text-muted-foreground mb-2">{breach.serviceName}</p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="font-medium">Created By:</span>
                                <p className="text-muted-foreground">{breach.createdBy}</p>
                              </div>
                              <div>
                                <span className="font-medium">Assigned To:</span>
                                <p className="text-muted-foreground">{breach.assignedTo}</p>
                              </div>
                              <div>
                                <span className="font-medium">Branch:</span>
                                <p className="text-muted-foreground">{breach.branchName}</p>
                              </div>
                              <div>
                                <span className="font-medium">Status:</span>
                                <p className="text-muted-foreground">{breach.status}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                              <div className={breach.responseBreached ? 'text-red-600' : 'text-green-600'}>
                                <span className="font-medium">Response SLA:</span>
                                <p>{breach.actualResponseHours.toFixed(1)}h / {breach.responseSlaHours}h</p>
                              </div>
                              <div className={breach.resolutionBreached ? 'text-red-600' : 'text-blue-600'}>
                                <span className="font-medium">Resolution SLA:</span>
                                <p>{breach.actualResolutionHours.toFixed(1)}h / {breach.resolutionSlaHours}h</p>
                              </div>
                              <div>
                                <span className="font-medium">Created:</span>
                                <p className="text-muted-foreground">{new Date(breach.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <span className="font-medium">Age:</span>
                                <p className="text-muted-foreground">{breach.daysSinceCreated} days</p>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">{breach.daysSinceCreated}</div>
                            <div className="text-xs text-muted-foreground">Days Old</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SLA Compliance Trend (Last 6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="totalTickets" stroke="#f59e0b" name="Total Tickets" />
                    <Line yAxisId="left" type="monotone" dataKey="breaches" stroke="#ef4444" name="Breaches" />
                    <Line yAxisId="right" type="monotone" dataKey="complianceRate" stroke="#22c55e" name="Compliance %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'targets' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SLA Target Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {Object.entries(data.slaTargets).map(([priority, targets]) => (
                    <Card key={priority}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={getPriorityBadgeColor(priority)} className="text-sm">
                              {priority}
                            </Badge>
                            <div>
                              <h4 className="font-semibold">{priority} Priority Targets</h4>
                              <p className="text-sm text-muted-foreground">Standard SLA expectations</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-6 text-center">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">{targets.response}h</div>
                              <div className="text-xs text-muted-foreground">Response SLA</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-green-600">{targets.resolution}h</div>
                              <div className="text-xs text-muted-foreground">Resolution SLA</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
