'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  MapPin,
  Eye,
  X
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
  const [branchData, setBranchData] = useState<NetworkEndpoint[]>([]);
  const [atmData, setAtmData] = useState<NetworkEndpoint[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Create ticket from incident
  const createTicketFromIncident = async (incidentId: string) => {
    if (!incidentId) {
      toast.error('Invalid incident ID');
      console.error('createTicketFromIncident: Invalid incident ID');
      return;
    }

    console.log('Creating ticket from incident:', incidentId);
    setIsCreatingTicket(true);
    
    try {
      const response = await fetch(`/api/incidents/${incidentId}/create-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('API Response status:', response.status);
      
      const data = await response.json();
      console.log('API Response data:', data);

      if (!response.ok) {
        if (data.ticketId && data.ticketNumber) {
          toast.error(`Ticket already exists: ${data.ticketNumber}`);
          console.error('Ticket already exists:', data.ticketNumber);
        } else {
          toast.error(data.error || 'Failed to create ticket');
          console.error('API Error:', data.error || 'Failed to create ticket');
        }
        return;
      }

      toast.success(`Ticket created successfully: ${data.ticket.ticketNumber}`);
      console.log('✅ Ticket created successfully:', data.ticket);
      
      // Close the modal
      setIsIncidentModalOpen(false);
      setSelectedIncident(null);

      // Refresh data to update incident status
      await loadData('manual');
      
    } catch (error) {
      console.error('❌ Error creating ticket:', error);
      toast.error('Network error: Failed to create ticket from incident');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Fetch network data - all data for admins/managers, user's branch for others
  const fetchNetworkData = async () => {
    const params = new URLSearchParams();
    // Only set branchId for non-admin/manager users (i.e., TECHNICIAN, AGENT, USER)
    const userRole = session?.user?.role || '';
    const isAdminOrManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(userRole);
    
    if (session?.user?.branchId && !isAdminOrManager) {
      params.set('branchId', session.user.branchId);
      console.log(`Restricting ${userRole} to branch: ${session.user.branchId}`);
    } else {
      console.log(`Allowing ${userRole} to see all branches and ATMs`);
    }
    
    const response = await fetch(`/api/monitoring/network/status?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch network data');
    }
    
    const data = await response.json();
    
    // Set branch data (single branch for users, all branches for admins)
    const branches = data.branches?.map((branch: any) => ({
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
    })) || [];
    
    setBranchData(branches);
    
    // Set ATM data (ATMs for user's branch or all ATMs for admins)
    const atms = data.atms?.map((atm: any) => ({
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
    })) || [];
    
    setAtmData(atms);
  };

  const loadData = async (refreshType: 'initial' | 'manual' | 'auto' = 'initial') => {
    if (refreshType === 'manual') {
      setIsRefreshing(true);
    } else if (refreshType === 'auto') {
      setIsAutoRefreshing(true);
    } else if (refreshType === 'initial') {
      setIsInitialLoading(true);
    }
    
    try {
      await fetchNetworkData();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load network data:', error);
      if (refreshType !== 'auto') { // Don't show error toast for auto-refresh
        toast.error('Failed to load network data');
      }
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      setIsAutoRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadData('initial');
      // Auto refresh every 30 seconds
      const interval = setInterval(() => loadData('auto'), 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user]);

  // Filter branches based on search and status
  const filteredBranches = branchData.filter(branch => {
    const matchesSearch = !searchTerm || 
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.ipAddress.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || branch.status === statusFilter;
    const matchesBranch = branchFilter === 'ALL' || branch.id === branchFilter;
    
    return matchesSearch && matchesStatus && matchesBranch;
  });

  // Filter ATMs based on search, status, and branch
  const filteredAtms = atmData.filter(atm => {
    const matchesSearch = !searchTerm || 
      atm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      atm.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      atm.ipAddress.includes(searchTerm) ||
      (atm.branchName && atm.branchName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' || atm.status === statusFilter;
    const matchesBranch = branchFilter === 'ALL' || atm.branch?.name === branchFilter;
    
    return matchesSearch && matchesStatus && matchesBranch;
  });

  // Calculate stats for all endpoints (branches + ATMs)
  const allEndpoints = [...branchData, ...atmData].filter(Boolean) as NetworkEndpoint[];
  
  // Get unique branch names for filter dropdown
  const uniqueBranches = [...new Set([
    ...branchData.map(b => b.name),
    ...atmData.map(a => a.branchName).filter(Boolean)
  ])].sort();
  const stats = {
    total: allEndpoints.length,
    online: allEndpoints.filter(e => e.status === 'ONLINE').length,
    offline: allEndpoints.filter(e => e.status === 'OFFLINE').length,
    slow: allEndpoints.filter(e => e.status === 'SLOW').length,
    avgResponseTime: Math.round(
      allEndpoints
        .filter(e => e.responseTime)
        .reduce((acc, e) => acc + (e.responseTime || 0), 0) /
      allEndpoints.filter(e => e.responseTime).length || 0
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

  // Helper function to render network endpoint card
  const renderEndpointCard = (endpoint: NetworkEndpoint) => (
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
        {endpoint.hasActiveIncident && endpoint.activeIncident && (
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              <span className="text-red-600">Active Incident</span>
              {endpoint.activeIncident.ticketId && (
                <Badge variant="secondary" className="text-xs ml-1">
                  Ticket Created
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setSelectedIncident(endpoint.activeIncident);
                setIsIncidentModalOpen(true);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </div>
        )}
        {endpoint.packetLoss !== undefined && endpoint.packetLoss > 0 && (
          <div className="text-xs text-muted-foreground">
            Packet Loss: {endpoint.packetLoss}%
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Network Monitoring
          {['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') ? (
            <Badge variant="outline" className="text-sm font-normal">
              All Branches
            </Badge>
          ) : session?.user?.branchName && (
            <Badge variant="outline" className="text-sm font-normal">
              {session.user.branchName}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          {['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') 
            ? 'Real-time network monitoring for all branches and ATMs'
            : 'Real-time network monitoring for your branch and ATMs'
          }
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

      {/* Branch Network Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle>
                {['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') ? 'Branch Networks' : 'Branch Network'}
              </CardTitle>
              <Badge variant="outline" className="text-sm">
                {branchData.length} {branchData.length === 1 ? 'Branch' : 'Branches'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdate && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                  {isRefreshing && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Updating...
                    </div>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData('manual')}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Branch Filters - only show for admins with multiple branches */}
          {['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') && uniqueBranches.length > 1 && (
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search branches by name, code, or IP address..."
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
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Branches</SelectItem>
                  {uniqueBranches.map((branchName) => (
                    <SelectItem key={branchName} value={branchName}>
                      {branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isInitialLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBranches.length > 0 ? (
            <div className={`grid gap-4 ${['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'max-w-sm'}`}>
              {filteredBranches.map(renderEndpointCard)}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>
                {searchTerm || statusFilter !== 'ALL' || branchFilter !== 'ALL'
                  ? 'No branches found matching your criteria'
                  : 'No branch data available'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ATM Network Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-600" />
              <CardTitle>ATM Networks</CardTitle>
              <Badge variant="outline" className="text-sm">
                {atmData.length} ATMs
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* ATM Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') 
                    ? "Search ATMs by name, code, IP address, or branch..."
                    : "Search ATMs by name, code, or IP address..."
                  }
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
            {['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') && uniqueBranches.length > 1 && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Branches</SelectItem>
                  {uniqueBranches.map((branchName) => (
                    <SelectItem key={branchName} value={branchName}>
                      {branchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ATM Grid */}
          {isInitialLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAtms.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAtms.map(renderEndpointCard)}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>
                {searchTerm || statusFilter !== 'ALL' 
                  ? 'No ATMs found matching your criteria' 
                  : 'No ATMs configured for this branch'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incident Details Modal */}
      <Dialog open={isIncidentModalOpen} onOpenChange={setIsIncidentModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Network Incident Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Incident ID</label>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {selectedIncident.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-sm">
                    {selectedIncident.type?.replace(/_/g, ' ') || 'Network Issue'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  <Badge 
                    variant={selectedIncident.severity === 'HIGH' ? 'destructive' : 
                            selectedIncident.severity === 'MEDIUM' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {selectedIncident.severity || 'UNKNOWN'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge 
                    variant={selectedIncident.status === 'OPEN' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {selectedIncident.status || 'OPEN'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Detected At</label>
                  <p className="text-sm">
                    {selectedIncident.detectedAt 
                      ? new Date(selectedIncident.detectedAt).toLocaleString()
                      : 'Unknown'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-sm">
                    {selectedIncident.createdAt 
                      ? new Date(selectedIncident.createdAt).toLocaleString()
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>
              
              {selectedIncident.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm bg-muted p-3 rounded mt-1">
                    {selectedIncident.description}
                  </p>
                </div>
              )}

              {selectedIncident.resolvedAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Resolved At</label>
                  <p className="text-sm text-green-600">
                    {new Date(selectedIncident.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {selectedIncident.ticketId && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-muted-foreground">Associated Ticket</label>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Ticket Created
                        </p>
                        <p className="text-xs text-blue-700">
                          A support ticket has been created for this incident
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/tickets/${selectedIncident.ticketId}`, '_blank')}
                      >
                        View Ticket
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsIncidentModalOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
                {selectedIncident.status === 'OPEN' && !selectedIncident.ticketId && (
                  <Button 
                    variant="default"
                    disabled={isCreatingTicket}
                    onClick={() => createTicketFromIncident(selectedIncident.id)}
                  >
                    {isCreatingTicket ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Ticket'
                    )}
                  </Button>
                )}
                {selectedIncident.ticketId && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Navigate to ticket (if we want to implement this)
                      window.open(`/tickets/${selectedIncident.ticketId}`, '_blank');
                    }}
                  >
                    View Ticket
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}