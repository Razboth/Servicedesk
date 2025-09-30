'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Calendar,
  ArrowLeft,
  Download,
  CheckCircle,
  Clock,
  Users,
  Moon,
  Sun,
  Coffee,
  Loader2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

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

interface Schedule {
  id: string;
  month: number;
  year: number;
  status: string;
  generatedAt: string | null;
  publishedAt: string | null;
  branch: {
    name: string;
    code: string;
  };
  shiftAssignments: ShiftAssignment[];
  onCallAssignments: Array<{
    date: string;
    staffProfile: {
      user: {
        name: string;
      };
    };
    reason: string;
  }>;
  holidays: Array<{
    date: string;
    name: string;
  }>;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const shiftTypeConfig = {
  DAY: { label: 'Day', icon: Sun, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  NIGHT: { label: 'Night', icon: Moon, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' },
  OFF: { label: 'Off', icon: Coffee, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  LEAVE: { label: 'Leave', icon: Calendar, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

const statusConfig = {
  DRAFT: { label: 'Draft', color: 'bg-gray-500' },
  GENERATED: { label: 'Generated', color: 'bg-blue-500' },
  PUBLISHED: { label: 'Published', color: 'bg-green-500' },
  ARCHIVED: { label: 'Archived', color: 'bg-orange-500' },
};

export default function ScheduleDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.scheduleId as string;

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    if (scheduleId) {
      fetchSchedule();
    }
  }, [scheduleId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shifts/schedules/${scheduleId}`);
      if (!response.ok) throw new Error('Failed to fetch schedule');

      const data = await response.json();
      setSchedule(data.data);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const response = await fetch(`/api/shifts/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });

      if (!response.ok) throw new Error('Failed to publish schedule');

      toast.success('Schedule published successfully');
      fetchSchedule();
    } catch (error) {
      console.error('Error publishing schedule:', error);
      toast.error('Failed to publish schedule');
    } finally {
      setPublishing(false);
    }
  };

  const handleExport = () => {
    // Export functionality can be added here
    toast.info('Export functionality coming soon');
  };

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">Schedule not found</p>
          <Link href="/manager/shift-schedules">
            <Button variant="outline" className="mt-4">
              Back to Schedules
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const config = statusConfig[schedule.status as keyof typeof statusConfig];
  const daysInMonth = new Date(schedule.year, schedule.month, 0).getDate();
  const firstDay = new Date(schedule.year, schedule.month - 1, 1).getDay();

  // Group assignments by date
  const assignmentsByDate = schedule.shiftAssignments.reduce((acc, assignment) => {
    const date = new Date(assignment.date).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(assignment);
    return acc;
  }, {} as Record<string, ShiftAssignment[]>);

  // Group assignments by staff
  const assignmentsByStaff = schedule.shiftAssignments.reduce((acc, assignment) => {
    const staffId = assignment.staffProfile.id;
    if (!acc[staffId]) {
      acc[staffId] = {
        name: assignment.staffProfile.user.name,
        assignments: []
      };
    }
    acc[staffId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { name: string; assignments: ShiftAssignment[] }>);

  // Calculate stats
  const totalDayShifts = schedule.shiftAssignments.filter(a => a.shiftType === 'DAY').length;
  const totalNightShifts = schedule.shiftAssignments.filter(a => a.shiftType === 'NIGHT').length;
  const totalOffDays = schedule.shiftAssignments.filter(a => a.shiftType === 'OFF').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/manager/shift-schedules">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {monthNames[schedule.month - 1]} {schedule.year}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {schedule.branch.name} ({schedule.branch.code})
            </p>
          </div>
          <Badge variant="outline" className={`${config.color} text-white`}>
            {config.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          {schedule.status === 'GENERATED' && (
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publish Schedule
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Day Shifts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalDayShifts}</p>
              </div>
              <Sun className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Night Shifts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalNightShifts}</p>
              </div>
              <Moon className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Off Days</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalOffDays}</p>
              </div>
              <Coffee className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">On-Call</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{schedule.onCallAssignments.length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule View</CardTitle>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar View</SelectItem>
                <SelectItem value="list">List View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'calendar' ? (
            <div className="space-y-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 p-2">
                    {day}
                  </div>
                ))}

                {/* Empty cells for first week */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2" />
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(schedule.year, schedule.month - 1, day);
                  const dateStr = date.toISOString().split('T')[0];
                  const assignments = assignmentsByDate[dateStr] || [];
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const holiday = schedule.holidays.find(h =>
                    new Date(h.date).toISOString().split('T')[0] === dateStr
                  );

                  return (
                    <div
                      key={day}
                      className={`min-h-24 p-2 border rounded-lg ${
                        isWeekend ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
                      } ${holiday ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'}`}
                    >
                      <div className="font-semibold text-sm mb-1">{day}</div>
                      {holiday && (
                        <div className="text-xs text-red-600 dark:text-red-400 mb-1">
                          {holiday.name}
                        </div>
                      )}
                      <div className="space-y-1">
                        {assignments.map(assignment => {
                          const config = shiftTypeConfig[assignment.shiftType as keyof typeof shiftTypeConfig];
                          const Icon = config?.icon || Clock;
                          return (
                            <div
                              key={assignment.id}
                              className={`text-xs p-1 rounded ${config?.color}`}
                              title={`${assignment.staffProfile.user.name} - ${config?.label}`}
                            >
                              <div className="flex items-center gap-1">
                                <Icon className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{assignment.staffProfile.user.name.split(' ')[0]}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* List View - By Staff */}
              {Object.entries(assignmentsByStaff).map(([staffId, data]) => {
                const nightCount = data.assignments.filter(a => a.shiftType === 'NIGHT').length;
                const dayCount = data.assignments.filter(a => a.shiftType === 'DAY').length;
                const offCount = data.assignments.filter(a => a.shiftType === 'OFF').length;

                return (
                  <Card key={staffId}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{data.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            <Sun className="w-3 h-3 mr-1" />
                            {dayCount} Day
                          </Badge>
                          <Badge variant="outline">
                            <Moon className="w-3 h-3 mr-1" />
                            {nightCount} Night
                          </Badge>
                          <Badge variant="outline">
                            <Coffee className="w-3 h-3 mr-1" />
                            {offCount} Off
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-7 gap-2">
                        {data.assignments
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map(assignment => {
                            const config = shiftTypeConfig[assignment.shiftType as keyof typeof shiftTypeConfig];
                            const Icon = config?.icon || Clock;
                            const date = new Date(assignment.date);

                            return (
                              <div
                                key={assignment.id}
                                className={`p-2 rounded text-center ${config?.color}`}
                              >
                                <div className="text-xs font-semibold">{date.getDate()}</div>
                                <Icon className="w-4 h-4 mx-auto mt-1" />
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* On-Call Assignments */}
      {schedule.onCallAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>On-Call Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedule.onCallAssignments.map((assignment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-medium">{assignment.staffProfile.user.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(assignment.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{assignment.reason}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}