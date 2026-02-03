'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  History,
  Wifi,
  WifiOff,
  Printer,
  CreditCard,
  HardDrive,
  DoorOpen,
  AlertCircle,
  Activity,
  Globe,
  Router,
  Phone,
  Signal,
  SignalLow,
  SignalZero,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const MarkerClusterGroup = dynamic(
  () => import('react-leaflet-cluster').then((mod) => mod.default),
  { ssr: false }
);

interface CurrentAlarm {
  id: string;
  deviceId: string;
  alarmType: string;
  location: string;
  occurredAt: string;
  timeAgo: string | null;
  createdAt: string;
}

interface NetworkATM {
  id: string;
  name: string;
  code: string;
  location: string | null;
  ipAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  networkMedia: string | null;
  networkVendor: string | null;
  branch: { name: string; code: string } | null;
  status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'ERROR' | 'STALE' | 'UNKNOWN';
  lastChecked: string | null;
  responseTime: number | null;
  packetLoss: number | null;
  hasActiveIncident: boolean;
  activeIncident: any | null;
}

interface AlarmDevice {
  id: string;
  deviceId: string;
  location: string | null;
  status: 'ONLINE' | 'ALARM';
  lastSeenAt: string;
  currentAlarms: CurrentAlarm[];
}

interface CombinedATM extends NetworkATM {
  alarmStatus: 'ONLINE' | 'ALARM';
  currentAlarms: CurrentAlarm[];
  alarmDeviceId: string | null;
  lastAlarmUpdate: string | null;
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

// Map alarm types to icons
const getAlarmIcon = (alarmType: string) => {
  const type = alarmType.toLowerCase();
  if (type.includes('communication') || type.includes('offline')) {
    return <WifiOff className="h-4 w-4" />;
  }
  if (type.includes('printer') || type.includes('receipt')) {
    return <Printer className="h-4 w-4" />;
  }
  if (type.includes('cash') || type.includes('cassette')) {
    return <HardDrive className="h-4 w-4" />;
  }
  if (type.includes('mcrw') || type.includes('card')) {
    return <CreditCard className="h-4 w-4" />;
  }
  if (type.includes('door')) {
    return <DoorOpen className="h-4 w-4" />;
  }
  return <AlertCircle className="h-4 w-4" />;
};

// Map alarm types to colors
const getAlarmColor = (alarmType: string) => {
  const type = alarmType.toLowerCase();
  if (type.includes('communication') || type.includes('offline')) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
  }
  if (type.includes('error')) {
    return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
  }
  if (type.includes('warning') || type.includes('low')) {
    return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
  }
  return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
};

const getMediaIcon = (media?: string | null) => {
  switch (media) {
    case 'FO':
      return <Globe className="h-3 w-3 text-blue-600" />;
    case 'VSAT':
      return <Router className="h-3 w-3 text-purple-600" />;
    case 'M2M':
      return <Phone className="h-3 w-3 text-green-600" />;
    case 'HYBRID':
      return <Activity className="h-3 w-3 text-indigo-600" />;
    default:
      return <Wifi className="h-3 w-3 text-gray-600" />;
  }
};

