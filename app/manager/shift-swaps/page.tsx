'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  ArrowLeftRight,
  User
} from 'lucide-react';

interface ShiftSwapRequest {
  id: string;
  initiatorProfile: {
    user: {
      name: string;
      email: string;
    };
  };
  recipientProfile: {
    user: {
      name: string;
      email: string;
    };
  };
  shiftAssignment: {
    date: string;
    shiftType: string;
    schedule: {
      month: number;
      year: number;
    };
  };
  proposedDate: string | null;
  reason: string;
  swapType: string;
  status: string;
  recipientResponse: string | null;
  recipientRespondedAt: string | null;
  managerNotes: string | null;
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  createdAt: string;
}

const swapTypeConfig = {
  GIVE_AWAY: { label: 'Give Away', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  TRADE: { label: 'Trade', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
};

const statusConfig = {
  PENDING_RECIPIENT: { label: 'Pending Recipient', color: 'bg-yellow-500', icon: Clock },
  PENDING_MANAGER: { label: 'Pending Manager', color: 'bg-blue-500', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-500', icon: XCircle },
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ShiftSwapsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<ShiftSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (session?.user?.branchId) {
      fetchRequests();
    }
  }, [session, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        branchId: session?.user?.branchId || '',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/shifts/swap-requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch swap requests');

      const data = await response.json();
      setRequests(data.data || []);
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      toast.error('Failed to load shift swap requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (request: ShiftSwapRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setManagerNotes('');
    setRejectionReason('');
    setIsDialogOpen(true);
  };

  const handleViewDetails = (request: ShiftSwapRequest) => {
    setSelectedRequest(request);
    setActionType(null);
    setIsDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch(`/api/shifts/swap-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manager_decision',
          response: actionType === 'approve' ? 'APPROVE' : 'REJECT',
          ...(actionType === 'reject' && { rejectionReason }),
          managerNotes: managerNotes || undefined,
        }),
      });

      if (!response.ok) throw new Error(`Failed to ${actionType} swap request`);

      toast.success(`Swap request ${actionType}d successfully`);
      setIsDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      console.error(`Error ${actionType}ing swap request:`, error);
      toast.error(error.message || `Failed to ${actionType} swap request`);
    } finally {
      setProcessing(false);
    }
  };

  if (!session) {
    return null;
  }

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const pendingManagerCount = requests.filter(r => r.status === 'PENDING_MANAGER').length;
  const pendingRecipientCount = requests.filter(r => r.status === 'PENDING_RECIPIENT').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Shift Swap Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve staff shift swap requests
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Manager</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingManagerCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Staff</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingRecipientCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-64">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="PENDING_RECIPIENT">Pending Recipient</SelectItem>
                <SelectItem value="PENDING_MANAGER">Pending Manager</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Swap Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
              <p>Loading swap requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No swap requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From → To</TableHead>
                  <TableHead>Swap Type</TableHead>
                  <TableHead>Original Shift</TableHead>
                  <TableHead>Proposed Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const config = statusConfig[request.status as keyof typeof statusConfig];
                  const swapConfig = swapTypeConfig[request.swapType as keyof typeof swapTypeConfig];
                  const Icon = config?.icon || AlertCircle;

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-sm">
                            <div className="font-medium">{request.initiatorProfile.user.name}</div>
                            <ArrowLeftRight className="w-3 h-3 text-gray-400 my-1" />
                            <div className="font-medium">{request.recipientProfile.user.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={swapConfig?.color}>
                          {swapConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {monthNames[request.shiftAssignment.schedule.month - 1]}{' '}
                            {new Date(request.shiftAssignment.date).getDate()},{' '}
                            {request.shiftAssignment.schedule.year}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {request.shiftAssignment.shiftType}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.proposedDate ? (
                          <div className="text-sm">
                            {new Date(request.proposedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs text-sm text-gray-600 dark:text-gray-400 truncate">
                          {request.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${config?.color} text-white`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'PENDING_MANAGER' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(request, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(request, 'reject')}
                            >
                              <XCircle className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(request)}
                          >
                            <AlertCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Shift Swap'}
              {actionType === 'reject' && 'Reject Shift Swap'}
              {!actionType && 'Shift Swap Details'}
            </DialogTitle>
            {selectedRequest && (
              <DialogDescription>
                {selectedRequest.initiatorProfile.user.name} → {selectedRequest.recipientProfile.user.name}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Request Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">From</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedRequest.initiatorProfile.user.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedRequest.initiatorProfile.user.email}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">To</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedRequest.recipientProfile.user.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedRequest.recipientProfile.user.email}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium mb-1">Swap Type</p>
                  <Badge variant="outline" className={swapTypeConfig[selectedRequest.swapType as keyof typeof swapTypeConfig]?.color}>
                    {swapTypeConfig[selectedRequest.swapType as keyof typeof swapTypeConfig]?.label}
                  </Badge>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium mb-1">Original Shift</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {monthNames[selectedRequest.shiftAssignment.schedule.month - 1]}{' '}
                    {new Date(selectedRequest.shiftAssignment.date).getDate()},{' '}
                    {selectedRequest.shiftAssignment.schedule.year} -{' '}
                    {selectedRequest.shiftAssignment.shiftType}
                  </p>
                </div>

                {selectedRequest.proposedDate && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">Proposed Trade Date</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(selectedRequest.proposedDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium mb-1">Reason</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.recipientResponse && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium mb-1 text-blue-700 dark:text-blue-400">Recipient Response</p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {selectedRequest.recipientResponse} on{' '}
                      {new Date(selectedRequest.recipientRespondedAt!).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedRequest.managerNotes && !actionType && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">Manager Notes</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.managerNotes}</p>
                  </div>
                )}

                {selectedRequest.rejectionReason && !actionType && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium mb-1 text-red-700 dark:text-red-400">Rejection Reason</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{selectedRequest.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Manager Notes Input (for both approve and reject) */}
              {actionType && (
                <div className="space-y-2">
                  <Label>Manager Notes {actionType === 'reject' ? '' : '(Optional)'}</Label>
                  <Textarea
                    placeholder="Add any notes or comments..."
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Rejection Reason Input */}
              {actionType === 'reject' && (
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    placeholder="Please provide a reason for rejecting this swap request..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {actionType ? 'Cancel' : 'Close'}
            </Button>
            {actionType && (
              <Button
                onClick={handleConfirmAction}
                disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                variant={actionType === 'approve' ? 'default' : 'destructive'}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {actionType === 'approve' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Swap
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Swap
                      </>
                    )}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}