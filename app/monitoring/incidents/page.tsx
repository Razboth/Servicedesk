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
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Search, 
  Calendar,
  MapPin,
  Wifi,
  WifiOff,
  Server,
  Building2,
  Zap,
  Activity,
  Users,
  Timer,
  AlertCircle,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';

interface NetworkIncident {
  id: string;
  entityType: 'BRANCH' | 'ATM';
  entityId: string;
  entity: {
    id?: string;
    name?: string;
    code?: string;
    location?: string;
    branch?: { name: string; code: string } | null;
  };
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  detectedAt: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  externalReferenceId?: string;
  metrics?: any;
  ticket?: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
  } | null;
}

export default function NetworkIncidentsPage() {
  const { data: session } = useSession();
  const [incidents, setIncidents] = useState<NetworkIncident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<NetworkIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  // Fetch real network incidents data from API
  const fetchNetworkIncidents = async (): Promise<NetworkIncident[]> => {
    const response = await fetch('/api/monitoring/network/incidents');
    if (!response.ok) {
      throw new Error('Failed to fetch network incidents data');
    }
    
    const data = await response.json();
    return data.incidents || [];
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchNetworkIncidents();
      setIncidents(data);
      setFilteredIncidents(data.filter(incident => 
        activeTab === 'active' 
          ? ['OPEN', 'IN_PROGRESS'].includes(incident.status)
          : activeTab === 'resolved'
          ? ['RESOLVED'].includes(incident.status)
          : true
      ));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load incident data:', error);
      toast.error('Failed to load incident data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = incidents;

    // Filter by tab
    if (activeTab === 'active') {
      filtered = filtered.filter(incident => ['OPEN', 'IN_PROGRESS'].includes(incident.status));
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(incident => ['RESOLVED'].includes(incident.status));
    }

    // Apply additional filters
    if (searchTerm) {
      filtered = filtered.filter(incident =>
        incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (incident.entity.name && incident.entity.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (incident.entity.location && incident.entity.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(incident => incident.status === statusFilter);
    }

    if (severityFilter !== 'ALL') {
      filtered = filtered.filter(incident => incident.severity === severityFilter);
    }

    setFilteredIncidents(filtered);
  }, [incidents, searchTerm, statusFilter, severityFilter, activeTab]);

  const stats = {
    total: incidents.length,
    active: incidents.filter(i => ['OPEN', 'IN_PROGRESS'].includes(i.status)).length,
    critical: incidents.filter(i => i.severity === 'CRITICAL').length,
    resolved: incidents.filter(i => i.status === 'RESOLVED').length,
    avgResolutionTime: Math.round(
      incidents
        .filter(i => i.resolvedAt)
        .reduce((acc, i) => {
          const created = new Date(i.createdAt).getTime();
          const resolved = new Date(i.resolvedAt!).getTime();
          return acc + (resolved - created) / (1000 * 60);
        }, 0) / incidents.filter(i => i.resolvedAt).length || 0
    )
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'HIGH':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'MEDIUM':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'IN_PROGRESS':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'RESOLVED':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'COMMUNICATION_OFFLINE':
        return <WifiOff className="h-4 w-4" />;
      case 'SLOW_CONNECTION':
        return <Timer className="h-4 w-4" />;
      case 'HIGH_LATENCY':
        return <Timer className="h-4 w-4" />;
      case 'PACKET_LOSS':
        return <Activity className="h-4 w-4" />;
      case 'DNS_ISSUE':
        return <Server className="h-4 w-4" />;
      case 'NETWORK_CONGESTION':
        return <Activity className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-8 w-8" />
          Network Incidents
          {!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') && session?.user?.branchName && (
            <Badge variant="outline" className="text-sm font-normal">
              {session.user.branchName}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">
          {['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') 
            ? 'Track and manage network-related incidents and outages across all branches'
            : `Track and manage network-related incidents and outages for ${session?.user?.branchName || 'your branch'}`
          }
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time incidents
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Ongoing incidents
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">
              High priority issues
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Successfully resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.avgResolutionTime}m</div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Network Incidents Management</CardTitle>
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
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by incident ID, title, or location..."
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
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Severity</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="active">Active Incidents</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="all">All Incidents</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIncidents.map((incident) => (
                    <Card key={incident.id} className="relative">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {getCategoryIcon(incident.type)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{incident.type}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {incident.id}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{incident.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getSeverityColor(incident.severity)}`}
                            >
                              {incident.severity}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getStatusColor(incident.status)}`}
                            >
                              {incident.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Location:</span>
                              <span>Network Incident</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Impacted Users:</span>
                              <span className="font-medium">N/A</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Reported:</span>
                              <span>{new Date(incident.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Timer className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-medium">
                                {incident.resolvedAt 
                                  ? `${Math.round((new Date(incident.resolvedAt).getTime() - new Date(incident.detectedAt).getTime()) / 60000)}m`
                                  : 'Ongoing'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Source:</span>
                              <span>{incident.entityType === 'BRANCH' ? 'Branch Network' : 'ATM Network'}</span>
                            </div>
                            {incident.ticket && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Ticket:</span>
                                <span>#{incident.ticket.ticketNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredIncidents.length === 0 && !isLoading && (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No incidents found matching your criteria</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}