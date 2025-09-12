'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Wifi, 
  WifiOff, 
  Clock, 
  RefreshCw, 
  Search,
  MapPin,
  Users,
  CheckCircle2,
  Timer,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Router,
  Activity,
  Globe,
  Phone,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface BranchNetwork {
  id: string;
  name: string;
  code: string;
  city?: string;
  address?: string;
  province?: string;
  ipAddress?: string;
  backupIpAddress?: string;
  networkMedia?: string;
  monitoringEnabled: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'SLOW' | 'ERROR' | 'STALE' | 'UNKNOWN';
  responseTime?: number;
  lastChecked: string | null;
  packetLoss?: number;
  hasActiveIncident?: boolean;
  activeIncident?: any;
  atmCount?: number;
  staffCount?: number;
}

export default function BranchNetworkPage() {
  const { data: session } = useSession();
  const [branches, setBranches] = useState<BranchNetwork[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<BranchNetwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [mediaFilter, setMediaFilter] = useState('ALL');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch real branch network data from API
  const fetchBranchNetworkData = async (): Promise<BranchNetwork[]> => {
    const response = await fetch('/api/monitoring/network/status?type=BRANCH');
    if (!response.ok) {
      throw new Error('Failed to fetch branch network data');
    }
    
    const data = await response.json();
    
    // Transform branch data to match our interface
    const branches: BranchNetwork[] = data.branches.map((branch: any) => ({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      city: branch.city,
      address: branch.address,
      province: branch.province,
      ipAddress: branch.ipAddress,
      backupIpAddress: branch.backupIpAddress,
      networkMedia: branch.networkMedia,
      monitoringEnabled: branch.monitoringEnabled,
      status: branch.status,
      responseTime: branch.responseTime,
      lastChecked: branch.lastChecked,
      packetLoss: branch.packetLoss,
      hasActiveIncident: branch.hasActiveIncident,
      activeIncident: branch.activeIncident,
      atmCount: 0, // Will be fetched separately if needed
      staffCount: 0 // Will be fetched separately if needed
    }));
    
    return branches;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBranchNetworkData();
      setBranches(data);
      setFilteredBranches(data);
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
    // Auto refresh every 45 seconds
    const interval = setInterval(loadData, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = branches;

    if (searchTerm) {
      filtered = filtered.filter(branch =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (branch.city && branch.city.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(branch => branch.status === statusFilter);
    }

    if (regionFilter !== 'ALL') {
      filtered = filtered.filter(branch => branch.city === regionFilter);
    }

    if (mediaFilter !== 'ALL') {
      filtered = filtered.filter(branch => branch.networkMedia === mediaFilter);
    }

    setFilteredBranches(filtered);
  }, [branches, searchTerm, statusFilter, regionFilter, mediaFilter]);

  const stats = {
    total: branches.length,
    online: branches.filter(b => b.status === 'ONLINE').length,
    offline: branches.filter(b => b.status === 'OFFLINE').length,
    slow: branches.filter(b => b.status === 'SLOW').length,
    error: branches.filter(b => b.status === 'ERROR').length,
    stale: branches.filter(b => b.status === 'STALE').length,
    unstable: branches.filter(b => b.status === 'ERROR' || b.status === 'STALE').length,
    monitoringEnabled: branches.filter(b => b.monitoringEnabled).length,
    activeIncidents: branches.filter(b => b.hasActiveIncident).length,
    avgResponseTime: Math.round(
      branches
        .filter(b => b.responseTime)
        .reduce((acc, b) => acc + (b.responseTime || 0), 0) / 
      branches.filter(b => b.responseTime).length || 0
    ),
    avgUptime: 95.5, // Default value, will be calculated from real data later
    totalStaff: 0, // Will be fetched separately if needed
    totalAtms: 0 // Will be fetched separately if needed
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

  const getMediaIcon = (media: string) => {
    switch (media) {
      case 'FO':
        return <Globe className="h-4 w-4 text-blue-600" />;
      case 'VSAT':
        return <Router className="h-4 w-4 text-purple-600" />;
      case 'M2M':
        return <Phone className="h-4 w-4 text-green-600" />;
      case 'HYBRID':
        return <Activity className="h-4 w-4 text-indigo-600" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-600" />;
    }
  };


  return (
    <div className="space-y-6">
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
          Real-time network monitoring and performance analytics for all bank branches
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
              {stats.totalStaff} staff, {stats.totalAtms} ATMs
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
            <p className="text-xs text-muted-foreground">
              Auto-refresh: 45s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed View</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
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

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branch Network Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search branches..."
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
                    <SelectItem value="UNSTABLE">Unstable</SelectItem>
                  </SelectContent>
                </Select>
                <Select value="ALL" onValueChange={() => {}}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Regions</SelectItem>
                    <SelectItem value="Manado">Manado</SelectItem>
                    <SelectItem value="Bitung">Bitung</SelectItem>
                    <SelectItem value="Tomohon">Tomohon</SelectItem>
                    <SelectItem value="Minahasa">Minahasa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredBranches.map((branch) => (
                    <Card key={branch.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                              BRANCH
                            </Badge>
                          </div>
                          {getStatusIcon(branch.status)}
                        </div>
                        
                        <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                          {branch.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {branch.code} • {branch.city || 'Unknown'}
                        </p>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{branch.city || branch.address || 'Unknown location'}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1">
                            {getMediaIcon(branch.networkMedia || 'UNKNOWN')}
                            <span className="text-xs">{branch.networkMedia || 'Unknown'}</span>
                          </div>
                          {branch.ipAddress && (
                            <span className="text-xs text-muted-foreground">{branch.ipAddress}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(branch.status)}`}
                          >
                            {branch.status}
                          </Badge>
                          <div className="text-right">
                            {branch.responseTime && (
                              <div className="text-xs text-muted-foreground">{branch.responseTime}ms</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Monitoring: {branch.monitoringEnabled ? 'Enabled' : 'Disabled'}</span>
                          </div>
                          {branch.packetLoss !== undefined && branch.packetLoss > 0 && (
                            <span className="text-orange-600">{branch.packetLoss}% loss</span>
                          )}
                        </div>
                        
                        {branch.hasActiveIncident && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-red-600 font-medium">⚠️ Active Network Incident</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {filteredBranches.length === 0 && !isLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No branches found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Branch Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Detailed view with comprehensive branch analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Performance charts and analytics dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}