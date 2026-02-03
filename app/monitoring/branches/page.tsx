'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Search,
  ExternalLink
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

interface BranchEntity {
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

export default function BranchMonitoringPage() {
  const { data: session } = useSession();
  const [branches, setBranches] = useState<BranchEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [leafletIcon, setLeafletIcon] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [listStatusFilter, setListStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE' | 'SLOW' | 'OTHER'>('ALL');
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

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

  // Fetch branch data from API
  const fetchBranchData = async (): Promise<BranchEntity[]> => {
    const response = await fetch('/api/monitoring/network/status?type=BRANCH');
    if (!response.ok) {
      throw new Error('Failed to fetch branch data');
    }

    const data = await response.json();
    return data.branches || [];
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const branchData = await fetchBranchData();
      setBranches(branchData);
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

  const stats = useMemo(() => {
    return {
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
    };
  }, [branches]);

  // Filter branches that have coordinates
  const branchesWithCoordinates = useMemo(() => {
    return branches.filter(b => b.latitude && b.longitude);
  }, [branches]);

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

    // Branch icon SVG
    const iconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
          <path fill="${color}" stroke="#fff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <path fill="#fff" d="M12 5.5L8 8v1h1v4h6V9h1V8l-4-2.5zM10 12v-2h1.5v2H10zm2.5 0v-2H14v2h-1.5z"/>
        </svg>`;

    return new leafletIcon.Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(iconSVG)}`,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48],
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

  // Create custom cluster icon
  const createClusterCustomIcon = (cluster: any) => {
    if (!leafletIcon) return undefined;

    const markers = cluster.getAllChildMarkers();
    const count = markers.length;

    // Count by status
    let onlineCount = 0;
    let offlineCount = 0;

    markers.forEach((marker: any) => {
      const data = marker.options.data;
      if (data) {
        if (data.status === 'ONLINE') onlineCount++;
        else if (data.status === 'OFFLINE') offlineCount++;
      }
    });

    // Determine cluster color based on status
    const hasOffline = offlineCount > 0;
    const allOnline = onlineCount === count;
    const bgColor = hasOffline ? '#ef4444' : allOnline ? '#22c55e' : '#eab308';

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

  // Handle branch click from list - zoom to marker and open popup
  const handleBranchClick = (branch: BranchEntity) => {
    if (!branch.latitude || !branch.longitude || !mapRef.current) return;

    setSelectedBranchId(branch.id);

    // Zoom to the branch location
    mapRef.current.setView([branch.latitude, branch.longitude], 15, {
      animate: true,
      duration: 0.5
    });

    // Open the marker popup
    setTimeout(() => {
      const marker = markersRef.current.get(branch.id);
      if (marker) {
        marker.openPopup();
      }
    }, 600);
  };

  // Filter branches for the list based on search and status
  const filteredBranches = useMemo(() => {
    return branchesWithCoordinates.filter(b => {
      // Status filter
      if (listStatusFilter !== 'ALL') {
        if (listStatusFilter === 'OTHER') {
          if (['ONLINE', 'OFFLINE', 'SLOW'].includes(b.status)) return false;
        } else if (b.status !== listStatusFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          b.name.toLowerCase().includes(query) ||
          b.code.toLowerCase().includes(query) ||
          b.ipAddress?.toLowerCase().includes(query) ||
          b.city?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [branchesWithCoordinates, searchQuery, listStatusFilter]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Branch Network Monitoring
          {!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') && session?.user?.branchName && (
            <Badge variant="outline" className="text-sm font-normal">
              {session.user.branchName}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          Real-time geographic visualization and monitoring of all branch locations
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
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
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Network latency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
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
              <CardTitle>Branch Network Map</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Click on markers to view detailed information and network metrics
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {branchesWithCoordinates.length < branches.length && (
            <Badge variant="outline" className="text-orange-600 mt-2">
              {branches.length - branchesWithCoordinates.length} branches without coordinates
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && !branches.length ? (
            <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg" style={{ height: '700px' }}>
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Loading branch data...</p>
              </div>
            </div>
          ) : branchesWithCoordinates.length === 0 ? (
            <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg" style={{ height: '700px' }}>
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No branches with coordinates found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add latitude and longitude to branch records to display them on the map
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
                  {branchesWithCoordinates.map((branch) => (
                    <Marker
                      key={branch.id}
                      position={[branch.latitude!, branch.longitude!]}
                      icon={getMarkerIcon(branch.status)}
                      ref={(ref: any) => {
                        if (ref) {
                          markersRef.current.set(branch.id, ref);
                          ref.options.data = { status: branch.status };
                        }
                      }}
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
                </MarkerClusterGroup>
              </MapContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branch List and Legend - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch List - 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Branch List</CardTitle>
              <Badge variant="outline">{filteredBranches.length} branches</Badge>
            </div>
            {/* Status Filter */}
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="flex gap-1">
                <Button
                  variant={listStatusFilter === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setListStatusFilter('ALL')}
                >
                  All Status
                </Button>
                <Button
                  variant={listStatusFilter === 'ONLINE' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => setListStatusFilter('ONLINE')}
                >
                  Online
                </Button>
                <Button
                  variant={listStatusFilter === 'OFFLINE' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setListStatusFilter('OFFLINE')}
                >
                  Offline
                </Button>
                <Button
                  variant={listStatusFilter === 'SLOW' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                  onClick={() => setListStatusFilter('SLOW')}
                >
                  Slow
                </Button>
                <Button
                  variant={listStatusFilter === 'OTHER' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setListStatusFilter('OTHER')}
                >
                  Other
                </Button>
              </div>
            </div>
            {/* Search */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, IP, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredBranches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No branches found</p>
                  </div>
                ) : (
                  filteredBranches.map((branch) => (
                    <div
                      key={`list-${branch.id}`}
                      onClick={() => handleBranchClick(branch)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 ${
                        selectedBranchId === branch.id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${
                          branch.status === 'ONLINE' ? 'bg-green-100' :
                          branch.status === 'OFFLINE' ? 'bg-red-100' :
                          branch.status === 'SLOW' ? 'bg-yellow-100' :
                          'bg-gray-100'
                        }`}>
                          <Building2 className={`h-4 w-4 ${
                            branch.status === 'ONLINE' ? 'text-green-600' :
                            branch.status === 'OFFLINE' ? 'text-red-600' :
                            branch.status === 'SLOW' ? 'text-yellow-600' :
                            'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{branch.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{branch.code}</span>
                            {branch.ipAddress && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{branch.ipAddress}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getStatusColor(branch.status)}`}>
                          {branch.status}
                        </Badge>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Legend - 1/3 width */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Status Colors</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm">Online - Network reachable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Slow - High latency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm">Offline - No response</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span className="text-sm">Stale - No recent data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                    <span className="text-sm">Unknown - Not monitored</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Network Media</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getMediaIcon('FO')}
                    <span className="text-sm">FO - Fiber Optic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getMediaIcon('VSAT')}
                    <span className="text-sm">VSAT - Satellite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getMediaIcon('M2M')}
                    <span className="text-sm">M2M - Mobile</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
