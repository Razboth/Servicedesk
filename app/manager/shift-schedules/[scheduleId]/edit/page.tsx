'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, useDroppable } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Calendar,
  Loader2,
  CheckCircle,
  Save,
  Wand2,
  Copy,
  Trash2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { StaffPoolSidebar } from '@/components/shifts/staff-pool-sidebar';
import { DraggableShiftCalendar } from '@/components/shifts/draggable-shift-calendar';

interface StaffProfile {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  canWorkNightShift: boolean;
  canWorkWeekendDay: boolean;
  hasServerAccess: boolean;
  hasSabbathRestriction: boolean;
  isActive: boolean;
  maxNightShiftsPerMonth: number;
  minDaysBetweenNightShifts: number;
}

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: string;
  staffProfile: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Trash Zone Component for drag-out deletion
function TrashZone({ isActive }: { isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash-zone',
    data: { type: 'trash' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        fixed bottom-8 right-8 z-50
        transition-all duration-200
        ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
      `}
    >
      <div
        className={`
          flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl
          transition-all
          ${isOver
            ? 'bg-red-600 text-white scale-110 ring-4 ring-red-300 dark:ring-red-800'
            : 'bg-red-500 text-white'
          }
        `}
      >
        <Trash2 className={`w-6 h-6 ${isOver ? 'animate-bounce' : ''}`} />
        <span className="font-medium text-sm whitespace-nowrap">
          {isOver ? 'Release to delete' : 'Drag here to delete'}
        </span>
      </div>
    </div>
  );
}

export default function EditSchedulePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.scheduleId as string;

  const [schedule, setSchedule] = useState<any>(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buildMode, setBuildMode] = useState<'blank' | 'auto' | 'template'>('blank');
  const [activeItem, setActiveItem] = useState<any>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (scheduleId) {
      fetchSchedule();
    }
  }, [scheduleId]);

  useEffect(() => {
    if (session?.user?.branchId && month && year) {
      fetchStaffProfiles();
      fetchLeaveRequests();
    }
  }, [session, month, year]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shifts/schedules/${scheduleId}`);
      if (!response.ok) throw new Error('Failed to fetch schedule');

      const data = await response.json();
      const scheduleData = data.data;

      setSchedule(scheduleData);
      setMonth(scheduleData.month.toString());
      setYear(scheduleData.year.toString());

      // Load existing assignments
      const existingAssignments = scheduleData.shiftAssignments.map((a: any) => ({
        id: a.id,
        date: new Date(a.date).toISOString().split('T')[0],
        shiftType: a.shiftType,
        staffProfile: a.staffProfile,
      }));

      setAssignments(existingAssignments);
      console.log(`Loaded ${existingAssignments.length} existing assignments`);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule');
      router.push('/manager/shift-schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    if (!session?.user?.branchId) return;

    try {
      // Fetch approved leave requests for the selected month and branch
      const response = await fetch(`/api/manager/leaves?status=APPROVED`);

      if (!response.ok) {
        console.error('Failed to fetch leaves:', response.status, response.statusText);
        return; // Silently fail - leaves are optional
      }

      const data = await response.json();

      if (data.leaves) {
        const selectedMonth = parseInt(month);
        const selectedYear = parseInt(year);
        const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
        const monthEnd = new Date(selectedYear, selectedMonth, 0);

        const leaveAssignments: ShiftAssignment[] = [];

        for (const leave of data.leaves) {
          const leaveStart = new Date(leave.startDate);
          const leaveEnd = new Date(leave.endDate);

          // Check if leave overlaps with selected month
          if (leaveStart <= monthEnd && leaveEnd >= monthStart) {
            // Create assignments for each day of leave within the month
            const currentDate = new Date(Math.max(leaveStart.getTime(), monthStart.getTime()));
            const endDate = new Date(Math.min(leaveEnd.getTime(), monthEnd.getTime()));

            while (currentDate <= endDate) {
              leaveAssignments.push({
                id: `leave-${leave.id}-${currentDate.toISOString().split('T')[0]}`,
                date: currentDate.toISOString().split('T')[0],
                shiftType: 'LEAVE',
                staffProfile: leave.staffProfile,
              });
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        }

        // Add leave assignments to the state
        if (leaveAssignments.length > 0) {
          setAssignments(prev => {
            // Filter out old leave assignments
            const nonLeaveAssignments = prev.filter(a => a.shiftType !== 'LEAVE' && !a.id.startsWith('leave-'));
            return [...nonLeaveAssignments, ...leaveAssignments];
          });
          console.log(`Loaded ${leaveAssignments.length} leave assignments for calendar display`);
        }
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const fetchStaffProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/shifts/staff-profiles?branchId=${session?.user?.branchId}&isActive=true`
      );
      if (!response.ok) throw new Error('Failed to fetch staff profiles');

      const data = await response.json();
      setStaffProfiles(data.data || []);
    } catch (error) {
      console.error('Error fetching staff profiles:', error);
      toast.error('Failed to load staff profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    if (!session?.user?.branchId) {
      toast.error('Branch ID is required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/shifts/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: session.user.branchId,
          month: parseInt(month),
          year: parseInt(year),
          holidayDates: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate schedule');
      }

      toast.success('Schedule auto-generated successfully');
      router.push(`/manager/shift-schedules/${data.data.scheduleId}`);
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      toast.error(error.message || 'Failed to generate schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveItem(event.active.data.current);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(
        `/api/shifts/schedules/${scheduleId}/assignments/manual?assignmentId=${assignmentId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete assignment');
      }

      toast.success('Assignment deleted');
      await fetchAssignments();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast.error(error.message || 'Failed to delete assignment');
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveItem(null);

    const activeData = active.data.current;
    const overData = over?.data.current;

    // Case 0: Dragging to trash zone (delete assignment)
    if (activeData?.type === 'assignment' && overData?.type === 'trash') {
      await handleDeleteAssignment(activeData.assignmentId);
      return;
    }

    if (!over) {
      return;
    }

    if (!activeData || !overData) {
      return;
    }

    try {
      // Case 1: Dragging from staff pool to shift slot
      if (activeData.type === 'staff' && overData.type === 'shift-slot') {
        const staffProfile = staffProfiles.find(s => s.id === activeData.staffId);
        if (!staffProfile) {
          toast.error('Staff profile not found');
          return;
        }

        const targetAssignment = overData.currentAssignment;

        // Check if slot already has an assignment
        if (targetAssignment) {
          // Replace existing assignment's staff
          setAssignments(prev => {
            const updated = [...prev];
            const targetIndex = updated.findIndex(a => a.id === targetAssignment.id);

            if (targetIndex !== -1) {
              updated[targetIndex].staffProfile = {
                id: staffProfile.id,
                user: staffProfile.user,
              };
            }

            return updated;
          });

          const displayDate = new Date(overData.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          toast.success(`Replaced ${targetAssignment.staffProfile.user.name} with ${activeData.staffName} on ${displayDate}`);
        } else {
          // Create a new assignment for empty slot
          const tempAssignment: ShiftAssignment = {
            id: `temp-${Date.now()}`,
            date: overData.date,
            shiftType: overData.shiftType,
            staffProfile: {
              id: staffProfile.id,
              user: staffProfile.user,
            },
          };

          setAssignments([...assignments, tempAssignment]);

          // Format date properly for display (parse ISO string with explicit timezone)
          const displayDate = new Date(overData.date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          toast.success(`Assigned ${activeData.staffName} to ${overData.shiftType} on ${displayDate}`);
        }
      }

      // Case 2: Swapping or moving assignments
      else if (activeData.type === 'assignment' && overData.type === 'shift-slot') {
        const targetAssignment = overData.currentAssignment;

        // If target has an assignment, try to swap (only if same shift type)
        if (targetAssignment) {
          const sourceStaffId = activeData.staffId;
          const targetStaffId = targetAssignment.staffProfile.id;

          if (sourceStaffId === targetStaffId) {
            toast.info('Cannot swap with the same staff member');
            return;
          }

          // Only allow swapping between same shift types
          if (activeData.shiftType !== targetAssignment.shiftType) {
            toast.error('Cannot swap assignments of different shift types');
            return;
          }

          // Swap the assignments in state
          setAssignments(prev => {
            const updated = [...prev];
            const sourceIndex = updated.findIndex(a => a.id === activeData.assignmentId);
            const targetIndex = updated.findIndex(a => a.id === targetAssignment.id);

            if (sourceIndex !== -1 && targetIndex !== -1) {
              // Store original staff profiles BEFORE swap
              const sourceStaffProfile = updated[sourceIndex].staffProfile;
              const targetStaffProfile = updated[targetIndex].staffProfile;

              // Calculate next day dates for OFF day lookup (avoid timezone issues)
              const getNextDayString = (dateStr: string): string => {
                const [year, month, day] = dateStr.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                date.setDate(date.getDate() + 1);
                const nextYear = date.getFullYear();
                const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
                const nextDay = String(date.getDate()).padStart(2, '0');
                return `${nextYear}-${nextMonth}-${nextDay}`;
              };

              const sourceNextDayStr = getNextDayString(updated[sourceIndex].date);
              const targetNextDayStr = getNextDayString(updated[targetIndex].date);

              // Find OFF days BEFORE swapping (using original staff IDs)
              const sourceOffIndex = updated.findIndex(a =>
                a.date === sourceNextDayStr &&
                a.staffProfile.id === sourceStaffProfile.id &&
                a.shiftType === 'OFF'
              );

              const targetOffIndex = updated.findIndex(a =>
                a.date === targetNextDayStr &&
                a.staffProfile.id === targetStaffProfile.id &&
                a.shiftType === 'OFF'
              );

              // NOW swap the main assignments
              updated[sourceIndex].staffProfile = targetStaffProfile;
              updated[targetIndex].staffProfile = sourceStaffProfile;

              // Swap OFF days if they exist
              if (sourceOffIndex !== -1) {
                updated[sourceOffIndex].staffProfile = targetStaffProfile;
              }
              if (targetOffIndex !== -1) {
                updated[targetOffIndex].staffProfile = sourceStaffProfile;
              }

              const offDayMsg = (sourceOffIndex !== -1 || targetOffIndex !== -1) ? ' (including OFF days)' : '';
              toast.success(`Swapped ${activeData.staffName} with ${targetAssignment.staffProfile.user.name}${offDayMsg}`);
            }

            return updated;
          });
        }
        // Empty slot - move the assignment (only to same shift type)
        else {
          // Only allow moving to slots of the same shift type
          if (activeData.shiftType !== overData.shiftType) {
            toast.error(`Cannot move ${activeData.shiftType} assignment to ${overData.shiftType} slot. Use drag from staff pool to assign different shift types.`);
            return;
          }

          setAssignments(prev => {
            const updated = [...prev];
            const sourceIndex = updated.findIndex(a => a.id === activeData.assignmentId);

            if (sourceIndex !== -1) {
              // Update only the date (shift type stays the same)
              updated[sourceIndex].date = overData.date;

              const displayDate = new Date(overData.date + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              });
              toast.success(`Moved ${activeData.staffName} to ${overData.shiftType} on ${displayDate}`);
            }

            return updated;
          });
        }
      }
    } catch (error: any) {
      console.error('Drag error:', error);
      toast.error(error.message || 'Failed to create assignment');
    }
  };

  const handleSaveSchedule = async () => {
    if (assignments.length === 0) {
      toast.error('No assignments to save. Please add some shift assignments first.');
      return;
    }

    try {
      setSaving(true);

      console.log('💾 Updating schedule...');
      console.log('Schedule ID:', scheduleId);
      console.log('Assignments to save:', assignments);

      // Step 1: Delete all non-LEAVE assignments (we'll recreate them)
      const deleteResponse = await fetch(`/api/shifts/schedules/${scheduleId}/assignments`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to clear existing assignments');
      }

      console.log('Cleared existing assignments');

      // Step 2: Filter assignments for this month only
      const selectedMonth = parseInt(month);
      const selectedYear = parseInt(year);

      const validAssignments = assignments.filter(assignment => {
        const assignmentDate = new Date(assignment.date);
        const assignmentMonth = assignmentDate.getMonth() + 1;
        const assignmentYear = assignmentDate.getFullYear();

        return assignmentMonth === selectedMonth && assignmentYear === selectedYear;
      });

      console.log('Valid assignments:', `${validAssignments.length} of ${assignments.length}`);

      // Step 3: Create all assignments in batch (exclude LEAVE - they already exist)
      const assignmentsToCreate = validAssignments.filter(a => a.shiftType !== 'LEAVE');

      if (assignmentsToCreate.length > 0) {
        const assignmentsData = assignmentsToCreate.map(assignment => ({
          staffProfileId: assignment.staffProfile.id,
          date: assignment.date,
          shiftType: assignment.shiftType,
        }));

        const batchResponse = await fetch(`/api/shifts/schedules/${scheduleId}/assignments/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignments: assignmentsData,
          }),
        });

        const batchData = await batchResponse.json();

        if (!batchResponse.ok) {
          console.error('Failed to create assignments:', batchData);
          throw new Error(batchData.error || 'Failed to create assignments');
        }

        const { created, updated, failed, errors } = batchData.data;

        if (errors && errors.length > 0) {
          console.error('Assignment errors:', errors);
        }

        if (failed > 0) {
          toast.warning(`Schedule updated: ${created} created, ${updated} updated, ${failed} failed. Check console for details.`);
        } else {
          toast.success(`Schedule updated successfully! ${created} assignments created, ${updated} updated`);
        }
      }

      // Navigate back to the schedule view
      router.push(`/manager/shift-schedules/${scheduleId}`);
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast.error(error.message || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all assignments?')) {
      setAssignments([]);
      toast.success('All assignments cleared');
    }
  };

  if (!session) {
    return null;
  }

  // Calculate stats
  const assignmentStats = staffProfiles.reduce((acc, staff) => {
    const staffAssignments = assignments.filter(a => a.staffProfile.id === staff.id);
    acc[staff.id] = {
      nightCount: staffAssignments.filter(a => a.shiftType === 'NIGHT').length,
      weekendCount: staffAssignments.filter(a => ['SATURDAY_DAY', 'SUNDAY_DAY'].includes(a.shiftType)).length,
      offCount: staffAssignments.filter(a => a.shiftType === 'OFF').length,
      totalAssignments: staffAssignments.length,
    };
    return acc;
  }, {} as Record<string, any>);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Schedule</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Modify shift assignments with drag-and-drop
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/manager/shift-schedules">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSaveSchedule} disabled={saving || assignments.length === 0}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Schedule
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Build Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Build Mode</CardTitle>
            <CardDescription>Choose how you want to create this schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Period Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Month</label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mode</label>
                <Select value={buildMode} onValueChange={(v) => setBuildMode(v as typeof buildMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Blank Canvas</SelectItem>
                    <SelectItem value="auto">Auto Generate</SelectItem>
                    <SelectItem value="template">From Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoGenerate}
                disabled={saving}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Auto-Generate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Copy from previous month coming soon')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Previous Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={assignments.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>

            {buildMode === 'blank' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Blank Canvas Mode:</strong> Drag staff members from the left sidebar onto calendar shifts to build your schedule manually.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Builder Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Staff Pool (Left Sidebar) */}
          <div className="lg:col-span-1">
            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 mt-2">Loading staff...</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <StaffPoolSidebar
                staff={staffProfiles}
                assignmentStats={assignmentStats}
              />
            )}
          </div>

          {/* Calendar Builder (Center) */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {monthNames[parseInt(month) - 1]} {year}
                  </CardTitle>
                  <Badge variant="outline">
                    {assignments.length} Assignments
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <DraggableShiftCalendar
                  year={parseInt(year)}
                  month={parseInt(month)}
                  assignments={assignments}
                  holidays={[]}
                  editable={true}
                  skipDndContext={true}
                  onAssignmentDelete={handleDeleteAssignment}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trash Zone - shows when dragging an assignment */}
        <TrashZone isActive={activeItem?.type === 'assignment'} />

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && (
            <div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg p-3 shadow-2xl">
              <p className="font-medium text-sm">
                {activeItem.staffName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {activeItem.type === 'staff' ? 'New Assignment' : activeItem.shiftType}
              </p>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
