'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
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

export default function ShiftBuilderPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
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
    if (session?.user?.branchId) {
      fetchStaffProfiles();
    }
  }, [session]);

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

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over) {
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

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

        // Create a temporary assignment
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
        toast.success(`Assigned ${activeData.staffName} to ${overData.shiftType} on ${overData.date}`);
      }

      // Case 2: Swapping assignments (future enhancement)
      else if (activeData.type === 'assignment' && overData.type === 'shift-slot') {
        toast.info('Assignment swapping coming soon');
      }
    } catch (error: any) {
      console.error('Drag error:', error);
      toast.error(error.message || 'Failed to create assignment');
    }
  };

  const handleSaveSchedule = async () => {
    if (!session?.user?.branchId) {
      toast.error('Branch ID is required');
      return;
    }

    if (assignments.length === 0) {
      toast.error('No assignments to save. Please add some shift assignments first.');
      return;
    }

    try {
      setSaving(true);
      // TODO: Implement API call to save manually created schedule
      toast.info('Manual schedule save functionality coming soon');
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error(error.message || 'Failed to save schedule');
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Shift Builder</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Build shift schedules with drag-and-drop
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
                />
              </CardContent>
            </Card>
          </div>
        </div>

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
