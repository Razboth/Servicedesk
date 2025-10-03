'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Loader2, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

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

interface LeaveManagerInlineProps {
  staffProfiles: StaffProfile[];
  scheduleId?: string;
  month: number;
  year: number;
  onLeaveChanged: () => void;
}

const leaveTypes = [
  { value: 'ANNUAL_LEAVE', label: 'Annual Leave', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'SICK_LEAVE', label: 'Sick Leave', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'EMERGENCY_LEAVE', label: 'Emergency', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { value: 'UNPAID_LEAVE', label: 'Unpaid', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
  { value: 'MATERNITY_LEAVE', label: 'Maternity', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  { value: 'PATERNITY_LEAVE', label: 'Paternity', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'COMPASSIONATE_LEAVE', label: 'Compassionate', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  { value: 'STUDY_LEAVE', label: 'Study', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'OTHER', label: 'Other', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
];

export function LeaveManagerInline({
  staffProfiles,
  scheduleId,
  month,
  year,
  onLeaveChanged,
}: LeaveManagerInlineProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [staffProfileId, setStaffProfileId] = useState('');
  const [leaveType, setLeaveType] = useState('ANNUAL_LEAVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, [scheduleId, month, year]);

  const fetchLeaves = async () => {
    if (!scheduleId) {
      setLeaves([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/manager/leaves?scheduleId=${scheduleId}`);
      const data = await response.json();
      if (data.success) {
        setLeaves(data.leaves || []);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!staffProfileId || !leaveType || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Create date objects and ensure they're at start of day
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Format as ISO strings for the API
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      const response = await fetch('/api/manager/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffProfileId,
          leaveType,
          startDate: startISO,
          endDate: endISO,
          scheduleId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create leave request');
      }

      toast.success('Leave added successfully');

      // Reset form
      setStaffProfileId('');
      setLeaveType('ANNUAL_LEAVE');
      setStartDate('');
      setEndDate('');
      setShowForm(false);

      // Refresh
      await fetchLeaves();
      onLeaveChanged();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add leave');
    } finally {
      setSubmitting(false);
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
      onLeaveChanged();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete leave');
    }
  };

  const getLeaveTypeStyle = (type: string) => {
    return leaveTypes.find(lt => lt.value === type)?.color || leaveTypes[leaveTypes.length - 1].color;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Staff Leave ({format(new Date(year, month - 1), 'MMMM yyyy')})</CardTitle>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              disabled={!scheduleId}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Leave
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add Leave Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Add New Leave</h4>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setStaffProfileId('');
                  setLeaveType('ANNUAL_LEAVE');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="staff" className="text-xs">Staff Member</Label>
                <Select value={staffProfileId} onValueChange={setStaffProfileId}>
                  <SelectTrigger id="staff" className="h-9">
                    <SelectValue placeholder="Select staff" />
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

              <div className="space-y-1.5">
                <Label htmlFor="leaveType" className="text-xs">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger id="leaveType" className="h-9">
                    <SelectValue />
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

              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9"
                  min={`${year}-${String(month).padStart(2, '0')}-01`}
                  max={`${year}-${String(month).padStart(2, '0')}-31`}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9"
                  min={startDate || `${year}-${String(month).padStart(2, '0')}-01`}
                  max={`${year}-${String(month).padStart(2, '0')}-31`}
                />
              </div>
            </div>

            <Button type="submit" size="sm" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              Add Leave
            </Button>
          </form>
        )}

        {/* Leave List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : leaves.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No leaves set for this month
          </p>
        ) : (
          <div className="space-y-2">
            {leaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{leave.staffProfile.user.name}</p>
                    <Badge variant="outline" className={`text-xs ${getLeaveTypeStyle(leave.leaveType)}`}>
                      {leaveTypes.find(lt => lt.value === leave.leaveType)?.label || leave.leaveType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(leave.startDate), 'MMM dd')} - {format(parseISO(leave.endDate), 'MMM dd, yyyy')} ({leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'})
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteLeave(leave.id)}
                  className="h-8 w-8 p-0 hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
