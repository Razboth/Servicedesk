'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface VendorTicket {
  id: string;
  vendorTicketNumber: string;
  status: string;
  createdAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
    createdBy: {
      name: string;
      email: string;
    };
    branch: {
      name: string;
      code: string;
    };
    service: {
      name: string;
    };
  };
  assignedBy: {
    name: string;
    email: string;
  };
}

interface VendorDetails {
  id: string;
  name: string;
  code: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  serviceTypes: string[];
  contractStartDate: string | null;
  contractEndDate: string | null;
  slaResponseTime: number;
  slaResolutionTime: number;
  notes: string | null;
  isActive: boolean;
  vendorTickets: VendorTicket[];
  metrics: {
    totalTickets: number;
    activeTickets: number;
    pendingTickets: number;
    resolvedTickets: number;
    avgResponseTimeHours: number;
    avgResolutionTimeHours: number;
    slaResponseCompliance: number;
    slaResolutionCompliance: number;
  };
}

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    fetchVendorDetails();
  }, [session, params.id]);

  const fetchVendorDetails = async () => {
    try {
      const response = await fetch(`/api/vendors/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      } else {
        console.error('Failed to fetch vendor details');
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading vendor details...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Vendor not found</p>
          <Button onClick={() => router.push('/admin/vendors')} className="mt-4">
            Back to Vendors
          </Button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const statusDistribution = [
    { name: 'Active', value: vendor.metrics.activeTickets, color: '#f59e0b' },
    { name: 'Pending', value: vendor.metrics.pendingTickets, color: '#3b82f6' },
    { name: 'Resolved', value: vendor.metrics.resolvedTickets, color: '#10b981' },
  ];

  const slaComplianceData = [
    { name: 'Response SLA', compliance: vendor.metrics.slaResponseCompliance, target: 100 },
    { name: 'Resolution SLA', compliance: vendor.metrics.slaResolutionCompliance, target: 100 },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'PENDING': 'secondary',
      'IN_PROGRESS': 'warning',
      'RESOLVED': 'success',
      'CANCELLED': 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      'LOW': 'secondary',
      'MEDIUM': 'default',
      'HIGH': 'warning',
      'URGENT': 'destructive'
    };
    return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/vendors')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{vendor.name}</h1>
            <p className="text-muted-foreground">Vendor Code: {vendor.code}</p>
          </div>
        </div>
        <Badge variant={vendor.isActive ? 'success' : 'secondary'} className="text-lg px-4 py-2">
          {vendor.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Vendor Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vendor.contactPerson && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{vendor.contactPerson}</span>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{vendor.email}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{vendor.phone}</span>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{vendor.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contract Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {vendor.contractStartDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Start: {format(new Date(vendor.contractStartDate), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
            {vendor.contractEndDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  End: {format(new Date(vendor.contractEndDate), 'MMM dd, yyyy')}
                </span>
              </div>
            )}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">Service Types</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {vendor.serviceTypes.map((type) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">SLA Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm">Response Time</span>
                <span className="text-sm font-medium">{vendor.slaResponseTime}h</span>
              </div>
              <Progress value={vendor.metrics.slaResponseCompliance} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {vendor.metrics.slaResponseCompliance}% Compliance
              </p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm">Resolution Time</span>
                <span className="text-sm font-medium">{vendor.slaResolutionTime}h</span>
              </div>
              <Progress value={vendor.metrics.slaResolutionCompliance} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {vendor.metrics.slaResolutionCompliance}% Compliance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tickets</p>
                <p className="text-3xl font-bold">{vendor.metrics.totalTickets}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tickets</p>
                <p className="text-3xl font-bold">{vendor.metrics.activeTickets}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-3xl font-bold">{vendor.metrics.avgResponseTimeHours}h</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Resolution</p>
                <p className="text-3xl font-bold">{vendor.metrics.avgResolutionTimeHours}h</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tickets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={slaComplianceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="compliance" fill="#10b981" name="Actual" />
                    <Bar dataKey="target" fill="#e5e7eb" name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
              <CardDescription>
                Tickets assigned to {vendor.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Vendor Ticket</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Response Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendor.vendorTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No tickets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendor.vendorTickets.map((vendorTicket) => {
                      const responseTime = vendorTicket.respondedAt
                        ? Math.round(
                            (new Date(vendorTicket.respondedAt).getTime() -
                              new Date(vendorTicket.createdAt).getTime()) /
                              (1000 * 60 * 60)
                          )
                        : null;
                      return (
                        <TableRow 
                          key={vendorTicket.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/tickets/${vendorTicket.ticket.id}`)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{vendorTicket.ticket.ticketNumber}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {vendorTicket.ticket.title}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {vendorTicket.vendorTicketNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {vendorTicket.ticket.service?.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {vendorTicket.ticket.branch.name}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(vendorTicket.status)}</TableCell>
                          <TableCell>{getPriorityBadge(vendorTicket.ticket.priority)}</TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {format(new Date(vendorTicket.createdAt), 'MMM dd, HH:mm')}
                            </span>
                          </TableCell>
                          <TableCell>
                            {responseTime !== null ? (
                              <Badge
                                variant={
                                  responseTime <= vendor.slaResponseTime
                                    ? 'success'
                                    : 'destructive'
                                }
                              >
                                {responseTime}h
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Response Time Performance</p>
                      <div className="flex items-center gap-2">
                        {vendor.metrics.slaResponseCompliance >= 90 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-2xl font-bold">
                          {vendor.metrics.slaResponseCompliance}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Average: {vendor.metrics.avgResponseTimeHours}h / Target: {vendor.slaResponseTime}h
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Resolution Time Performance</p>
                      <div className="flex items-center gap-2">
                        {vendor.metrics.slaResolutionCompliance >= 90 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-2xl font-bold">
                          {vendor.metrics.slaResolutionCompliance}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Average: {vendor.metrics.avgResolutionTimeHours}h / Target: {vendor.slaResolutionTime}h
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}