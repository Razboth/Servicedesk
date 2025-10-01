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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  User,
  Plus
} from 'lucide-react';

interface LeaveRequest {
  id: string;
  staffProfileId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  contactNumber: string | null;
  emergencyContact: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  staffProfile: {
    user: {
      name: string;
      email: string;
    };
    branch: {
      name: string;
      code: string;
    };
  };
}

const leaveTypeConfig = {
  ANNUAL: { label: 'Annual Leave', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  SICK: { label: 'Sick Leave', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  EMERGENCY: { label: 'Emergency', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  UNPAID: { label: 'Unpaid Leave', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  OTHER: { label: 'Other', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
};

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-500', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: 'bg-red-500', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-500', icon: XCircle },
};

interface StaffProfile {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
}

export default function LeaveRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [newLeaveForm, setNewLeaveForm] = useState({
    staffProfileId: '',
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
    contactNumber: '',
    emergencyContact: ''
  });

  useEffect(() => {
    if (session?.user?.branchId) {
      fetchRequests();
      fetchStaffProfiles();
    }
  }, [session, statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        branchId: session?.user?.branchId || '',
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/shifts/leave-requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leave requests');

      const data = await response.json();
      setRequests(data.data || []);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffProfiles = async () => {
    try {
      const response = await fetch('/api/shifts/staff-profiles');
      if (!response.ok) throw new Error('Failed to fetch staff profiles');

      const data = await response.json();
      setStaffProfiles(data.profiles || []);
    } catch (error) {
      console.error('Error fetching staff profiles:', error);
    }
  };

  const handleCreateLeave = async () => {
    if (!newLeaveForm.staffProfileId || !newLeaveForm.startDate || !newLeaveForm.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/manager/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeaveForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create leave request');
      }

      toast.success('Leave request created successfully');
      setIsCreateDialogOpen(false);
      setNewLeaveForm({
        staffProfileId: '',
        leaveType: 'ANNUAL',
        startDate: '',
        endDate: '',
        reason: '',
        contactNumber: '',
        emergencyContact: ''
      });
      fetchRequests();
    } catch (error: any) {
      console.error('Error creating leave:', error);
      toast.error(error.message || 'Failed to create leave request');
    } finally {
      setProcessing(false);
    }
  };

  const handleAction = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setRejectionReason('');
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
      const response = await fetch(`/api/shifts/leave-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'APPROVED' : 'REJECTED',
          ...(actionType === 'reject' && { rejectionReason }),
        }),
      });

      if (!response.ok) throw new Error(`Failed to ${actionType} leave request`);

      toast.success(`Leave request ${actionType}d successfully`);
      setIsDialogOpen(false);
      fetchRequests();
    } catch (error: any) {
      console.error(`Error ${actionType}ing leave request:`, error);
      toast.error(error.message || `Failed to ${actionType} leave request`);
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

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Leave Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and manage staff leave requests
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Leave Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingCount}</p>
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
                <SelectItem value="PENDING">Pending</SelectItem>
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
          <CardTitle>Leave Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
              <p>Loading leave requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No leave requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const config = statusConfig[request.status as keyof typeof statusConfig];
                  const leaveConfig = leaveTypeConfig[request.leaveType as keyof typeof leaveTypeConfig];
                  const Icon = config?.icon || AlertCircle;

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.staffProfile.user.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {request.staffProfile.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={leaveConfig?.color}>
                          {leaveConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {new Date(request.startDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            to{' '}
                            {new Date(request.endDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs text-sm text-gray-600 dark:text-gray-400 truncate">
                          {request.reason || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${config?.color} text-white`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'PENDING' && (
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
                        )}
                        {request.status === 'REJECTED' && request.rejectionReason && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionType(null);
                              setIsDialogOpen(true);
                            }}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Leave Request'}
              {actionType === 'reject' && 'Reject Leave Request'}
              {!actionType && 'Leave Request Details'}
            </DialogTitle>
            {selectedRequest && (
              <DialogDescription>
                {selectedRequest.staffProfile.user.name} -{' '}
                {new Date(selectedRequest.startDate).toLocaleDateString()} to{' '}
                {new Date(selectedRequest.endDate).toLocaleDateString()}
                {' '}({selectedRequest.totalDays} {selectedRequest.totalDays === 1 ? 'day' : 'days'})
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Request Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm font-medium">Leave Type</span>
                  <Badge variant="outline" className={leaveTypeConfig[selectedRequest.leaveType as keyof typeof leaveTypeConfig]?.color}>
                    {leaveTypeConfig[selectedRequest.leaveType as keyof typeof leaveTypeConfig]?.label}
                  </Badge>
                </div>

                {selectedRequest.reason && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">Reason</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.reason}</p>
                  </div>
                )}

                {selectedRequest.contactNumber && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">Contact Number</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.contactNumber}</p>
                  </div>
                )}

                {selectedRequest.emergencyContact && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-1">Emergency Contact</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.emergencyContact}</p>
                  </div>
                )}

                {selectedRequest.rejectionReason && !actionType && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium mb-1 text-red-700 dark:text-red-400">Rejection Reason</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{selectedRequest.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Rejection Reason Input */}
              {actionType === 'reject' && (
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    placeholder="Please provide a reason for rejecting this leave request..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
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
                        Approve Request
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Request
                      </>
                    )}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Leave Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Leave Request</DialogTitle>
            <DialogDescription>
              Create a leave request for a staff member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Staff Member *</Label>
                <Select
                  value={newLeaveForm.staffProfileId}
                  onValueChange={(value) => setNewLeaveForm({ ...newLeaveForm, staffProfileId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.user.name} - {profile.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select
                  value={newLeaveForm.leaveType}
                  onValueChange={(value) => setNewLeaveForm({ ...newLeaveForm, leaveType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL">Annual Leave</SelectItem>
                    <SelectItem value="SICK">Sick Leave</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                    <SelectItem value="UNPAID">Unpaid Leave</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={newLeaveForm.startDate}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={newLeaveForm.endDate}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, endDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input
                  type="tel"
                  placeholder="+62 xxx xxxx xxxx"
                  value={newLeaveForm.contactNumber}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, contactNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Emergency Contact</Label>
                <Input
                  type="tel"
                  placeholder="+62 xxx xxxx xxxx"
                  value={newLeaveForm.emergencyContact}
                  onChange={(e) => setNewLeaveForm({ ...newLeaveForm, emergencyContact: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Optional reason for leave..."
                value={newLeaveForm.reason}
                onChange={(e) => setNewLeaveForm({ ...newLeaveForm, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateLeave}
              disabled={processing || !newLeaveForm.staffProfileId || !newLeaveForm.startDate || !newLeaveForm.endDate}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Leave Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}