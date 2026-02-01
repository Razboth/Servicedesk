'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReportFilters, type ReportFilters as ReportFiltersType } from '@/components/reports/report-filters';
import { MetricCard } from '@/components/reports/report-charts';
import { ExportButton, exportUtils } from '@/components/reports/export-button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, Shield, Target, Clock, TrendingUp, AlertTriangle,
  CheckCircle, Award, Building2, Settings, Zap, Timer, Users,
  UserCheck, AlertCircle, LayoutDashboard, BarChart3, GitBranch, LineChartIcon, Lightbulb,
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

interface TechnicianData {
  id: string;
  name: string;
  email: string;
  branch: string;
  branchCode: string;
  supportGroups: string[];
  totalTickets: number;
  resolvedTickets: number;
  openTickets: number;
  overdueTickets: number;
  responseBreaches: number;
  resolutionBreaches: number;
  slaCompliance: number;
  resolutionRate: number;
  avgResponseHours: number;
  avgResolutionHours: number;
  excellenceCount: number;
}

interface SLAPerformanceData {
  summary: {
    totalSlaRecords: number;
    overallCompliance: number;
    responseCompliance: number;
    resolutionCompliance: number;
    responseBreaches: number;
    resolutionBreaches: number;
    avgResponseHours: number;
    avgResolutionHours: number;
    totalEscalated: number;
    activeBreaches: number;
    pausedTickets: number;
    avgPauseDurationHours: number;
  };
  technicians: TechnicianData[];
  byPriority: Array<{
    priority: string;
    total: number;
    compliant: number;
    complianceRate: number;
    responseBreaches: number;
    resolutionBreaches: number;
    avgResponseHours: number;
  }>;
  byCategory: Array<{
    category: string;
    total: number;
    compliant: number;
    complianceRate: number;
    responseBreaches: number;
    resolutionBreaches: number;
    avgResponseHours: number;
  }>;
  byBranch: Array<{
    branch: string;
    total: number;
    compliant: number;
    complianceRate: number;
    responseBreaches: number;
    resolutionBreaches: number;
  }>;
  trends: {
    daily: Array<{ date: string; value: number; total: number; compliant: number; label: string }>;
    monthly: Array<{ date: string; value: number; total: number; compliant: number; label: string }>;
  };
  responseDistribution: Array<{ label: string; value: number }>;
  excellence: {
    excellenceRate: number;
    criticalIncidents: number;
    criticalOnTime: number;
    criticalComplianceRate: number;
  };
  improvements: {
    highBreachBranches: Array<{ branch: string; complianceRate: number; total: number }>;
    problematicCategories: Array<{ category: string; complianceRate: number; total: number }>;
    frequentBreaches: number;
    totalImprovementAreas: number;
  };
  period: { startDate: string; endDate: string };
}

const tabConfig = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'technicians', label: 'Technician Performance', icon: Users },
  { id: 'branch-category', label: 'Branch & Category', icon: GitBranch },
  { id: 'trends', label: 'Trends', icon: LineChartIcon },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];

