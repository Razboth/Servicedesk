'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  User,
  Download,
  Search,
  Filter,
  BarChart3,
  Eye,
  Calendar,
  Building2,
  Wrench
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface TechnicianTicket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  service: {
    name: string;
    category: {
      name: string;
    };
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface TechnicianStats {
  created: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    pending: number;
    cancelled: number;
    rejected: number;
  };
  assigned: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    pending: number;
    cancelled: number;
    rejected: number;
  };
  performance: {
    avgResolutionTimeHours: number;
    resolvedToday: number;
    totalResolved: number;
    resolutionRate: number;
  };
}

interface TechnicianData {
  technician: {
    id: string;
    name: string;
    email: string;
    branchId?: string;
    supportGroupId?: string;
    branch?: {
      id: string;
      name: string;
      code: string;
    };
    supportGroup?: {
      id: string;
      name: string;
    };
  };
  createdTickets: TechnicianTicket[];
  assignedTickets: TechnicianTicket[];
  stats: TechnicianStats;
}

interface TechnicianTicketSummaryProps {
  className?: string;
}

export function TechnicianTicketSummary({ className }: TechnicianTicketSummaryProps) {
  const [technicians, setTechnicians] = useState<TechnicianData[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<TechnicianData[]>([]);
  const [overallStats, setOverallStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianData | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadTechnicianSummary();
  }, [dateRange, statusFilter, branchFilter]);

  useEffect(() => {
    filterTechnicians();
  }, [technicians, searchTerm]);

  const loadTechnicianSummary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (branchFilter !== 'ALL') params.append('branchId', branchFilter);

      const response = await fetch(`/api/reports/technician/tickets-summary?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.technicians || []);
        setOverallStats(data.overallStats || {});
      } else {
        toast.error('Failed to load technician summary');
      }
    } catch (error) {
      console.error('Error loading technician summary:', error);
      toast.error('Failed to load technician summary');
    } finally {
      setLoading(false);
    }
  };

  const filterTechnicians = () => {
    if (!searchTerm) {
      setFilteredTechnicians(technicians);
      return;
    }

    const filtered = technicians.filter(tech =>
      tech.technician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.technician.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.technician.branch?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tech.technician.supportGroup?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTechnicians(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      'Technician Name',
      'Email',
      'Branch',
      'Support Group',
      'Tickets Created',
      'Tickets Assigned', 
      'Tickets Resolved',
      'Resolution Rate (%)',
      'Avg Resolution Time (hrs)',
      'Resolved Today'
    ];

    const rows = filteredTechnicians.map(tech => [
      tech.technician.name,
      tech.technician.email,
      tech.technician.branch?.name || '',
      tech.technician.supportGroup?.name || '',
      tech.stats.created.total,
      tech.stats.assigned.total,
      tech.stats.assigned.resolved,
      tech.stats.performance.resolutionRate,
      tech.stats.performance.avgResolutionTimeHours,
      tech.stats.performance.resolvedToday
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `technician-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'RESOLVED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading technician summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Statistics */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalTechnicians}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalAssignedTickets}</div>
              <p className="text-xs text-muted-foreground">Tickets handled</p>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalResolvedToday}</div>
              <p className="text-xs text-muted-foreground">Across all technicians</p>
            </CardContent>
          </Card>

          <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.avgResolutionTime}h</div>
              <p className="text-xs text-muted-foreground">Average time to resolve</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search technicians..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/[0.5] dark:bg-gray-800/[0.5]"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white/[0.5] dark:bg-gray-800/[0.5]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Input
                type="date"
                placeholder="Start Date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="bg-white/[0.5] dark:bg-gray-800/[0.5]"
              />

              <Input
                type="date"
                placeholder="End Date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="bg-white/[0.5] dark:bg-gray-800/[0.5]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToCSV}
                className="bg-white/[0.5] dark:bg-gray-800/[0.5]"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technician Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTechnicians.map((tech) => (
          <Card key={tech.technician.id} className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">{tech.technician.name}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tech.technician.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {tech.technician.branch && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {tech.technician.branch.name}
                      </div>
                    )}
                    {tech.technician.supportGroup && (
                      <div className="flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {tech.technician.supportGroup.name}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTechnician(tech);
                    setShowTicketDetails(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {tech.stats.created.total}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Created</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {tech.stats.assigned.total}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Assigned</div>
                  </div>
                </div>

                {/* Status Breakdown for Assigned Tickets */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Assigned Tickets Breakdown</h4>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{tech.stats.assigned.open}</div>
                      <div className="text-gray-500">Open</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-600">{tech.stats.assigned.inProgress}</div>
                      <div className="text-gray-500">Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{tech.stats.assigned.resolved}</div>
                      <div className="text-gray-500">Resolved</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-600">{tech.stats.assigned.closed}</div>
                      <div className="text-gray-500">Closed</div>
                    </div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-sm font-semibold">{tech.stats.performance.resolutionRate}%</div>
                    <div className="text-xs text-gray-500">Resolution Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">{tech.stats.performance.avgResolutionTimeHours}h</div>
                    <div className="text-xs text-gray-500">Avg Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">{tech.stats.performance.resolvedToday}</div>
                    <div className="text-xs text-gray-500">Today</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTechnicians.length === 0 && (
        <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No technicians found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No technician data available.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ticket Details Modal */}
      {showTicketDetails && selectedTechnician && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Tickets - {selectedTechnician.technician.name}
                </h3>
                <Button variant="ghost" onClick={() => setShowTicketDetails(false)}>
                  ×
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* Created Tickets */}
                <div>
                  <h4 className="text-md font-medium mb-3">Created Tickets ({selectedTechnician.createdTickets.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTechnician.createdTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{ticket.title}</div>
                          <div className="text-sm text-gray-500">{ticket.service.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {selectedTechnician.createdTickets.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No created tickets</p>
                    )}
                  </div>
                </div>

                {/* Assigned Tickets */}
                <div>
                  <h4 className="text-md font-medium mb-3">Assigned Tickets ({selectedTechnician.assignedTickets.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTechnician.assignedTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{ticket.title}</div>
                          <div className="text-sm text-gray-500">
                            {ticket.service.name} • Created by {ticket.createdBy?.name}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {selectedTechnician.assignedTickets.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No assigned tickets</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}