'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Search,
  Filter,
  Zap,
  Timer,
  RefreshCw,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  assignedToId?: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  service: {
    id: string;
    name: string;
    category: {
      name: string;
    };
  };
  _count: {
    comments: number;
  };
  branch?: {
    name: string;
  };
  slaHours?: number;
}

interface TechnicianStats {
  assigned: number;
  available: number;
  resolvedToday: number;
  avgResolutionTime: string;
  slaCompliance: number;
}

interface Filters {
  search: string;
  status: string;
  priority: string;
  category: string;
  assigned: string;
  timeRange: string;
}

export default function TechnicianWorkbenchTable() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TechnicianStats>({
    assigned: 0,
    available: 0,
    resolvedToday: 0,
    avgResolutionTime: '0h',
    slaCompliance: 95
  });
  
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    priority: 'all',
    category: 'all',
    assigned: 'mine_and_available',
    timeRange: 'all'
  });

  useEffect(() => {
    if (session?.user?.role !== 'TECHNICIAN') {
      return;
    }
    fetchTickets();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, [session, filters, sortField, sortOrder]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(filters.search && { search: filters.search }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.priority !== 'all' && { priority: filters.priority }),
        sortBy: sortField,
        sortOrder,
        limit: '50'
      });
      
      // Handle assignment filter
      if (filters.assigned === 'mine') {
        params.append('assignedTo', session?.user?.id || '');
      } else if (filters.assigned === 'available') {
        params.append('assignedTo', '');
      } else if (filters.assigned === 'mine_and_available') {
        params.append('mineAndAvailable', session?.user?.id || '');
      }

      const response = await fetch(`/api/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        
        // Calculate stats
        const allTickets = data.tickets || [];
        const myTickets = allTickets.filter((t: Ticket) => t.assignedToId === session?.user?.id);
        const availableTickets = allTickets.filter((t: Ticket) => !t.assignedToId && t.status !== 'PENDING_APPROVAL');
        const resolvedToday = myTickets.filter((t: Ticket) => 
          t.status === 'RESOLVED' && 
          new Date(t.updatedAt).toDateString() === new Date().toDateString()
        );
        
        setStats({
          assigned: myTickets.length,
          available: availableTickets.length,
          resolvedToday: resolvedToday.length,
          avgResolutionTime: '2.3h',
          slaCompliance: 94
        });
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickClaim = async (ticketId: string) => {
    setClaiming(prev => [...prev, ticketId]);
    
    try {
      // Auto-claim and set to IN_PROGRESS
      const assignResponse = await fetch(`/api/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: session?.user?.id }),
      });
      
      if (assignResponse.ok) {
        await fetch(`/api/tickets/${ticketId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IN_PROGRESS' }),
        });
        
        toast.success('Ticket claimed and work started!');
        fetchTickets();
      }
    } catch (error) {
      console.error('Error claiming ticket:', error);
      toast.error('Failed to claim ticket');
    } finally {
      setClaiming(prev => prev.filter(id => id !== ticketId));
    }
  };

  const handleBulkClaim = async () => {
    if (selectedTickets.length === 0) return;
    
    try {
      const response = await fetch('/api/tickets/bulk-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticketIds: selectedTickets,
          status: 'IN_PROGRESS'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedTickets([]);
        toast.success(result.message);
        fetchTickets();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to claim tickets');
      }
    } catch (error) {
      console.error('Error in bulk claim:', error);
      toast.error('Failed to claim tickets');
    }
  };

  const handleStatusUpdate = async (ticketId: string, status: string) => {
    try {
      await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      toast.success(`Ticket ${status.toLowerCase()}`);
      fetchTickets();
    } catch (error) {
      toast.error('Failed to update ticket');
    }
  };

  const calculateSLATimeRemaining = (ticket: Ticket) => {
    if (!ticket.slaHours) return null;
    
    const createdAt = new Date(ticket.createdAt);
    const slaDeadline = new Date(createdAt.getTime() + (ticket.slaHours * 60 * 60 * 1000));
    const now = new Date();
    const timeRemaining = slaDeadline.getTime() - now.getTime();
    
    if (timeRemaining <= 0) return { expired: true, text: 'SLA Breached' };
    
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    return {
      expired: false,
      text: `${hours}h ${minutes}m`,
      urgent: hours < 2,
      warning: hours < 6
    };
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      if (filters.assigned === 'mine' && ticket.assignedToId !== session?.user?.id) return false;
      if (filters.assigned === 'available' && ticket.assignedToId) return false;
      if (filters.status !== 'all' && ticket.status !== filters.status) return false;
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false;
      if (filters.search && !ticket.title.toLowerCase().includes(filters.search.toLowerCase()) && 
          !ticket.ticketNumber.toLowerCase().includes(filters.search.toLowerCase())) return false;
      
      return true;
    });
  }, [tickets, filters, session?.user?.id]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'RESOLVED': return 'bg-green-100 text-green-800 border-green-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading workbench...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to technicians and security analysts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Technician Workbench</h1>
                <p className="mt-2 text-gray-600">Advanced table view with smart filtering and one-click claiming</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={fetchTickets}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                {selectedTickets.length > 0 && (
                  <Button 
                    onClick={handleBulkClaim}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Zap className="h-4 w-4" />
                    Claim & Start {selectedTickets.length} Tickets
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Tickets</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.assigned}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.available}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.resolvedToday}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgResolutionTime}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.slaCompliance}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search tickets..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Assignment</Label>
                  <Select 
                    value={filters.assigned} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, assigned: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mine_and_available">My Tickets + Available</SelectItem>
                      <SelectItem value="available">Available Only</SelectItem>
                      <SelectItem value="mine">My Tickets Only</SelectItem>
                      <SelectItem value="all">All Tickets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={filters.priority} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quick Filters</Label>
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setFilters(prev => ({ ...prev, priority: 'CRITICAL', status: 'all' }))}
                    >
                      Critical Priority
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setFilters(prev => ({ ...prev, assigned: 'available', status: 'OPEN' }))}
                    >
                      New Available
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => setFilters(prev => ({ ...prev, assigned: 'mine', status: 'IN_PROGRESS' }))}
                    >
                      My Active Work
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Tickets</CardTitle>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  Click any row to view ticket details
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedTickets.length === filteredTickets.length && filteredTickets.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTickets(filteredTickets.map(t => t.id));
                            } else {
                              setSelectedTickets([]);
                            }
                          }}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('ticketNumber')}
                      >
                        <div className="flex items-center gap-1">
                          Ticket # <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center gap-1">
                          Title <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('priority')}
                      >
                        <div className="flex items-center gap-1">
                          Priority <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-1">
                          Created <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>SLA Timer</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => {
                      const slaInfo = calculateSLATimeRemaining(ticket);
                      const isSelected = selectedTickets.includes(ticket.id);
                      const isClaiming = claiming.includes(ticket.id);
                      
                      return (
                        <TableRow 
                          key={ticket.id} 
                          className={`${isSelected ? 'bg-blue-50' : ''} cursor-pointer hover:bg-gray-50 transition-colors group`}
                          onClick={(e) => {
                            // Don't navigate if clicking on interactive elements
                            if ((e.target as HTMLElement).closest('button, input, a')) return;
                            router.push(`/tickets/${ticket.id}`);
                          }}
                          title="Click to view ticket details"
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTickets(prev => [...prev, ticket.id]);
                                } else {
                                  setSelectedTickets(prev => prev.filter(id => id !== ticket.id));
                                }
                              }}
                              className="rounded"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {ticket.ticketNumber}
                              <Eye className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={ticket.title}>
                              {ticket.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={ticket.service.name}>
                              {ticket.service.name}
                            </div>
                          </TableCell>
                          <TableCell>{ticket.createdBy.name}</TableCell>
                          <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {slaInfo && (
                              <div className={`text-sm ${
                                slaInfo.expired ? 'text-red-600 font-semibold' :
                                slaInfo.urgent ? 'text-orange-600 font-medium' :
                                slaInfo.warning ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {slaInfo.text}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {!ticket.assignedToId && (
                                <Button
                                  size="sm"
                                  onClick={() => handleQuickClaim(ticket.id)}
                                  disabled={isClaiming}
                                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                                  title="Claim ticket and start work"
                                >
                                  {isClaiming ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Zap className="h-3 w-3" />
                                  )}
                                  Claim & Start
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              
                              {ticket.assignedToId === session?.user?.id && (
                                <div className="flex gap-1">
                                  {ticket.status === 'OPEN' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(ticket.id, 'IN_PROGRESS')}
                                      title="Start Work"
                                    >
                                      <AlertCircle className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {ticket.status === 'IN_PROGRESS' && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleStatusUpdate(ticket.id, 'RESOLVED')}
                                      title="Mark Resolved"
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {filteredTickets.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                  <p className="text-gray-500">
                    {filters.search || filters.status !== 'all' || filters.priority !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'No tickets available at the moment'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}