export default function SLAPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<SLAPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFiltersType>({
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    },
    selectedFilters: {},
  });
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/auth/signin'); return; }
    if (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      router.push('/reports');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') {
      fetchData();
    }
  }, [filters, session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        startDate: filters.dateRange.startDate.toISOString(),
        endDate: filters.dateRange.endDate.toISOString(),
      });
      const response = await fetch(`/api/reports/admin/sla-performance?${params}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;
    const exportData = [
      ...data.byBranch.map(b => ({
        'Type': 'Branch',
        'Name': b.branch,
        'Total': b.total,
        'Compliant': b.compliant,
        'Compliance %': `${b.complianceRate}%`,
        'Response Breaches': b.responseBreaches,
        'Resolution Breaches': b.resolutionBreaches,
      })),
      ...data.technicians.map(t => ({
        'Type': 'Technician',
        'Name': t.name,
        'Total': t.totalTickets,
        'Compliant': t.resolvedTickets,
        'Compliance %': `${t.slaCompliance}%`,
        'Response Breaches': t.responseBreaches,
        'Resolution Breaches': t.resolutionBreaches,
      })),
    ];
    const filename = exportUtils.generateFilename('sla-performance', format === 'xlsx' ? 'xlsx' : 'csv');
    if (format === 'csv') exportUtils.exportToCSV(exportData, filename);
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
    return `${Math.round((hours / 24) * 10) / 10}d`;
  };

  const getComplianceBadgeVariant = (rate: number): "success" | "default" | "warning" | "destructive" => {
    if (rate >= 95) return 'success';
    if (rate >= 85) return 'default';
    if (rate >= 70) return 'warning';
    return 'destructive';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading SLA performance data...</p>
        </div>
      </div>
    );
  }

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPER_ADMIN')) return null;

  if (error) {
    return (
      <div className="w-full py-6 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Report</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">SLA & Performance Excellence</h1>
            <p className="text-muted-foreground">
              Organization-wide SLA compliance, technician performance, and trend analytics
            </p>
          </div>
        </div>
        <ExportButton onExport={handleExport} disabled={!data} reportName="sla-performance" />
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onChange={setFilters} filterGroups={[]} isLoading={loading} />

      {data && (
        <div className="space-y-6">
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
            <div className="space-y-6">
              {/* Key Metrics Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Overall Compliance"
                  value={`${data.summary.overallCompliance}%`}
                  subtitle={`${data.summary.totalSlaRecords} SLA records`}
                  icon={<Shield className="h-5 w-5" />}
                  badge={{
                    text: data.summary.overallCompliance >= 95 ? 'Excellent' :
                          data.summary.overallCompliance >= 85 ? 'Good' :
                          data.summary.overallCompliance >= 70 ? 'Fair' : 'Poor',
                    variant: getComplianceBadgeVariant(data.summary.overallCompliance),
                  }}
                />
                <MetricCard
                  title="Response Compliance"
                  value={`${data.summary.responseCompliance}%`}
                  subtitle={`${data.summary.responseBreaches} breaches`}
                  icon={<Timer className="h-5 w-5" />}
                  badge={{
                    text: `${data.summary.responseBreaches} breaches`,
                    variant: data.summary.responseBreaches === 0 ? 'success' : 'warning',
                  }}
                />
                <MetricCard
                  title="Resolution Compliance"
                  value={`${data.summary.resolutionCompliance}%`}
                  subtitle={`${data.summary.resolutionBreaches} breaches`}
                  icon={<Target className="h-5 w-5" />}
                  badge={{
                    text: `${data.summary.resolutionBreaches} breaches`,
                    variant: data.summary.resolutionBreaches === 0 ? 'success' : 'warning',
                  }}
                />
                <MetricCard
                  title="Avg Response Time"
                  value={formatDuration(data.summary.avgResponseHours)}
                  subtitle="Organization average"
                  icon={<Clock className="h-5 w-5" />}
                  badge={{
                    text: data.summary.avgResponseHours <= 2 ? 'Fast' :
                          data.summary.avgResponseHours <= 4 ? 'Good' : 'Slow',
                    variant: data.summary.avgResponseHours <= 2 ? 'success' :
                             data.summary.avgResponseHours <= 4 ? 'default' : 'destructive',
                  }}
                />
              </div>

              {/* Key Metrics Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Excellence Rate"
                  value={`${data.excellence.excellenceRate}%`}
                  subtitle="Resolved < 50% SLA time"
                  icon={<Award className="h-5 w-5" />}
                  badge={{
                    text: data.excellence.excellenceRate >= 20 ? 'Outstanding' : data.excellence.excellenceRate >= 10 ? 'Good' : 'Developing',
                    variant: data.excellence.excellenceRate >= 20 ? 'success' : data.excellence.excellenceRate >= 10 ? 'default' : 'secondary',
                  }}
                />
                <MetricCard
                  title="Active Breaches"
                  value={data.summary.activeBreaches}
                  subtitle="Unresolved breached tickets"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  badge={{
                    text: data.summary.activeBreaches === 0 ? 'Clear' : 'Action needed',
                    variant: data.summary.activeBreaches === 0 ? 'success' : 'destructive',
                  }}
                />
                <MetricCard
                  title="Escalated Tickets"
                  value={data.summary.totalEscalated}
                  subtitle={`${data.summary.pausedTickets} currently paused`}
                  icon={<Zap className="h-5 w-5" />}
                  badge={{
                    text: 'Escalated',
                    variant: data.summary.totalEscalated > 0 ? 'warning' : 'success',
                  }}
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Response Time Distribution - PieChart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Response Time Distribution</CardTitle>
                    <CardDescription>How quickly tickets receive initial response</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.responseDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ label, value }) => value > 0 ? `${label}: ${value}` : ''}
                          outerRadius={100}
                          dataKey="value"
                          nameKey="label"
                        >
                          {data.responseDistribution.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Compliance by Priority - BarChart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance by Priority</CardTitle>
                    <CardDescription>SLA compliance rates across ticket priorities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.byPriority}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="priority" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="complianceRate" name="Compliance %" fill="#10b981" />
                        <Bar dataKey="responseBreaches" name="Response Breaches" fill="#ef4444" />
                        <Bar dataKey="resolutionBreaches" name="Resolution Breaches" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ====== TAB 2: TECHNICIAN PERFORMANCE ====== */}
          {activeTab === 'technicians' && (
            <div className="space-y-6">
              {/* Technician Filter */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Filter by Technician
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Technicians ({data.technicians.length})</SelectItem>
                      {data.technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name} - {tech.branch} ({tech.slaCompliance}% SLA)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Summary Row */}
              {(() => {
                const filteredTechs = selectedTechnician === 'all'
                  ? data.technicians
                  : data.technicians.filter(t => t.id === selectedTechnician);
                const selectedTech = selectedTechnician !== 'all'
                  ? data.technicians.find(t => t.id === selectedTechnician)
                  : null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {selectedTech ? 'Technician' : 'Total Technicians'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {selectedTech ? selectedTech.name : filteredTechs.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedTech ? selectedTech.branch : 'With assigned SLA tickets'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {selectedTech ? 'SLA Compliance' : 'Avg SLA Compliance'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {selectedTech
                            ? selectedTech.slaCompliance
                            : filteredTechs.length > 0
                              ? Math.round(filteredTechs.reduce((s, t) => s + t.slaCompliance, 0) / filteredTechs.length)
                              : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedTech ? `${selectedTech.totalTickets} total tickets` : 'Across all technicians'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {selectedTech ? 'Resolution Rate' : 'Avg Resolution Rate'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {selectedTech
                            ? selectedTech.resolutionRate
                            : filteredTechs.length > 0
                              ? Math.round(filteredTechs.reduce((s, t) => s + t.resolutionRate, 0) / filteredTechs.length)
                              : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedTech ? `${selectedTech.resolvedTickets} resolved` : 'Tickets resolved'}
                        </p>
                      </CardContent>
                    </Card>
                    {selectedTech && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Breaches</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-destructive">
                            {selectedTech.responseBreaches + selectedTech.resolutionBreaches}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {selectedTech.responseBreaches} resp. / {selectedTech.resolutionBreaches} res.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })()}

              {/* Top 10 Technicians BarChart */}
              {selectedTechnician === 'all' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Technicians by SLA Compliance</CardTitle>
                    <CardDescription>Technicians ranked by overall SLA compliance rate</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={data.technicians.slice(0, 10)}
                        layout="vertical"
                        margin={{ left: 120 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="slaCompliance" name="SLA Compliance %" fill="#10b981" />
                        <Bar dataKey="resolutionRate" name="Resolution Rate %" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Individual Technician Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.technicians
                  .filter((tech) => selectedTechnician === 'all' || tech.id === selectedTechnician)
                  .map((tech) => (
                  <Card key={tech.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {tech.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-sm">{tech.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {tech.branch}{tech.supportGroups.length > 0 ? ` - ${tech.supportGroups[0]}` : ''}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={getComplianceBadgeVariant(tech.slaCompliance)}>
                          {tech.slaCompliance}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-medium">{tech.totalTickets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Resolved</span>
                          <span className="font-medium">{tech.resolvedTickets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Open</span>
                          <span className="font-medium">{tech.openTickets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Overdue</span>
                          <span className="font-medium text-destructive">{tech.overdueTickets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Resp. Breach</span>
                          <span className="font-medium">{tech.responseBreaches}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Res. Breach</span>
                          <span className="font-medium">{tech.resolutionBreaches}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SLA %</span>
                          <span className="font-medium">{tech.slaCompliance}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Resolve</span>
                          <span className="font-medium">{formatDuration(tech.avgResolutionHours)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ====== TAB 3: BRANCH & CATEGORY ====== */}
          {activeTab === 'branch-category' && (
            <div className="space-y-6">
              {/* Branch Compliance BarChart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Branch Compliance Rates
                  </CardTitle>
                  <CardDescription>SLA compliance by branch (sorted by compliance)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(300, data.byBranch.length * 32)}>
                    <BarChart
                      data={data.byBranch.slice(0, 20)}
                      layout="vertical"
                      margin={{ left: 140 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="branch" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="complianceRate" name="Compliance %" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Branch Detail List */}
              <Card>
                <CardHeader>
                  <CardTitle>Branch Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.byBranch.map((branch, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{branch.branch}</p>
                          <p className="text-xs text-muted-foreground">
                            {branch.total} tickets - {branch.compliant} compliant - {branch.responseBreaches} resp. / {branch.resolutionBreaches} res. breaches
                          </p>
                        </div>
                        <Badge variant={getComplianceBadgeVariant(branch.complianceRate)}>
                          {branch.complianceRate}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Category Compliance BarChart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Category Compliance Rates
                  </CardTitle>
                  <CardDescription>SLA compliance by service category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(250, data.byCategory.length * 40)}>
                    <BarChart
                      data={data.byCategory}
                      layout="vertical"
                      margin={{ left: 160 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="category" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="complianceRate" name="Compliance %" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Detail List */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.byCategory.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{cat.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {cat.total} tickets - Avg response: {formatDuration(cat.avgResponseHours)} - {cat.responseBreaches} resp. / {cat.resolutionBreaches} res. breaches
                          </p>
                        </div>
                        <Badge variant={getComplianceBadgeVariant(cat.complianceRate)}>
                          {cat.complianceRate}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ====== TAB 4: TRENDS ====== */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* Daily Compliance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily SLA Compliance (Last 30 Days)</CardTitle>
                  <CardDescription>Day-by-day compliance percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={data.trends.daily}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => v.slice(5)}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        labelFormatter={(v) => `Date: ${v}`}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Compliance %"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Monthly Compliance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly SLA Compliance (Last 6 Months)</CardTitle>
                  <CardDescription>Month-over-month compliance trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.trends.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip
                        labelFormatter={(v) => `Month: ${v}`}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Compliance %"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ====== TAB 5: INSIGHTS ====== */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Executive Insights & Strategic Recommendations</CardTitle>
                  <CardDescription>Automated analysis based on current SLA data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.summary.overallCompliance >= 95 && (
                      <div className="flex items-start gap-3 text-sm p-3 rounded-md bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300">
                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>Outstanding organizational SLA compliance at {data.summary.overallCompliance}%. Service excellence is being delivered consistently.</span>
                      </div>
                    )}
                    {data.excellence.excellenceRate >= 20 && (
                      <div className="flex items-start gap-3 text-sm p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
                        <Award className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>Exceptional performance: {data.excellence.excellenceRate}% of tickets resolved within 50% of SLA time.</span>
                      </div>
                    )}
                    {data.excellence.criticalComplianceRate >= 95 && (
                      <div className="flex items-start gap-3 text-sm p-3 rounded-md bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300">
                        <Zap className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>Critical incident handling is excellent with {data.excellence.criticalComplianceRate}% compliance for urgent tickets.</span>
                      </div>
                    )}
                    {data.summary.activeBreaches > 0 && (
                      <div className="flex items-start gap-3 text-sm p-3 rounded-md bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{data.summary.activeBreaches} tickets are currently breached and unresolved. Immediate attention is required.</span>
                      </div>
                    )}
                    {data.improvements.totalImprovementAreas > 0 && (
                      <div className="flex items-start gap-3 text-sm p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                        <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          {data.improvements.totalImprovementAreas} area{data.improvements.totalImprovementAreas > 1 ? 's' : ''} identified for improvement.
                          Focus on process optimization and additional training.
                        </span>
                      </div>
                    )}
                    {data.improvements.frequentBreaches > 10 && (
                      <div className="flex items-start gap-3 text-sm p-3 rounded-md bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          {data.improvements.frequentBreaches} tickets experienced both response and resolution breaches.
                          Investigate root causes.
                        </span>
                      </div>
                    )}
                    {data.summary.avgResponseHours <= 2 && (
                      <div className="flex items-start gap-3 text-sm p-3 rounded-md bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300">
                        <Timer className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>Outstanding response time of {formatDuration(data.summary.avgResponseHours)} demonstrates responsive customer service.</span>
                      </div>
                    )}
                    {data.summary.pausedTickets > 0 && (
                      <div className="flex items-start gap-3 text-sm p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
                        <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          {data.summary.pausedTickets} tickets are currently paused (avg pause: {formatDuration(data.summary.avgPauseDurationHours)}).
                          SLA timers are paused for these tickets.
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performers & Improvement Areas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Top Performing Branches
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {data.byBranch.filter(b => b.total >= 5).slice(0, 5).map((branch, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                              idx === 1 ? 'bg-gray-100 text-gray-800' :
                              idx === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{branch.branch}</p>
                              <p className="text-xs text-muted-foreground">{branch.total} tickets</p>
                            </div>
                          </div>
                          <Badge variant="success">{branch.complianceRate}%</Badge>
                        </div>
                      ))}
                      {data.byBranch.filter(b => b.total >= 5).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No branches with 5+ tickets</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {data.improvements.totalImprovementAreas > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Areas Needing Attention
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.improvements.highBreachBranches.map((branch, idx) => (
                          <div key={`b-${idx}`} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{branch.branch}</p>
                              <p className="text-xs text-muted-foreground">{branch.total} tickets - Branch</p>
                            </div>
                            <Badge variant="destructive">{branch.complianceRate}%</Badge>
                          </div>
                        ))}
                        {data.improvements.problematicCategories.map((cat, idx) => (
                          <div key={`c-${idx}`} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                            <div>
                              <p className="font-medium text-sm">{cat.category}</p>
                              <p className="text-xs text-muted-foreground">{cat.total} tickets - Category</p>
                            </div>
                            <Badge variant="warning">{cat.complianceRate}%</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
