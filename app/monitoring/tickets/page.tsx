'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/tickets/data-table/data-table';
import { Bot, RefreshCw, Download, Search, Filter, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TicketStats {
  summary: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    autoResolvedTickets: number;
    resolutionRate: number;
    autoResolutionRate: number;
    avgResolutionTime: number;
  };
  breakdowns: {
    channels: Array<{ channel: string; count: number }>;
    priorities: Array<{ priority: string; _count: { id: number } }>;
    topServices: Array<{ serviceId: string; serviceName: string; _count: { id: number } }>;
  };
  trends: {
    hourly: Array<{ hour: number; count: number }>;
  };
  period: {
    range: string;
    startDate: string;
    endDate: string;
  };
}

interface ApiTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  apiSource: string;
  autoResolved: boolean;
  resolutionTime?: number;
  channelInfo: {
    channel: string;
    referenceId?: string;
    serviceType?: string;
    originalChannel?: string;
  };
  service: {
    name: string;
    supportGroup?: {
      name: string;
    };
  };
  branch?: {
    name: string;
    code: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  assignedTo?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  _count: {
    comments: number;
  };
}

export default function AutoTicketsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [apiSourceFilter, setApiSourceFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState('today');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 10;

  // Fetch statistics
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch(`/api/monitoring/tickets/stats?dateRange=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
        ...(apiSourceFilter && { apiSource: apiSourceFilter })
      });

      const response = await fetch(`/api/monitoring/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchTickets()]);
    setRefreshing(false);
  };

  // Effect hooks
  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  useEffect(() => {
    fetchTickets();
  }, [page, search, statusFilter, priorityFilter, apiSourceFilter]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      if (page === 1) {
        fetchTickets();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [page, search, statusFilter, priorityFilter, apiSourceFilter, dateRange]);

  // Export function
  const handleExport = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      const params = new URLSearchParams({
        format,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
        ...(apiSourceFilter && { apiSource: apiSourceFilter })
      });

      const response = await fetch(`/api/monitoring/tickets/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `api-tickets-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting tickets:', error);
    }
  };

  // Table columns
  const columns = [
    {
      accessorKey: 'ticketNumber',
      header: 'Ticket #',
      cell: ({ row }: any) => (
        <div className="font-medium">{row.original.ticketNumber}</div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }: any) => (
        <div className="max-w-[200px] truncate">{row.original.title}</div>
      ),
    },
    {
      accessorKey: 'apiSource',
      header: 'API Source',
      cell: ({ row }: any) => {
        const source = row.original.apiSource;
        const color = source === 'omnichannel' ? 'blue' :
                      source === 'atm-claim' ? 'orange' : 'green';
        return (
          <Badge variant="outline" className={`text-${color}-600 border-${color}-200`}>
            {source}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.status;
        const color = status === 'OPEN' ? 'blue' :
                      status === 'IN_PROGRESS' ? 'yellow' :
                      status === 'RESOLVED' ? 'green' : 'gray';
        return (
          <Badge variant="outline" className={`text-${color}-600 border-${color}-200`}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }: any) => {
        const priority = row.original.priority;
        const color = priority === 'URGENT' ? 'red' :
                      priority === 'HIGH' ? 'orange' :
                      priority === 'MEDIUM' ? 'yellow' : 'gray';
        return (
          <Badge variant="outline" className={`text-${color}-600 border-${color}-200`}>
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }: any) => (
        <div className="max-w-[150px] truncate">
          {row.original.customerName || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: 'autoResolved',
      header: 'Auto-Resolved',
      cell: ({ row }: any) => (
        <div className="flex items-center">
          {row.original.autoResolved ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-gray-400" />
          )}
        </div>
      ),
    },
    {
      accessorKey: 'resolutionTime',
      header: 'Resolution Time',
      cell: ({ row }: any) => {
        const time = row.original.resolutionTime;
        return time ? `${time}m` : '-';
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }: any) => (
        <div className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
        </div>
      ),
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-8 w-8" />
            API Ticket Monitoring
            {!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') && session?.user?.branchName && (
              <Badge variant="outline" className="text-sm font-normal">
                {session.user.branchName}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            Monitor tickets submitted via API including omnichannel integrations, ATM claims, and direct API calls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total API Tickets</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : stats?.summary.totalTickets || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dateRange === 'today' ? 'Today' :
               dateRange === 'week' ? 'This week' :
               dateRange === 'month' ? 'This month' : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '-' : stats?.summary.autoResolvedTickets || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? '-' : stats?.summary.autoResolutionRate || 0}% auto-resolution rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? '-' : stats?.summary.openTickets || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting resolution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '-' : `${stats?.summary.avgResolutionTime || 0}m`}
            </div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All priorities</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={apiSourceFilter} onValueChange={setApiSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All API sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sources</SelectItem>
                <SelectItem value="omnichannel">Omnichannel</SelectItem>
                <SelectItem value="atm-claim">ATM Claims</SelectItem>
                <SelectItem value="direct-api">Direct API</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => {
              setSearch('');
              setStatusFilter('');
              setPriorityFilter('');
              setApiSourceFilter('');
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>API Tickets</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tickets}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}