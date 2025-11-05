'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  CreditCard
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

interface NetworkEntity {
  id: string;
  name: string;
  code: string;
  type: 'BRANCH' | 'ATM';
  city?: string;
  address?: string;
  province?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  backupIpAddress?: string;
  networkMedia?: string;
  networkVendor?: string;
  monitoringEnabled?: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'ERROR' | 'STALE' | 'UNKNOWN';
  responseTime?: number;
  lastChecked: string | null;
  packetLoss?: number;
  hasActiveIncident?: boolean;
  activeIncident?: any;
  branch?: { name: string; code: string };
}

export default function NetworkMapPage() {
  const { data: session } = useSession();
  const [entities, setEntities] = useState<NetworkEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [leafletIcon, setLeafletIcon] = useState<any>(null);
  const [showBranches, setShowBranches] = useState(true);
  const [showATMs, setShowATMs] = useState(true);

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

  // Fetch network data from API
  const fetchNetworkData = async (): Promise<{ branches: any[], atms: any[] }> => {
    const response = await fetch('/api/monitoring/network/status');
    if (!response.ok) {
      throw new Error('Failed to fetch network data');
    }

    const data = await response.json();
    return { branches: data.branches, atms: data.atms };
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { branches, atms } = await fetchNetworkData();

      // Combine branches and ATMs into a single array
      const combined: NetworkEntity[] = [
        ...branches.map((b: any) => ({ ...b, type: 'BRANCH' as const })),
        ...atms.map((a: any) => ({ ...a, type: 'ATM' as const }))
      ];

      setEntities(combined);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load network data:', error);
      toast.error('Failed to load network data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const branches = entities.filter(e => e.type === 'BRANCH');
    const atms = entities.filter(e => e.type === 'ATM');

    return {
      total: entities.length,
      branches: branches.length,
      atms: atms.length,
      online: entities.filter(e => e.status === 'ONLINE').length,
      offline: entities.filter(e => e.status === 'OFFLINE').length,
      slow: entities.filter(e => e.status === 'SLOW').length,
      error: entities.filter(e => e.status === 'ERROR').length,
      stale: entities.filter(e => e.status === 'STALE').length,
      unstable: entities.filter(e => e.status === 'ERROR' || e.status === 'STALE').length,
      activeIncidents: entities.filter(e => e.hasActiveIncident).length,
      avgResponseTime: Math.round(
        entities
          .filter(e => e.responseTime)
          .reduce((acc, e) => acc + (e.responseTime || 0), 0) /
        entities.filter(e => e.responseTime).length || 0
      ),
      avgUptime: entities.length > 0
        ? Math.round((entities.filter(e => e.status === 'ONLINE').length / entities.length) * 100 * 100) / 100
        : 0,
    };
  }, [entities]);

  // Filter entities that have coordinates and match display filters
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
    if (entitiesWithCoordinates.length === 0) {
      // Default to Manado, North Sulawesi (Bank SulutGo headquarters)
      return [1.4748, 124.8421];
    }

    const avgLat = entitiesWithCoordinates.reduce((sum, e) => sum + (e.latitude || 0), 0) / entitiesWithCoordinates.length;
    const avgLng = entitiesWithCoordinates.reduce((sum, e) => sum + (e.longitude || 0), 0) / entitiesWithCoordinates.length;

    return [avgLat, avgLng];
  }, [entitiesWithCoordinates]);

  // Create custom icons for different status and entity types
  const getMarkerIcon = (status: string, entityType: 'BRANCH' | 'ATM') => {
    if (!leafletIcon) return undefined;

    const colors: Record<string, string> = {
      ONLINE: '#22c55e',
      OFFLINE: '#ef4444',
      SLOW: '#eab308',
      ERROR: '#ef4444',
      STALE: '#f97316',
      UNKNOWN: '#9ca3af'
    };

    const color = colors[status] || colors.UNKNOWN;

    // Different SVG icons for branches and ATMs
    const iconSVG = entityType === 'BRANCH'
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
          <path fill="${color}" stroke="#fff" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <path fill="#fff" d="M12 6h-1v2H9v1h2v2h1v-2h2V8h-2V6z M9 12h6v1H9v-1z M9 14h6v1H9v-1z"/>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
          <path fill="${color}" stroke="#fff" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <rect x="8" y="7" width="8" height="5" rx="1" fill="#fff"/>
          <rect x="10" y="13" width="4" height="2" fill="#fff"/>
        </svg>`;

    return new leafletIcon.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(iconSVG)}`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'OFFLINE':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'SLOW':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'STALE':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'UNKNOWN':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMediaIcon = (media?: string) => {
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

  const formatUptime = (status: string, lastChecked: string | null) => {
    if (!lastChecked) return 'N/A';
    const now = new Date();
    const checked = new Date(lastChecked);
    const diffMinutes = Math.floor((now.getTime() - checked.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="h-8 w-8" />
          Network Infrastructure Map
          {!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') && session?.user?.branchName && (
            <Badge variant="outline" className="text-sm font-normal">
              {session.user.branchName}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          Real-time geographic visualization of all network infrastructure (Branches & ATMs)
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {entitiesWithCoordinates.length} on map
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branches</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.branches}</div>
            <p className="text-xs text-muted-foreground">
              Branch locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ATMs</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.atms}</div>
            <p className="text-xs text-muted-foreground">
              ATM locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.online}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}% operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.slow + stats.unstable}</div>
            <p className="text-xs text-muted-foreground">
              Slow or unstable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <WifiOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.avgUptime}%</div>
            <p className="text-xs text-muted-foreground">
              Network reliability
            </p>
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
                Click on markers to view detailed information and network metrics
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={showBranches ? "default" : "outline"}
                size="sm"
                onClick={() => setShowBranches(!showBranches)}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Branches
              </Button>
              <Button
                variant={showATMs ? "default" : "outline"}
                size="sm"
                onClick={() => setShowATMs(!showATMs)}
              >
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
            <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg" style={{ height: '700px' }}>
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Loading network data...</p>
              </div>
            </div>
          ) : entitiesWithCoordinates.length === 0 ? (
            <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg" style={{ height: '700px' }}>
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No entities with coordinates found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add latitude and longitude to records to display them on the map
                </p>
              </div>
            </div>
          ) : (
            <div className="relative" style={{ height: '700px' }}>
              <link
                rel="stylesheet"
                href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
                integrity="sha512-Zcn6bjR/8RZbLEpLIeOwNtzREBAJnUKESxces60Mpoj+2okopSAcSUIUOseddDm0cxnGQzxIR7vJgsLZbdLE3w=="
                crossOrigin=""
              />
              <div className="absolute top-4 left-4 z-[1000] bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">
                  Last Update: {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadData}
                  disabled={isLoading}
                  className="h-7 px-2"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <MapContainer
                center={mapCenter}
                zoom={9}
                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {entitiesWithCoordinates.map((entity) => (
                  <Marker
                    key={`${entity.type}-${entity.id}`}
                    position={[entity.latitude!, entity.longitude!]}
                    icon={getMarkerIcon(entity.status, entity.type)}
                  >
                    <Popup maxWidth={300}>
                      <div className="p-2">
                        <div className="flex items-center gap-2 mb-2">
                          {entity.type === 'BRANCH' ? (
                            <Building2 className="h-4 w-4 text-blue-600" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-purple-600" />
                          )}
                          <h3 className="font-semibold text-sm">{entity.name}</h3>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <Badge variant="outline" className="text-xs">
                              {entity.type}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Code:</span>
                            <span className="font-medium">{entity.code}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(entity.status)}`}>
                              {entity.status}
                            </Badge>
                          </div>

                          {entity.ipAddress && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">IP Address:</span>
                              <span className="font-mono text-xs">{entity.ipAddress}</span>
                            </div>
                          )}

                          {entity.networkMedia && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Network:</span>
                              <div className="flex items-center gap-1">
                                {getMediaIcon(entity.networkMedia)}
                                <span>{entity.networkMedia}</span>
                              </div>
                            </div>
                          )}

                          {entity.responseTime !== null && entity.responseTime !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Response Time:</span>
                              <span className={entity.responseTime > 500 ? 'text-orange-600 font-medium' : ''}>
                                {entity.responseTime}ms
                              </span>
                            </div>
                          )}

                          {entity.packetLoss !== null && entity.packetLoss !== undefined && entity.packetLoss > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Packet Loss:</span>
                              <span className="text-orange-600 font-medium">{entity.packetLoss}%</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Last Checked:</span>
                            <span>{formatUptime(entity.status, entity.lastChecked)}</span>
                          </div>

                          {entity.type === 'ATM' && entity.branch && (
                            <div className="flex items-center justify-between pt-1 border-t">
                              <span className="text-muted-foreground">Branch:</span>
                              <span className="font-medium">{entity.branch.name}</span>
                            </div>
                          )}

                          {entity.type === 'BRANCH' && entity.city && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">City:</span>
                              <span>{entity.city}</span>
                            </div>
                          )}

                          {entity.type === 'ATM' && entity.location && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Location:</span>
                              <span className="text-xs">{entity.location}</span>
                            </div>
                          )}

                          {entity.hasActiveIncident && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="font-medium">Active Network Incident</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Entity Types</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Branch</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <span className="text-sm">ATM</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                  <span className="text-sm">Stale</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                  <span className="text-sm">Unknown</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-sm">Error</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
