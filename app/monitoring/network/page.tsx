'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Globe,
  History,
  List,
  Map,
  MapPin,
  Phone,
  RefreshCw,
  Router,
  Search,
  Server,
  Signal,
  SignalLow,
  SignalZero,
  Timer,
  Wifi,
  WifiOff,
  XCircle,
  Printer,
  HardDrive,
  DoorOpen,
  AlertCircle,
} from 'lucide-react';

// Dynamically import map component to avoid SSR issues
const NetworkMap = dynamic(
  () => import('@/components/monitoring/network-map'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-muted/50 rounded-lg">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

const DetailMap = dynamic(
  () => import('@/components/monitoring/network-map'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] flex items-center justify-center bg-muted/50 rounded-lg">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

interface CurrentAlarm {
  id: string;
  deviceId: string;
  alarmType: string;
  location: string;
  occurredAt: string;
  timeAgo: string | null;
}

interface NetworkEndpoint {
  id: string;
  type: 'BRANCH' | 'ATM';
  name: string;
  code: string;
  ipAddress: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'ERROR' | 'STALE' | 'UNKNOWN';
  responseTime: number | null;
  packetLoss: number | null;
  lastChecked: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  networkMedia: string | null;
  networkVendor: string | null;
  hasActiveIncident: boolean;
  activeIncident: any;
  // Branch specific
  city?: string;
  backupIpAddress?: string;
  // ATM specific
  branch?: { name: string; code: string } | null;
  // Alarm data (for ATMs)
  alarmStatus?: 'ONLINE' | 'ALARM';
  currentAlarms?: CurrentAlarm[];
}

interface AlarmTypeBreakdown {
  alarmType: string;
  count: number;
}

interface HistoryRecord {
  id: string;
  deviceId: string;
  alarmType: string;
  location: string;
  occurredAt: string;
  clearedAt: string | null;
  duration: number | null;
}

// Map icons
const getAlarmIcon = (alarmType: string) => {
  const type = alarmType.toLowerCase();
  if (type.includes('communication') || type.includes('offline')) return <WifiOff className="h-4 w-4" />;
  if (type.includes('printer') || type.includes('receipt')) return <Printer className="h-4 w-4" />;
  if (type.includes('cash') || type.includes('cassette')) return <HardDrive className="h-4 w-4" />;
  if (type.includes('mcrw') || type.includes('card')) return <CreditCard className="h-4 w-4" />;
  if (type.includes('door')) return <DoorOpen className="h-4 w-4" />;
  return <AlertCircle className="h-4 w-4" />;
};

const getAlarmColor = (alarmType: string) => {
  const type = alarmType.toLowerCase();
  if (type.includes('communication') || type.includes('offline')) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
  }
  if (type.includes('error')) {
    return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400';
  }
  return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400';
};

const getMediaIcon = (media?: string | null) => {
  switch (media) {
    case 'FO': return <Globe className="h-3 w-3 text-blue-600" />;
    case 'VSAT': return <Router className="h-3 w-3 text-purple-600" />;
    case 'M2M': return <Phone className="h-3 w-3 text-green-600" />;
    case 'HYBRID': return <Activity className="h-3 w-3 text-indigo-600" />;
    default: return <Wifi className="h-3 w-3 text-gray-600" />;
  }
};

const getConnectionStatusColor = (status: string) => {
  switch (status) {
    case 'ONLINE': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
    case 'OFFLINE': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
    case 'SLOW': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'ERROR': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
    case 'STALE': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400';
    default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

const getConnectionIcon = (status: string) => {
  switch (status) {
    case 'ONLINE': return <Signal className="h-4 w-4 text-green-600" />;
    case 'OFFLINE': return <SignalZero className="h-4 w-4 text-red-600" />;
    case 'SLOW': return <SignalLow className="h-4 w-4 text-yellow-600" />;
    case 'ERROR': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'STALE': return <Clock className="h-4 w-4 text-orange-600" />;
    default: return <Signal className="h-4 w-4 text-gray-400" />;
  }
};

export default function NetworkMonitoringPage() {
  const { data: session } = useSession();
  const [endpoints, setEndpoints] = useState<NetworkEndpoint[]>([]);
  const [alarmTypeBreakdown, setAlarmTypeBreakdown] = useState<AlarmTypeBreakdown[]>([]);
  const [lastAlarmUpdate, setLastAlarmUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [connectionFilter, setConnectionFilter] = useState('all');
  const [alarmFilter, setAlarmFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'cards'>('cards');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedEndpoint, setSelectedEndpoint] = useState<NetworkEndpoint | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<HistoryRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const isAdminOrManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(session?.user?.role || '');

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const params = new URLSearchParams();
      if (session?.user?.branchId && !isAdminOrManager) {
        params.set('branchId', session.user.branchId);
      }
      params.set('limit', '2000');

      // Fetch network status and alarm data in parallel
      const [networkResponse, alarmResponse] = await Promise.all([
        fetch(`/api/monitoring/network/status?${params}`),
        fetch('/api/monitoring/atm?limit=2000'),
      ]);

      if (!networkResponse.ok) throw new Error('Failed to fetch network data');

      const networkData = await networkResponse.json();

      // Create alarm map for quick lookup
      const alarmMap = new Map<string, any>();
      if (alarmResponse.ok) {
        const alarmData = await alarmResponse.json();
        const alarmDevices = alarmData.data?.devices || [];
        alarmDevices.forEach((device: any) => {
          alarmMap.set(device.deviceId, device);
        });
        setAlarmTypeBreakdown(alarmData.data?.summary?.alarmTypeBreakdown || []);
        setLastAlarmUpdate(alarmData.data?.lastUpdate?.receivedAt || null);
      }

      // Process branches
      const branches: NetworkEndpoint[] = (networkData.branches || []).map((branch: any) => ({
        id: branch.id,
        type: 'BRANCH' as const,
        name: branch.name,
        code: branch.code,
        ipAddress: branch.ipAddress || null,
        status: branch.status,
        responseTime: branch.responseTime,
        packetLoss: branch.packetLoss,
        lastChecked: branch.lastChecked,
        location: branch.city || null,
        latitude: branch.latitude,
        longitude: branch.longitude,
        networkMedia: branch.networkMedia,
        networkVendor: branch.networkVendor,
        hasActiveIncident: branch.hasActiveIncident,
        activeIncident: branch.activeIncident,
        city: branch.city,
        backupIpAddress: branch.backupIpAddress,
        alarmStatus: 'ONLINE',
        currentAlarms: [],
      }));

      // Process ATMs with alarm data
      const atms: NetworkEndpoint[] = (networkData.atms || []).map((atm: any) => {
        const alarmDevice = alarmMap.get(atm.code);
        return {
          id: atm.id,
          type: 'ATM' as const,
          name: atm.name,
          code: atm.code,
          ipAddress: atm.ipAddress || null,
          status: atm.status,
          responseTime: atm.responseTime,
          packetLoss: atm.packetLoss,
          lastChecked: atm.lastChecked,
          location: atm.location || null,
          latitude: atm.latitude,
          longitude: atm.longitude,
          networkMedia: atm.networkMedia,
          networkVendor: atm.networkVendor,
          hasActiveIncident: atm.hasActiveIncident,
          activeIncident: atm.activeIncident,
          branch: atm.branch,
          alarmStatus: alarmDevice?.status === 'ALARM' ? 'ALARM' : 'ONLINE',
          currentAlarms: alarmDevice?.currentAlarms || [],
        };
      });

      setEndpoints([...branches, ...atms]);
    } catch (error) {
      console.error('Error fetching network data:', error);
      if (!silent) toast.error('Failed to load network data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user, isAdminOrManager]);

  const fetchDeviceHistory = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/monitoring/atm/${deviceId}`);
      if (response.ok) {
        const data = await response.json();
        setDeviceHistory(data.data?.recentHistory || []);
      } else {
        setDeviceHistory([]);
      }
    } catch {
      setDeviceHistory([]);
    }
  };

  useEffect(() => {
    if (session?.user) fetchData();
  }, [session?.user, fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !session?.user) return;
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, session?.user, fetchData]);

  // Filter endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          ep.name.toLowerCase().includes(searchLower) ||
          ep.code.toLowerCase().includes(searchLower) ||
          ep.location?.toLowerCase().includes(searchLower) ||
          ep.ipAddress?.toLowerCase().includes(searchLower) ||
          ep.branch?.name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && ep.type !== typeFilter) return false;

      // Connection filter
      if (connectionFilter !== 'all' && ep.status !== connectionFilter) return false;

      // Alarm filter
      if (alarmFilter === 'ALARM' && ep.alarmStatus !== 'ALARM') return false;
      if (alarmFilter === 'NO_ALARM' && ep.alarmStatus === 'ALARM') return false;

      return true;
    });
  }, [endpoints, search, typeFilter, connectionFilter, alarmFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const branches = endpoints.filter((e) => e.type === 'BRANCH');
    const atms = endpoints.filter((e) => e.type === 'ATM');
    return {
      totalBranches: branches.length,
      totalATMs: atms.length,
      branchesOnline: branches.filter((e) => e.status === 'ONLINE').length,
      branchesOffline: branches.filter((e) => e.status === 'OFFLINE').length,
      atmsOnline: atms.filter((e) => e.status === 'ONLINE').length,
      atmsOffline: atms.filter((e) => e.status === 'OFFLINE').length,
      atmsSlow: atms.filter((e) => e.status === 'SLOW').length,
      atmsAlarming: atms.filter((e) => e.alarmStatus === 'ALARM').length,
      incidents: endpoints.filter((e) => e.hasActiveIncident).length,
    };
  }, [endpoints]);

  // Endpoints with coordinates for map
  const endpointsWithCoords = useMemo(() => {
    return filteredEndpoints.filter((e) => e.latitude && e.longitude);
  }, [filteredEndpoints]);

  // Map center
  const mapCenter = useMemo(() => {
    if (endpointsWithCoords.length === 0) return { lat: -0.789275, lng: 119.9 }; // Sulawesi center
    const lats = endpointsWithCoords.map((e) => e.latitude!);
    const lngs = endpointsWithCoords.map((e) => e.longitude!);
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    };
  }, [endpointsWithCoords]);

  const handleEndpointClick = async (endpoint: NetworkEndpoint) => {
    setSelectedEndpoint(endpoint);
    setModalOpen(true);
    if (endpoint.type === 'ATM' && endpoint.code) {
      await fetchDeviceHistory(endpoint.code);
    } else {
      setDeviceHistory([]);
    }
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

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatUptime = (lastChecked: string | null) => {
    if (!lastChecked) return 'N/A';
    const diffMinutes = Math.floor((Date.now() - new Date(lastChecked).getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return `${Math.floor(diffMinutes / 60)}h ago`;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Network Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time network status for all branches and ATMs
            {lastAlarmUpdate && (
              <span className="ml-2 text-sm">
                | Alarm update: {formatTime(lastAlarmUpdate)}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Auto</span>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
          <Button onClick={() => fetchData(true)} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold">{stats.totalBranches}</span>
            </div>
            <p className="text-xs text-muted-foreground">Branches</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-xl font-bold text-green-700 dark:text-green-400">{stats.branchesOnline}</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">Branch Online</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-xl font-bold text-red-700 dark:text-red-400">{stats.branchesOffline}</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">Branch Offline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <span className="text-xl font-bold">{stats.totalATMs}</span>
            </div>
            <p className="text-xs text-muted-foreground">ATMs</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Signal className="h-5 w-5 text-green-600" />
              <span className="text-xl font-bold text-green-700 dark:text-green-400">{stats.atmsOnline}</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">ATM Online</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <SignalZero className="h-5 w-5 text-red-600" />
              <span className="text-xl font-bold text-red-700 dark:text-red-400">{stats.atmsOffline}</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">ATM Offline</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <SignalLow className="h-5 w-5 text-yellow-600" />
              <span className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{stats.atmsSlow}</span>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">ATM Slow</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-xl font-bold text-red-700 dark:text-red-400">{stats.atmsAlarming}</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">ATM Alarm</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="text-xl font-bold text-orange-700 dark:text-orange-400">{stats.incidents}</span>
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">Incidents</p>
          </CardContent>
        </Card>
      </div>

      {/* Alarm Type Breakdown */}
      {alarmTypeBreakdown.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active ATM Alarms by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alarmTypeBreakdown.map((item) => (
                <Badge
                  key={item.alarmType}
                  className={`${getAlarmColor(item.alarmType)} flex items-center gap-1 cursor-pointer hover:opacity-80`}
                  onClick={() => setAlarmFilter('ALARM')}
                >
                  {getAlarmIcon(item.alarmType)}
                  <span>{item.alarmType}</span>
                  <span className="ml-1 px-1.5 py-0.5 bg-white/50 dark:bg-black/20 rounded text-xs font-bold">
                    {item.count}
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & View Toggle */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, code, IP, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="BRANCH">Branches</SelectItem>
                <SelectItem value="ATM">ATMs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={connectionFilter} onValueChange={setConnectionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Connection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
                <SelectItem value="SLOW">Slow</SelectItem>
                <SelectItem value="STALE">Stale</SelectItem>
              </SelectContent>
            </Select>
            <Select value={alarmFilter} onValueChange={setAlarmFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Alarm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alarm</SelectItem>
                <SelectItem value="ALARM">Has Alarm</SelectItem>
                <SelectItem value="NO_ALARM">No Alarm</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg p-1 bg-muted/50">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="px-3"
              >
                <Server className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                className="px-3"
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading network data...</span>
        </div>
      ) : (
        <>
          {/* Map View */}
          {viewMode === 'map' && (
            <Card className="mb-6">
              <CardContent className="p-0 overflow-hidden rounded-lg">
                <NetworkMap
                  endpoints={endpointsWithCoords}
                  center={mapCenter}
                  onEndpointClick={handleEndpointClick}
                />
              </CardContent>
            </Card>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {filteredEndpoints.map((ep) => {
                const hasAlarm = ep.alarmStatus === 'ALARM';
                const isOffline = ep.status === 'OFFLINE';
                const isBranch = ep.type === 'BRANCH';

                return (
                  <Card
                    key={ep.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 ${
                      hasAlarm
                        ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10'
                        : isOffline
                        ? 'border-gray-300 bg-gray-50 dark:bg-gray-900/20'
                        : 'border-green-200 bg-green-50/50 dark:bg-green-900/10'
                    }`}
                    onClick={() => handleEndpointClick(ep)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isBranch ? (
                              <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-purple-600 flex-shrink-0" />
                            )}
                            <h3 className="font-semibold text-sm truncate">
                              {ep.location || ep.name} / {ep.code}
                            </h3>
                          </div>
                          {ep.ipAddress && (
                            <p className="text-xs text-muted-foreground font-mono">{ep.ipAddress}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                          <Badge className={`${getConnectionStatusColor(ep.status)} text-xs`}>
                            {getConnectionIcon(ep.status)}
                            <span className="ml-1">{ep.status}</span>
                          </Badge>
                          {hasAlarm && (
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              ALARM
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Connection Info */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        {ep.responseTime !== null && ep.status === 'ONLINE' && (
                          <span className={ep.responseTime > 500 ? 'text-yellow-600' : 'text-green-600'}>
                            {ep.responseTime}ms
                          </span>
                        )}
                        {ep.networkMedia && (
                          <span className="flex items-center gap-1">
                            {getMediaIcon(ep.networkMedia)}
                            {ep.networkMedia}
                          </span>
                        )}
                        <span className="ml-auto">{formatUptime(ep.lastChecked)}</span>
                      </div>

                      {/* Alarms */}
                      {ep.currentAlarms && ep.currentAlarms.length > 0 && (
                        <div className="space-y-1 mt-2 pt-2 border-t">
                          {ep.currentAlarms.slice(0, 2).map((alarm) => (
                            <div
                              key={alarm.id}
                              className={`flex items-center gap-2 p-1.5 rounded text-xs ${getAlarmColor(alarm.alarmType)}`}
                            >
                              {getAlarmIcon(alarm.alarmType)}
                              <span className="truncate">{alarm.alarmType}</span>
                            </div>
                          ))}
                          {ep.currentAlarms.length > 2 && (
                            <p className="text-xs text-muted-foreground text-center">
                              +{ep.currentAlarms.length - 2} more
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <Card className="mb-6">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Name / Code</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Connection</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead>Alarm</TableHead>
                        <TableHead>Last Check</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEndpoints.map((ep) => (
                        <TableRow
                          key={ep.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleEndpointClick(ep)}
                        >
                          <TableCell>
                            {ep.type === 'BRANCH' ? (
                              <Building2 className="h-4 w-4 text-primary" />
                            ) : (
                              <CreditCard className="h-4 w-4 text-purple-600" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{ep.name}</p>
                              <p className="text-xs text-muted-foreground">{ep.code}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{ep.ipAddress || '-'}</TableCell>
                          <TableCell className="text-sm">{ep.location || '-'}</TableCell>
                          <TableCell>
                            <Badge className={getConnectionStatusColor(ep.status)}>
                              {ep.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {ep.responseTime !== null ? `${ep.responseTime}ms` : '-'}
                          </TableCell>
                          <TableCell>
                            {ep.alarmStatus === 'ALARM' ? (
                              <Badge className="bg-red-100 text-red-700">
                                {ep.currentAlarms?.length || 0} Alarm
                              </Badge>
                            ) : (
                              <span className="text-green-600 text-sm">OK</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatUptime(ep.lastChecked)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredEndpoints.length} of {endpoints.length} endpoints
                {endpointsWithCoords.length > 0 && viewMode === 'map' && (
                  <span className="ml-2">({endpointsWithCoords.length} with coordinates)</span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedEndpoint && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {selectedEndpoint.type === 'BRANCH' ? (
                        <Building2 className="h-6 w-6 text-primary" />
                      ) : (
                        <CreditCard className="h-6 w-6 text-purple-600" />
                      )}
                      <span className="text-2xl font-bold">{selectedEndpoint.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedEndpoint.code} | {selectedEndpoint.ipAddress || 'No IP'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className={`${getConnectionStatusColor(selectedEndpoint.status)} text-base px-3 py-1`}>
                      {getConnectionIcon(selectedEndpoint.status)}
                      <span className="ml-1">{selectedEndpoint.status}</span>
                    </Badge>
                    {selectedEndpoint.alarmStatus === 'ALARM' && (
                      <Badge className="bg-red-100 text-red-700 text-sm px-3 py-1">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        ALARM
                      </Badge>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {selectedEndpoint.type === 'BRANCH' ? 'Branch' : 'ATM'} details and status
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Info
                  </TabsTrigger>
                  <TabsTrigger value="alarms" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Alarms ({selectedEndpoint.currentAlarms?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                  </TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="info" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Connection Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge className={getConnectionStatusColor(selectedEndpoint.status)}>
                            {selectedEndpoint.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IP Address</span>
                          <span className="font-mono">{selectedEndpoint.ipAddress || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Response Time</span>
                          <span>{selectedEndpoint.responseTime !== null ? `${selectedEndpoint.responseTime}ms` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Packet Loss</span>
                          <span>{selectedEndpoint.packetLoss !== null ? `${selectedEndpoint.packetLoss}%` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Network Media</span>
                          <span className="flex items-center gap-1">
                            {getMediaIcon(selectedEndpoint.networkMedia)}
                            {selectedEndpoint.networkMedia || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Checked</span>
                          <span>{formatTime(selectedEndpoint.lastChecked)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {selectedEndpoint.type === 'BRANCH' ? 'Branch' : 'ATM'} Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Code</span>
                          <span className="font-mono">{selectedEndpoint.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name</span>
                          <span>{selectedEndpoint.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location</span>
                          <span className="text-right max-w-[200px]">{selectedEndpoint.location || '-'}</span>
                        </div>
                        {selectedEndpoint.branch && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Parent Branch</span>
                            <span>{selectedEndpoint.branch.name}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Network Vendor</span>
                          <span>{selectedEndpoint.networkVendor || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Active Incident</span>
                          <span>{selectedEndpoint.hasActiveIncident ? 'Yes' : 'No'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Alarms Tab */}
                <TabsContent value="alarms" className="mt-4">
                  {!selectedEndpoint.currentAlarms || selectedEndpoint.currentAlarms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                      <p className="text-muted-foreground">No active alarms</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedEndpoint.currentAlarms.map((alarm) => (
                        <div
                          key={alarm.id}
                          className={`p-4 rounded-lg border-2 ${getAlarmColor(alarm.alarmType)}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                              {getAlarmIcon(alarm.alarmType)}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{alarm.alarmType}</p>
                              <p className="text-sm opacity-75">Location: {alarm.location}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(alarm.occurredAt)}
                                </span>
                                {alarm.timeAgo && <span className="opacity-75">{alarm.timeAgo}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4">
                  {deviceHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <History className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No alarm history</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Alarm Type</TableHead>
                            <TableHead>Started</TableHead>
                            <TableHead>Cleared</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deviceHistory.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getAlarmIcon(record.alarmType)}
                                  <span className="text-sm">{record.alarmType}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{formatTime(record.occurredAt)}</TableCell>
                              <TableCell className="text-sm">
                                {record.clearedAt ? (
                                  <span className="text-green-600">{formatTime(record.clearedAt)}</span>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{formatDuration(record.duration)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </TabsContent>

                {/* Location Tab */}
                <TabsContent value="location" className="mt-4">
                  {selectedEndpoint.latitude && selectedEndpoint.longitude ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          Coordinates: {selectedEndpoint.latitude.toFixed(6)}, {selectedEndpoint.longitude.toFixed(6)}
                        </span>
                      </div>
                      <div className="rounded-lg overflow-hidden border">
                        <DetailMap
                          endpoints={[selectedEndpoint]}
                          center={{ lat: selectedEndpoint.latitude, lng: selectedEndpoint.longitude }}
                          onEndpointClick={() => {}}
                          height="400px"
                          zoom={16}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Coordinates not available</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add latitude and longitude to display location on map
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
