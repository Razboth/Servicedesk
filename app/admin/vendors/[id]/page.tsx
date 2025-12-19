'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  User,
  Search,
  Hash,
  Activity,
  BarChart3,
  Globe,
  ClockIcon
} from 'lucide-react';
import { format, differenceInHours, differenceInDays } from 'date-fns';
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
import { toast } from 'sonner';

interface VendorTicket {
  id: string;
  vendorTicketNumber: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  notes: string | null;
  createdAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    createdBy: {
      name: string;
      email: string;
    };
    branch?: {
      name: string;
      code: string;
    };
    service: {
      name: string;
      category?: {
        name: string;
      };
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
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  supportHours: string | null;
  slaResponseTime: number | null;
  slaResolutionTime: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

export default function VendorDetailsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const vendorId = params?.id as string;

  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [vendorTickets, setVendorTickets] = useState<VendorTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }
    if (vendorId) {
      fetchVendorDetails();
      fetchVendorTickets();
    }
  }, [session, vendorId]);

  const fetchVendorDetails = async () => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`);
      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      } else {
        toast.error('Failed to fetch vendor details');
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      toast.error('Failed to fetch vendor details');
    }
  };

  const fetchVendorTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateRange !== 'all') {
        const today = new Date();
        let fromDate = new Date();
        
        switch (dateRange) {
          case '7days':
            fromDate.setDate(today.getDate() - 7);
            break;
          case '30days':
            fromDate.setDate(today.getDate() - 30);
            break;
          case '90days':
            fromDate.setDate(today.getDate() - 90);
            break;
        }
        
        if (dateRange !== 'all') {
          params.append('from', fromDate.toISOString());
          params.append('to', today.toISOString());
        }
      }

      const response = await fetch(`/api/vendors/${vendorId}/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setVendorTickets(data);
      } else {
        toast.error('Failed to fetch vendor tickets');
      }
    } catch (error) {
      console.error('Error fetching vendor tickets:', error);
      toast.error('Failed to fetch vendor tickets');
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const calculateMetrics = () => {
    const total = vendorTickets.length;
    const pending = vendorTickets.filter(t => t.status === 'PENDING').length;
    const inProgress = vendorTickets.filter(t => t.status === 'IN_PROGRESS').length;
    const resolved = vendorTickets.filter(t => t.status === 'RESOLVED').length;
    const cancelled = vendorTickets.filter(t => t.status === 'CANCELLED').length;

    // Response time metrics
    const ticketsWithResponse = vendorTickets.filter(t => t.respondedAt);
    const avgResponseTime = ticketsWithResponse.length > 0
      ? ticketsWithResponse.reduce((sum, t) => {
          const hours = differenceInHours(new Date(t.respondedAt!), new Date(t.createdAt));
          return sum + hours;
        }, 0) / ticketsWithResponse.length
      : 0;

    // Resolution time metrics
    const resolvedTickets = vendorTickets.filter(t => t.resolvedAt);
    const avgResolutionTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const hours = differenceInHours(new Date(t.resolvedAt!), new Date(t.createdAt));
          return sum + hours;
        }, 0) / resolvedTickets.length
      : 0;

    // SLA compliance
    const slaResponseCompliant = ticketsWithResponse.filter(t => {
      if (!vendor?.slaResponseTime) return true;
      const hours = differenceInHours(new Date(t.respondedAt!), new Date(t.createdAt));
      return hours <= vendor.slaResponseTime;
    }).length;

    const slaResolutionCompliant = resolvedTickets.filter(t => {
      if (!vendor?.slaResolutionTime) return true;
      const hours = differenceInHours(new Date(t.resolvedAt!), new Date(t.createdAt));
      return hours <= vendor.slaResolutionTime;
    }).length;

    return {
      total,
      pending,
      inProgress,
      resolved,
      cancelled,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      slaResponseRate: ticketsWithResponse.length > 0 
        ? Math.round((slaResponseCompliant / ticketsWithResponse.length) * 100) 
        : 100,
      slaResolutionRate: resolvedTickets.length > 0 
        ? Math.round((slaResolutionCompliant / resolvedTickets.length) * 100) 
        : 100
    };
  };

  const metrics = calculateMetrics();

  // Prepare chart data
  const statusChartData = [
    { name: 'Pending', value: metrics.pending, color: '#f59e0b' },
    { name: 'In Progress', value: metrics.inProgress, color: '#3b82f6' },
    { name: 'Resolved', value: metrics.resolved, color: '#10b981' },
    { name: 'Cancelled', value: metrics.cancelled, color: '#ef4444' }
  ].filter(item => item.value > 0);

  // Group tickets by month for trend chart
  const monthlyData = vendorTickets.reduce((acc, ticket) => {
    const month = format(new Date(ticket.createdAt), 'MMM yyyy');
    if (!acc[month]) {
      acc[month] = { month, total: 0, resolved: 0 };
    }
    acc[month].total++;
    if (ticket.status === 'RESOLVED') {
      acc[month].resolved++;
    }
    return acc;
  }, {} as Record<string, any>);

  const trendChartData = Object.values(monthlyData).sort((a, b) => {
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  });

  // Group by service category
  const categoryData = vendorTickets.reduce((acc, ticket) => {
    const category = ticket.ticket.service.category?.name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category]++;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value
  }));

  // Filter tickets
  const filteredTickets = vendorTickets.filter(ticket => {
    const matchesSearch = searchTerm === '' || 
      ticket.ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.vendorTicketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'RESOLVED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-gray-100 text-gray-800',
      'MEDIUM': 'bg-blue-100 text-blue-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'CRITICAL': 'bg-red-100 text-red-800',
      'EMERGENCY': 'bg-purple-100 text-purple-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Vendor not found</p>
        <Button onClick={() => router.push('/admin/vendors')} className="mt-4">
          Back to Vendors
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/vendors')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-8 w-8 text-amber-600" />
              {vendor.name}
            </h1>
            <p className="text-gray-600 mt-1">Vendor Code: {vendor.code}</p>
          </div>
        </div>
        <Badge className={vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {vendor.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Contact Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {vendor.contactName && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Contact Person</p>
                  <p className="font-medium">{vendor.contactName}</p>
                </div>
              </div>
            )}
            {vendor.contactEmail && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{vendor.contactEmail}</p>
                </div>
              </div>
            )}
            {vendor.contactPhone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{vendor.contactPhone}</p>
                </div>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Website</p>
                  <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                    {vendor.website}
                  </a>
                </div>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{vendor.address}</p>
                </div>
              </div>
            )}
            {vendor.supportHours && (
              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Support Hours</p>
                  <p className="font-medium">{vendor.supportHours}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{metrics.resolutionRate}%</p>
              {metrics.resolutionRate >= 80 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <Progress value={metrics.resolutionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Response</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.avgResponseTime}h</p>
            {vendor.slaResponseTime && (
              <p className="text-xs text-gray-500 mt-1">SLA: {vendor.slaResponseTime}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.avgResolutionTime}h</p>
            {vendor.slaResolutionTime && (
              <p className="text-xs text-gray-500 mt-1">SLA: {vendor.slaResolutionTime}h</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Response SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{metrics.slaResponseRate}%</p>
              {metrics.slaResponseRate >= 90 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : metrics.slaResponseRate >= 70 ? (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Resolution SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{metrics.slaResolutionRate}%</p>
              {metrics.slaResolutionRate >= 90 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : metrics.slaResolutionRate >= 70 ? (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#f59e0b" name="Total" />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>By Service Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Tickets</CardTitle>
          <CardDescription>All tickets assigned to this vendor</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by ticket number or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Vendor Ticket #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Resolution Time</TableHead>
                  <TableHead>Assigned By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((vendorTicket) => {
                    const responseTime = vendorTicket.respondedAt
                      ? differenceInHours(new Date(vendorTicket.respondedAt), new Date(vendorTicket.createdAt))
                      : null;
                    const resolutionTime = vendorTicket.resolvedAt
                      ? differenceInHours(new Date(vendorTicket.resolvedAt), new Date(vendorTicket.createdAt))
                      : null;

                    return (
                      <TableRow key={vendorTicket.id}>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium"
                            onClick={() => router.push(`/tickets/${vendorTicket.ticket.id}`)}
                          >
                            {vendorTicket.ticket.ticketNumber}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-gray-400" />
                            {vendorTicket.vendorTicketNumber}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {vendorTicket.ticket.title}
                        </TableCell>
                        <TableCell>{vendorTicket.ticket.service.name}</TableCell>
                        <TableCell>{vendorTicket.ticket.branch?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(vendorTicket.ticket.priority)}>
                            {vendorTicket.ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(vendorTicket.status)}>
                            {vendorTicket.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(vendorTicket.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          {responseTime !== null ? (
                            <span className={responseTime <= (vendor.slaResponseTime || 999) ? 'text-green-600' : 'text-red-600'}>
                              {responseTime}h
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {resolutionTime !== null ? (
                            <span className={resolutionTime <= (vendor.slaResolutionTime || 999) ? 'text-green-600' : 'text-red-600'}>
                              {resolutionTime}h
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{vendorTicket.assignedBy.name}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      No tickets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}