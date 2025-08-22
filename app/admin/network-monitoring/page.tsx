'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Activity, 
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
  Play,
  Pause,
  SkipForward,
  Settings,
  Timer,
  Target,
  ArrowRight,
  Zap,
  Ticket,
  Plus,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  BarChart3
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
}

interface PingResult {
  id: string;
  status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'TIMEOUT' | 'ERROR';
  responseTimeMs?: number;
  packetLoss?: number;
  errorMessage?: string;
  checkedAt: string;
  ipAddress: string;
  ipType: 'PRIMARY' | 'BACKUP';
}

interface NetworkStats {
  total: number;
  online: number;
  offline: number;
  slow: number;
  error: number;
  avgResponseTime: number;
  lastCycleCompletedAt?: string;
  cycleCount: number;
}

export default function NetworkMonitoringPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // Core data
  const [endpoints, setEndpoints] = useState<NetworkEndpoint[]>([]);
  const [pingResults, setPingResults] = useState<Map<string, PingResult>>(new Map());
  const [stats, setStats] = useState<NetworkStats>({
    total: 0,
    online: 0,
    offline: 0,
    slow: 0,
    error: 0,
    avgResponseTime: 0,
    cycleCount: 0
  });
  
  // Loop control
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCurrentlyPinging, setIsCurrentlyPinging] = useState(false);
  const [pingDelay, setPingDelay] = useState(2000); // 2 seconds default
  const [skipOffline, setSkipOffline] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Refs
  const pingTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();
  
  // Load initial data
  useEffect(() => {
    loadEndpoints();
    return () => {
      // Cleanup on unmount
      if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Update stats when ping results change
  useEffect(() => {
    updateStats();
  }, [pingResults, endpoints]);

  const loadEndpoints = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/network-monitoring/endpoints');
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data.endpoints);
        // Initialize ping results with unknown status
        const initialResults = new Map();
        data.endpoints.forEach((endpoint: NetworkEndpoint) => {
          initialResults.set(endpoint.id, {
            id: endpoint.id,
            status: 'ERROR',
            checkedAt: new Date().toISOString(),
            ipAddress: endpoint.ipAddress,
            ipType: 'PRIMARY'
          });
        });
        setPingResults(initialResults);
      } else {
        toast.error('Failed to load network endpoints');
      }
    } catch (error) {
      console.error('Error loading endpoints:', error);
      toast.error('Error loading network endpoints');
    } finally {
      setLoading(false);
    }
  };

  const updateStats = () => {
    const total = endpoints.length;
    let online = 0;
    let offline = 0;
    let slow = 0;
    let error = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    pingResults.forEach((result) => {
      switch (result.status) {
        case 'ONLINE':
          online++;
          break;
        case 'OFFLINE':
          offline++;
          break;
        case 'SLOW':
          slow++;
          break;
        case 'TIMEOUT':
        case 'ERROR':
          error++;
          break;
      }
      
      if (result.responseTimeMs && result.responseTimeMs > 0) {
        totalResponseTime += result.responseTimeMs;
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
      cycleCount
    });
  };

  const pingEndpoint = async (endpoint: NetworkEndpoint): Promise<PingResult | null> => {
    try {
      // Abort previous request if still running
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/admin/network-monitoring/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointId: endpoint.id,
          type: endpoint.type
        }),
        signal: abortControllerRef.current.signal
      });

      if (response.ok) {
        const data = await response.json();
        return data.result;
      } else {
        return {
          id: endpoint.id,
          status: 'ERROR',
          errorMessage: 'Failed to ping endpoint',
          checkedAt: new Date().toISOString(),
          ipAddress: endpoint.ipAddress,
          ipType: 'PRIMARY'
        };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return null; // Request was aborted, don't update
      }
      
      return {
        id: endpoint.id,
        status: 'ERROR',
        errorMessage: error.message || 'Network error',
        checkedAt: new Date().toISOString(),
        ipAddress: endpoint.ipAddress,
        ipType: 'PRIMARY'
      };
    }
  };

  const pingNext = useCallback(async () => {
    if (!isRunning || endpoints.length === 0) return;
    
    setIsCurrentlyPinging(true);
    const endpoint = endpoints[currentIndex];
    
    // Skip offline endpoints if option is enabled
    if (skipOffline) {
      const currentResult = pingResults.get(endpoint.id);
      if (currentResult && currentResult.status === 'OFFLINE') {
        // Move to next endpoint immediately
        setCurrentIndex((prev) => (prev + 1) % endpoints.length);
        setIsCurrentlyPinging(false);
        
        // Schedule next ping with minimal delay
        pingTimeoutRef.current = setTimeout(pingNext, 100);
        return;
      }
    }

    const result = await pingEndpoint(endpoint);
    
    if (result) {
      setPingResults(prev => new Map(prev.set(result.id, result)));
    }
    
    // Move to next endpoint
    const nextIndex = (currentIndex + 1) % endpoints.length;
    setCurrentIndex(nextIndex);
    
    // If we completed a full cycle, increment counter
    if (nextIndex === 0) {
      setCycleCount(prev => prev + 1);
    }
    
    setIsCurrentlyPinging(false);
    
    // Schedule next ping
    if (isRunning) {
      pingTimeoutRef.current = setTimeout(pingNext, pingDelay);
    }
  }, [isRunning, currentIndex, endpoints, pingResults, skipOffline, pingDelay]);

  // Start/stop the ping loop
  useEffect(() => {
    if (isRunning && !isCurrentlyPinging && endpoints.length > 0) {
      pingTimeoutRef.current = setTimeout(pingNext, 100);
    } else if (!isRunning && pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
    }
    
    return () => {
      if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
    };
  }, [isRunning, pingNext]);

  const toggleMonitoring = () => {
    setIsRunning(!isRunning);
    if (!isRunning) {
      toast.success('Continuous monitoring started');
    } else {
      toast.info('Continuous monitoring stopped');
      if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
    }
  };

  const skipToNext = () => {
    if (pingTimeoutRef.current) clearTimeout(pingTimeoutRef.current);
    setCurrentIndex((prev) => (prev + 1) % endpoints.length);
    if (isRunning) {
      pingTimeoutRef.current = setTimeout(pingNext, 100);
    }
  };

  const createNetworkTicket = async (endpoint: NetworkEndpoint, pingResult?: PingResult) => {
    try {
      const response = await fetch('/api/admin/network-monitoring/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointId: endpoint.id,
          endpointType: endpoint.type,
          incidentType: pingResult?.status || 'OUTAGE',
          pingResult: pingResult
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Network ticket created: ${data.ticket.id.slice(-8)}`);
        // Optionally navigate to the ticket
        // router.push(`/tickets/${data.ticket.id}`);
      } else {
        const error = await response.json();
        toast.error(`Failed to create ticket: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating network ticket:', error);
      toast.error('Failed to create network ticket');
    }
  };

  const createTicketsForOfflineEndpoints = async () => {
    const offlineEndpoints = endpoints.filter(endpoint => {
      const result = pingResults.get(endpoint.id);
      return result && ['OFFLINE', 'TIMEOUT', 'ERROR'].includes(result.status);
    });

    if (offlineEndpoints.length === 0) {
      toast.info('No offline endpoints found');
      return;
    }

    const confirmation = confirm(
      `Create tickets for ${offlineEndpoints.length} offline endpoints?\n\n` +
      offlineEndpoints.slice(0, 5).map(e => `- ${e.code} (${e.name})`).join('\n') +
      (offlineEndpoints.length > 5 ? `\n... and ${offlineEndpoints.length - 5} more` : '')
    );

    if (!confirmation) return;

    toast.info(`Creating tickets for ${offlineEndpoints.length} offline endpoints...`);
    
    let successCount = 0;
    let failureCount = 0;

    for (const endpoint of offlineEndpoints) {
      try {
        const result = pingResults.get(endpoint.id);
        const response = await fetch('/api/admin/network-monitoring/create-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpointId: endpoint.id,
            endpointType: endpoint.type,
            incidentType: result?.status || 'OUTAGE',
            pingResult: result
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        console.error(`Error creating ticket for ${endpoint.code}:`, error);
        failureCount++;
      }
      
      // Small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} network incident tickets`);
    }
    if (failureCount > 0) {
      toast.error(`Failed to create ${failureCount} tickets`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'SLOW':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'OFFLINE':
      case 'TIMEOUT':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'ERROR':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'bg-green-100 text-green-800 border-green-200';
      case 'SLOW': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'OFFLINE':
      case 'TIMEOUT': return 'bg-red-100 text-red-800 border-red-200';
      case 'ERROR': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getResponseTimeColor = (responseTime: number | undefined) => {
    if (!responseTime) return 'text-gray-500';
    if (responseTime < 100) return 'text-green-600';
    if (responseTime < 300) return 'text-yellow-600';
    if (responseTime < 1000) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getUptimeColor = (percentage: number): string => {
    if (percentage >= 99) return 'text-green-600';
    if (percentage >= 95) return 'text-yellow-600';
    if (percentage >= 90) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesSearch = searchTerm === '' || 
      endpoint.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (endpoint.location && endpoint.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || endpoint.type === typeFilter;
    
    const result = pingResults.get(endpoint.id);
    const matchesStatus = statusFilter === 'all' || (result && result.status.toLowerCase() === statusFilter.toLowerCase());

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading network endpoints...</p>
        </div>
      </div>
    );
  }

  const currentEndpoint = endpoints[currentIndex];
  const nextEndpoint = endpoints[(currentIndex + 1) % endpoints.length];

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
                Continuous monitoring of branch and ATM network connectivity
              </p>
            </div>
            
            {/* Control Panel */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={isRunning ? "default" : "secondary"} className="flex items-center gap-1">
                    {isRunning ? <Activity className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    {isRunning ? "RUNNING" : "STOPPED"}
                  </Badge>
                  <Button
                    variant={isRunning ? "destructive" : "default"}
                    size="sm"
                    onClick={toggleMonitoring}
                    disabled={endpoints.length === 0}
                  >
                    {isRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                    {isRunning ? "Stop" : "Start"}
                  </Button>
                  {isRunning && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={skipToNext}
                      disabled={isCurrentlyPinging}
                    >
                      <SkipForward className="h-4 w-4 mr-1" />
                      Skip
                    </Button>
                  )}
                </div>
                
                <div className="border-l pl-4">
                  <Select value={pingDelay.toString()} onValueChange={(value) => setPingDelay(parseInt(value))}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">Fast (1s)</SelectItem>
                      <SelectItem value="2000">Normal (2s)</SelectItem>
                      <SelectItem value="3000">Slow (3s)</SelectItem>
                      <SelectItem value="5000">Very Slow (5s)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cycles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.cycleCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Current Status */}
        {isRunning && currentEndpoint && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Currently checking:</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {currentEndpoint.type === 'BRANCH' ? <Building2 className="h-3 w-3" /> : <Server className="h-3 w-3" />}
                      {currentEndpoint.code} - {currentEndpoint.name}
                    </Badge>
                    {isCurrentlyPinging && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                  </div>
                </div>
                {nextEndpoint && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Next:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {nextEndpoint.type === 'BRANCH' ? <Building2 className="h-3 w-3" /> : <Server className="h-3 w-3" />}
                      {nextEndpoint.code}
                    </Badge>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
              <Button
                variant="outline"
                onClick={() => setSkipOffline(!skipOffline)}
                className={skipOffline ? 'bg-blue-50 border-blue-200' : ''}
              >
                <Zap className="h-4 w-4 mr-2" />
                {skipOffline ? 'Skipping Offline' : 'Check All'}
              </Button>
              <Button
                variant="outline"
                onClick={() => createTicketsForOfflineEndpoints()}
                className="text-red-600 border-red-300 hover:bg-red-50"
                disabled={stats.offline === 0}
              >
                <Ticket className="h-4 w-4 mr-2" />
                Create Tickets for Offline ({stats.offline})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEndpoints.map((endpoint) => {
            const result = pingResults.get(endpoint.id);
            const isCurrentlyChecking = isRunning && currentIndex === endpoints.findIndex(e => e.id === endpoint.id);
            
            return (
              <Card 
                key={endpoint.id} 
                className={`hover:shadow-lg transition-all ${
                  isCurrentlyChecking ? 'border-blue-400 shadow-lg ring-2 ring-blue-200' : 
                  result?.status === 'OFFLINE' ? 'border-red-300' : 
                  result?.status === 'ONLINE' ? 'border-green-300' : ''
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
                      {isCurrentlyChecking && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    </CardTitle>
                    {result && (
                      <Badge className={`${getStatusColor(result.status)} text-xs`}>
                        {result.status}
                      </Badge>
                    )}
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
                      <span className="font-mono text-xs">{endpoint.ipAddress}</span>
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
                    
                    {result && (
                      <>
                        {result.responseTimeMs && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Response:</span>
                            <span className={`font-medium ${getResponseTimeColor(result.responseTimeMs)}`}>
                              {result.responseTimeMs}ms
                            </span>
                          </div>
                        )}
                        
                        {result.packetLoss !== undefined && result.packetLoss > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Packet Loss:</span>
                            <span className="font-medium text-red-600">
                              {result.packetLoss.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Last Check:</span>
                          <span className="text-xs">
                            {new Date(result.checkedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {/* Uptime Information */}
                        {result.uptimePercentage !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Uptime:</span>
                            <span className={`font-medium flex items-center gap-1 ${getUptimeColor(result.uptimePercentage)}`}>
                              <TrendingUp className="h-3 w-3" />
                              {result.uptimePercentage}%
                            </span>
                          </div>
                        )}
                        
                        {/* Downtime Information for offline endpoints */}
                        {result.downSince && ['OFFLINE', 'TIMEOUT', 'ERROR'].includes(result.status) && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Down since:</span>
                            <span className="text-red-600 font-medium text-xs">
                              {formatTimeAgo(new Date(result.downSince))}
                            </span>
                          </div>
                        )}
                        
                        {/* Current downtime duration */}
                        {result.currentDowntimeSeconds && result.currentDowntimeSeconds > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Downtime:</span>
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {formatDuration(result.currentDowntimeSeconds)}
                            </span>
                          </div>
                        )}
                        
                        {/* Status change information */}
                        {result.statusChangedAt && result.previousStatus && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Status changed:</span>
                            <span className="text-xs">
                              {formatTimeAgo(new Date(result.statusChangedAt))}
                            </span>
                          </div>
                        )}
                        
                        {/* Previous status information */}
                        {result.previousStatus && result.previousStatus !== result.status && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Was:</span>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(result.previousStatus)}`}>
                              {result.previousStatus}
                            </Badge>
                          </div>
                        )}
                        
                        {result.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {result.errorMessage}
                          </div>
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
                                router.push(`/manager/atms/${endpoint.id}`);
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Details
                          </Button>

                          {/* Show ticket button for failed/problematic states */}
                          {result && ['OFFLINE', 'SLOW', 'TIMEOUT', 'ERROR'].includes(result.status) && (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 text-xs bg-red-600 hover:bg-red-700"
                              onClick={() => createNetworkTicket(endpoint, result)}
                            >
                              <Ticket className="h-3 w-3 mr-1" />
                              Create Ticket
                            </Button>
                          )}

                          {/* Manual ticket creation for any status */}
                          {result && result.status === 'ONLINE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={() => createNetworkTicket(endpoint, result)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Report Issue
                            </Button>
                          )}
                        </div>
                      </>
                    )}
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