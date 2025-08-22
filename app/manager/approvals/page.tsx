'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Inline Checkbox component
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

// Inline Dialog components
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName
import { toast } from 'sonner';
import { CheckCircle, XCircle, Search, Filter, Clock, User, AlertTriangle, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TicketFieldValue {
  id: string;
  value: string;
  field: {
    name: string;
    label: string;
    type: string;
  };
}

interface PendingTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  createdAt: string;
  service: {
    name: string;
    description: string;
  };
  createdBy: {
    name: string;
    email: string;
  };
  fieldValues: TicketFieldValue[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-yellow-100 text-yellow-800',
  CRITICAL: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800'
};

const priorityIcons = {
  LOW: '🟢',
  MEDIUM: '🔵',
  HIGH: '🟡',
  CRITICAL: '🟠',
  EMERGENCY: '🔴'
};

export default function ManagerApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<PendingTicket[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');
  const [bulkReason, setBulkReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<PendingTicket | null>(null);
  
  // Individual approval dialog states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalTicket, setApprovalTicket] = useState<PendingTicket | null>(null);
  const [approvalReason, setApprovalReason] = useState('');

  // Redirect if not manager
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'MANAGER') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch pending approvals
  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(priorityFilter && priorityFilter !== 'all' && { priority: priorityFilter })
      });

      const response = await fetch(`/api/approvals?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user.role === 'MANAGER') {
      fetchApprovals();
    }
  }, [session, pagination.page, searchTerm, priorityFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle ticket selection
  const handleTicketSelect = (ticketId: string, checked: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (checked) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    } else {
      setSelectedTickets(new Set());
    }
  };

  // Process bulk approval
  const processBulkApproval = async () => {
    if (selectedTickets.size === 0) {
      toast.error('Please select at least one ticket');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: Array.from(selectedTickets),
          action: bulkAction,
          reason: bulkReason || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process approval');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Reset state and refresh
      setSelectedTickets(new Set());
      setBulkReason('');
      setShowBulkDialog(false);
      fetchApprovals();
    } catch (error) {
      console.error('Error processing bulk approval:', error);
      toast.error('Failed to process approval');
    } finally {
      setProcessing(false);
    }
  };

  // Quick approve/reject single ticket (legacy - keeping for any existing usage)
  const quickAction = async (ticketId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: [ticketId],
          action
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process approval');
      }

      const result = await response.json();
      toast.success(result.message);
      fetchApprovals();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process approval');
    }
  };

  // Individual approval with notes
  const processIndividualApproval = async () => {
    if (!approvalTicket) {
      toast.error('No ticket selected');
      return;
    }

    // Require reason for rejections
    if (approvalAction === 'reject' && !approvalReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: [approvalTicket.id],
          action: approvalAction,
          reason: approvalReason.trim() || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process approval');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Reset dialog state
      setShowApprovalDialog(false);
      setApprovalTicket(null);
      setApprovalReason('');
      
      // Refresh the approvals list
      fetchApprovals();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process approval');
    } finally {
      setProcessing(false);
    }
  };

  // Open individual approval dialog
  const openApprovalDialog = (ticket: PendingTicket, action: 'approve' | 'reject') => {
    setApprovalTicket(ticket);
    setApprovalAction(action);
    setApprovalReason('');
    setShowApprovalDialog(true);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'MANAGER') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Approval Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve pending ticket requests</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <Clock className="w-4 h-4 mr-1" />
            {pagination.total} pending
          </Badge>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-1 gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedTickets.size > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={() => { setBulkAction('approve'); setShowBulkDialog(true); }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve ({selectedTickets.size})
                </Button>
                <Button
                  onClick={() => { setBulkAction('reject'); setShowBulkDialog(true); }}
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject ({selectedTickets.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="space-y-4">
        {/* Select All Header */}
        {tickets.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedTickets.size === tickets.length && tickets.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  Select All ({tickets.length} tickets)
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tickets */}
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Checkbox
                  checked={selectedTickets.has(ticket.id)}
                  onCheckedChange={(checked: boolean) => handleTicketSelect(ticket.id, checked)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg">{ticket.title}</h3>
                        <Badge className={priorityColors[ticket.priority]}>
                          {priorityIcons[ticket.priority]} {ticket.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">#{ticket.ticketNumber}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => openApprovalDialog(ticket, 'approve')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openApprovalDialog(ticket, 'reject')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTicketDetails(ticket)}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Description</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">Service</h4>
                      <p className="text-sm text-gray-600">{ticket.service.name}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{ticket.createdBy.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tickets.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Approvals</h3>
              <p className="text-gray-600">All tickets have been processed. Great job!</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'approve' ? 'Approve' : 'Reject'} {selectedTickets.size} Ticket(s)
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'approve' 
                ? 'Are you sure you want to approve the selected tickets? This action cannot be undone.'
                : 'Please provide a reason for rejecting the selected tickets.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {bulkAction === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for rejection</label>
              <Textarea
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Please explain why these tickets are being rejected..."
                rows={3}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={processBulkApproval}
              disabled={processing || (bulkAction === 'reject' && !bulkReason.trim())}
              className={bulkAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {processing ? 'Processing...' : (bulkAction === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicketDetails} onOpenChange={() => setSelectedTicketDetails(null)}>
        <DialogContent className="max-w-2xl">
          {selectedTicketDetails && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <span>{selectedTicketDetails.title}</span>
                  <Badge className={priorityColors[selectedTicketDetails.priority]}>
                    {priorityIcons[selectedTicketDetails.priority]} {selectedTicketDetails.priority}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Ticket #{selectedTicketDetails.ticketNumber} • {selectedTicketDetails.service.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {selectedTicketDetails.description}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Requested by</h4>
                  <p className="text-sm text-gray-600">
                    {selectedTicketDetails.createdBy.name} ({selectedTicketDetails.createdBy.email})
                  </p>
                </div>
                
                {selectedTicketDetails.fieldValues.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Additional Information</h4>
                    <div className="space-y-2">
                      {selectedTicketDetails.fieldValues.map((fieldValue) => (
                        <div key={fieldValue.id} className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{fieldValue.field.label}:</span>
                          <span className="text-gray-600">{fieldValue.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium mb-2">Created</h4>
                  <p className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(selectedTicketDetails.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTicketDetails(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    openApprovalDialog(selectedTicketDetails, 'approve');
                    setSelectedTicketDetails(null);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    openApprovalDialog(selectedTicketDetails, 'reject');
                    setSelectedTicketDetails(null);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Individual Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalAction === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Ticket
            </DialogTitle>
            <DialogDescription>
              {approvalTicket && (
                <div className="space-y-2 text-left">
                  <div><strong>Ticket:</strong> {approvalTicket.ticketNumber}</div>
                  <div><strong>Title:</strong> {approvalTicket.title}</div>
                  <div><strong>Requester:</strong> {approvalTicket.createdBy.name}</div>
                  <div><strong>Priority:</strong> 
                    <Badge variant="outline" className="ml-2">
                      {approvalTicket.priority}
                    </Badge>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="approval-reason" className="block text-sm font-medium mb-2">
                {approvalAction === 'approve' ? 'Notes (Optional)' : 'Reason for Rejection (Required)'}
              </label>
              <Textarea
                id="approval-reason"
                placeholder={
                  approvalAction === 'approve' 
                    ? 'Add any notes about this approval...' 
                    : 'Please provide a reason for rejecting this ticket...'
                }
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApprovalDialog(false);
                setApprovalReason('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={processIndividualApproval}
              disabled={processing || (approvalAction === 'reject' && !approvalReason.trim())}
              className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={approvalAction === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}