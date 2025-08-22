'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  CreditCard, 
  ArrowLeft, 
  AlertTriangle,
  Activity,
  WifiOff,
  CheckCircle,
  MapPin,
  Globe,
  Clock,
  Ticket,
  Building2,
  Calendar,
  User
} from 'lucide-react';

interface ATMDetails {
  id: string;
  code: string;
  name: string;
  location?: string;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  lastHeartbeat?: string;
  createdAt: string;
  updatedAt: string;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    incidents: number;
  };
  incidents: Array<{
    id: string;
    type: string;
    severity: string;
    status: string;
    description: string;
    createdAt: string;
    resolvedAt?: string;
  }>;
  recentTickets: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    user: {
      name: string;
    };
    assignedTo?: {
      name: string;
    };
  }>;
}

export default function ATMDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const atmId = params.id as string;
  
  const [atm, setATM] = useState<ATMDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchATMDetails();
  }, [atmId]);

  const fetchATMDetails = async () => {
    try {
      const response = await fetch(`/api/manager/atms/${atmId}`);
      if (!response.ok) throw new Error('Failed to fetch ATM details');
      
      const data = await response.json();
      setATM(data);
    } catch (error) {
      console.error('Error fetching ATM details:', error);
      toast.error('Failed to load ATM details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!atm?.isActive) {
      return <WifiOff className="h-8 w-8 text-gray-400" />;
    }
    const hasActiveIncidents = atm.incidents.some(i => i.status !== 'RESOLVED');
    if (hasActiveIncidents) {
      return <AlertTriangle className="h-8 w-8 text-red-500" />;
    }
    return <CheckCircle className="h-8 w-8 text-green-500" />;
  };

  const getStatusText = () => {
    if (!atm?.isActive) return 'Inactive';
    const activeIncidents = atm.incidents.filter(i => i.status !== 'RESOLVED').length;
    if (activeIncidents > 0) return `${activeIncidents} Active Issues`;
    return 'Operational';
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div className="text-center">Loading ATM details...</div>
      </div>
    );
  }

  if (!atm) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
        <div className="text-center text-red-600">ATM not found</div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/manager/atms">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to ATMs
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon()}
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {atm.name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-gray-600">
                <span>ATM Code: {atm.code}</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {atm.branch.name}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={atm.isActive ? 'success' : 'secondary'} className="text-lg px-4 py-2">
              {getStatusText()}
            </Badge>
            <Link href={`/tickets/create?atmId=${atm.id}`}>
              <Button>
                <Ticket className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atm._count.incidents}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {atm.incidents.filter(i => i.status !== 'RESOLVED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Last Heartbeat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {atm.lastHeartbeat 
                ? new Date(atm.lastHeartbeat).toLocaleString()
                : 'Never'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {new Date(atm.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Incidents ({atm.incidents.length})</TabsTrigger>
          <TabsTrigger value="tickets">Recent Tickets ({atm.recentTickets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>ATM Information</CardTitle>
              <CardDescription>
                Details about this ATM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{atm.location || 'Not specified'}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">IP Address</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="font-mono">{atm.ipAddress || 'Not configured'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Coordinates</label>
                    <div className="mt-1">
                      {atm.latitude && atm.longitude ? (
                        <span className="font-mono text-sm">
                          {atm.latitude}, {atm.longitude}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not available</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Branch</label>
                    <div className="mt-1">
                      <Link 
                        href={`/admin/branches/${atm.branch.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {atm.branch.name} ({atm.branch.code})
                      </Link>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{new Date(atm.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <Badge variant={atm.isActive ? 'success' : 'secondary'}>
                        {atm.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents">
          <Card>
            <CardHeader>
              <CardTitle>Incident History</CardTitle>
              <CardDescription>
                All incidents reported for this ATM
              </CardDescription>
            </CardHeader>
            <CardContent>
              {atm.incidents.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No incidents recorded</p>
              ) : (
                <div className="space-y-4">
                  {atm.incidents.map((incident) => (
                    <div key={incident.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityBadgeVariant(incident.severity)}>
                              {incident.severity}
                            </Badge>
                            <Badge variant={
                              incident.status === 'RESOLVED' ? 'success' : 'default'
                            }>
                              {incident.status}
                            </Badge>
                            <span className="font-medium">{incident.type}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{incident.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Created: {new Date(incident.createdAt).toLocaleString()}
                            </span>
                            {incident.resolvedAt && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Resolved: {new Date(incident.resolvedAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
              <CardDescription>
                Latest tickets related to this ATM
              </CardDescription>
            </CardHeader>
            <CardContent>
              {atm.recentTickets.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No tickets found</p>
              ) : (
                <div className="space-y-4">
                  {atm.recentTickets.map((ticket) => (
                    <div key={ticket.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Link 
                            href={`/tickets/${ticket.id}`}
                            className="font-medium hover:underline"
                          >
                            {ticket.title}
                          </Link>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.user.name}
                            </span>
                            {ticket.assignedTo && (
                              <span>Assigned to: {ticket.assignedTo.name}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            ticket.priority === 'URGENT' ? 'destructive' :
                            ticket.priority === 'HIGH' ? 'warning' :
                            'secondary'
                          }>
                            {ticket.priority}
                          </Badge>
                          <Badge variant={
                            ticket.status === 'OPEN' ? 'default' :
                            ticket.status === 'IN_PROGRESS' ? 'warning' :
                            ticket.status === 'RESOLVED' ? 'success' :
                            'secondary'
                          }>
                            {ticket.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}