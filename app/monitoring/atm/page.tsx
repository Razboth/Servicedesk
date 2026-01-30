'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BranchSelect } from '@/components/ui/branch-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  MapPin,
  Network,
  TrendingDown,
  Calendar,
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

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  ONLINE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  OFFLINE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  SLOW: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  TIMEOUT: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  ERROR: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  WARNING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MAINTENANCE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'ONLINE':
      return <Wifi className="h-5 w-5 text-green-600" />;
    case 'OFFLINE':
      return <WifiOff className="h-5 w-5 text-red-600" />;
    case 'SLOW':
      return <Clock className="h-5 w-5 text-yellow-600" />;
    case 'TIMEOUT':
      return <XCircle className="h-5 w-5 text-orange-600" />;
    case 'ERROR':
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case 'WARNING':
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    case 'MAINTENANCE':
      return <Activity className="h-5 w-5 text-blue-600" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
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
  const [selectedATM, setSelectedATM] = useState<ATM | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  const handleCardClick = (atm: ATM) => {
    setSelectedATM(atm);
    setModalOpen(true);
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
      year: 'numeric',
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
            Real-time ATM network status - showing only ATMs with problems
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
            <BranchSelect
              branches={branches}
              value={selectedBranch}
              onValueChange={setSelectedBranch}
              placeholder="All Branches"
              allOption={true}
              className="w-[200px]"
            />
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

      {/* Main Content - Card Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading ATM status...</span>
        </div>
      ) : atms.length === 0 ? (
        <Card>
          <CardContent className="p-16">
            <div className="flex flex-col items-center justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-green-700">All ATMs Online</h3>
              <p className="text-gray-500 mt-2">
                No ATM problems detected. All systems operating normally.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ATM Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {atms.map((atm) => {
              const status = atm.networkStatus?.networkStatus || 'UNKNOWN';
              const colorScheme = statusColors[status] || statusColors.OFFLINE;

              return (
                <Card
                  key={atm.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 ${colorScheme.border} ${colorScheme.bg}`}
                  onClick={() => handleCardClick(atm)}
                >
                  <CardContent className="p-5">
                    {/* Header with Status Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{atm.code}</h3>
                        <p className="text-sm text-gray-600 line-clamp-1">{atm.name}</p>
                      </div>
                      <Badge className={`${colorScheme.bg} ${colorScheme.text} border ${colorScheme.border} flex items-center gap-1`}>
                        <StatusIcon status={status} />
                        <span className="font-semibold">{status}</span>
                      </Badge>
                    </div>

                    {/* Branch */}
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-700">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{atm.branch.name}</span>
                    </div>

                    {/* IP Address */}
                    {atm.ipAddress && (
                      <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                        <Network className="h-4 w-4 text-gray-500" />
                        <span className="font-mono">{atm.ipAddress}</span>
                      </div>
                    )}

                    {/* Down Duration */}
                    {atm.networkStatus?.downSince && (
                      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-100 rounded-lg border border-red-200">
                        <Clock className="h-4 w-4 text-red-600" />
                        <div className="flex-1">
                          <p className="text-xs text-red-600 font-medium">Down for</p>
                          <p className="text-sm font-bold text-red-700">
                            {formatDuration(atm.networkStatus.downSince)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500">Response Time</p>
                        <p className={`text-sm font-bold ${
                          atm.networkStatus?.responseTimeMs == null ? 'text-gray-400' :
                          atm.networkStatus.responseTimeMs > 500 ? 'text-red-600' :
                          atm.networkStatus.responseTimeMs > 200 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {atm.networkStatus?.responseTimeMs != null
                            ? `${atm.networkStatus.responseTimeMs}ms`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Packet Loss</p>
                        <p className={`text-sm font-bold ${
                          atm.networkStatus?.packetLoss == null ? 'text-gray-400' :
                          atm.networkStatus.packetLoss > 50 ? 'text-red-600' :
                          atm.networkStatus.packetLoss > 10 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {atm.networkStatus?.packetLoss != null
                            ? `${atm.networkStatus.packetLoss}%`
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          {selectedATM && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{selectedATM.code}</div>
                    <div className="text-sm font-normal text-gray-600 mt-1">
                      {selectedATM.name}
                    </div>
                  </div>
                  {selectedATM.networkStatus && (
                    <Badge className={`${statusColors[selectedATM.networkStatus.networkStatus]?.bg || 'bg-gray-100'} ${statusColors[selectedATM.networkStatus.networkStatus]?.text || 'text-gray-800'} border-2 ${statusColors[selectedATM.networkStatus.networkStatus]?.border || 'border-gray-300'} text-base px-4 py-2`}>
                      <StatusIcon status={selectedATM.networkStatus.networkStatus} />
                      <span className="ml-2 font-bold">{selectedATM.networkStatus.networkStatus}</span>
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Complete ATM network status and diagnostic information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Branch</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedATM.branch.name}</p>
                        <p className="text-xs text-gray-500 font-mono">Code: {selectedATM.branch.code}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Network className="h-5 w-5 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">IP Address</p>
                        <p className="text-sm font-semibold font-mono text-gray-900">
                          {selectedATM.ipAddress || 'Not available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedATM.location && (
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Location</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedATM.location}</p>
                    </div>
                  </div>
                )}

                {/* Network Status Details */}
                {selectedATM.networkStatus && (
                  <>
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">Network Metrics</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium mb-1">Response Time</p>
                          <p className={`text-2xl font-bold ${
                            selectedATM.networkStatus.responseTimeMs == null ? 'text-gray-400' :
                            selectedATM.networkStatus.responseTimeMs > 500 ? 'text-red-600' :
                            selectedATM.networkStatus.responseTimeMs > 200 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {selectedATM.networkStatus.responseTimeMs != null
                              ? `${selectedATM.networkStatus.responseTimeMs}ms`
                              : 'N/A'}
                          </p>
                          {selectedATM.networkStatus.responseTimeMs != null && (
                            <p className="text-xs text-gray-600 mt-1">
                              {selectedATM.networkStatus.responseTimeMs > 500 ? 'Very Slow' :
                               selectedATM.networkStatus.responseTimeMs > 200 ? 'Slow' : 'Good'}
                            </p>
                          )}
                        </div>

                        <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                          <p className="text-xs text-purple-600 font-medium mb-1">Packet Loss</p>
                          <p className={`text-2xl font-bold ${
                            selectedATM.networkStatus.packetLoss == null ? 'text-gray-400' :
                            selectedATM.networkStatus.packetLoss > 50 ? 'text-red-600' :
                            selectedATM.networkStatus.packetLoss > 10 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {selectedATM.networkStatus.packetLoss != null
                              ? `${selectedATM.networkStatus.packetLoss}%`
                              : 'N/A'}
                          </p>
                          {selectedATM.networkStatus.packetLoss != null && (
                            <p className="text-xs text-gray-600 mt-1">
                              {selectedATM.networkStatus.packetLoss > 50 ? 'Critical' :
                               selectedATM.networkStatus.packetLoss > 10 ? 'Warning' : 'Good'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Downtime Information */}
                    {selectedATM.networkStatus.downSince && (
                      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="h-5 w-5 text-red-600" />
                          <h4 className="font-semibold text-red-700">Downtime Information</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-red-600 font-medium">Down Since</p>
                            <p className="text-sm font-semibold text-red-800">
                              {formatTime(selectedATM.networkStatus.downSince)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-red-600 font-medium">Duration</p>
                            <p className="text-sm font-bold text-red-800">
                              {formatDuration(selectedATM.networkStatus.downSince)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {selectedATM.networkStatus.errorMessage && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-amber-600 font-medium mb-1">Error Message</p>
                            <p className="text-sm text-amber-900 font-mono">
                              {selectedATM.networkStatus.errorMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">Monitoring Timestamps</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                          <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Last Checked</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatTime(selectedATM.networkStatus.checkedAt)}
                            </p>
                          </div>
                        </div>
                        {selectedATM.networkStatus.statusChangedAt && (
                          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                            <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Status Changed</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatTime(selectedATM.networkStatus.statusChangedAt)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Additional Info */}
                <div className="flex items-center justify-between pt-3 border-t text-xs text-gray-500">
                  <span>ATM ID: {selectedATM.id}</span>
                  <span>Status: {selectedATM.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
