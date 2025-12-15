'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import {
  Shield,
  AlertTriangle,
  Bug,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  summary: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    pendingTickets: number;
    socTickets: number;
    antivirusTickets: number;
    avgResolutionHours: number;
  };
  priorityDistribution: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  statusDistribution: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    pending: number;
  };
  trendData: Array<{ date: string; count: number }>;
  serviceData: Array<{ name: string; value: number }>;
  socSeverityData: Array<{ priority: string; count: number }>;
  recentTickets: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
    service: string;
    assignedTo: string;
    createdAt: string;
  }>;
  antivirusTickets: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
  period: number;
  supportGroup: string;
}

export default function SecurityReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!['SECURITY_ANALYST', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      toast.error('Access denied. Security Operations team only.');
      router.push('/');
      return;
    }

    fetchDashboardData();
  }, [session, status, router, period]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/security/reports/dashboard?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load security reports');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'default';
      case 'IN_PROGRESS': return 'warning';
      case 'RESOLVED': return 'success';
      case 'CLOSED': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 dark:bg-brown-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brown-400 dark:text-brown-200" />
          <span className="text-brown-700 dark:text-cream-200">Loading security reports...</span>
        </div>
      </div>
    );
  }

  // Chart configurations
  const trendChartData = {
    labels: data?.trendData.map(d => d.date) || [],
    datasets: [
      {
        label: 'Security Tickets',
        data: data?.trendData.map(d => d.count) || [],
        borderColor: 'rgb(220, 38, 38)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const statusChartData = {
    labels: ['Open', 'In Progress', 'Resolved', 'Closed', 'Pending'],
    datasets: [
      {
        data: [
          data?.statusDistribution.open || 0,
          data?.statusDistribution.inProgress || 0,
          data?.statusDistribution.resolved || 0,
          data?.statusDistribution.closed || 0,
          data?.statusDistribution.pending || 0
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(107, 114, 128, 0.8)',
          'rgba(249, 115, 22, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  };

  const priorityChartData = {
    labels: ['Urgent', 'High', 'Medium', 'Low'],
    datasets: [
      {
        label: 'Tickets by Priority',
        data: [
          data?.priorityDistribution.urgent || 0,
          data?.priorityDistribution.high || 0,
          data?.priorityDistribution.medium || 0,
          data?.priorityDistribution.low || 0
        ],
        backgroundColor: [
          'rgba(220, 38, 38, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  };

  const serviceChartData = {
    labels: data?.serviceData.map(s => s.name) || [],
    datasets: [
      {
        label: 'Tickets',
        data: data?.serviceData.map(s => s.value) || [],
        backgroundColor: 'rgba(220, 38, 38, 0.8)',
        borderColor: 'rgb(220, 38, 38)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-brown-950">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <PageHeader
          title="Security Reports"
          description="Security Operations Center analytics and incident tracking"
          icon={<Shield className="h-6 w-6" />}
          action={
            <div className="flex items-center gap-3">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[150px] bg-white dark:bg-warm-dark-200">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchDashboardData}
                className="border-brown-400 dark:border-brown-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">SOC Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{data?.summary.socTickets || 0}</div>
                <Shield className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Antivirus Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{data?.summary.antivirusTickets || 0}</div>
                <Bug className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{data?.summary.totalTickets || 0}</div>
                <FileText className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Avg Resolution Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{data?.summary.avgResolutionHours || 0}h</div>
                <Clock className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Open</p>
                  <p className="text-xl font-bold">{data?.summary.openTickets || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                  <p className="text-xl font-bold">{data?.summary.inProgressTickets || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                  <p className="text-xl font-bold">{data?.summary.resolvedTickets || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Closed</p>
                  <p className="text-xl font-bold">{data?.summary.closedTickets || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold">{data?.summary.pendingTickets || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Trend Chart */}
          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Ticket Trend
              </CardTitle>
              <CardDescription>Security tickets over the last {period} days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Line data={trendChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Status Distribution
              </CardTitle>
              <CardDescription>Tickets by current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Doughnut data={statusChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Priority Distribution */}
          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Priority Distribution
              </CardTitle>
              <CardDescription>Tickets by priority level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Pie data={priorityChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>

          {/* Top Services */}
          <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Services
              </CardTitle>
              <CardDescription>Most frequently used services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Bar
                  data={serviceChartData}
                  options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: { display: false }
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tickets Table */}
        <Card className="bg-cream-50 dark:bg-warm-dark-300 border-cream-500 dark:border-warm-dark-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Security Tickets
            </CardTitle>
            <CardDescription>Latest tickets in your support group</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.recentTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No tickets found in the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.recentTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {ticket.ticketNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{ticket.title}</TableCell>
                      <TableCell>{ticket.service}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{ticket.assignedTo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString('id-ID')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
