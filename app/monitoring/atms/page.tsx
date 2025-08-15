'use client';

import { useState, useEffect } from 'react';
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
  TrendingDown,
  TrendingUp,
  XCircle,
  Building2,
  Loader2,
  Wifi,
  WifiOff,
  Globe
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ATMStatus {
  id: string;
  code: string;
  location: string;
  status: 'OPERATIONAL' | 'WARNING' | 'DOWN' | 'MAINTENANCE';
  lastPing: string;
  uptime: number;
  cashLevel: number;
  paperLevel: number;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  recentIncidents: number;
  activeTickets: number;
  networkMedia?: 'VSAT' | 'M2M' | 'FO';
  networkVendor?: string;
  networkStatus?: string;
  responseTime?: number;
  packetLoss?: number;
}

interface ATMMetrics {
  total: number;
  operational: number;
  warning: number;
  down: number;
  maintenance: number;
  avgUptime: number;
  totalIncidentsToday: number;
  totalIncidentsWeek: number;
}

interface ATMIncident {
  id: string;
  atmCode: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  createdAt: string;
  resolvedAt?: string;
  ticketId?: string;
}

export default function ATMMonitoringDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [atms, setAtms] = useState<ATMStatus[]>([]);
  const [metrics, setMetrics] = useState<ATMMetrics | null>(null);
  const [incidents, setIncidents] = useState<ATMIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [branches, setBranches] = useState<{id: string, name: string, code: string}[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
    loadBranches();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadBranches = async () => {
    try {
      const response = await fetch('/api/admin/branches?limit=100&status=active');
      if (response.ok) {
        const data = await response.json();
        setBranches(data.branches);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadATMStatus(),
        loadMetrics(),
        loadRecentIncidents()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadATMStatus(),
        loadMetrics(),
        loadRecentIncidents()
      ]);
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const loadATMStatus = async () => {
    const response = await fetch('/api/monitoring/atms/status');
    if (response.ok) {
      const data = await response.json();
      setAtms(data.atms);
    }
  };

  const loadMetrics = async () => {
    const response = await fetch('/api/monitoring/atms/metrics');
    if (response.ok) {
      const data = await response.json();
      setMetrics(data);
    }
  };

  const loadRecentIncidents = async () => {
    const response = await fetch('/api/monitoring/atms/incidents?limit=20');
    if (response.ok) {
      const data = await response.json();
      setIncidents(data.incidents);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'DOWN':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'MAINTENANCE':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL': return 'bg-green-100 text-green-800';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800';
      case 'DOWN': return 'bg-red-100 text-red-800';
      case 'MAINTENANCE': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredATMs = atms.filter(atm => {
    const matchesSearch = searchTerm === '' || 
      atm.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      atm.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || atm.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || atm.branch.id === branchFilter;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const createTicketForATM = (atmId: string) => {
    router.push(`/tickets/create?atmId=${atmId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Server className="h-8 w-8" />
                ATM Monitoring Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Real-time monitoring of ATM network status and performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={autoRefresh ? "default" : "secondary"}>
                {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? "Disable" : "Enable"} Auto-refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total ATMs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.total}</div>
                <p className="text-xs text-gray-500 mt-1">Across all branches</p>
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-600">Operational</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.operational}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <p className="text-xs text-gray-500">
                    {((metrics.operational / metrics.total) * 100).toFixed(1)}% uptime
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-600">Down/Critical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.down}</div>
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <p className="text-xs text-gray-500">Requires immediate attention</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Incidents Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalIncidentsToday}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.totalIncidentsWeek} this week
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by ATM code or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPERATIONAL">Operational</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                  <SelectItem value="DOWN">Down</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                </SelectContent>
              </Select>
              {session?.user?.role === 'ADMIN' && branches.length > 0 && (
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="incidents">Recent Incidents</TabsTrigger>
          </TabsList>

          {/* Grid View */}
          <TabsContent value="grid" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredATMs.map((atm) => (
                <Card key={atm.id} className={`hover:shadow-lg transition-shadow ${
                  atm.status === 'DOWN' ? 'border-red-300' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        {getStatusIcon(atm.status)}
                        {atm.code}
                      </CardTitle>
                      <Badge className={getStatusColor(atm.status)}>
                        {atm.status}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {atm.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Branch:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {atm.branch.name}
                        </span>
                      </div>
                      {atm.networkMedia && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Network:</span>
                          <span className="font-medium flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {atm.networkMedia}
                            {atm.networkVendor && ` (${atm.networkVendor})`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Uptime:</span>
                        <span className="font-medium">{atm.uptime}%</span>
                      </div>
                      {atm.responseTime !== undefined && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Response:</span>
                          <span className={`font-medium ${
                            atm.responseTime > 500 ? 'text-red-600' : 
                            atm.responseTime > 200 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {atm.responseTime}ms
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Cash Level:</span>
                        <span className={`font-medium ${
                          atm.cashLevel < 20 ? 'text-red-600' : 
                          atm.cashLevel < 40 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {atm.cashLevel}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Paper Level:</span>
                        <span className={`font-medium ${
                          atm.paperLevel < 20 ? 'text-red-600' : 
                          atm.paperLevel < 40 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {atm.paperLevel}%
                        </span>
                      </div>
                      {(atm.recentIncidents > 0 || atm.activeTickets > 0) && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-sm">
                            {atm.recentIncidents > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {atm.recentIncidents} recent incidents
                              </Badge>
                            )}
                            {atm.activeTickets > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {atm.activeTickets} active tickets
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="pt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => router.push(`/manager/atms/${atm.id}`)}
                        >
                          View Details
                        </Button>
                        {atm.status !== 'OPERATIONAL' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
                            onClick={() => createTicketForATM(atm.id)}
                          >
                            Create Ticket
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ATM Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Branch
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uptime
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cash/Paper
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Network
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Ping
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredATMs.map((atm) => (
                        <tr key={atm.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(atm.status)}
                              <span className="font-medium">{atm.code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {atm.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {atm.branch.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(atm.status)}>
                              {atm.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {atm.uptime}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <span className={atm.cashLevel < 30 ? 'text-red-600' : ''}>
                                💵 {atm.cashLevel}%
                              </span>
                              <span className={atm.paperLevel < 30 ? 'text-red-600' : ''}>
                                📄 {atm.paperLevel}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {atm.networkMedia ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{atm.networkMedia}</span>
                                {atm.responseTime !== undefined && (
                                  <span className="text-xs text-gray-500">
                                    {atm.responseTime}ms
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(atm.lastPing).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/manager/atms/${atm.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents View */}
          <TabsContent value="incidents">
            <Card>
              <CardHeader>
                <CardTitle>Recent ATM Incidents</CardTitle>
                <CardDescription>
                  Latest incidents and alerts from the ATM network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incidents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      No recent incidents reported
                    </p>
                  ) : (
                    incidents.map((incident) => (
                      <div key={incident.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSeverityColor(incident.severity)}>
                                {incident.severity}
                              </Badge>
                              <span className="font-medium">{incident.atmCode}</span>
                              <span className="text-sm text-gray-500">• {incident.type}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{incident.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(incident.createdAt).toLocaleString()}
                              </span>
                              {incident.resolvedAt && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Resolved {new Date(incident.resolvedAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {incident.ticketId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/tickets/${incident.ticketId}`)}
                              >
                                View Ticket
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => createTicketForATM(incident.atmCode)}
                              >
                                Create Ticket
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}