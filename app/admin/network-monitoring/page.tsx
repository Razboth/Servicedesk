'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Server,
  Building2,
  Loader2,
  Wifi,
  WifiOff,
  Globe,
  Ticket,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Radio,
  Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NetworkEndpoint {
  id: string;
  type: 'BRANCH' | 'ATM';
  name: string;
  code: string;
  location?: string;
  ipAddress: string;
  backupIpAddress?: string;
  networkMedia?: 'VSAT' | 'M2M' | 'FO';
  networkVendor?: string;
  branchId?: string;
  branchName?: string;
  lastStatus?: {
    status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'TIMEOUT' | 'ERROR' | 'WARNING' | 'MAINTENANCE';
    responseTimeMs?: number;
    checkedAt: string;
    errorMessage?: string;
    packetLoss?: number;
    previousStatus?: string;
    statusChangedAt?: string;
    downSince?: string;
    uptimePercentage?: number;
  };
}

interface NetworkStats {
  total: number;
  online: number;
  offline: number;
  slow: number;
  error: number;
  avgResponseTime: number;
  lastRefresh: string;
}

export default function NetworkMonitoringPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Core data
  const [endpoints, setEndpoints] = useState<NetworkEndpoint[]>([]);
  const [stats, setStats] = useState<NetworkStats>({
    total: 0,
    online: 0,
    offline: 0,
    slow: 0,
    error: 0,
    avgResponseTime: 0,
    lastRefresh: new Date().toISOString()
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Load initial data and set up auto-refresh
  useEffect(() => {
    loadEndpoints();

    // Auto-refresh interval
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadEndpoints(true);
      }, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const loadEndpoints = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch('/api/admin/network-monitoring/endpoints?includeStatus=true');
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data.endpoints);
        calculateStats(data.endpoints);
      } else {
        toast.error('Failed to load network status');
      }
    } catch (error) {
      console.error('Error loading endpoints:', error);
      toast.error('Error loading network status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStats = (endpointList: NetworkEndpoint[]) => {
    const total = endpointList.length;
    let online = 0;
    let offline = 0;
    let slow = 0;
    let error = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    endpointList.forEach((endpoint) => {
      const status = endpoint.lastStatus?.status;
      switch (status) {
        case 'ONLINE':
          online++;
          break;
        case 'OFFLINE':
        case 'TIMEOUT':
          offline++;
          break;
        case 'SLOW':
        case 'WARNING':
          slow++;
          break;
        case 'ERROR':
        case 'MAINTENANCE':
          error++;
          break;
      }

      if (endpoint.lastStatus?.responseTimeMs && endpoint.lastStatus.responseTimeMs > 0) {
        totalResponseTime += endpoint.lastStatus.responseTimeMs;
        responseTimeCount++;
      }
    });

    setStats({
      total,
      online,
      offline,
      slow,
      error,
      avgResponseTime: responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0,
      lastRefresh: new Date().toISOString()
    });
  };

  const createNetworkTicket = async (endpoint: NetworkEndpoint) => {
    try {
      const response = await fetch('/api/admin/network-monitoring/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointId: endpoint.id,
          endpointType: endpoint.type,
          incidentType: endpoint.lastStatus?.status || 'OUTAGE',
          pingResult: endpoint.lastStatus
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Network ticket created: ${data.ticket.id.slice(-8)}`);
      } else {
        const error = await response.json();
        toast.error(`Failed to create ticket: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating network ticket:', error);
      toast.error('Failed to create network ticket');
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'ONLINE':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'SLOW':
      case 'WARNING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'OFFLINE':
      case 'TIMEOUT':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'ERROR':
      case 'MAINTENANCE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Radio className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-100 text-green-800 border-green-200';
      case 'SLOW':
      case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'OFFLINE':
      case 'TIMEOUT': return 'bg-red-100 text-red-800 border-red-200';
      case 'ERROR':
      case 'MAINTENANCE': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getResponseTimeColor = (responseTime?: number) => {
    if (!responseTime) return 'text-gray-500';
    if (responseTime < 100) return 'text-green-600';
    if (responseTime < 300) return 'text-yellow-600';
    if (responseTime < 1000) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTimeAgo = (dateString?: string): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const isStale = (dateString?: string): boolean => {
    if (!dateString) return true;
    const date = new Date(dateString);
    const minutes = (Date.now() - date.getTime()) / 1000 / 60;
    return minutes > 10; // Consider stale if no update in 10 minutes
  };

  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch = searchTerm === '' ||
      endpoint.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (endpoint.location && endpoint.location.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'all' || endpoint.type === typeFilter;

    const status = endpoint.lastStatus?.status?.toLowerCase() || '';
    const matchesStatus = statusFilter === 'all' ||
      status === statusFilter.toLowerCase() ||
      (statusFilter === 'offline' && (status === 'offline' || status === 'timeout')) ||
      (statusFilter === 'error' && (status === 'error' || status === 'maintenance'));

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading network status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Wifi className="h-8 w-8" />
                Network Monitoring Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Real-time status from external monitoring systems
              </p>
            </div>

            {/* Status Panel */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                  <Radio className="h-3 w-3" />
                  PASSIVE MODE
                </Badge>

                <div className="border-l pl-4 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Auto-refresh:</span>
                  <Select
                    value={autoRefresh ? refreshInterval.toString() : 'off'}
                    onValueChange={(val) => {
                      if (val === 'off') {
                        setAutoRefresh(false);
                      } else {
                        setAutoRefresh(true);
                        setRefreshInterval(parseInt(val));
                      }
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="10000">10s</SelectItem>
                      <SelectItem value="30000">30s</SelectItem>
                      <SelectItem value="60000">1m</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadEndpoints(true)}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Last updated: {formatTimeAgo(stats.lastRefresh)}
              </div>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Online</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.online}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.total > 0 ? ((stats.online / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Offline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Slow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.slow}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getResponseTimeColor(stats.avgResponseTime)}`}>
                {stats.avgResponseTime}ms
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by code, name, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BRANCH">Branches</SelectItem>
                  <SelectItem value="ATM">ATMs</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEndpoints.map((endpoint) => {
            const status = endpoint.lastStatus;
            const stale = isStale(status?.checkedAt);

            return (
              <Card
                key={endpoint.id}
                className={`hover:shadow-lg transition-all ${
                  stale ? 'border-gray-300 opacity-75' :
                  status?.status === 'OFFLINE' || status?.status === 'TIMEOUT' ? 'border-red-300' :
                  status?.status === 'ONLINE' ? 'border-green-300' :
                  status?.status === 'SLOW' || status?.status === 'WARNING' ? 'border-yellow-300' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      {endpoint.type === 'BRANCH' ? (
                        <Building2 className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Server className="h-5 w-5 text-purple-600" />
                      )}
                      {endpoint.code}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      {stale && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          Stale
                        </Badge>
                      )}
                      {status && (
                        <Badge className={`${getStatusColor(status.status)} text-xs`}>
                          {status.status}
                        </Badge>
                      )}
                      {!status && (
                        <Badge variant="secondary" className="text-xs">
                          No Data
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {endpoint.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">IP Address:</span>
                      <span className="font-mono text-xs">{endpoint.ipAddress || 'N/A'}</span>
                    </div>

                    {endpoint.networkMedia && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Network:</span>
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          {endpoint.networkMedia}
                        </Badge>
                      </div>
                    )}

                    {endpoint.branchName && endpoint.type === 'ATM' && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Branch:</span>
                        <span className="text-xs">{endpoint.branchName}</span>
                      </div>
                    )}

                    {status && (
                      <>
                        {status.responseTimeMs !== undefined && status.responseTimeMs > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Response:</span>
                            <span className={`font-medium ${getResponseTimeColor(status.responseTimeMs)}`}>
                              {status.responseTimeMs}ms
                            </span>
                          </div>
                        )}

                        {status.packetLoss !== undefined && status.packetLoss > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Packet Loss:</span>
                            <span className="font-medium text-red-600">
                              {status.packetLoss.toFixed(1)}%
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Last Update:</span>
                          <span className={`text-xs ${stale ? 'text-orange-600' : ''}`}>
                            {formatTimeAgo(status.checkedAt)}
                          </span>
                        </div>

                        {status.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {status.errorMessage}
                          </div>
                        )}
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-3 pt-2 border-t flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => {
                          if (endpoint.type === 'BRANCH') {
                            router.push(`/admin/branches/${endpoint.id}`);
                          } else {
                            router.push(`/admin/atms/${endpoint.id}`);
                          }
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Details
                      </Button>

                      {status && ['OFFLINE', 'SLOW', 'TIMEOUT', 'ERROR', 'WARNING'].includes(status.status) && (
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1 text-xs bg-red-600 hover:bg-red-700"
                          onClick={() => createNetworkTicket(endpoint)}
                        >
                          <Ticket className="h-3 w-3 mr-1" />
                          Create Ticket
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredEndpoints.length === 0 && (
          <div className="text-center py-12">
            <Wifi className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No endpoints found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
