'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wifi, 
  WifiOff, 
  Clock, 
  Building2, 
  Server, 
  RefreshCw, 
  Search,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Activity,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

interface NetworkEndpoint {
  id: string;
  type: 'BRANCH' | 'ATM';
  name: string;
  code: string;
  ipAddress: string;
  status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'ERROR' | 'STALE' | 'UNKNOWN';
  responseTime?: number;
  lastChecked: string | null;
  location?: string;
  branchName?: string;
  packetLoss?: number;
  hasActiveIncident?: boolean;
  activeIncident?: any;
  city?: string;
  backupIpAddress?: string;
  branch?: { name: string; code: string };
}

export default function NetworkOverviewPage() {
  const { data: session } = useSession();
  const [endpoints, setEndpoints] = useState<NetworkEndpoint[]>([]);
  const [filteredEndpoints, setFilteredEndpoints] = useState<NetworkEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch real network data from API
  const fetchNetworkData = async (): Promise<NetworkEndpoint[]> => {
    const response = await fetch('/api/monitoring/network/status');
    if (!response.ok) {
      throw new Error('Failed to fetch network data');
    }
    
    const data = await response.json();
    const endpoints: NetworkEndpoint[] = [];
    
    // Transform branch data
    data.branches.forEach((branch: any) => {
      endpoints.push({
        id: branch.id,
        type: 'BRANCH' as const,
        name: branch.name,
        code: branch.code,
        ipAddress: branch.ipAddress,
        status: branch.status,
        responseTime: branch.responseTime,
        lastChecked: branch.lastChecked,
        location: branch.city,
        city: branch.city,
        backupIpAddress: branch.backupIpAddress,
        packetLoss: branch.packetLoss,
        hasActiveIncident: branch.hasActiveIncident,
        activeIncident: branch.activeIncident,
        branchName: branch.name
      });
    });
    
    // Transform ATM data
    data.atms.forEach((atm: any) => {
      endpoints.push({
        id: atm.id,
        type: 'ATM' as const,
        name: atm.name,
        code: atm.code,
        ipAddress: atm.ipAddress,
        status: atm.status,
        responseTime: atm.responseTime,
        lastChecked: atm.lastChecked,
        location: atm.location,
        branch: atm.branch,
        packetLoss: atm.packetLoss,
        hasActiveIncident: atm.hasActiveIncident,
        activeIncident: atm.activeIncident,
        branchName: atm.branch?.name
      });
    });
    
    return endpoints;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchNetworkData();
      setEndpoints(data);
      setFilteredEndpoints(data);
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

  useEffect(() => {
    let filtered = endpoints;

    if (searchTerm) {
      filtered = filtered.filter(endpoint =>
        endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.ipAddress.includes(searchTerm)
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(endpoint => endpoint.status === statusFilter);
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter(endpoint => endpoint.type === typeFilter);
    }

    setFilteredEndpoints(filtered);
  }, [endpoints, searchTerm, statusFilter, typeFilter]);

  const stats = {
    total: endpoints.length,
    online: endpoints.filter(e => e.status === 'ONLINE').length,
    offline: endpoints.filter(e => e.status === 'OFFLINE').length,
    slow: endpoints.filter(e => e.status === 'SLOW').length,
    avgResponseTime: Math.round(
      endpoints
        .filter(e => e.responseTime)
        .reduce((acc, e) => acc + (e.responseTime || 0), 0) /
      endpoints.filter(e => e.responseTime).length || 0
    )
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'OFFLINE':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case 'SLOW':
        return <Timer className="h-4 w-4 text-yellow-600" />;
      case 'ERROR':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'STALE':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'UNKNOWN':
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Network Overview
          {session?.user?.role !== 'ADMIN' && session?.user?.branchName && (
            <Badge variant="outline" className="text-sm font-normal">
              {session.user.branchName}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          Real-time network monitoring dashboard for all branches and ATMs
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Networks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Monitored endpoints
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
              {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}% uptime
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow</CardTitle>
            <Timer className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.slow}</div>
            <p className="text-xs text-muted-foreground">
              High latency
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
              Connection lost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Average latency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Network Status</CardTitle>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <span className="text-sm text-muted-foreground">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or IP address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
                <SelectItem value="SLOW">Slow</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="STALE">Stale</SelectItem>
                <SelectItem value="UNKNOWN">Unknown</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="BRANCH">Branches</SelectItem>
                <SelectItem value="ATM">ATMs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Network Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEndpoints.map((endpoint) => (
                <Card key={endpoint.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {endpoint.type === 'BRANCH' ? (
                          <Building2 className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Server className="h-4 w-4 text-purple-600" />
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {endpoint.type}
                        </Badge>
                      </div>
                      {getStatusIcon(endpoint.status)}
                    </div>
                    
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                      {endpoint.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {endpoint.code} • {endpoint.ipAddress}
                    </p>
                    
                    {endpoint.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        {endpoint.location}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`text-xs ${getStatusColor(endpoint.status)}`}
                      >
                        {endpoint.status}
                      </Badge>
                      {endpoint.responseTime && (
                        <span className="text-xs text-muted-foreground">
                          {endpoint.responseTime}ms
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Checked: {endpoint.lastChecked ? new Date(endpoint.lastChecked).toLocaleTimeString() : 'Never'}
                    </p>
                    {endpoint.hasActiveIncident && (
                      <div className="mt-2 text-xs text-red-600 font-medium">
                        ⚠️ Active Incident
                      </div>
                    )}
                    {endpoint.packetLoss !== undefined && endpoint.packetLoss > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Packet Loss: {endpoint.packetLoss}%
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredEndpoints.length === 0 && !isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No network endpoints found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}