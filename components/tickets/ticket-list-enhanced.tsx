'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BranchSelect } from '@/components/ui/branch-select';
import { Loader2, Search, Plus, Eye, Clock, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatRelativeTime, getPriorityColor, getStatusColor } from '@/lib/utils';

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
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
}

interface TicketListProps {
  onCreateTicket?: () => void;
  onViewTicket?: (ticketId: string) => void;
}

export function TicketListEnhanced({ onCreateTicket, onViewTicket }: TicketListProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [branches, setBranches] = useState<{id: string, name: string, code: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 10;

  useEffect(() => {
    loadBranches();
  }, [session]);

  useEffect(() => {
    loadTickets();
  }, [currentPage, searchTerm, statusFilter, priorityFilter, branchFilter]);

  const loadBranches = async () => {
    try {
      // Only admins can see and filter by all branches
      if (session?.user?.role === 'ADMIN') {
        const response = await fetch('/api/admin/branches?limit=100&status=active');
        if (response.ok) {
          const data = await response.json();
          setBranches(data.branches);
        }
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (priorityFilter !== 'ALL') {
        params.append('priority', priorityFilter);
      }
      if (branchFilter !== 'ALL') {
        params.append('branchId', branchFilter);
      }

      const response = await fetch(`/api/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.total);
      } else {
        toast.error('Failed to load tickets');
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePriorityFilter = (value: string) => {
    setPriorityFilter(value);
    setCurrentPage(1);
  };

  const handleBranchFilter = (value: string) => {
    setBranchFilter(value);
    setCurrentPage(1);
  };

  const handleViewTicket = (ticketId: string) => {
    if (onViewTicket) {
      onViewTicket(ticketId);
    } else {
      router.push(`/tickets/${ticketId}`);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'default';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'RESOLVED':
        return 'outline';
      case 'CLOSED':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      case 'LOW':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="mt-2 text-gray-600">
            {totalCount > 0 ? `${totalCount} tickets found` : 'No tickets found'}
          </p>
        </div>
        <Button onClick={onCreateTicket} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={handleStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={handlePriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Branch Filter - Only visible to admins */}
            {session?.user?.role === 'ADMIN' && branches.length > 0 && (
              <BranchSelect
                branches={branches}
                value={branchFilter}
                onValueChange={handleBranchFilter}
                placeholder="Filter by branch"
                allOption={true}
                allOptionLabel="All Branches"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500">
              <h3 className="text-lg font-medium mb-2">No tickets found</h3>
              <p className="mb-4">Try adjusting your search criteria or create a new ticket.</p>
              <Button onClick={onCreateTicket} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Ticket
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Ticket Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        #{ticket.ticketNumber}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </div>

                    {/* Ticket Title */}
                    <h4 className="text-base font-medium text-gray-800 mb-2 line-clamp-1">
                      {ticket.title}
                    </h4>

                    {/* Ticket Description */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {ticket.description}
                    </p>

                    {/* Ticket Meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{ticket.createdBy.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatRelativeTime(ticket.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Service: {ticket.service.name}</span>
                      </div>
                      {ticket._count.comments > 0 && (
                        <div className="flex items-center gap-1">
                          <span>{ticket._count.comments} comments</span>
                        </div>
                      )}
                      {ticket.branch && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{ticket.branch.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Assignment */}
                    {ticket.assignedTo && (
                      <div className="mt-2 text-sm text-gray-600">
                        Assigned to: {ticket.assignedTo.name}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewTicket(ticket.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} tickets
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}