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
import { Activity, Database, Server, TrendingUp, Calendar, MapPin } from 'lucide-react';

interface SystemHealthData {
  summary: {
    totalSystemTickets: number;
    criticalIssues: number;
    systemUptime: number;
    dataQualityScore: number;
    performanceScore: number;
    healthScore: number;
  };
  systemPerformance: {
    uptime: number;
    availability: number;
    responseTime: number;
    throughput: number;
    errorRate: number;
    performanceTrends: Array<{ date: string; uptime: number; responseTime: number; errorRate: number }>;
  };
  dataQuality: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    validity: number;
    qualityBySource: Record<string, {
      completeness: number;
      accuracy: number;
      consistency: number;
      issues: number;
    }>;
    dataIssues: Array<{
      source: string;
      issue: string;
      severity: string;
      count: number;
      impact: string;
    }>;
  };
  systemReliability: {
    mtbf: number; // Mean Time Between Failures
    mttr: number; // Mean Time To Recovery
    availability: number;
    reliabilityScore: number;
    failuresByComponent: Record<string, number>;
    recoveryTimes: Array<{ component: string; avgRecoveryTime: number; incidents: number }>;
  };
  databaseHealth: {
    connectionHealth: number;
    queryPerformance: number;
    storageUtilization: number;
    backupStatus: number;
    indexHealth: number;
    databaseMetrics: Record<string, {
      size: number;
      connections: number;
      queryTime: number;
      health: number;
    }>;
  };
  systemComponents: Record<string, {
    status: string;
    uptime: number;
    performance: number;
    lastIncident: string;
    incidentCount: number;
    healthScore: number;
  }>;
  regionalHealth: Record<string, {
    uptime: number;
    performance: number;
    incidents: number;
    dataQuality: number;
    healthScore: number;
  }>;
  insights: {
    performanceBottlenecks: Array<{ component: string; impact: string; severity: string; recommendation: string }>;
    dataQualityIssues: Array<{ area: string; currentScore: number; targetScore: number; priority: string }>;
    systemTrends: Array<{ metric: string; trend: string; change: number; prediction: string }>;
  };
  recommendations: {
    performance: string[];
    dataQuality: string[];
    reliability: string[];
    monitoring: string[];
  };
}

