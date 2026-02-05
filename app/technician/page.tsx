'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getTicketUrlId } from '@/lib/utils/ticket-utils';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ModernDialog, 
  ModernDialogContent, 
  ModernDialogHeader, 
  ModernDialogTitle, 
  ModernDialogDescription, 
  ModernDialogBody, 
  ModernDialogFooter 
} from '@/components/ui/modern-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, User, AlertCircle, CheckCircle, ArrowRight, Plus, Eye, X, Edit, Wrench, BarChart3, Calendar, ClipboardCheck, Circle, CircleDot } from 'lucide-react';
import { TechnicianTicketSummary } from '@/components/technician/ticket-summary';

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

interface ShiftStats {
  serverTime: {
    isDayTime: boolean;
    isNightTime: boolean;
  };
  operationalShifts: {
    today: Array<{
      shiftType: string;
      staffName: string;
      staffId: string;
    }>;
  };
  checklistStatus: Record<string, {
    claimed: boolean;
    claims: Array<{
      userId: string;
      userName: string;
      progress: number;
      status: string;
    }>;
  }>;
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
  const [shiftStats, setShiftStats] = useState<ShiftStats | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssigned, setTotalAssigned] = useState(0);
  const [totalUnassigned, setTotalUnassigned] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    if (session?.user?.role !== 'TECHNICIAN') {
      return;
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchTickets();
      fetchShiftStats();
    }
  }, [session, currentPage]); // Add currentPage dependency

  const fetchShiftStats = async () => {
    try {
      const response = await fetch('/api/shifts/today-stats');
      if (response.ok) {
        const data = await response.json();
        setShiftStats(data);
      }
    } catch (error) {
      console.error('Error fetching shift stats:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      // Build pagination parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      });
      
      const response = await fetch(`/api/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
        
        // Update pagination info
        setTotalPages(data.pagination?.pages || 1);
        
        // Calculate current page stats
        const assigned = data.tickets?.filter((t: Ticket) => t.assignedTo?.id === session?.user?.id) || [];
        const unassigned = data.tickets?.filter((t: Ticket) => !t.assignedTo && t.status !== 'PENDING_APPROVAL') || [];
        const resolvedToday = data.tickets?.filter((t: Ticket) => 
          t.assignedTo?.id === session?.user?.id && 
          t.status === 'RESOLVED' && 
          new Date(t.updatedAt).toDateString() === new Date().toDateString()
        ) || [];
        
        // Get total counts for badges - we need to make separate API calls for accurate counts
        await fetchTotalCounts();
        
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

  const fetchTotalCounts = async () => {
    try {
      // Fetch all tickets for accurate badge counts
      const allResponse = await fetch('/api/tickets?limit=1000'); // Large limit for counting
      if (allResponse.ok) {
        const allData = await allResponse.json();
        const allTickets = allData.tickets || [];
        
        const totalAssignedCount = allTickets.filter((t: Ticket) => t.assignedTo?.id === session?.user?.id).length;
        const totalUnassignedCount = allTickets.filter((t: Ticket) => !t.assignedTo && t.status !== 'PENDING_APPROVAL').length;
        
        setTotalAssigned(totalAssignedCount);
        setTotalUnassigned(totalUnassignedCount);
      }
    } catch (error) {
      console.error('Error fetching total counts:', error);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when switching tabs
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
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading workbench...</p>
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
    <div className="min-h-screen bg-background">
      <main className="w-full py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2 text-brown-900 dark:text-cream-200">
              <Wrench className="h-8 w-8 text-brown-600 dark:text-cream-300" />
              Technician Workbench
            </h1>
            <p className="mt-2 text-brown-600 dark:text-cream-300">Manage and process your assigned tickets</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned Tickets</CardTitle>
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.assigned}</div>
                <p className="text-xs text-muted-foreground">Currently assigned to you</p>
              </CardContent>
            </Card>
            
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Tickets</CardTitle>
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.unassigned}</div>
                <p className="text-xs text-muted-foreground">Unassigned tickets</p>
              </CardContent>
            </Card>
            
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.resolvedToday}</div>
                <p className="text-xs text-muted-foreground">Tickets completed today</p>
              </CardContent>
            </Card>
            
            <Card className="bg-cream-50 dark:bg-warm-dark-300 backdrop-blur-sm border-cream-500 dark:border-warm-dark-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgResolutionTime}</div>
                <p className="text-xs text-muted-foreground">Average resolution time</p>
              </CardContent>
            </Card>
          </div>

          {/* Compact Shift & Checklist Bar */}
          {shiftStats && (
            <Card className="mb-6 bg-cream-50/80 dark:bg-warm-dark-300/80 border-cream-500 dark:border-warm-dark-200">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Current Shift Info */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {shiftStats.serverTime.isDayTime ? 'Shift Siang' : 'Shift Malam'}
                      </span>
                      {shiftStats.operationalShifts.today.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({shiftStats.operationalShifts.today.length} aktif)
                        </span>
                      )}
                    </div>

                    {/* Checklist Status Indicators */}
                    <div className="flex items-center gap-4 border-l pl-4 border-muted">
                      {(() => {
                        const opsType = shiftStats.serverTime.isDayTime ? 'OPS_SIANG' : 'OPS_MALAM';
                        const monType = shiftStats.serverTime.isDayTime ? 'MONITORING_SIANG' : 'MONITORING_MALAM';
                        const opsStatus = shiftStats.checklistStatus[opsType];
                        const monStatus = shiftStats.checklistStatus[monType];
                        const opsClaim = opsStatus?.claims?.[0];
                        const monClaim = monStatus?.claims?.[0];

                        return (
                          <>
                            {/* OPS Checklist */}
                            <div className="flex items-center gap-1.5">
                              {opsClaim ? (
                                opsClaim.progress === 100 ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                ) : (
                                  <CircleDot className="h-3.5 w-3.5 text-blue-600" />
                                )
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              <span className="text-xs">
                                OPS {opsClaim ? `${opsClaim.progress}%` : '-'}
                              </span>
                            </div>

                            {/* MONITORING Checklist */}
                            <div className="flex items-center gap-1.5">
                              {monClaim ? (
                                monClaim.progress === 100 ? (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                ) : (
                                  <CircleDot className="h-3.5 w-3.5 text-blue-600" />
                                )
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-amber-500" />
                              )}
                              <span className="text-xs">
                                MON {monClaim ? `${monClaim.progress}%` : '-'}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Button to Shift Page */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/technician/shifts')}
                    className="h-7 text-xs gap-1.5"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Shift & Checklist
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab Navigation */}
          <div className="w-full">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => handleTabChange('assigned')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'assigned'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Tickets ({totalAssigned})
                </button>
                <button
                  onClick={() => handleTabChange('available')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'available'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Available ({totalUnassigned})
                </button>
                <button
                  onClick={() => handleTabChange('summary')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'summary'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Ticket Summary
                </button>
              </nav>
            </div>
            
            {activeTab === 'assigned' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">My Assigned Tickets</h2>
                  <Badge variant="outline">{totalAssigned} total tickets</Badge>
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

                {/* Pagination for Assigned Tickets */}
                {activeTab === 'assigned' && totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="bg-card/50 dark:bg-card/50"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="bg-card/50 dark:bg-card/50"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'available' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Available Tickets</h2>
                  <Badge variant="outline">{totalUnassigned} total tickets</Badge>
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

                {/* Pagination for Available Tickets */}
                {activeTab === 'available' && totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="bg-card/50 dark:bg-card/50"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="bg-card/50 dark:bg-card/50"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Technician Ticket Summary</h2>
                  <Badge variant="outline">All Technicians</Badge>
                </div>
                
                <TechnicianTicketSummary />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Claim Ticket Modal - Modern Style */}
      <ModernDialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <ModernDialogContent className="sm:max-w-[500px]">
          <ModernDialogHeader variant="gradient" icon={<Wrench className="w-5 h-5" />}>
            <ModernDialogTitle>Claim Ticket</ModernDialogTitle>
            <ModernDialogDescription>
              Select the initial status for this ticket when you claim it.
            </ModernDialogDescription>
          </ModernDialogHeader>
          <ModernDialogBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Initial Status
                </Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-card/50 dark:bg-card/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
                <div className="space-y-2">
                  <div><span className="font-semibold text-blue-700 dark:text-blue-300">Open:</span> <span className="text-gray-600 dark:text-gray-400">Ticket is claimed but work hasn't started yet</span></div>
                  <div><span className="font-semibold text-blue-700 dark:text-blue-300">In Progress:</span> <span className="text-gray-600 dark:text-gray-400">Work has begun on this ticket</span></div>
                  <div><span className="font-semibold text-blue-700 dark:text-blue-300">Closed:</span> <span className="text-gray-600 dark:text-gray-400">Issue has been fixed and ticket is complete</span></div>
                </div>
              </div>
            </div>
          </ModernDialogBody>
          <ModernDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setClaimModalOpen(false)}
              className="bg-card/50 hover:bg-card/70"
            >
              Cancel
            </Button>
            <Button 
              onClick={claimTicket}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
            >
              Claim Ticket
            </Button>
          </ModernDialogFooter>
        </ModernDialogContent>
      </ModernDialog>

      {/* Resolution Modal - Modern Style */}
      <ModernDialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <ModernDialogContent className="sm:max-w-[500px]">
          <ModernDialogHeader variant="gradient" icon={<Edit className="w-5 h-5" />}>
            <ModernDialogTitle>Update Ticket Status</ModernDialogTitle>
            <ModernDialogDescription>
              Add an optional comment and select the new status for this ticket.
            </ModernDialogDescription>
          </ModernDialogHeader>
          <ModernDialogBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-select" className="text-sm font-medium">New Status</Label>
                <Select value={selectedResolutionStatus} onValueChange={setSelectedResolutionStatus}>
                  <SelectTrigger id="status-select" className="bg-card/50 dark:bg-card/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PENDING_VENDOR">Pending Vendor</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution-comment" className="text-sm font-medium">Comment (Optional)</Label>
                <Textarea
                  id="resolution-comment"
                  placeholder="Add a comment about this status change..."
                  value={resolutionComment}
                  onChange={(e) => setResolutionComment(e.target.value)}
                  className="min-h-[100px] resize-none bg-card/50 dark:bg-card/50 backdrop-blur-sm"
                />
              </div>
            </div>
          </ModernDialogBody>
          <ModernDialogFooter>
            <Button
              variant="outline"
              onClick={handleModalClose}
              disabled={isSubmittingResolution}
              className="bg-card/50 hover:bg-card/70"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolutionSubmit}
              disabled={isSubmittingResolution}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
            >
              {isSubmittingResolution ? 'Processing...' : 'Update Status'}
            </Button>
          </ModernDialogFooter>
        </ModernDialogContent>
      </ModernDialog>
    </div>
  );
}