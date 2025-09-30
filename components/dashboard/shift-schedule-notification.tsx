'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  Moon,
  Sun,
  Server,
  ChevronRight,
  AlertCircle,
  CalendarClock
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: 'DAY' | 'NIGHT';
  isWeekend: boolean;
  schedule: {
    month: number;
    year: number;
    status: string;
  };
}

interface OnCallAssignment {
  id: string;
  startDate: string;
  endDate: string;
  schedule: {
    month: number;
    year: number;
  };
}

interface ShiftScheduleData {
  todayShift: ShiftAssignment | null;
  upcomingShifts: ShiftAssignment[];
  todayOnCall: OnCallAssignment | null;
}

export function ShiftScheduleNotification() {
  const { data: session } = useSession();
  const [scheduleData, setScheduleData] = useState<ShiftScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    const fetchSchedule = async () => {
      try {
        const response = await fetch('/api/shifts/my-schedule');
        if (!response.ok) {
          // If 404 or error, user might not have shift profile - silently fail
          setLoading(false);
          return;
        }

        const result = await response.json();
        if (result.success) {
          setScheduleData(result.data);
        }
      } catch (error) {
        console.error('Error fetching shift schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [session]);

  // Don't show anything if loading or no data
  if (loading || !scheduleData) return null;

  // Don't show if user has no shifts at all
  if (!scheduleData.todayShift && !scheduleData.upcomingShifts.length && !scheduleData.todayOnCall) {
    return null;
  }

  const getShiftTypeIcon = (shiftType: 'DAY' | 'NIGHT') => {
    return shiftType === 'DAY' ? (
      <Sun className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
    ) : (
      <Moon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    );
  };

  const getShiftTypeLabel = (shiftType: 'DAY' | 'NIGHT') => {
    return shiftType === 'DAY' ? 'Day Shift (08:00 - 17:00)' : 'Night Shift (17:00 - 08:00)';
  };

  const formatShiftDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM dd');
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Today's Shift Alert */}
      {scheduleData.todayShift && (
        <Alert className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="ml-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getShiftTypeIcon(scheduleData.todayShift.shiftType)}
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    You have a shift today
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {getShiftTypeLabel(scheduleData.todayShift.shiftType)}
                    {scheduleData.todayShift.isWeekend && (
                      <Badge variant="outline" className="ml-2 text-xs">Weekend</Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Today's On-Call Alert */}
      {scheduleData.todayOnCall && (
        <Alert className="border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/20">
          <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="ml-2">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-semibold text-purple-900 dark:text-purple-100">
                  You are on-call today
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Server access rotation: {format(new Date(scheduleData.todayOnCall.startDate), 'MMM dd')} - {format(new Date(scheduleData.todayOnCall.endDate), 'MMM dd')}
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Upcoming Shifts Card */}
      {scheduleData.upcomingShifts.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Upcoming Shifts</CardTitle>
              </div>
              <Badge variant="secondary" className="text-xs">
                {scheduleData.upcomingShifts.length} scheduled
              </Badge>
            </div>
            <CardDescription className="text-sm">
              Your shift schedule for the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scheduleData.upcomingShifts.slice(0, showUpcoming ? undefined : 3).map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getShiftTypeIcon(shift.shiftType)}
                    <div>
                      <p className="font-medium text-sm">
                        {formatShiftDate(shift.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shift.shiftType === 'DAY' ? '08:00 - 17:00' : '17:00 - 08:00'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {shift.isWeekend && (
                      <Badge variant="outline" className="text-xs">Weekend</Badge>
                    )}
                    <Badge
                      variant={shift.shiftType === 'DAY' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {shift.shiftType}
                    </Badge>
                  </div>
                </div>
              ))}

              {scheduleData.upcomingShifts.length > 3 && (
                <button
                  onClick={() => setShowUpcoming(!showUpcoming)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showUpcoming ? 'Show less' : `Show ${scheduleData.upcomingShifts.length - 3} more`}
                  <ChevronRight className={`w-4 h-4 transition-transform ${showUpcoming ? 'rotate-90' : ''}`} />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Shifts Message */}
      {!scheduleData.todayShift && !scheduleData.todayOnCall && scheduleData.upcomingShifts.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have no scheduled shifts in the next 7 days.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
