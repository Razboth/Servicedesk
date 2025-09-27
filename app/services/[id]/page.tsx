'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ExternalLink, Filter, Clock, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt?: string;
  closedAt?: string;
  customerName?: string;
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
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  slaTracking?: {
    responseDeadline: string;
    resolutionDeadline: string;
    isResponseBreached: boolean;
    isResolutionBreached: boolean;
  };
}

interface Service {
  id: string;
  name: string;
  defaultTitle: string;
  description?: string;
  slaHours?: number;
  priority?: string;
  isActive: boolean;
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-500',
  IN_PROGRESS: 'bg-yellow-500',
  RESOLVED: 'bg-green-500',
  CLOSED: 'bg-gray-500',
  ON_HOLD: 'bg-orange-500',
  CANCELLED: 'bg-red-500',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-500',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;

  const [service, setService] = useState<Service | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    fetchServiceDetails();
    fetchTickets();
  }, [serviceId, page, pageSize, statusFilter, priorityFilter]);

  const fetchServiceDetails = async () => {
    try {
      const response = await fetch(`/api/services/${serviceId}`);
      if (response.ok) {
        const data = await response.json();
        setService(data);
      }
    } catch (error) {
      console.error('Error fetching service:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(statusFilter && { status: statusFilter }),
        ...(priorityFilter && { priority: priorityFilter }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/services/${serviceId}/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchTickets();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertCircle className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CLOSED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatSLAStatus = (slaTracking: any) => {
    if (!slaTracking) return null;

    const now = new Date();
    const resolutionDeadline = new Date(slaTracking.resolutionDeadline);
    const isOverdue = now > resolutionDeadline;

    if (slaTracking.isResolutionBreached) {
      return <Badge variant="destructive">SLA Breached</Badge>;
    }

    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }

    const hoursRemaining = Math.floor((resolutionDeadline.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursRemaining < 4) {
      return <Badge variant="outline" className="border-orange-500 text-orange-500">Due Soon</Badge>;
    }

    return <Badge variant="outline" className="border-green-500 text-green-500">On Track</Badge>;
  };

  if (!service) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Service Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{service.name}</CardTitle>
              <CardDescription className="mt-2">
                {service.defaultTitle || service.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {service.isActive ? (
                <Badge variant="outline" className="border-green-500 text-green-500">Active</Badge>
              ) : (
                <Badge variant="outline" className="border-red-500 text-red-500">Inactive</Badge>
              )}
              {service.slaHours && (
                <Badge variant="outline">SLA: {service.slaHours}h</Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total Tickets</div>
          </CardContent>
        </Card>
        {Object.entries(stats.byStatus || {}).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{count as number}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                {status.replace('_', ' ')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SLA Performance Metrics */}
      {stats.sla && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Overall SLA Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${
                  parseFloat(stats.sla.performance.overall) >= 90 ? 'text-green-600' :
                  parseFloat(stats.sla.performance.overall) >= 75 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.sla.performance.overall}%
                </span>
                <span className="text-sm text-muted-foreground">
                  ({stats.sla.met} / {stats.sla.total} met)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Response SLA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${
                  parseFloat(stats.sla.performance.response) >= 90 ? 'text-green-600' :
                  parseFloat(stats.sla.performance.response) >= 75 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.sla.performance.response}%
                </span>
                <span className="text-sm text-muted-foreground">
                  ({stats.sla.total - stats.sla.breached.response} / {stats.sla.total})
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resolution SLA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${
                  parseFloat(stats.sla.performance.resolution) >= 90 ? 'text-green-600' :
                  parseFloat(stats.sla.performance.resolution) >= 75 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.sla.performance.resolution}%
                </span>
                <span className="text-sm text-muted-foreground">
                  ({stats.sla.total - stats.sla.breached.resolution} / {stats.sla.total})
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SLA Breaches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Response:</span>
                  <span className={`font-medium ${stats.sla.breached.response > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.sla.breached.response}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Resolution:</span>
                  <span className={`font-medium ${stats.sla.breached.resolution > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.sla.breached.resolution}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className={`font-bold ${stats.sla.breached.total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats.sla.breached.total}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by ticket number, title, or customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("")}
              >
                All Status
              </Button>
              <Button
                variant={statusFilter === "OPEN" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("OPEN")}
              >
                Open
              </Button>
              <Button
                variant={statusFilter === "IN_PROGRESS" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("IN_PROGRESS")}
              >
                In Progress
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={priorityFilter === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter("")}
              >
                All Priority
              </Button>
              <Button
                variant={priorityFilter === "HIGH" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter("HIGH")}
              >
                High
              </Button>
              <Button
                variant={priorityFilter === "CRITICAL" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter("CRITICAL")}
              >
                Critical
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      No tickets found for this service
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Link
                          href={`/tickets/${ticket.ticketNumber}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          #{ticket.ticketNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[300px] truncate" title={ticket.title}>
                          {ticket.title}
                        </div>
                      </TableCell>
                      <TableCell>{ticket.customerName || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(ticket.status)}
                          <Badge
                            variant="outline"
                            className={`border-0 ${statusColors[ticket.status]} text-white`}
                          >
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border-0 ${priorityColors[ticket.priority]} text-white`}
                        >
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{ticket.assignedTo?.name || 'Unassigned'}</TableCell>
                      <TableCell>{ticket.branch?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>{formatSLAStatus(ticket.slaTracking)}</TableCell>
                      <TableCell>
                        <Link href={`/tickets/${ticket.ticketNumber}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} tickets
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNumber = i + 1;
                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => setPage(pageNumber)}
                          isActive={page === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}