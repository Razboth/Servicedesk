'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  WifiOff,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Wifi,
  Globe,
  Phone,
  Router,
  Activity,
  CreditCard,
  Search,
  ExternalLink,
  Signal,
  SignalZero,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';

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
  alarmType: string;
  location: string;
  occurredAt: string;
  timeAgo: string | null;
}

interface NetworkEntity {
  id: string;
  name: string;
  code: string;
  type: 'BRANCH' | 'ATM';
  city?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  networkMedia?: string;
  networkVendor?: string;
  status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'ERROR' | 'STALE' | 'UNKNOWN';
  responseTime?: number;
  lastChecked: string | null;
  packetLoss?: number;
  hasActiveIncident?: boolean;
  branch?: { name: string; code: string };
  // ATM Alarm data
  alarmStatus?: 'ONLINE' | 'ALARM';
  currentAlarms?: CurrentAlarm[];
}

export default function NetworkMonitoringPage() {
  const { data: session } = useSession();
  const [entities, setEntities] = useState<NetworkEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [lastAlarmUpdate, setLastAlarmUpdate] = useState<string | null>(null);
  const [leafletIcon, setLeafletIcon] = useState<any>(null);
  const [showBranches, setShowBranches] = useState(true);
  const [showATMs, setShowATMs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [listTypeFilter, setListTypeFilter] = useState<'ALL' | 'BRANCH' | 'ATM'>('ALL');
  const [listStatusFilter, setListStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE' | 'ALARM' | 'OTHER'>('ALL');
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  const isAdminOrManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(session?.user?.role || '');

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (session?.user?.branchId && !isAdminOrManager) {
        params.set('branchId', session.user.branchId);
      }
      params.set('limit', '2000');

      const [networkResponse, alarmResponse] = await Promise.all([
        fetch(`/api/monitoring/network/status?${params}`),
        fetch('/api/monitoring/atm?limit=2000'),
      ]);

      if (!networkResponse.ok) throw new Error('Failed to fetch network data');

      const networkData = await networkResponse.json();

      // Create alarm map
      const alarmMap = new Map<string, any>();
      if (alarmResponse.ok) {
        const alarmData = await alarmResponse.json();
        (alarmData.data?.devices || []).forEach((device: any) => {
          alarmMap.set(device.deviceId, device);
        });
        setLastAlarmUpdate(alarmData.data?.lastUpdate?.receivedAt || null);
      }

      // Combine branches and ATMs
      const combined: NetworkEntity[] = [
        ...(networkData.branches || []).map((b: any) => ({
          ...b,
          type: 'BRANCH' as const,
          alarmStatus: 'ONLINE' as const,
          currentAlarms: [],
        })),
        ...(networkData.atms || []).map((a: any) => {
          const alarmDevice = alarmMap.get(a.code);
          return {
            ...a,
            type: 'ATM' as const,
            alarmStatus: alarmDevice?.status === 'ALARM' ? 'ALARM' : 'ONLINE',
            currentAlarms: alarmDevice?.currentAlarms || [],
          };
        }),
      ];

      setEntities(combined);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load network data:', error);
      toast.error('Failed to load network data');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user, isAdminOrManager]);

  useEffect(() => {
    if (session?.user) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user, loadData]);

  const stats = useMemo(() => {
    const branches = entities.filter(e => e.type === 'BRANCH');
    const atms = entities.filter(e => e.type === 'ATM');

    return {
      total: entities.length,
      branches: branches.length,
      atms: atms.length,
      branchOnline: branches.filter(e => e.status === 'ONLINE').length,
      branchOffline: branches.filter(e => e.status !== 'ONLINE').length,
      atmOnline: atms.filter(e => e.status === 'ONLINE').length,
      atmOffline: atms.filter(e => e.status !== 'ONLINE').length,
      atmAlarm: atms.filter(e => e.alarmStatus === 'ALARM').length,
      online: entities.filter(e => e.status === 'ONLINE').length,
      offline: entities.filter(e => e.status === 'OFFLINE').length,
      slow: entities.filter(e => e.status === 'SLOW').length,
      avgResponseTime: Math.round(
        entities.filter(e => e.responseTime).reduce((acc, e) => acc + (e.responseTime || 0), 0) /
        (entities.filter(e => e.responseTime).length || 1)
      ),
      avgUptime: entities.length > 0
        ? Math.round((entities.filter(e => e.status === 'ONLINE').length / entities.length) * 100 * 100) / 100
        : 0,
    };
  }, [entities]);

  // Filter entities with coordinates
  const entitiesWithCoordinates = useMemo(() => {
    return entities.filter(e => {
      if (!e.latitude || !e.longitude) return false;
      if (e.type === 'BRANCH' && !showBranches) return false;
      if (e.type === 'ATM' && !showATMs) return false;
      return true;
    });
  }, [entities, showBranches, showATMs]);

  // Calculate map center
  const mapCenter: [number, number] = useMemo(() => {
    if (entitiesWithCoordinates.length === 0) return [1.4748, 124.8421];
    const avgLat = entitiesWithCoordinates.reduce((sum, e) => sum + (e.latitude || 0), 0) / entitiesWithCoordinates.length;
    const avgLng = entitiesWithCoordinates.reduce((sum, e) => sum + (e.longitude || 0), 0) / entitiesWithCoordinates.length;
    return [avgLat, avgLng];
  }, [entitiesWithCoordinates]);

  // Create custom marker icon
  const getMarkerIcon = (entity: NetworkEntity) => {
    if (!leafletIcon) return undefined;

    const hasAlarm = entity.alarmStatus === 'ALARM';
    const isOffline = entity.status === 'OFFLINE' || entity.status === 'ERROR';

    let color = '#22c55e'; // green - online
    if (hasAlarm) color = '#f97316'; // orange - alarm
    if (isOffline) color = '#ef4444'; // red - offline
    if (entity.status === 'SLOW') color = '#eab308'; // yellow - slow
    if (entity.status === 'STALE' || entity.status === 'UNKNOWN') color = '#9ca3af'; // gray

    const iconSVG = entity.type === 'BRANCH'
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
          <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <path fill="#fff" d="M12 5.5L8 8v1h1v4h6V9h1V8l-4-2.5zM10 12v-2h1.5v2H10zm2.5 0v-2H14v2h-1.5z"/>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
          <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <rect x="8.5" y="6" width="7" height="5" rx="0.5" fill="#fff"/>
          <rect x="9.5" y="7" width="5" height="2.5" rx="0.3" fill="${color}" opacity="0.3"/>
          <rect x="10" y="12" width="4" height="2" rx="0.3" fill="#fff"/>
        </svg>`;

    return new leafletIcon.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(iconSVG)}`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });
  };

  // Create cluster icon
  const createClusterCustomIcon = (cluster: any) => {
    if (!leafletIcon) return undefined;

    const markers = cluster.getAllChildMarkers();
    const count = markers.length;

    let hasOffline = false;
    let hasAlarm = false;

    markers.forEach((marker: any) => {
      const data = marker.options.data;
      if (data) {
        if (data.status === 'OFFLINE' || data.status === 'ERROR') hasOffline = true;
        if (data.alarmStatus === 'ALARM') hasAlarm = true;
      }
    });

    const bgColor = hasOffline ? '#ef4444' : hasAlarm ? '#f97316' : '#22c55e';
    const size = count < 10 ? 36 : count < 100 ? 44 : 52;

    return new leafletIcon.DivIcon({
      html: `<div style="background:${bgColor};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white;">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-green-600 bg-green-50 border-green-200';
      case 'OFFLINE': return 'text-red-600 bg-red-50 border-red-200';
      case 'SLOW': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ERROR': return 'text-red-600 bg-red-50 border-red-200';
      case 'STALE': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMediaIcon = (media?: string) => {
    switch (media) {
      case 'FO': return <Globe className="h-3 w-3 text-blue-600" />;
      case 'VSAT': return <Router className="h-3 w-3 text-purple-600" />;
      case 'M2M': return <Phone className="h-3 w-3 text-green-600" />;
      case 'HYBRID': return <Activity className="h-3 w-3 text-indigo-600" />;
      default: return <Wifi className="h-3 w-3 text-gray-600" />;
    }
  };

  const formatUptime = (lastChecked: string | null) => {
    if (!lastChecked) return 'N/A';
    const diffMinutes = Math.floor((Date.now() - new Date(lastChecked).getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return `${Math.floor(diffMinutes / 60)}h ago`;
  };

  const handleEntityClick = (entity: NetworkEntity) => {
    if (!entity.latitude || !entity.longitude || !mapRef.current) return;
    setSelectedEntityId(`${entity.type}-${entity.id}`);
    mapRef.current.setView([entity.latitude, entity.longitude], 15, { animate: true, duration: 0.5 });
    setTimeout(() => {
      const marker = markersRef.current.get(`${entity.type}-${entity.id}`);
      if (marker) marker.openPopup();
    }, 600);
  };

  // Filter entities for list
  const filteredEntities = useMemo(() => {
    return entitiesWithCoordinates.filter(e => {
      if (listTypeFilter !== 'ALL' && e.type !== listTypeFilter) return false;
      if (listStatusFilter === 'ONLINE' && e.status !== 'ONLINE') return false;
      if (listStatusFilter === 'OFFLINE' && e.status !== 'OFFLINE') return false;
      if (listStatusFilter === 'ALARM' && e.alarmStatus !== 'ALARM') return false;
      if (listStatusFilter === 'OTHER' && ['ONLINE', 'OFFLINE'].includes(e.status) && e.alarmStatus !== 'ALARM') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          e.name.toLowerCase().includes(query) ||
          e.code.toLowerCase().includes(query) ||
          e.ipAddress?.toLowerCase().includes(query) ||
          e.city?.toLowerCase().includes(query) ||
          e.location?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [entitiesWithCoordinates, searchQuery, listTypeFilter, listStatusFilter]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Network Monitoring
        </h1>
        <p className="text-muted-foreground">
          Real-time network status for all branches and ATMs
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branches</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.branches}</div>
            <p className="text-xs text-muted-foreground">Total branches</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Branch Online</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.branchOnline}</div>
            <p className="text-xs text-green-600">{stats.branches > 0 ? Math.round((stats.branchOnline / stats.branches) * 100) : 0}% operational</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">Branch Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.branchOffline}</div>
            <p className="text-xs text-red-600">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ATMs</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.atms}</div>
            <p className="text-xs text-muted-foreground">Total ATMs</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">ATM Online</CardTitle>
            <Signal className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.atmOnline}</div>
            <p className="text-xs text-green-600">{stats.atms > 0 ? Math.round((stats.atmOnline / stats.atms) * 100) : 0}% operational</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">ATM Offline</CardTitle>
            <SignalZero className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.atmOffline}</div>
            <p className="text-xs text-red-600">No ping response</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">ATM Alarm</CardTitle>
            <Bell className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.atmAlarm}</div>
            <p className="text-xs text-orange-600">Active alarms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.avgUptime}%</div>
            <p className="text-xs text-muted-foreground">Network reliability</p>
          </CardContent>
        </Card>
      </div>

      {/* Map Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Network Infrastructure Map</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click on markers to view detailed information
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant={showBranches ? "default" : "outline"} size="sm" onClick={() => setShowBranches(!showBranches)}>
                <Building2 className="h-4 w-4 mr-2" />
                Branches
              </Button>
              <Button variant={showATMs ? "default" : "outline"} size="sm" onClick={() => setShowATMs(!showATMs)}>
                <CreditCard className="h-4 w-4 mr-2" />
                ATMs
              </Button>
            </div>
          </div>
          {entitiesWithCoordinates.length < entities.length && (
            <Badge variant="outline" className="text-orange-600 mt-2">
              {entities.length - entitiesWithCoordinates.length} entities without coordinates
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && !entities.length ? (
            <div className="flex items-center justify-center py-12 bg-muted/50 rounded-lg" style={{ height: '600px' }}>
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Loading network data...</p>
              </div>
            </div>
          ) : entitiesWithCoordinates.length === 0 ? (
            <div className="flex items-center justify-center py-12 bg-muted/50 rounded-lg" style={{ height: '600px' }}>
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No entities with coordinates found</p>
              </div>
            </div>
          ) : (
            <div className="relative" style={{ height: '600px' }}>
              <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />

              {/* Data Source Info Overlay */}
              <div className="absolute top-4 left-4 z-[1000] bg-background/95 backdrop-blur px-4 py-2 rounded-lg shadow-md border space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Network: {lastUpdate ? lastUpdate.toLocaleTimeString('id-ID') : '--:--'}
                  </span>
                </div>
                {lastAlarmUpdate && (
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-muted-foreground">
                      Alarm: {new Date(lastAlarmUpdate).toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                )}
                <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading} className="h-7 px-2 w-full mt-1">
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>

              <MapContainer center={mapCenter} zoom={8} style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }} ref={mapRef}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MarkerClusterGroup chunkedLoading iconCreateFunction={createClusterCustomIcon} maxClusterRadius={60} spiderfyOnMaxZoom showCoverageOnHover={false}>
                  {entitiesWithCoordinates.map((entity) => (
                    <Marker
                      key={`${entity.type}-${entity.id}`}
                      position={[entity.latitude!, entity.longitude!]}
                      icon={getMarkerIcon(entity)}
                      data={{ type: entity.type, status: entity.status, alarmStatus: entity.alarmStatus }}
                      ref={(ref: any) => { if (ref) markersRef.current.set(`${entity.type}-${entity.id}`, ref); }}
                    >
                      <Popup maxWidth={320}>
                        <div className="p-2">
                          <div className="flex items-center gap-2 mb-2">
                            {entity.type === 'BRANCH' ? <Building2 className="h-4 w-4 text-blue-600" /> : <CreditCard className="h-4 w-4 text-purple-600" />}
                            <h3 className="font-semibold text-sm">{entity.name}</h3>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span className="font-medium">{entity.code}</span></div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(entity.status)}`}>{entity.status}</Badge>
                            </div>
                            {entity.alarmStatus === 'ALARM' && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Alarm:</span>
                                <Badge className="bg-orange-100 text-orange-700 text-xs">ALARM</Badge>
                              </div>
                            )}
                            {entity.ipAddress && <div className="flex justify-between"><span className="text-muted-foreground">IP:</span><span className="font-mono">{entity.ipAddress}</span></div>}
                            {entity.responseTime != null && <div className="flex justify-between"><span className="text-muted-foreground">Response:</span><span className={entity.responseTime > 500 ? 'text-orange-600 font-medium' : ''}>{entity.responseTime}ms</span></div>}
                            {entity.networkMedia && <div className="flex justify-between"><span className="text-muted-foreground">Network:</span><div className="flex items-center gap-1">{getMediaIcon(entity.networkMedia)}<span>{entity.networkMedia}</span></div></div>}
                            <div className="flex justify-between"><span className="text-muted-foreground">Last Check:</span><span>{formatUptime(entity.lastChecked)}</span></div>
                            {entity.currentAlarms && entity.currentAlarms.length > 0 && (
                              <div className="pt-2 mt-2 border-t">
                                <p className="font-medium text-orange-600 mb-1">Active Alarms:</p>
                                {entity.currentAlarms.slice(0, 3).map((a) => (
                                  <p key={a.id} className="text-orange-600">{a.alarmType}</p>
                                ))}
                                {entity.currentAlarms.length > 3 && <p className="text-muted-foreground">+{entity.currentAlarms.length - 3} more</p>}
                              </div>
                            )}
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

      {/* Entity List and Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity List */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Entity List</CardTitle>
              <Badge variant="outline">{filteredEntities.length} items</Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="flex gap-1">
                <Button variant={listTypeFilter === 'ALL' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setListTypeFilter('ALL')}>All</Button>
                <Button variant={listTypeFilter === 'BRANCH' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setListTypeFilter('BRANCH')}><Building2 className="h-3 w-3 mr-1" />Branch</Button>
                <Button variant={listTypeFilter === 'ATM' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setListTypeFilter('ATM')}><CreditCard className="h-3 w-3 mr-1" />ATM</Button>
              </div>
              <div className="border-l mx-1"></div>
              <div className="flex gap-1">
                <Button variant={listStatusFilter === 'ALL' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setListStatusFilter('ALL')}>All</Button>
                <Button variant={listStatusFilter === 'ONLINE' ? 'default' : 'outline'} size="sm" className="h-7 text-xs text-green-600" onClick={() => setListStatusFilter('ONLINE')}>Online</Button>
                <Button variant={listStatusFilter === 'OFFLINE' ? 'default' : 'outline'} size="sm" className="h-7 text-xs text-red-600" onClick={() => setListStatusFilter('OFFLINE')}>Offline</Button>
                <Button variant={listStatusFilter === 'ALARM' ? 'default' : 'outline'} size="sm" className="h-7 text-xs text-orange-600" onClick={() => setListStatusFilter('ALARM')}>Alarm</Button>
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, code, IP, location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredEntities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No entities found</p>
                  </div>
                ) : (
                  filteredEntities.map((entity) => (
                    <div
                      key={`list-${entity.type}-${entity.id}`}
                      onClick={() => handleEntityClick(entity)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-muted ${selectedEntityId === `${entity.type}-${entity.id}` ? 'bg-primary/10 border border-primary/20' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${entity.status === 'ONLINE' ? 'bg-green-100' : entity.status === 'OFFLINE' ? 'bg-red-100' : entity.alarmStatus === 'ALARM' ? 'bg-orange-100' : 'bg-gray-100'}`}>
                          {entity.type === 'BRANCH' ? (
                            <Building2 className={`h-4 w-4 ${entity.status === 'ONLINE' ? 'text-green-600' : entity.status === 'OFFLINE' ? 'text-red-600' : entity.alarmStatus === 'ALARM' ? 'text-orange-600' : 'text-gray-600'}`} />
                          ) : (
                            <CreditCard className={`h-4 w-4 ${entity.status === 'ONLINE' ? 'text-green-600' : entity.status === 'OFFLINE' ? 'text-red-600' : entity.alarmStatus === 'ALARM' ? 'text-orange-600' : 'text-gray-600'}`} />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{entity.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{entity.code}</span>
                            {entity.ipAddress && <><span>•</span><span className="font-mono">{entity.ipAddress}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(entity.status)}`}>{entity.status}</Badge>
                        {entity.alarmStatus === 'ALARM' && <Badge className="bg-orange-100 text-orange-700 text-xs">ALARM</Badge>}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Legend</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Entity Types</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-600" /><span className="text-sm">Branch</span></div>
                  <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-purple-600" /><span className="text-sm">ATM</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Connection Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500"></div><span className="text-sm">Online</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500"></div><span className="text-sm">Slow</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500"></div><span className="text-sm">Offline</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-400"></div><span className="text-sm">Stale/Unknown</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">ATM Alarm Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-500"></div><span className="text-sm">Has Active Alarm</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