export default function SystemHealthReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<SystemHealthData | null>(null);
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
      
      const response = await fetch(`/api/reports/compliance/system-health?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching system health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;

    if (format === 'csv') {
      const rows = [
        ['System Health & Data Quality Report'],
        [`Date Range: ${startDate} to ${endDate}`],
        [`Generated: ${new Date().toISOString()}`],
        [''],
        ['Summary'],
        ['Metric', 'Value'],
        ['Total System Tickets', data.summary.totalSystemTickets.toString()],
        ['Critical Issues', data.summary.criticalIssues.toString()],
        ['System Uptime', `${data.summary.systemUptime.toFixed(2)}%`],
        ['Data Quality Score', `${data.summary.dataQualityScore.toFixed(1)}%`],
        ['Performance Score', `${data.summary.performanceScore.toFixed(1)}%`],
        ['Overall Health Score', `${data.summary.healthScore.toFixed(1)}%`],
        [''],
        ['System Performance'],
        ['Metric', 'Value'],
        ['Uptime', `${data.systemPerformance.uptime.toFixed(2)}%`],
        ['Availability', `${data.systemPerformance.availability.toFixed(2)}%`],
        ['Response Time (ms)', data.systemPerformance.responseTime.toFixed(0)],
        ['Throughput/sec', data.systemPerformance.throughput.toFixed(0)],
        ['Error Rate', `${data.systemPerformance.errorRate.toFixed(2)}%`],
        [''],
        ['Data Quality Metrics'],
        ['Metric', 'Score'],
        ['Completeness', `${data.dataQuality.completeness.toFixed(1)}%`],
        ['Accuracy', `${data.dataQuality.accuracy.toFixed(1)}%`],
        ['Consistency', `${data.dataQuality.consistency.toFixed(1)}%`],
        ['Timeliness', `${data.dataQuality.timeliness.toFixed(1)}%`],
        ['Validity', `${data.dataQuality.validity.toFixed(1)}%`],
        [''],
        ['System Reliability'],
        ['Metric', 'Value'],
        ['MTBF (hours)', data.systemReliability.mtbf.toFixed(1)],
        ['MTTR (hours)', data.systemReliability.mttr.toFixed(1)],
        ['Availability', `${data.systemReliability.availability.toFixed(2)}%`],
        ['Reliability Score', data.systemReliability.reliabilityScore.toFixed(1)],
        [''],
        ['Database Health'],
        ['Metric', 'Value'],
        ['Connection Health', `${data.databaseHealth.connectionHealth.toFixed(1)}%`],
        ['Query Performance', `${data.databaseHealth.queryPerformance.toFixed(1)}%`],
        ['Storage Utilization', `${data.databaseHealth.storageUtilization.toFixed(1)}%`],
        ['Backup Status', `${data.databaseHealth.backupStatus.toFixed(1)}%`],
        ['Index Health', `${data.databaseHealth.indexHealth.toFixed(1)}%`],
        [''],
        ['System Components'],
        ['Component', 'Status', 'Uptime', 'Performance', 'Incidents', 'Health Score'],
        ...Object.entries(data.systemComponents).map(([component, status]) => [
          component, status.status, `${status.uptime.toFixed(1)}%`, `${status.performance.toFixed(1)}%`,
          status.incidentCount.toString(), status.healthScore.toFixed(1)
        ]),
        [''],
        ['Regional Health'],
        ['Region', 'Uptime', 'Performance', 'Incidents', 'Data Quality', 'Health Score'],
        ...Object.entries(data.regionalHealth).map(([region, health]) => [
          region, `${health.uptime.toFixed(1)}%`, `${health.performance.toFixed(1)}%`,
          health.incidents.toString(), `${health.dataQuality.toFixed(1)}%`, health.healthScore.toFixed(1)
        ])
      ];

      const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-health-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx' || format === 'pdf') {
      alert(`${format.toUpperCase()} export coming soon. Please use CSV export for now.`);
    }
  };

  useEffect(() => {
    if (session?.user && session.user.role === 'ADMIN') {
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
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            Only administrators can view system health reports.
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
    performanceTrends: data.systemPerformance.performanceTrends.map(item => ({
      date: item.date,
      uptime: item.uptime,
      responseTime: item.responseTime,
      errorRate: item.errorRate
    })),
    failuresByComponent: Object.entries(data.systemReliability.failuresByComponent).map(([component, failures]) => ({
      name: component,
      value: failures
    })),
    dataQualityMetrics: [
      { name: 'Completeness', value: data.dataQuality.completeness },
      { name: 'Accuracy', value: data.dataQuality.accuracy },
      { name: 'Consistency', value: data.dataQuality.consistency },
      { name: 'Timeliness', value: data.dataQuality.timeliness },
      { name: 'Validity', value: data.dataQuality.validity }
    ]
  };

  const getHealthColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthBadge = (score: number) => {
    if (score >= 95) return 'default';
    if (score >= 85) return 'secondary';
    if (score >= 70) return 'default';
    return 'destructive';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      case 'down': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health & Data Quality Report</h1>
          <p className="text-gray-600 mt-1">
            System performance, data quality metrics, and infrastructure health monitoring
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton 
            onExport={handleExport} 
            reportName="System Health & Data Quality Report"
            disabled={!data} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report Filters
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(data.summary.systemUptime)}`}>
              {data.summary.systemUptime.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.summary.criticalIssues} critical issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality Score</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(data.summary.dataQualityScore)}`}>
              {data.summary.dataQualityScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Data integrity rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(data.summary.performanceScore)}`}>
              {data.summary.performanceScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              System performance rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(data.summary.healthScore)}`}>
              {data.summary.healthScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Composite health index
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(data.systemPerformance.uptime)}`}>
                {data.systemPerformance.uptime.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">Uptime</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(data.systemPerformance.availability)}`}>
                {data.systemPerformance.availability.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">Availability</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.systemPerformance.responseTime.toFixed(0)}ms</div>
              <div className="text-sm text-gray-500">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.systemPerformance.throughput.toFixed(0)}</div>
              <div className="text-sm text-gray-500">Throughput/sec</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${data.systemPerformance.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
                {data.systemPerformance.errorRate.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">Error Rate</div>
            </div>
          </div>
          
          <ReportCharts 
            data={chartData.performanceTrends}
            type="line"
            title="Performance Trends Over Time"
          />
        </CardContent>
      </Card>

      {/* Data Quality Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.dataQualityMetrics}
              type="bar"
              title="Data Quality Dimensions"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Quality by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.dataQuality.qualityBySource).slice(0, 5).map(([source, quality], index) => (
                <div key={index} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{source}</div>
                    <Badge variant={getHealthBadge((quality.completeness + quality.accuracy + quality.consistency) / 3)}>
                      {((quality.completeness + quality.accuracy + quality.consistency) / 3).toFixed(1)}% Quality
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold">{quality.completeness.toFixed(1)}%</div>
                      <div className="text-gray-500">completeness</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{quality.accuracy.toFixed(1)}%</div>
                      <div className="text-gray-500">accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{quality.consistency.toFixed(1)}%</div>
                      <div className="text-gray-500">consistency</div>
                    </div>
                  </div>
                  {quality.issues > 0 && (
                    <div className="text-xs text-red-600 mt-2">
                      {quality.issues} data quality issues detected
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Reliability */}
      <Card>
        <CardHeader>
          <CardTitle>System Reliability Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.systemReliability.mtbf.toFixed(1)}h</div>
              <div className="text-sm text-gray-500">MTBF (Mean Time Between Failures)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.systemReliability.mttr.toFixed(1)}h</div>
              <div className="text-sm text-gray-500">MTTR (Mean Time To Recovery)</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(data.systemReliability.availability)}`}>
                {data.systemReliability.availability.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">Availability</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(data.systemReliability.reliabilityScore)}`}>
                {data.systemReliability.reliabilityScore.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500">Reliability Score</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Failures by Component</h4>
              <ReportCharts 
                data={chartData.failuresByComponent}
                type="pie"
                title="Component Failure Distribution"
              />
            </div>
            <div>
              <h4 className="font-medium mb-3">Recovery Times</h4>
              <div className="space-y-2">
                {data.systemReliability.recoveryTimes.slice(0, 5).map((recovery, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{recovery.component}</div>
                      <div className="text-sm text-gray-500">{recovery.incidents} incidents</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{recovery.avgRecoveryTime.toFixed(1)}h</div>
                      <div className="text-xs text-gray-500">avg recovery</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Health */}
      <Card>
        <CardHeader>
          <CardTitle>Database Health Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(data.databaseHealth.connectionHealth)}`}>
                {data.databaseHealth.connectionHealth.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Connection Health</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(data.databaseHealth.queryPerformance)}`}>
                {data.databaseHealth.queryPerformance.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Query Performance</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${data.databaseHealth.storageUtilization > 80 ? 'text-red-600' : 'text-green-600'}`}>
                {data.databaseHealth.storageUtilization.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Storage Utilization</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(data.databaseHealth.backupStatus)}`}>
                {data.databaseHealth.backupStatus.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Backup Status</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthColor(data.databaseHealth.indexHealth)}`}>
                {data.databaseHealth.indexHealth.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Index Health</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Database Metrics</h4>
            {Object.entries(data.databaseHealth.databaseMetrics).slice(0, 5).map(([database, metrics], index) => (
              <div key={index} className="p-3 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{database}</div>
                  <Badge variant={getHealthBadge(metrics.health)}>
                    {metrics.health.toFixed(1)}% Health
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold">{(metrics.size / 1024).toFixed(1)}GB</div>
                    <div className="text-gray-500">size</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{metrics.connections}</div>
                    <div className="text-gray-500">connections</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{metrics.queryTime.toFixed(0)}ms</div>
                    <div className="text-gray-500">avg query time</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Components Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Components Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.systemComponents).slice(0, 10).map(([component, status], index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span className="font-medium">{component}</span>
                  </div>
                  <Badge variant={getStatusBadge(status.status)}>
                    {status.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className={`font-bold ${getHealthColor(status.uptime)}`}>
                      {status.uptime.toFixed(1)}%
                    </div>
                    <div className="text-gray-500">uptime</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getHealthColor(status.performance)}`}>
                      {status.performance.toFixed(1)}%
                    </div>
                    <div className="text-gray-500">performance</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{status.incidentCount}</div>
                    <div className="text-gray-500">incidents</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getHealthColor(status.healthScore)}`}>
                      {status.healthScore.toFixed(1)}
                    </div>
                    <div className="text-gray-500">health score</div>
                  </div>
                </div>
                {status.lastIncident && (
                  <div className="text-xs text-gray-500 mt-2">
                    Last incident: {status.lastIncident}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regional Health Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Health Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(data.regionalHealth).slice(0, 8).map(([region, health], index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{region}</span>
                  </div>
                  <Badge variant={getHealthBadge(health.healthScore)}>
                    {health.healthScore.toFixed(1)} Health Score
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className={`font-bold ${getHealthColor(health.uptime)}`}>
                      {health.uptime.toFixed(1)}%
                    </div>
                    <div className="text-gray-500">uptime</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getHealthColor(health.performance)}`}>
                      {health.performance.toFixed(1)}%
                    </div>
                    <div className="text-gray-500">performance</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">{health.incidents}</div>
                    <div className="text-gray-500">incidents</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${getHealthColor(health.dataQuality)}`}>
                      {health.dataQuality.toFixed(1)}%
                    </div>
                    <div className="text-gray-500">data quality</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Issues */}
      {data.dataQuality.dataIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Quality Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.dataQuality.dataIssues.slice(0, 8).map((issue, index) => (
                <div key={index} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{issue.source}</div>
                      <div className="text-sm text-gray-600">{issue.issue}</div>
                    </div>
                    <Badge variant={issue.severity === 'Critical' ? 'destructive' : 
                                  issue.severity === 'High' ? 'destructive' : 
                                  issue.severity === 'Medium' ? 'default' : 'secondary'}>
                      {issue.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      Count: <span className="font-bold">{issue.count}</span>
                    </div>
                    <div>
                      Impact: <span className="font-bold">{issue.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Bottlenecks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.insights.performanceBottlenecks.map((bottleneck, index) => (
              <div key={index} className="p-4 border rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{bottleneck.component}</div>
                  <Badge variant={bottleneck.severity === 'Critical' ? 'destructive' : 
                                bottleneck.severity === 'High' ? 'destructive' : 
                                bottleneck.severity === 'Medium' ? 'default' : 'secondary'}>
                    {bottleneck.severity} Impact
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Impact: {bottleneck.impact}
                </div>
                <div className="text-sm text-blue-600">
                  Recommendation: {bottleneck.recommendation}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Trends */}
      <Card>
        <CardHeader>
          <CardTitle>System Health Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.insights.systemTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{trend.metric}</div>
                  <div className="text-sm text-gray-500">{trend.trend} trend</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    trend.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">{trend.prediction}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-600">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.performance.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Data Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.dataQuality.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Reliability</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.reliability.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-purple-600">Monitoring</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.monitoring.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}