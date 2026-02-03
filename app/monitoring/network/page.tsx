'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  Signal,
  SignalZero,
} from 'lucide-react';

interface NetworkEndpoint {
  id: string;
  type: 'BRANCH' | 'ATM';
  name: string;
  code: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'ERROR' | 'STALE' | 'UNKNOWN';
  alarmStatus?: 'ONLINE' | 'ALARM';
  currentAlarms?: { id: string; alarmType: string }[];
}

export default function NetworkMonitoringPage() {
  const { data: session } = useSession();
  const [endpoints, setEndpoints] = useState<NetworkEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [MapComponents, setMapComponents] = useState<any>(null);

  const isAdminOrManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(session?.user?.role || '');

  // Load map components on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('react-leaflet'),
        import('leaflet'),
      ]).then(([reactLeaflet, L]) => {
        // Fix default marker icon
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          L,
        });
        setMapReady(true);
      });
    }
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

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
      }

      // Process branches
      const branches: NetworkEndpoint[] = (networkData.branches || []).map((branch: any) => ({
        id: branch.id,
        type: 'BRANCH' as const,
        name: branch.name,
        code: branch.code,
        location: branch.city || null,
        latitude: branch.latitude,
        longitude: branch.longitude,
        status: branch.status,
        alarmStatus: 'ONLINE',
        currentAlarms: [],
      }));

      // Process ATMs
      const atms: NetworkEndpoint[] = (networkData.atms || []).map((atm: any) => {
        const alarmDevice = alarmMap.get(atm.code);
        return {
          id: atm.id,
          type: 'ATM' as const,
          name: atm.name,
          code: atm.code,
          location: atm.location || null,
          latitude: atm.latitude,
          longitude: atm.longitude,
          status: atm.status,
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

  useEffect(() => {
    if (session?.user) fetchData();
  }, [session?.user, fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!session?.user) return;
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [session?.user, fetchData]);

  // Calculate stats
  const stats = useMemo(() => {
    const branches = endpoints.filter((e) => e.type === 'BRANCH');
    const atms = endpoints.filter((e) => e.type === 'ATM');
    return {
      branchOnline: branches.filter((e) => e.status === 'ONLINE').length,
      branchOffline: branches.filter((e) => e.status !== 'ONLINE').length,
      atmOnline: atms.filter((e) => e.status === 'ONLINE').length,
      atmOffline: atms.filter((e) => e.status !== 'ONLINE').length,
      atmAlarm: atms.filter((e) => e.alarmStatus === 'ALARM').length,
    };
  }, [endpoints]);

  // Endpoints with coordinates
  const endpointsWithCoords = useMemo(() => {
    return endpoints.filter((e) => e.latitude && e.longitude);
  }, [endpoints]);

  // Map center (Indonesia default)
  const mapCenter = useMemo(() => {
    if (endpointsWithCoords.length === 0) return [-2.5, 118];
    const lats = endpointsWithCoords.map((e) => e.latitude!);
    const lngs = endpointsWithCoords.map((e) => e.longitude!);
    return [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
    ];
  }, [endpointsWithCoords]);

  const getMarkerColor = (ep: NetworkEndpoint) => {
    if (ep.alarmStatus === 'ALARM') return 'red';
    if (ep.status === 'OFFLINE') return 'gray';
    return 'green';
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Network Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time status for all branches and ATMs
          </p>
        </div>
        <Button onClick={() => fetchData(true)} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.branchOnline}</span>
            </div>
            <p className="text-xs text-green-600">Branch Online</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.branchOffline}</span>
            </div>
            <p className="text-xs text-red-600">Branch Offline</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Signal className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.atmOnline}</span>
            </div>
            <p className="text-xs text-green-600">ATM Online</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <SignalZero className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-700 dark:text-red-400">{stats.atmOffline}</span>
            </div>
            <p className="text-xs text-red-600">ATM Offline</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.atmAlarm}</span>
            </div>
            <p className="text-xs text-orange-600">ATM Alarm</p>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading...</span>
            </div>
          ) : !mapReady || !MapComponents ? (
            <div className="h-[600px] flex items-center justify-center bg-muted/50">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading map...</span>
            </div>
          ) : (
            <>
              <link
                rel="stylesheet"
                href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
              />
              <MapComponents.MapContainer
                center={mapCenter as [number, number]}
                zoom={6}
                style={{ height: '600px', width: '100%' }}
              >
                <MapComponents.TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {endpointsWithCoords.map((ep) => (
                  <MapComponents.Marker
                    key={ep.id}
                    position={[ep.latitude!, ep.longitude!]}
                  >
                    <MapComponents.Popup>
                      <div className="p-1 min-w-[180px]">
                        <div className="flex items-center gap-2 mb-2">
                          {ep.type === 'BRANCH' ? (
                            <Building2 className="h-4 w-4 text-blue-600" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-purple-600" />
                          )}
                          <span className="font-semibold text-sm">{ep.name}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{ep.code}</p>
                        {ep.location && <p className="text-xs text-gray-500 mb-2">{ep.location}</p>}
                        <div className="flex gap-1">
                          <Badge className={ep.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {ep.status}
                          </Badge>
                          {ep.alarmStatus === 'ALARM' && (
                            <Badge className="bg-orange-100 text-orange-700">ALARM</Badge>
                          )}
                        </div>
                        {ep.currentAlarms && ep.currentAlarms.length > 0 && (
                          <div className="mt-2 pt-2 border-t text-xs">
                            <p className="font-medium mb-1">Alarms:</p>
                            {ep.currentAlarms.slice(0, 3).map((a) => (
                              <p key={a.id} className="text-red-600">{a.alarmType}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </MapComponents.Popup>
                  </MapComponents.Marker>
                ))}
              </MapComponents.MapContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="mt-4 text-sm text-muted-foreground">
        Showing {endpointsWithCoords.length} locations on map ({endpoints.filter(e => e.type === 'BRANCH').length} branches, {endpoints.filter(e => e.type === 'ATM').length} ATMs)
      </div>
    </div>
  );
}
