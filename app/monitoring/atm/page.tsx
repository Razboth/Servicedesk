'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertTriangle,
  RefreshCw,
  WifiOff,
  Clock,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wifi,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NetworkStatus {
  networkStatus: string;
  responseTimeMs: number | null;
  packetLoss: number | null;
  errorMessage: string | null;
  checkedAt: string;
  statusChangedAt: string | null;
  downSince: string | null;
}

interface ATM {
  id: string;
  code: string;
  name: string;
  location?: string;
  ipAddress?: string;
  isActive: boolean;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    incidents: number;
  };
  networkStatus?: NetworkStatus | null;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  ONLINE: 'bg-green-100 text-green-800',
  OFFLINE: 'bg-red-100 text-red-800',
  SLOW: 'bg-yellow-100 text-yellow-800',
  TIMEOUT: 'bg-orange-100 text-orange-800',
  ERROR: 'bg-red-100 text-red-800',
  WARNING: 'bg-amber-100 text-amber-800',
  MAINTENANCE: 'bg-blue-100 text-blue-800',
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'ONLINE':
      return <Wifi className="h-4 w-4 text-green-600" />;
    case 'OFFLINE':
      return <WifiOff className="h-4 w-4 text-red-600" />;
    case 'SLOW':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'TIMEOUT':
      return <XCircle className="h-4 w-4 text-orange-600" />;
    case 'ERROR':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'WARNING':
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    case 'MAINTENANCE':
      return <Activity className="h-4 w-4 text-blue-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
};

export default function ATMStatusPage() {
  const [atms, setATMs] = useState<ATM[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    offline: 0,
    slow: 0,
    timeout: 0,
    error: 0,
    warning: 0,
    maintenance: 0,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchATMs();
  }, [search, selectedBranch, statusFilter, pagination.page]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchATMs(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, search, selectedBranch, statusFilter, pagination.page]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/admin/branches?limit=100&status=active');
      if (!response.ok) throw new Error('Failed to fetch branches');
      const data = await response.json();
      setBranches(data.branches);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchATMs = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        problemsOnly: 'true',
        includeNetworkStatus: 'true',
        ...(search && { search }),
        ...(selectedBranch !== 'all' && { branchId: selectedBranch }),
      });

      const response = await fetch(`/api/admin/atms?${params}`);
      if (!response.ok) throw new Error('Failed to fetch ATMs');

      const data = await response.json();

      // Filter by specific status if selected
      let filteredAtms = data.atms;
      if (statusFilter !== 'all') {
        filteredAtms = data.atms.filter((atm: ATM) =>
          atm.networkStatus?.networkStatus === statusFilter
        );
      }

      setATMs(filteredAtms);
      setPagination(data.pagination);
      setLastUpdated(new Date());

      // Calculate stats from all problem ATMs
      const newStats = {
        total: data.pagination.total,
        offline: data.atms.filter((a: ATM) => a.networkStatus?.networkStatus === 'OFFLINE').length,
        slow: data.atms.filter((a: ATM) => a.networkStatus?.networkStatus === 'SLOW').length,
        timeout: data.atms.filter((a: ATM) => a.networkStatus?.networkStatus === 'TIMEOUT').length,
        error: data.atms.filter((a: ATM) => a.networkStatus?.networkStatus === 'ERROR').length,
        warning: data.atms.filter((a: ATM) => a.networkStatus?.networkStatus === 'WARNING').length,
        maintenance: data.atms.filter((a: ATM) => a.networkStatus?.networkStatus === 'MAINTENANCE').length,
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching ATMs:', error);
      if (!silent) {
        toast.error('Failed to load ATM status data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, search, selectedBranch, statusFilter]);

  const handleManualRefresh = () => {
    fetchATMs(true);
    toast.success('Data refreshed');
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDuration = (dateString: string | null) => {
    if (!dateString) return '-';
    const start = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - start.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            ATM Status Monitor
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time ATM network status from external monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Auto-refresh</span>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
          <Button onClick={handleManualRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">Total Problems</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-700">{stats.offline}</span>
            </div>
            <p className="text-xs text-red-600">Offline</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-700">{stats.timeout}</span>
            </div>
            <p className="text-xs text-orange-600">Timeout</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-700">{stats.slow}</span>
            </div>
            <p className="text-xs text-yellow-600">Slow</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-700">{stats.error}</span>
            </div>
            <p className="text-xs text-red-600">Error</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold text-amber-700">{stats.warning}</span>
            </div>
            <p className="text-xs text-amber-600">Warning</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-700">{stats.maintenance}</span>
            </div>
            <p className="text-xs text-blue-600">Maintenance</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Filters</CardTitle>
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by ATM code, name, or location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Problems</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
                <SelectItem value="TIMEOUT">Timeout</SelectItem>
                <SelectItem value="SLOW">Slow</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading ATM status...</span>
            </div>
          ) : atms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-green-700">All ATMs Online</h3>
              <p className="text-gray-500 mt-2">
                No ATM problems detected. All systems operating normally.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ATM</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Response</TableHead>
                    <TableHead className="text-center">Packet Loss</TableHead>
                    <TableHead>Down Since</TableHead>
                    <TableHead>Last Check</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atms.map((atm) => (
                    <TableRow key={atm.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{atm.code}</div>
                          <div className="text-sm text-gray-500">{atm.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{atm.branch.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {atm.location || '-'}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-gray-600">
                        {atm.ipAddress || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {atm.networkStatus ? (
                          <Badge className={`${statusColors[atm.networkStatus.networkStatus] || 'bg-gray-100 text-gray-800'}`}>
                            <StatusIcon status={atm.networkStatus.networkStatus} />
                            <span className="ml-1">{atm.networkStatus.networkStatus}</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline">Unknown</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {atm.networkStatus?.responseTimeMs != null ? (
                          <span className={`font-mono text-sm ${
                            atm.networkStatus.responseTimeMs > 500 ? 'text-red-600' :
                            atm.networkStatus.responseTimeMs > 200 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {atm.networkStatus.responseTimeMs}ms
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {atm.networkStatus?.packetLoss != null ? (
                          <span className={`font-mono text-sm ${
                            atm.networkStatus.packetLoss > 50 ? 'text-red-600' :
                            atm.networkStatus.packetLoss > 10 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {atm.networkStatus.packetLoss}%
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {atm.networkStatus?.downSince ? (
                          <div>
                            <div className="text-sm font-medium text-red-600">
                              {formatDuration(atm.networkStatus.downSince)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(atm.networkStatus.downSince)}
                            </div>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatTime(atm.networkStatus?.checkedAt || null)}
                      </TableCell>
                      <TableCell>
                        {atm.networkStatus?.errorMessage ? (
                          <span className="text-sm text-red-600 max-w-[200px] truncate block" title={atm.networkStatus.errorMessage}>
                            {atm.networkStatus.errorMessage}
                          </span>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} ATMs with problems
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
