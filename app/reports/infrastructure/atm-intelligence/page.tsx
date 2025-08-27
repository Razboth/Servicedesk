'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportButton } from '@/components/reports/export-button';
import { ReportCharts } from '@/components/reports/report-charts';
import { Monitor, AlertTriangle, TrendingUp, MapPin, Calendar, Activity } from 'lucide-react';

interface ATMIntelligenceData {
  summary: {
    totalAtms: number;
    totalIncidents: number;
    openIncidents: number;
    criticalIncidents: number;
    avgResolutionHours: number;
    healthScore: number;
  };
  distributions: {
    byBranch: Record<string, number>;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byRegion: Record<string, {
      atmCount: number;
      incidents: number;
      avgResolutionHours: number;
    }>;
  };
  trends: {
    dailyIncidents: Array<{ date: string; count: number }>;
    resolutionTimes: Array<number>;
  };
  recentIncidents: Array<{
    id: string;
    title: string;
    branch: string;
    priority: string;
    status: string;
    createdAt: string;
    assignedTo?: string;
    category?: string;
  }>;
  atmList: Array<{
    id: string;
    name: string;
    branch: string;
    region: string;
    isActive: boolean;
    incidentCount: number;
  }>;
}

export default function ATMIntelligenceReport() {
  const { data: session } = useSession();
  const [data, setData] = useState<ATMIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });
      
      if (selectedBranch !== 'all') {
        params.append('branchId', selectedBranch);
      }
      
      const response = await fetch(`/api/reports/infrastructure/atm-intelligence?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching ATM intelligence data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!data) return;
    
    const exportData = {
      reportTitle: 'ATM Intelligence Report',
      dateRange: `${startDate} to ${endDate}`,
      ...data,
      generatedAt: new Date().toISOString()
    };

    if (format === 'xlsx') {
      console.log('Exporting to Excel:', exportData);
    } else if (format === 'pdf') {
      console.log('Exporting to PDF:', exportData);
    } else if (format === 'csv') {
      console.log('Exporting to CSV:', exportData);
    }
  };

  useEffect(() => {
    if (session?.user && ['TECHNICIAN', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      fetchData();
    }
  }, [session, startDate, endDate, selectedBranch]);

  if (!session) {
    return <div className="p-6">Please log in to view this report.</div>;
  }

  if (!['TECHNICIAN', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
    return (
      <div className="p-6">
        <div className="text-center">
          <Monitor className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to view this report.
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
    incidentTrends: data.trends?.dailyIncidents?.map(item => ({
      date: item.date,
      value: item.count,
      label: 'Incidents'
    })) || [],
    incidentTypes: Object.entries(data.distributions?.byType || {}).map(([type, count]) => ({
      name: type,
      value: count
    })),
    priorityDistribution: Object.entries(data.distributions?.byPriority || {}).map(([priority, count]) => ({
      name: priority,
      value: count
    })),
    resolutionTrends: data.trends?.resolutionTimes?.slice(-30).map((time, index) => ({
      date: new Date(Date.now() - (29 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: time
    })) || []
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ATM Infrastructure Intelligence</h1>
          <p className="text-gray-600 mt-1">
            ATM health, incident correlation, and maintenance optimization
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton 
            onExport={handleExport} 
            reportName="ATM Intelligence Report"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {Object.keys(data.distributions?.byBranch || {}).map(branch => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <CardTitle className="text-sm font-medium">Total ATMs</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalAtms}</div>
            <p className="text-xs text-muted-foreground">
              {data.atmList?.filter(atm => atm.isActive).length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.criticalIncidents} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.healthScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Health Score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.healthScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Overall health index
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Incident Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.incidentTrends}
              type="line"
              title="Daily Incidents"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts 
              data={chartData.incidentTypes}
              type="pie"
              title="Incidents by Type"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Problematic ATMs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.atmList?.sort((a, b) => b.incidentCount - a.incidentCount).slice(0, 5).map((atm, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{atm.name}</div>
                    <div className="text-sm text-gray-500">{atm.branch}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{atm.incidentCount}</div>
                    <div className="text-xs text-gray-500">incidents</div>
                  </div>
                </div>
              )) || []}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.distributions?.byRegion || {}).slice(0, 5).map(([region, stats], index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{region}</div>
                    <div className="text-sm text-gray-500">{stats.atmCount} ATMs</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{stats.avgResolutionHours.toFixed(1)}h</div>
                    <div className="text-xs text-gray-500">avg resolution</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentIncidents.slice(0, 10).map((incident, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{incident.title}</div>
                  <div className="text-sm text-gray-500">
                    {incident.branch}
                    {incident.category && ` • ${incident.category}`}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={incident.priority === 'HIGH' || incident.priority === 'URGENT' ? 'destructive' : 'secondary'}
                  >
                    {incident.priority}
                  </Badge>
                  <Badge variant="outline">{incident.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}