const getConnectionStatusColor = (status: string) => {
  switch (status) {
    case 'ONLINE':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400';
    case 'OFFLINE':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
    case 'SLOW':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'ERROR':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400';
    case 'STALE':
      return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

const getConnectionIcon = (status: string) => {
  switch (status) {
    case 'ONLINE':
      return <Signal className="h-4 w-4 text-green-600" />;
    case 'OFFLINE':
      return <SignalZero className="h-4 w-4 text-red-600" />;
    case 'SLOW':
      return <SignalLow className="h-4 w-4 text-yellow-600" />;
    case 'ERROR':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'STALE':
      return <Clock className="h-4 w-4 text-orange-600" />;
    default:
      return <Signal className="h-4 w-4 text-gray-400" />;
  }
};

// Helper to get status color for map
const getMapStatusColor = (status: string, hasAlarm: boolean) => {
  if (hasAlarm) return '#f97316'; // orange for alarm
  switch (status) {
    case 'ONLINE': return '#22c55e';
    case 'OFFLINE': return '#ef4444';
    case 'SLOW': return '#eab308';
    case 'ERROR': return '#ef4444';
    case 'STALE': return '#f97316';
    default: return '#9ca3af';
  }
};

export default function ATMMonitoringPage() {
  const [networkATMs, setNetworkATMs] = useState<NetworkATM[]>([]);
  const [alarmDevices, setAlarmDevices] = useState<AlarmDevice[]>([]);
  const [alarmTypeBreakdown, setAlarmTypeBreakdown] = useState<AlarmTypeBreakdown[]>([]);
  const [lastAlarmUpdate, setLastAlarmUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('all');
  const [alarmFilter, setAlarmFilter] = useState('all');
  const [alarmTypeFilter, setAlarmTypeFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedATM, setSelectedATM] = useState<CombinedATM | null>(null);
  const [deviceHistory, setDeviceHistory] = useState<HistoryRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [leafletIcon, setLeafletIcon] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());

  // Initialize Leaflet icon only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
        setLeafletIcon(L);
      });
    }
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      // Fetch both network status and alarm data in parallel
      const [networkResponse, alarmResponse] = await Promise.all([
        fetch('/api/monitoring/network/status?type=ATM&limit=1000'),
        fetch('/api/monitoring/atm?limit=1000'),
      ]);

      if (!networkResponse.ok) throw new Error('Failed to fetch network data');

      const networkData = await networkResponse.json();
      setNetworkATMs(networkData.atms || []);

      // Alarm data might fail if tables don't exist yet, handle gracefully
      if (alarmResponse.ok) {
        const alarmData = await alarmResponse.json();
        setAlarmDevices(alarmData.data?.devices || []);
        setAlarmTypeBreakdown(alarmData.data?.summary?.alarmTypeBreakdown || []);
        setLastAlarmUpdate(alarmData.data?.lastUpdate?.receivedAt || null);
      }
    } catch (error) {
      console.error('Error fetching ATM data:', error);
      if (!silent) {
        toast.error('Gagal memuat data ATM');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchDeviceHistory = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/monitoring/atm/${deviceId}`);
      if (response.ok) {
        const data = await response.json();
        setDeviceHistory(data.data?.recentHistory || []);
      } else {
        setDeviceHistory([]);
      }
    } catch (error) {
      console.error('Error fetching device history:', error);
      setDeviceHistory([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Combine network ATMs with alarm data
  const combinedATMs = useMemo(() => {
    // Create a map of alarm devices by normalized device ID
    const alarmMap = new Map<string, AlarmDevice>();
    alarmDevices.forEach((device) => {
      // The alarm device ID is like "0126", ATM code might be "0126" or similar
      alarmMap.set(device.deviceId, device);
    });

    return networkATMs.map((atm): CombinedATM => {
      // Try to match by ATM code (e.g., "0126")
      const alarmDevice = alarmMap.get(atm.code);

      return {
        ...atm,
        alarmStatus: alarmDevice?.status === 'ALARM' ? 'ALARM' : 'ONLINE',
        currentAlarms: alarmDevice?.currentAlarms || [],
        alarmDeviceId: alarmDevice?.deviceId || null,
        lastAlarmUpdate: alarmDevice?.lastSeenAt || null,
      };
    });
  }, [networkATMs, alarmDevices]);

  // Filter ATMs
  const filteredATMs = useMemo(() => {
    return combinedATMs.filter((atm) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          atm.name.toLowerCase().includes(searchLower) ||
          atm.code.toLowerCase().includes(searchLower) ||
          atm.location?.toLowerCase().includes(searchLower) ||
          atm.ipAddress?.toLowerCase().includes(searchLower) ||
          atm.branch?.name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Connection status filter
      if (connectionFilter !== 'all' && atm.status !== connectionFilter) {
        return false;
      }

      // Alarm status filter
      if (alarmFilter === 'ALARM' && atm.alarmStatus !== 'ALARM') {
        return false;
      }
      if (alarmFilter === 'ONLINE' && atm.alarmStatus !== 'ONLINE') {
        return false;
      }

      // Alarm type filter
      if (alarmTypeFilter !== 'all') {
        const hasAlarmType = atm.currentAlarms.some(
          (alarm) => alarm.alarmType === alarmTypeFilter
        );
        if (!hasAlarmType) return false;
      }

      return true;
    });
  }, [combinedATMs, search, connectionFilter, alarmFilter, alarmTypeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: combinedATMs.length,
      online: combinedATMs.filter((a) => a.status === 'ONLINE').length,
      offline: combinedATMs.filter((a) => a.status === 'OFFLINE').length,
      slow: combinedATMs.filter((a) => a.status === 'SLOW').length,
      stale: combinedATMs.filter((a) => a.status === 'STALE' || a.status === 'UNKNOWN').length,
      alarming: combinedATMs.filter((a) => a.alarmStatus === 'ALARM').length,
      healthy: combinedATMs.filter((a) => a.alarmStatus === 'ONLINE').length,
    };
  }, [combinedATMs]);

  const handleManualRefresh = () => {
    fetchData(true);
    toast.success('Data diperbarui');
  };

  const handleATMClick = async (atm: CombinedATM) => {
    setSelectedATM(atm);
    setModalOpen(true);
    if (atm.alarmDeviceId) {
      await fetchDeviceHistory(atm.alarmDeviceId);
    } else {
      setDeviceHistory([]);
    }
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

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}h ${hours % 24}j ${minutes}m`;
    }
    return `${hours}j ${minutes}m`;
  };

  const formatUptime = (lastChecked: string | null) => {
    if (!lastChecked) return 'N/A';
    const now = new Date();
    const checked = new Date(lastChecked);
    const diffMinutes = Math.floor((now.getTime() - checked.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  // Get unique alarm types for filter
  const alarmTypes = alarmTypeBreakdown.map((a) => a.alarmType);

  // ATMs with coordinates for map display
  const atmsWithCoordinates = useMemo(() => {
    return filteredATMs.filter(atm => atm.latitude && atm.longitude);
  }, [filteredATMs]);

  // Calculate map center
  const mapCenter: [number, number] = useMemo(() => {
    if (atmsWithCoordinates.length === 0) {
      return [1.4748, 124.8421]; // Default to Manado
    }
    const avgLat = atmsWithCoordinates.reduce((sum, a) => sum + (a.latitude || 0), 0) / atmsWithCoordinates.length;
    const avgLng = atmsWithCoordinates.reduce((sum, a) => sum + (a.longitude || 0), 0) / atmsWithCoordinates.length;
    return [avgLat, avgLng];
  }, [atmsWithCoordinates]);

  // Create custom marker icon for ATM
  const getMarkerIcon = (status: string, hasAlarm: boolean) => {
    if (!leafletIcon) return undefined;
    const color = getMapStatusColor(status, hasAlarm);

    const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
      <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <rect x="8.5" y="6" width="7" height="5" rx="0.5" fill="#fff"/>
      <rect x="9.5" y="7" width="5" height="2.5" rx="0.3" fill="${color}" opacity="0.3"/>
      <rect x="10" y="12" width="4" height="2" rx="0.3" fill="#fff"/>
      <circle cx="11" cy="13" r="0.4" fill="${color}"/>
      <circle cx="12" cy="13" r="0.4" fill="${color}"/>
      <circle cx="13" cy="13" r="0.4" fill="${color}"/>
    </svg>`;

    return new leafletIcon.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(iconSVG)}`,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48],
    });
  };

  // Create custom cluster icon
  const createClusterCustomIcon = (cluster: any) => {
    if (!leafletIcon) return undefined;

    const markers = cluster.getAllChildMarkers();
    const count = markers.length;

    let onlineCount = 0;
    let offlineCount = 0;
    let alarmCount = 0;

    markers.forEach((marker: any) => {
      const data = marker.options.data;
      if (data) {
        if (data.hasAlarm) alarmCount++;
        else if (data.status === 'ONLINE') onlineCount++;
        else if (data.status === 'OFFLINE') offlineCount++;
      }
    });

    const hasAlarm = alarmCount > 0;
    const hasOffline = offlineCount > 0;
    const allOnline = onlineCount === count;
    const bgColor = hasAlarm ? '#f97316' : hasOffline ? '#ef4444' : allOnline ? '#22c55e' : '#eab308';

    const size = count < 10 ? 40 : count < 100 ? 50 : 60;

    return new leafletIcon.DivIcon({
      html: `
        <div style="
          background: ${bgColor};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${count < 100 ? '16px' : '14px'};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 3px solid white;
        ">
          ${count}
        </div>
      `,
      className: 'custom-cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Handle ATM click from map list
  const handleMapATMClick = (atm: CombinedATM) => {
    if (!atm.latitude || !atm.longitude || !mapRef.current) return;

    mapRef.current.setView([atm.latitude, atm.longitude], 15, {
      animate: true,
      duration: 0.5
    });

    setTimeout(() => {
      const marker = markersRef.current.get(atm.id);
      if (marker) {
        marker.openPopup();
      }
    }, 600);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-purple-600" />
            ATM Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time ATM connection and alarm monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Map
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Auto-refresh</span>
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
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground">Total ATM</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Signal className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                {stats.online}
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">Connected</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <SignalZero className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-2xl font-bold text-red-700 dark:text-red-400">
                {stats.offline}
              </span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">Disconnected</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <SignalLow className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {stats.slow}
              </span>
            </div>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Slow</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {stats.stale}
              </span>
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">Stale/Unknown</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <span className="text-2xl font-bold text-red-700 dark:text-red-400">
                {stats.alarming}
              </span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">Alarm Aktif</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {lastAlarmUpdate ? formatTime(lastAlarmUpdate) : '-'}
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">Last Alarm Update</p>
          </CardContent>
        </Card>
      </div>

      {/* Alarm Type Breakdown */}
      {alarmTypeBreakdown.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tipe Alarm Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alarmTypeBreakdown.map((item) => (
                <Badge
                  key={item.alarmType}
                  className={`${getAlarmColor(item.alarmType)} flex items-center gap-1 cursor-pointer hover:opacity-80`}
                  onClick={() => setAlarmTypeFilter(item.alarmType)}
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, kode, lokasi, IP, atau cabang..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={connectionFilter} onValueChange={setConnectionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Connection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Connection</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
                <SelectItem value="SLOW">Slow</SelectItem>
                <SelectItem value="STALE">Stale</SelectItem>
              </SelectContent>
            </Select>
            <Select value={alarmFilter} onValueChange={setAlarmFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Alarm Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ALARM">Has Alarm</SelectItem>
                <SelectItem value="ONLINE">No Alarm</SelectItem>
              </SelectContent>
            </Select>
            <Select value={alarmTypeFilter} onValueChange={setAlarmTypeFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Tipe Alarm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe Alarm</SelectItem>
                {alarmTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Memuat data ATM...</span>
        </div>
      ) : filteredATMs.length === 0 ? (
        <Card>
          <CardContent className="p-16">
            <div className="flex flex-col items-center justify-center">
              <CreditCard className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600">
                {combinedATMs.length === 0 ? 'Belum Ada Data ATM' : 'Tidak Ada ATM yang Cocok'}
              </h3>
              <p className="text-muted-foreground mt-2">
                {combinedATMs.length === 0
                  ? 'Belum ada data ATM yang tersedia.'
                  : 'Coba ubah filter pencarian Anda.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'map' ? (
        <>
          {/* Map View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Map Section - 2/3 width */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>ATM Network Map</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {atmsWithCoordinates.length} of {filteredATMs.length} ATMs shown on map
                    </p>
                  </div>
                  {atmsWithCoordinates.length < filteredATMs.length && (
                    <Badge variant="outline" className="text-orange-600">
                      {filteredATMs.length - atmsWithCoordinates.length} ATMs without coordinates
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {atmsWithCoordinates.length === 0 ? (
                  <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg" style={{ height: '600px' }}>
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                      <p className="text-muted-foreground">No ATMs with coordinates found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Add latitude and longitude to ATM records to display them on the map
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative" style={{ height: '600px' }}>
                    <link
                      rel="stylesheet"
                      href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
                      integrity="sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w=="
                      crossOrigin=""
                    />
                    <div className="absolute top-4 left-4 z-[1000] bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">
                        Last Update: {lastAlarmUpdate ? formatTime(lastAlarmUpdate) : '--:--'}
                      </span>
                    </div>
                    <MapContainer
                      center={mapCenter}
                      zoom={9}
                      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
                      ref={mapRef}
                    >
                      <TileLayer
                        attribution=""
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MarkerClusterGroup
                        chunkedLoading
                        iconCreateFunction={createClusterCustomIcon}
                        maxClusterRadius={60}
                        spiderfyOnMaxZoom={true}
                        showCoverageOnHover={false}
                      >
                        {atmsWithCoordinates.map((atm) => (
                          <Marker
                            key={atm.id}
                            position={[atm.latitude!, atm.longitude!]}
                            icon={getMarkerIcon(atm.status, atm.alarmStatus === 'ALARM')}
                            ref={(ref: any) => {
                              if (ref) {
                                markersRef.current.set(atm.id, ref);
                                ref.options.data = { status: atm.status, hasAlarm: atm.alarmStatus === 'ALARM' };
                              }
                            }}
                          >
                            <Popup maxWidth={300}>
                              <div className="p-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <CreditCard className="h-4 w-4 text-purple-600" />
                                  <h3 className="font-semibold text-sm">{atm.location || atm.name}</h3>
                                </div>
                                <div className="space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Code:</span>
                                    <span className="font-mono font-medium">{atm.code}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Connection:</span>
                                    <Badge variant="outline" className={`text-xs ${getConnectionStatusColor(atm.status)}`}>
                                      {atm.status}
                                    </Badge>
                                  </div>
                                  {atm.alarmStatus === 'ALARM' && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Alarm:</span>
                                      <Badge className="bg-red-100 text-red-700 text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {atm.currentAlarms.length} Active
                                      </Badge>
                                    </div>
                                  )}
                                  {atm.ipAddress && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">IP:</span>
                                      <span className="font-mono text-xs">{atm.ipAddress}</span>
                                    </div>
                                  )}
                                  {atm.responseTime !== null && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-muted-foreground">Response:</span>
                                      <span className={atm.responseTime > 500 ? 'text-orange-600' : ''}>
                                        {atm.responseTime}ms
                                      </span>
                                    </div>
                                  )}
                                  {atm.currentAlarms.length > 0 && (
                                    <div className="pt-2 border-t mt-2">
                                      <p className="text-xs font-medium mb-1">Active Alarms:</p>
                                      {atm.currentAlarms.slice(0, 2).map((alarm) => (
                                        <p key={alarm.id} className="text-xs text-red-600 flex items-center gap-1">
                                          {getAlarmIcon(alarm.alarmType)}
                                          {alarm.alarmType}
                                        </p>
                                      ))}
                                      {atm.currentAlarms.length > 2 && (
                                        <p className="text-xs text-muted-foreground">
                                          +{atm.currentAlarms.length - 2} more
                                        </p>
                                      )}
                                    </div>
                                  )}
                                  <div className="pt-2 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full text-xs"
                                      onClick={() => handleATMClick(atm)}
                                    >
                                      View Details
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MarkerClusterGroup>
                    </MapContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ATM List - 1/3 width */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">ATM List</CardTitle>
                  <Badge variant="outline">{atmsWithCoordinates.length} ATMs</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="h-[550px]">
                  <div className="space-y-1">
                    {atmsWithCoordinates.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No ATMs with coordinates</p>
                      </div>
                    ) : (
                      atmsWithCoordinates.map((atm) => (
                        <div
                          key={`list-${atm.id}`}
                          onClick={() => handleMapATMClick(atm)}
                          className="flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-full ${
                              atm.alarmStatus === 'ALARM' ? 'bg-orange-100' :
                              atm.status === 'ONLINE' ? 'bg-green-100' :
                              atm.status === 'OFFLINE' ? 'bg-red-100' :
                              atm.status === 'SLOW' ? 'bg-yellow-100' :
                              'bg-gray-100'
                            }`}>
                              <CreditCard className={`h-4 w-4 ${
                                atm.alarmStatus === 'ALARM' ? 'text-orange-600' :
                                atm.status === 'ONLINE' ? 'text-green-600' :
                                atm.status === 'OFFLINE' ? 'text-red-600' :
                                atm.status === 'SLOW' ? 'text-yellow-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <div className="font-medium text-sm truncate max-w-[150px]">
                                {atm.location || atm.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {atm.code}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge variant="outline" className={`text-xs ${getConnectionStatusColor(atm.status)}`}>
                              {atm.status}
                            </Badge>
                            {atm.alarmStatus === 'ALARM' && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                ALARM
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm">Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Slow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm">Offline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span className="text-sm">Has Alarm</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* ATM Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {filteredATMs.map((atm) => {
              const hasAlarm = atm.alarmStatus === 'ALARM';
              const isOffline = atm.status === 'OFFLINE';

              return (
                <Card
                  key={atm.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-2 ${
                    hasAlarm
                      ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800'
                      : isOffline
                      ? 'border-gray-300 bg-gray-50 dark:bg-gray-900/20 dark:border-gray-700'
                      : 'border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800'
                  }`}
                  onClick={() => handleATMClick(atm)}
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">
                          {atm.location || atm.name} / {atm.code}
                        </h3>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {/* Connection Status */}
                        <Badge className={`${getConnectionStatusColor(atm.status)} text-xs`}>
                          {getConnectionIcon(atm.status)}
                          <span className="ml-1">{atm.status}</span>
                        </Badge>
                        {/* Alarm Status */}
                        {hasAlarm && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            ALARM
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Connection Info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      {atm.ipAddress && (
                        <span className="font-mono">{atm.ipAddress}</span>
                      )}
                      {atm.responseTime !== null && atm.status === 'ONLINE' && (
                        <span className={atm.responseTime > 500 ? 'text-yellow-600' : 'text-green-600'}>
                          {atm.responseTime}ms
                        </span>
                      )}
                      {atm.networkMedia && (
                        <span className="flex items-center gap-1">
                          {getMediaIcon(atm.networkMedia)}
                          {atm.networkMedia}
                        </span>
                      )}
                    </div>

                    {/* Active Alarms */}
                    {atm.currentAlarms.length > 0 && (
                      <div className="space-y-2">
                        {atm.currentAlarms.slice(0, 2).map((alarm) => (
                          <div
                            key={alarm.id}
                            className={`flex items-center gap-2 p-2 rounded ${getAlarmColor(
                              alarm.alarmType
                            )}`}
                          >
                            {getAlarmIcon(alarm.alarmType)}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">
                                {alarm.alarmType}
                              </p>
                              <p className="text-[10px] opacity-75">
                                {alarm.timeAgo || formatTime(alarm.occurredAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {atm.currentAlarms.length > 2 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{atm.currentAlarms.length - 2} alarm lainnya
                          </p>
                        )}
                      </div>
                    )}

                    {/* Last Checked */}
                    <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                      Last checked: {formatUptime(atm.lastChecked)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                Menampilkan {filteredATMs.length} dari {combinedATMs.length} ATM
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedATM && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-2xl font-bold">{selectedATM.name}</div>
                    <div className="text-sm font-normal text-muted-foreground mt-1 flex items-center gap-1">
                      <span className="font-mono">{selectedATM.code}</span>
                      {selectedATM.ipAddress && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{selectedATM.ipAddress}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className={`${getConnectionStatusColor(selectedATM.status)} text-base px-3 py-1`}>
                      {getConnectionIcon(selectedATM.status)}
                      <span className="ml-1">{selectedATM.status}</span>
                    </Badge>
                    {selectedATM.alarmStatus === 'ALARM' && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-sm px-3 py-1">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        ALARM
                      </Badge>
                    )}
                  </div>
                </DialogTitle>
                <DialogDescription>
                  Detail ATM, status koneksi, dan riwayat alarm
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
                    Alarms ({selectedATM.currentAlarms.length})
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
                          <Badge className={getConnectionStatusColor(selectedATM.status)}>
                            {selectedATM.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IP Address</span>
                          <span className="font-mono">{selectedATM.ipAddress || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Response Time</span>
                          <span>{selectedATM.responseTime !== null ? `${selectedATM.responseTime}ms` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Packet Loss</span>
                          <span>{selectedATM.packetLoss !== null ? `${selectedATM.packetLoss}%` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Network Media</span>
                          <span className="flex items-center gap-1">
                            {getMediaIcon(selectedATM.networkMedia)}
                            {selectedATM.networkMedia || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Checked</span>
                          <span>{formatTime(selectedATM.lastChecked)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">ATM Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Code</span>
                          <span className="font-mono">{selectedATM.code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name</span>
                          <span>{selectedATM.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location</span>
                          <span className="text-right max-w-[200px]">{selectedATM.location || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Branch</span>
                          <span>{selectedATM.branch?.name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Network Vendor</span>
                          <span>{selectedATM.networkVendor || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Active Incident</span>
                          <span>{selectedATM.hasActiveIncident ? 'Yes' : 'No'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Alarms Tab */}
                <TabsContent value="alarms" className="mt-4">
                  {selectedATM.currentAlarms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                      <p className="text-muted-foreground">Tidak ada alarm aktif</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedATM.currentAlarms.map((alarm) => (
                        <div
                          key={alarm.id}
                          className={`p-4 rounded-lg border-2 ${getAlarmColor(
                            alarm.alarmType
                          )}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/50 dark:bg-black/20 rounded">
                              {getAlarmIcon(alarm.alarmType)}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{alarm.alarmType}</p>
                              <p className="text-sm opacity-75">
                                Lokasi: {alarm.location}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(alarm.occurredAt)}
                                </span>
                                {alarm.timeAgo && (
                                  <span className="opacity-75">{alarm.timeAgo}</span>
                                )}
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
                      <p className="text-muted-foreground">Tidak ada riwayat alarm</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipe Alarm</TableHead>
                            <TableHead>Waktu Mulai</TableHead>
                            <TableHead>Waktu Selesai</TableHead>
                            <TableHead>Durasi</TableHead>
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
                              <TableCell className="text-sm">
                                {formatTime(record.occurredAt)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {record.clearedAt ? (
                                  <span className="text-green-600 dark:text-green-400">
                                    {formatTime(record.clearedAt)}
                                  </span>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    Aktif
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDuration(record.duration)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </TabsContent>

                {/* Location Tab */}
                <TabsContent value="location" className="mt-4">
                  {selectedATM.latitude && selectedATM.longitude ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          Coordinates: {selectedATM.latitude.toFixed(6)}, {selectedATM.longitude.toFixed(6)}
                        </span>
                      </div>
                      <div style={{ height: '400px' }} className="rounded-lg overflow-hidden border">
                        <link
                          rel="stylesheet"
                          href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
                          integrity="sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w=="
                          crossOrigin=""
                        />
                        {leafletIcon && (
                          <MapContainer
                            center={[selectedATM.latitude, selectedATM.longitude]}
                            zoom={16}
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              attribution=""
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker position={[selectedATM.latitude, selectedATM.longitude]}>
                              <Popup>
                                <div className="p-2">
                                  <h3 className="font-semibold">{selectedATM.name}</h3>
                                  <p className="text-sm text-muted-foreground">{selectedATM.location}</p>
                                  {selectedATM.branch && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Branch: {selectedATM.branch.name}
                                    </p>
                                  )}
                                </div>
                              </Popup>
                            </Marker>
                          </MapContainer>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Koordinat tidak tersedia</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tambahkan latitude dan longitude untuk menampilkan lokasi di peta
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
