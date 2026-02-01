'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Users, Clock, CheckCircle, AlertTriangle, Download, TrendingUp, LayoutDashboard, User, Building, Activity, TrendingDown } from 'lucide-react';

interface TechnicianPerformance {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  branch: string;
  branchCode: string;
  supportGroups: string[];
  totalTickets: number;
  recentTickets: number;
  resolvedTickets: number;
  openTickets: number;
  overdueTickets: number;
  resolutionRate: number;
  avgResolutionHours: number;
  avgFirstResponseHours: number;
  slaCompliance: number;
  serviceDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  performance: {
    last7Days: number;
    last24Hours: number;
  };
}

interface ReportData {
  summary: {
    totalTechnicians: number;
    activeTechnicians: number;
    avgTicketsPerTechnician: number;
    avgResolutionRate: number;
    avgSlaCompliance: number;
  };
  technicians: TechnicianPerformance[];
  topPerformers: TechnicianPerformance[];
  branchDistribution: Record<string, any>;
}

const COLORS = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'];

const tabConfig = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'individual', label: 'Individual', icon: User },
  { id: 'branches', label: 'Branches', icon: Building },
  { id: 'workload', label: 'Workload', icon: Activity },
  { id: 'trends', label: 'Trends', icon: TrendingDown },
];

export default function TechnicianDetailedPerformancePage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/technician/detailed-performance');
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

  const exportToCsv = () => {
    if (!data) return;

    const csvData = data.technicians.map(tech => ({
      Name: tech.name,
      Email: tech.email,
      Branch: tech.branch,
      'Support Groups': tech.supportGroups.join('; '),
      'Total Tickets': tech.totalTickets,
      'Resolved Tickets': tech.resolvedTickets,
      'Open Tickets': tech.openTickets,
      'Overdue Tickets': tech.overdueTickets,
      'Resolution Rate (%)': tech.resolutionRate,
      'Avg Resolution Hours': tech.avgResolutionHours,
      'Avg First Response Hours': tech.avgFirstResponseHours,
      'SLA Compliance (%)': tech.slaCompliance
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `technician-performance-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
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

  const performanceChartData = data.technicians.map(tech => ({
    name: tech.name.length > 10 ? tech.name.substring(0, 10) + '...' : tech.name,
    fullName: tech.name,
    totalTickets: tech.totalTickets,
    resolvedTickets: tech.resolvedTickets,
    resolutionRate: tech.resolutionRate,
    slaCompliance: tech.slaCompliance,
    avgResolutionHours: tech.avgResolutionHours
  }));

  const branchChartData = Object.entries(data.branchDistribution).map(([branch, stats]) => ({
    branch: branch.length > 15 ? branch.substring(0, 15) + '...' : branch,
    fullBranch: branch,
    technicians: stats.technicians,
    totalTickets: stats.totalTickets,
    resolutionRate: stats.resolutionRate,
    avgSlaCompliance: stats.avgSlaCompliance
  }));

  const priorityData = data.technicians.reduce((acc: any, tech) => {
    Object.entries(tech.priorityDistribution).forEach(([priority, count]) => {
      acc[priority] = (acc[priority] || 0) + count;
    });
    return acc;
  }, {});

  const priorityChartData = Object.entries(priorityData).map(([priority, count]) => ({
    name: priority,
    value: count as number
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technician Performance Report</h1>
          <p className="text-muted-foreground">Comprehensive performance analysis for all technicians</p>
        </div>
        <Button onClick={exportToCsv} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalTechnicians}</div>
            <p className="text-xs text-muted-foreground">Active technicians: {data.summary.activeTechnicians}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tickets/Technician</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgTicketsPerTechnician}</div>
            <p className="text-xs text-muted-foreground">Per technician workload</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgResolutionRate}%</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg SLA Compliance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.avgSlaCompliance}%</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{data.topPerformers[0]?.name || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {data.topPerformers[0]?.resolutionRate.toFixed(1)}% resolution rate
            </p>
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
                  <CardTitle>Top 10 Performers by Resolution Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceChartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(label) => {
                          const tech = performanceChartData.find(t => t.name === label);
                          return tech?.fullName || label;
                        }}
                        formatter={(value, name) => [
                          name === 'resolutionRate' ? `${value}%` : value,
                          name === 'resolutionRate' ? 'Resolution Rate' : 'Total Tickets'
                        ]}
                      />
                      <Bar dataKey="resolutionRate" fill="#f59e0b" />
                      <Bar dataKey="totalTickets" fill="#d97706" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ticket Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={priorityChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {priorityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'individual' && (
          <div className="space-y-6">
            <div className="grid gap-4">
              {data.technicians.map((tech) => (
                <Card key={tech.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          {tech.avatar ? (
                            <AvatarImage src={tech.avatar} alt={tech.name} />
                          ) : (
                            <AvatarFallback>{tech.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{tech.name}</h3>
                          <p className="text-sm text-muted-foreground">{tech.email}</p>
                          <p className="text-sm text-muted-foreground">{tech.branch}</p>
                          {tech.supportGroups.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tech.supportGroups.map((group, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {group}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={tech.resolutionRate >= 80 ? "default" : "destructive"}>
                          {tech.resolutionRate.toFixed(1)}% Resolution Rate
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{tech.totalTickets}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{tech.resolvedTickets}</div>
                        <div className="text-xs text-muted-foreground">Resolved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{tech.openTickets}</div>
                        <div className="text-xs text-muted-foreground">Open</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">{tech.overdueTickets}</div>
                        <div className="text-xs text-muted-foreground">Overdue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{tech.avgResolutionHours}h</div>
                        <div className="text-xs text-muted-foreground">Avg Resolution</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{tech.avgFirstResponseHours}h</div>
                        <div className="text-xs text-muted-foreground">Avg Response</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{tech.slaCompliance}%</div>
                        <div className="text-xs text-muted-foreground">SLA</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{tech.performance.last7Days}</div>
                        <div className="text-xs text-muted-foreground">Last 7 Days</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={branchChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="branch"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => {
                        const branch = branchChartData.find(b => b.branch === label);
                        return branch?.fullBranch || label;
                      }}
                    />
                    <Bar dataKey="technicians" fill="#f59e0b" name="Technicians" />
                    <Bar dataKey="totalTickets" fill="#d97706" name="Total Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'workload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workload vs Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      labelFormatter={(label) => {
                        const tech = performanceChartData.find(t => t.name === label);
                        return tech?.fullName || label;
                      }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="totalTickets" stroke="#f59e0b" name="Total Tickets" />
                    <Line yAxisId="right" type="monotone" dataKey="resolutionRate" stroke="#d97706" name="Resolution Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SLA Compliance vs Resolution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={data.topPerformers.slice(0, 5).map(tech => ({
                    name: tech.name,
                    slaCompliance: tech.slaCompliance,
                    resolutionRate: tech.resolutionRate,
                    totalTickets: tech.totalTickets / 10, // Scale down for better visualization
                    avgResolutionHours: Math.max(0, 50 - tech.avgResolutionHours) // Invert so higher is better
                  }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="SLA Compliance" dataKey="slaCompliance" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                    <Radar name="Resolution Rate" dataKey="resolutionRate" stroke="#d97706" fill="#d97706" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
