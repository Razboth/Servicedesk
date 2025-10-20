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
  Activity
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

interface BranchNetwork {
  id: string;
  name: string;
  code: string;
  city?: string;
  address?: string;
  province?: string;
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
}

export default function BranchNetworkMapPage() {
  const { data: session } = useSession();
  const [branches, setBranches] = useState<BranchNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [leafletIcon, setLeafletIcon] = useState<any>(null);

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

  // Fetch branch network data from API
  const fetchBranchNetworkData = async (): Promise<BranchNetwork[]> => {
    const response = await fetch('/api/monitoring/network/status?type=BRANCH');
    if (!response.ok) {
      throw new Error('Failed to fetch branch network data');
    }

    const data = await response.json();
    return data.branches;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBranchNetworkData();
      setBranches(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load branch data:', error);
      toast.error('Failed to load branch data');
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

  const stats = useMemo(() => ({
    total: branches.length,
    online: branches.filter(b => b.status === 'ONLINE').length,
    offline: branches.filter(b => b.status === 'OFFLINE').length,
    slow: branches.filter(b => b.status === 'SLOW').length,
    error: branches.filter(b => b.status === 'ERROR').length,
    stale: branches.filter(b => b.status === 'STALE').length,
    unstable: branches.filter(b => b.status === 'ERROR' || b.status === 'STALE').length,
    activeIncidents: branches.filter(b => b.hasActiveIncident).length,
    avgResponseTime: Math.round(
      branches
        .filter(b => b.responseTime)
        .reduce((acc, b) => acc + (b.responseTime || 0), 0) /
      branches.filter(b => b.responseTime).length || 0
    ),
    avgUptime: branches.length > 0
      ? Math.round((branches.filter(b => b.status === 'ONLINE').length / branches.length) * 100 * 100) / 100
      : 0,
  }), [branches]);

  // Filter branches that have coordinates
  const branchesWithCoordinates = useMemo(() =>
    branches.filter(b => b.latitude && b.longitude),
    [branches]
  );

  // Calculate map center
  const mapCenter: [number, number] = useMemo(() => {
    if (branchesWithCoordinates.length === 0) {
      // Default to Manado, North Sulawesi (Bank SulutGo headquarters)
      return [1.4748, 124.8421];
    }

    const avgLat = branchesWithCoordinates.reduce((sum, b) => sum + (b.latitude || 0), 0) / branchesWithCoordinates.length;
    const avgLng = branchesWithCoordinates.reduce((sum, b) => sum + (b.longitude || 0), 0) / branchesWithCoordinates.length;

    return [avgLat, avgLng];
  }, [branchesWithCoordinates]);

  // Create custom icons for different status
  const getMarkerIcon = (status: string) => {
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

    return new leafletIcon.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
          <path fill="${color}" stroke="#fff" stroke-width="2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#fff"/>
        </svg>
      `)}`,
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
          Branch Network Map
          {!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') && session?.user?.branchName && (
            <Badge variant="outline" className="text-sm font-normal">
              {session.user.branchName}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          Real-time geographic visualization of branch network status
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {branchesWithCoordinates.length} on map
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-700">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="h-6 px-2 text-xs mt-1"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Map Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Branch Network Map</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click on markers to view detailed branch information and network metrics
              </p>
            </div>
            {branchesWithCoordinates.length < branches.length && (
              <Badge variant="outline" className="text-orange-600">
                {branches.length - branchesWithCoordinates.length} branches without coordinates
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !branches.length ? (
            <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg" style={{ height: '600px' }}>
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Loading branch data...</p>
              </div>
            </div>
          ) : branchesWithCoordinates.length === 0 ? (
            <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg" style={{ height: '600px' }}>
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No branches with coordinates found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add latitude and longitude to branch records to display them on the map
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
              <MapContainer
                center={mapCenter}
                zoom={9}
                style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {branchesWithCoordinates.map((branch) => (
                  <Marker
                    key={branch.id}
                    position={[branch.latitude!, branch.longitude!]}
                    icon={getMarkerIcon(branch.status)}
                  >
                    <Popup maxWidth={300}>
                      <div className="p-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <h3 className="font-semibold text-sm">{branch.name}</h3>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Code:</span>
                            <span className="font-medium">{branch.code}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(branch.status)}`}>
                              {branch.status}
                            </Badge>
                          </div>

                          {branch.ipAddress && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">IP Address:</span>
                              <span className="font-mono text-xs">{branch.ipAddress}</span>
                            </div>
                          )}

                          {branch.networkMedia && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Network:</span>
                              <div className="flex items-center gap-1">
                                {getMediaIcon(branch.networkMedia)}
                                <span>{branch.networkMedia}</span>
                              </div>
                            </div>
                          )}

                          {branch.responseTime !== null && branch.responseTime !== undefined && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Response Time:</span>
                              <span className={branch.responseTime > 500 ? 'text-orange-600 font-medium' : ''}>
                                {branch.responseTime}ms
                              </span>
                            </div>
                          )}

                          {branch.packetLoss !== null && branch.packetLoss !== undefined && branch.packetLoss > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Packet Loss:</span>
                              <span className="text-orange-600 font-medium">{branch.packetLoss}%</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Last Checked:</span>
                            <span>{formatUptime(branch.status, branch.lastChecked)}</span>
                          </div>

                          {branch.city && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">City:</span>
                              <span>{branch.city}</span>
                            </div>
                          )}

                          {branch.hasActiveIncident && (
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
          <CardTitle className="text-sm">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
