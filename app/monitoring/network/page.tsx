'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Signal,
  SignalLow,
  SignalZero
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

const ITEMS_PER_PAGE = 12;

export default function NetworkOverviewPage() {
  const { data: session } = useSession();
  const [branchData, setBranchData] = useState<NetworkEndpoint[]>([]);
  const [atmData, setAtmData] = useState<NetworkEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Pagination state
  const [branchPage, setBranchPage] = useState(1);
  const [atmPage, setAtmPage] = useState(1);

  const isAdminOrManager = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '');

  // Create ticket from incident
  const createTicketFromIncident = async (incidentId: string) => {
    if (!incidentId) {
      toast.error('Invalid incident ID');
      return;
    }

    setIsCreatingTicket(true);

    try {
      const response = await fetch(`/api/incidents/${incidentId}/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.ticketId && data.ticketNumber) {
          toast.error(`Ticket already exists: ${data.ticketNumber}`);
        } else {
          toast.error(data.error || 'Failed to create ticket');
        }
        return;
      }

      toast.success(`Ticket created: ${data.ticket.ticketNumber}`);
      setIsIncidentModalOpen(false);
      setSelectedIncident(null);
      await loadData(false);

    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Fetch network data
  const fetchNetworkData = async () => {
    const params = new URLSearchParams();

    if (session?.user?.branchId && !isAdminOrManager) {
      params.set('branchId', session.user.branchId);
    }

    const response = await fetch(`/api/monitoring/network/status?${params}`);
    if (!response.ok) throw new Error('Failed to fetch network data');

    const data = await response.json();

    const branches = data.branches?.map((branch: any) => ({
      id: branch.id,
      type: 'BRANCH' as const,
      name: branch.name,
      code: branch.code,
      ipAddress: branch.ipAddress || '-',
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

    const atms = data.atms?.map((atm: any) => ({
      id: atm.id,
      type: 'ATM' as const,
      name: atm.name,
      code: atm.code,
      ipAddress: atm.ipAddress || '-',
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

  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      await fetchNetworkData();
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load network data:', error);
      if (showLoading) toast.error('Failed to load network data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadData();
      const interval = setInterval(() => loadData(false), 30000);
      return () => clearInterval(interval);
    }
  }, [session?.user]);

  // Filter data
  const filterEndpoints = (endpoints: NetworkEndpoint[]) => {
    return endpoints.filter(endpoint => {
      const matchesSearch = !searchTerm ||
        endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        endpoint.ipAddress.includes(searchTerm) ||
        (endpoint.branchName && endpoint.branchName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || endpoint.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  const filteredBranches = useMemo(() => filterEndpoints(branchData), [branchData, searchTerm, statusFilter]);
  const filteredAtms = useMemo(() => filterEndpoints(atmData), [atmData, searchTerm, statusFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setBranchPage(1);
    setAtmPage(1);
  }, [searchTerm, statusFilter]);

  // Paginated data
  const paginatedBranches = useMemo(() => {
    const start = (branchPage - 1) * ITEMS_PER_PAGE;
    return filteredBranches.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBranches, branchPage]);

  const paginatedAtms = useMemo(() => {
    const start = (atmPage - 1) * ITEMS_PER_PAGE;
    return filteredAtms.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAtms, atmPage]);

  const totalBranchPages = Math.ceil(filteredBranches.length / ITEMS_PER_PAGE);
  const totalAtmPages = Math.ceil(filteredAtms.length / ITEMS_PER_PAGE);

  // Calculate stats
  const allEndpoints = [...branchData, ...atmData];
  const stats = {
    total: allEndpoints.length,
    online: allEndpoints.filter(e => e.status === 'ONLINE').length,
    offline: allEndpoints.filter(e => e.status === 'OFFLINE').length,
    slow: allEndpoints.filter(e => e.status === 'SLOW').length,
    incidents: allEndpoints.filter(e => e.hasActiveIncident).length
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { icon: any; className: string }> = {
      ONLINE: { icon: Signal, className: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20' },
      OFFLINE: { icon: SignalZero, className: 'bg-destructive/10 text-destructive border-destructive/20' },
      SLOW: { icon: SignalLow, className: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20' },
      ERROR: { icon: AlertTriangle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
      STALE: { icon: Clock, className: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
      UNKNOWN: { icon: AlertTriangle, className: 'bg-muted text-muted-foreground border-border' }
    };

    const config = configs[status] || configs.UNKNOWN;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`${config.className} gap-1 font-medium`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  // Render table row
  const renderRow = (endpoint: NetworkEndpoint) => (
    <tr key={endpoint.id} className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {endpoint.type === 'BRANCH' ? (
            <Building2 className="h-4 w-4 text-primary" />
          ) : (
            <Server className="h-4 w-4 text-chart-2" />
          )}
          <div>
            <p className="font-medium text-sm">{endpoint.name}</p>
            <p className="text-xs text-muted-foreground">{endpoint.code}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <code className="text-xs bg-muted px-2 py-1 rounded">{endpoint.ipAddress}</code>
      </td>
      <td className="px-4 py-3">
        {getStatusBadge(endpoint.status)}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {endpoint.responseTime ? `${endpoint.responseTime}ms` : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {endpoint.lastChecked ? new Date(endpoint.lastChecked).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
      </td>
      <td className="px-4 py-3">
        {endpoint.hasActiveIncident && endpoint.activeIncident ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              setSelectedIncident(endpoint.activeIncident);
              setIsIncidentModalOpen(true);
            }}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Incident
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
    </tr>
  );

  // Pagination component
  const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
  }) => {
    if (totalPages <= 1) return null;

    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Showing {start}-{end} of {totalItems}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading network status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Network Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdminOrManager ? 'All branches and ATMs' : `${session?.user?.branchName || 'Your branch'}`}
            {lastUpdate && (
              <span className="ml-2">
                • Updated {lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadData(false)}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[hsl(var(--success))] uppercase tracking-wide">Online</p>
                <p className="text-2xl font-bold text-[hsl(var(--success))]">{stats.online}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-[hsl(var(--success))]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[hsl(var(--warning))] uppercase tracking-wide">Slow</p>
                <p className="text-2xl font-bold text-[hsl(var(--warning))]">{stats.slow}</p>
              </div>
              <Timer className="h-8 w-8 text-[hsl(var(--warning))]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-destructive uppercase tracking-wide">Offline</p>
                <p className="text-2xl font-bold text-destructive">{stats.offline}</p>
              </div>
              <WifiOff className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-destructive uppercase tracking-wide">Incidents</p>
                <p className="text-2xl font-bold text-destructive">{stats.incidents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="SLOW">Slow</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
                <SelectItem value="STALE">Stale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="all" className="gap-2">
            <Activity className="h-4 w-4" />
            All ({filteredBranches.length + filteredAtms.length})
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <Building2 className="h-4 w-4" />
            Branches ({filteredBranches.length})
          </TabsTrigger>
          <TabsTrigger value="atms" className="gap-2">
            <Server className="h-4 w-4" />
            ATMs ({filteredAtms.length})
          </TabsTrigger>
        </TabsList>

        {/* All Tab */}
        <TabsContent value="all" className="space-y-4 mt-4">
          {/* Branches Section */}
          {filteredBranches.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Branches</CardTitle>
                  <Badge variant="secondary" className="text-xs">{filteredBranches.length}</Badge>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">IP Address</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Response</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Checked</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Incident</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBranches.map(renderRow)}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={branchPage}
                totalPages={totalBranchPages}
                onPageChange={setBranchPage}
                totalItems={filteredBranches.length}
              />
            </Card>
          )}

          {/* ATMs Section */}
          {filteredAtms.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-chart-2" />
                  <CardTitle className="text-base">ATMs</CardTitle>
                  <Badge variant="secondary" className="text-xs">{filteredAtms.length}</Badge>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">IP Address</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Response</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Checked</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Incident</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAtms.map(renderRow)}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={atmPage}
                totalPages={totalAtmPages}
                onPageChange={setAtmPage}
                totalItems={filteredAtms.length}
              />
            </Card>
          )}

          {filteredBranches.length === 0 && filteredAtms.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No network endpoints found matching your criteria</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="mt-4">
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Branch Networks</CardTitle>
                <Badge variant="secondary" className="text-xs">{filteredBranches.length}</Badge>
              </div>
            </CardHeader>
            {filteredBranches.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">IP Address</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Response</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Checked</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Incident</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedBranches.map(renderRow)}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={branchPage}
                  totalPages={totalBranchPages}
                  onPageChange={setBranchPage}
                  totalItems={filteredBranches.length}
                />
              </>
            ) : (
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No branches found</p>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* ATMs Tab */}
        <TabsContent value="atms" className="mt-4">
          <Card>
            <CardHeader className="py-3 px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-chart-2" />
                <CardTitle className="text-base">ATM Networks</CardTitle>
                <Badge variant="secondary" className="text-xs">{filteredAtms.length}</Badge>
              </div>
            </CardHeader>
            {filteredAtms.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">IP Address</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Response</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Checked</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Incident</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAtms.map(renderRow)}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={atmPage}
                  totalPages={totalAtmPages}
                  onPageChange={setAtmPage}
                  totalItems={filteredAtms.length}
                />
              </>
            ) : (
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No ATMs found</p>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Incident Details Modal */}
      <Dialog open={isIncidentModalOpen} onOpenChange={setIsIncidentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Incident Details
            </DialogTitle>
          </DialogHeader>

          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Type</p>
                  <p className="text-sm font-medium">{selectedIncident.type?.replace(/_/g, ' ') || 'Network Issue'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Severity</p>
                  <Badge variant={selectedIncident.severity === 'HIGH' || selectedIncident.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                    {selectedIncident.severity || 'UNKNOWN'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Status</p>
                  <Badge variant={selectedIncident.status === 'OPEN' ? 'destructive' : 'secondary'}>
                    {selectedIncident.status || 'OPEN'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Detected</p>
                  <p className="text-sm">
                    {selectedIncident.detectedAt
                      ? new Date(selectedIncident.detectedAt).toLocaleString('id-ID')
                      : '-'
                    }
                  </p>
                </div>
              </div>

              {selectedIncident.description && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Description</p>
                  <p className="text-sm bg-muted p-3 rounded">{selectedIncident.description}</p>
                </div>
              )}

              {selectedIncident.ticketId && (
                <div className="bg-primary/10 border border-primary/20 rounded p-3">
                  <p className="text-sm font-medium text-primary">Ticket Created</p>
                  <p className="text-xs text-muted-foreground mt-1">A support ticket has been created for this incident</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setIsIncidentModalOpen(false)}>
                  Close
                </Button>
                {selectedIncident.status === 'OPEN' && !selectedIncident.ticketId && (
                  <Button
                    size="sm"
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
                    size="sm"
                    onClick={() => window.open(`/tickets/${selectedIncident.ticketId}`, '_blank')}
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
