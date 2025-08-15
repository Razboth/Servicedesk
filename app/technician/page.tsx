'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, User, AlertCircle, CheckCircle, ArrowRight, Plus, Eye, X, Edit } from 'lucide-react';

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
}

interface TechnicianStats {
  assigned: number;
  unassigned: number;
  resolvedToday: number;
  avgResolutionTime: string;
}

export default function TechnicianWorkbench() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TechnicianStats>({
    assigned: 0,
    unassigned: 0,
    resolvedToday: 0,
    avgResolutionTime: '0h'
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assigned');
  const [error, setError] = useState<string | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('IN_PROGRESS');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionComment, setResolutionComment] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [resolveTicketId, setResolveTicketId] = useState<string | null>(null);
  const [selectedResolutionStatus, setSelectedResolutionStatus] = useState<string>('RESOLVED');

  useEffect(() => {
    if (session?.user?.role !== 'TECHNICIAN') {
      return;
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTickets();
    }
  }, [session]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        
        // Calculate stats
        const assigned = data.tickets?.filter((t: Ticket) => t.assignedTo?.id === session?.user?.id) || [];
        const unassigned = data.tickets?.filter((t: Ticket) => !t.assignedTo && t.status !== 'PENDING_APPROVAL') || [];
        const resolvedToday = data.tickets?.filter((t: Ticket) => 
          t.assignedTo?.id === session?.user?.id && 
          t.status === 'RESOLVED' && 
          new Date(t.updatedAt).toDateString() === new Date().toDateString()
        ) || [];
        
        setStats({
          assigned: assigned.length,
          unassigned: unassigned.length,
          resolvedToday: resolvedToday.length,
          avgResolutionTime: '2.5h' // Placeholder - would calculate from actual data
        });
      }
    } catch (error) {
      setError('Failed to load tickets');
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const openClaimModal = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setSelectedStatus('IN_PROGRESS');
    setClaimModalOpen(true);
  };

  const claimTicket = async () => {
    if (!selectedTicketId) return;
    
    try {
      // First assign the ticket
      const assignResponse = await fetch(`/api/tickets/${selectedTicketId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignedToId: session?.user?.id }),
      });
      
      if (assignResponse.ok) {
        // Then update the status if it's different from OPEN
        if (selectedStatus !== 'OPEN') {
          await fetch(`/api/tickets/${selectedTicketId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: selectedStatus }),
          });
        }
        
        setClaimModalOpen(false);
        setSelectedTicketId(null);
        fetchTickets(); // Refresh the list
      }
    } catch (error) {
      console.error('Error claiming ticket:', error);
      alert('Failed to claim ticket');
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        fetchTickets(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status');
    }
  };

  const handleResolveClick = (ticketId: string) => {
    setResolveTicketId(ticketId);
    setShowResolveModal(true);
  };

  const handleResolutionSubmit = async () => {
    if (!resolveTicketId) return;
    
    setIsSubmittingResolution(true);
    
    try {
      // Add resolution comment if provided
      if (resolutionComment.trim()) {
        await fetch(`/api/tickets/${resolveTicketId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: resolutionComment.trim(),
            isInternal: false
          }),
        });
      }
      
      // Update ticket status
      await updateTicketStatus(resolveTicketId, selectedResolutionStatus);
      
      // Close modal and reset state
      handleModalClose();
    } catch (error) {
      console.error('Error submitting resolution:', error);
      alert('Failed to submit resolution');
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const handleModalClose = () => {
    setShowResolveModal(false);
    setResolutionComment('');
    setResolveTicketId(null);
    setSelectedResolutionStatus('RESOLVED');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTicketCard = (ticket: Ticket, showClaimButton = false) => (
    <Card key={ticket.id} className="mb-4 min-h-[200px]">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold mb-2">{ticket.title}</CardTitle>
            <CardDescription className="text-base">
              {ticket.service?.name} • Created {new Date(ticket.createdAt).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className={getPriorityColor(ticket.priority)}>
              {ticket.priority}
            </Badge>
            <Badge className={getStatusColor(ticket.status)}>
              {ticket.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-between h-full">
        <div className="mb-6">
          <p className="text-gray-600 text-base leading-relaxed">{ticket.description}</p>
        </div>
        <div className="flex justify-between items-center mt-auto">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {ticket.createdBy?.name || 'Unknown'}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {new Date(ticket.createdAt).toLocaleTimeString()}
            </div>
          </div>
          <div className="flex gap-2">
            {showClaimButton && (
              <Button
                size="sm"
                onClick={() => openClaimModal(ticket.id)}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Claim
              </Button>
            )}
            {!showClaimButton && ticket.status === 'OPEN' && (
              <Button
                size="sm"
                onClick={() => updateTicketStatus(ticket.id, 'IN_PROGRESS')}
                className="flex items-center gap-1"
              >
                <AlertCircle className="h-4 w-4" />
                Start Work
              </Button>
            )}
            {!showClaimButton && (ticket.status === 'IN_PROGRESS' || ticket.status === 'RESOLVED') && (
              <Button
                size="sm"
                onClick={() => handleResolveClick(ticket.id)}
                className="flex items-center gap-1"
              >
                <Edit className="h-4 w-4" />
                Update Status
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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

  const assignedTickets = tickets.filter(ticket => ticket.assignedToId === session?.user?.id);
  const unassignedTickets = tickets.filter(ticket => !ticket.assignedToId);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Technician Workbench</h1>
            <p className="mt-2 text-gray-600">Manage and process your assigned tickets</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned Tickets</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.assigned}</div>
                <p className="text-xs text-muted-foreground">Currently assigned to you</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Tickets</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unassigned}</div>
                <p className="text-xs text-muted-foreground">Unassigned tickets</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.resolvedToday}</div>
                <p className="text-xs text-muted-foreground">Tickets completed today</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgResolutionTime}</div>
                <p className="text-xs text-muted-foreground">Average resolution time</p>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="w-full">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('assigned')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'assigned'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Tickets ({assignedTickets.length})
                </button>
                <button
                  onClick={() => setActiveTab('available')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'available'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Available ({unassignedTickets.length})
                </button>
              </nav>
            </div>
            
            {activeTab === 'assigned' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">My Assigned Tickets</h2>
                  <Badge variant="outline">{assignedTickets.length} tickets</Badge>
                </div>
                
                {assignedTickets.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <User className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned tickets</h3>
                      <p className="text-gray-500 text-center max-w-sm">
                        You don't have any tickets assigned to you right now. Check the available tickets to claim some work.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {assignedTickets.map(ticket => renderTicketCard(ticket, false))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'available' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Available Tickets</h2>
                  <Badge variant="outline">{unassignedTickets.length} tickets</Badge>
                </div>
                
                {unassignedTickets.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No available tickets</h3>
                      <p className="text-gray-500 text-center max-w-sm">
                        All tickets are currently assigned. Great job team!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {unassignedTickets.map(ticket => renderTicketCard(ticket, true))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Claim Ticket Modal */}
      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Claim Ticket</DialogTitle>
            <DialogDescription>
              Select the initial status for this ticket when you claim it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <div className="col-span-3">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              <strong>Open:</strong> Ticket is claimed but work hasn't started yet<br/>
              <strong>In Progress:</strong> Work has begun on this ticket<br/>
              <strong>Closed:</strong> Issue has been fixed and ticket is complete
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={claimTicket}>
              Claim Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolution Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
            <DialogDescription>
              Add an optional comment and select the new status for this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status-select">New Status</Label>
              <Select value={selectedResolutionStatus} onValueChange={setSelectedResolutionStatus}>
                <SelectTrigger id="status-select">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="PENDING_VENDOR">Pending Vendor</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution-comment">Comment (Optional)</Label>
              <Textarea
                id="resolution-comment"
                placeholder="Add a comment about this status change..."
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleModalClose}
              disabled={isSubmittingResolution}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolutionSubmit}
              disabled={isSubmittingResolution}
            >
              {isSubmittingResolution ? 'Processing...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}