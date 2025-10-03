'use client';

import { useState } from 'react';
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
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeaveRequest {
  id: string;
  staffProfileId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  status: string;
  staffProfile: {
    user: {
      name: string;
    };
  };
}

interface StaffProfile {
  id: string;
  user: {
    name: string;
    email: string;
  };
}

interface LeaveManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffProfiles: StaffProfile[];
  scheduleId?: string;
  month: number;
  year: number;
  onLeaveCreated: () => void;
}

const leaveTypes = [
  { value: 'ANNUAL_LEAVE', label: 'Annual Leave' },
  { value: 'SICK_LEAVE', label: 'Sick Leave' },
  { value: 'EMERGENCY_LEAVE', label: 'Emergency Leave' },
  { value: 'UNPAID_LEAVE', label: 'Unpaid Leave' },
  { value: 'MATERNITY_LEAVE', label: 'Maternity Leave' },
  { value: 'PATERNITY_LEAVE', label: 'Paternity Leave' },
  { value: 'COMPASSIONATE_LEAVE', label: 'Compassionate Leave' },
  { value: 'STUDY_LEAVE', label: 'Study Leave' },
  { value: 'OTHER', label: 'Other' },
];

export function LeaveManagementDialog({
  open,
  onOpenChange,
  staffProfiles,
  scheduleId,
  month,
  year,
  onLeaveCreated,
}: LeaveManagementDialogProps) {
  const [staffProfileId, setStaffProfileId] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);

  // Fetch existing leaves for the schedule
  const fetchLeaves = async () => {
    if (!scheduleId) return;

    setLoadingLeaves(true);
    try {
      const response = await fetch(
        `/api/manager/leaves?scheduleId=${scheduleId}`
      );
      const data = await response.json();
      if (data.success) {
        setLeaves(data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoadingLeaves(false);
    }
  };

  // Fetch leaves when dialog opens
  useState(() => {
    if (open && scheduleId) {
      fetchLeaves();
    }
  });

  const handleSubmit = async () => {
    if (!staffProfileId || !leaveType || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/manager/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffProfileId,
          leaveType,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reason,
          scheduleId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create leave request');
      }

      toast.success('Leave request created successfully');

      // Reset form
      setStaffProfileId('');
      setLeaveType('');
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');

      // Refresh leaves list
      await fetchLeaves();

      // Notify parent
      onLeaveCreated();

      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    try {
      const response = await fetch(`/api/manager/leaves/${leaveId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete leave');
      }

      toast.success('Leave deleted successfully');
      await fetchLeaves();
      onLeaveCreated();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete leave');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Staff Leave</DialogTitle>
          <DialogDescription>
            Set staff leave for {format(new Date(year, month - 1), 'MMMM yyyy')}.
            Leave days will be automatically applied during shift generation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Leaves */}
          {scheduleId && (
            <div>
              <h3 className="font-medium mb-3">Existing Leave Requests</h3>
              {loadingLeaves ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : leaves.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No leave requests for this schedule</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {leaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{leave.staffProfile.user.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {leave.leaveType.replace('_', ' ')} • {' '}
                          {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd')} ({leave.totalDays} days)
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLeave(leave.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add New Leave */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium">Add New Leave</h3>

            <div className="space-y-2">
              <Label htmlFor="staff">Staff Member *</Label>
              <Select value={staffProfileId} onValueChange={setStaffProfileId}>
                <SelectTrigger id="staff">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type *</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
