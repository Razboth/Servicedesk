'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ArrowRight, Moon, Sun, Building, AlertTriangle } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: 'NIGHT_WEEKDAY' | 'DAY_WEEKEND' | 'NIGHT_WEEKEND' | 'STANDBY_ONCALL' | 'STANDBY_BRANCH' | 'OFF' | 'LEAVE' | 'HOLIDAY';
  isWeekend: boolean;
  schedule: {
    month: number;
    year: number;
    status: string;
  };
}

interface ShiftScheduleData {
  todayShift: ShiftAssignment | null;
  upcomingShifts: ShiftAssignment[];
  todayOnCall: { id: string; startDate: string; endDate: string } | null;
}

export function ShiftScheduleNotification() {
  const { data: session } = useSession();
  const router = useRouter();
  const [scheduleData, setScheduleData] = useState<ShiftScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    const fetchSchedule = async () => {
      try {
        const response = await fetch('/api/shifts/my-schedule');
        if (!response.ok) {
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

  if (loading || !scheduleData) return null;

  // Don't show if user has no shifts at all
  if (!scheduleData.todayShift && !scheduleData.upcomingShifts.length && !scheduleData.todayOnCall) {
    return null;
  }

  const getShiftIcon = (shiftType: string) => {
    if (shiftType.includes('NIGHT')) return <Moon className="w-3.5 h-3.5" />;
    if (shiftType.includes('DAY')) return <Sun className="w-3.5 h-3.5" />;
    if (shiftType === 'STANDBY_BRANCH') return <Building className="w-3.5 h-3.5" />;
    if (shiftType === 'STANDBY_ONCALL') return <AlertTriangle className="w-3.5 h-3.5" />;
    return <Calendar className="w-3.5 h-3.5" />;
  };

  const formatShiftDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Hari ini';
    if (isTomorrow(date)) return 'Besok';
    return format(date, 'EEE, dd MMM');
  };

  const getShiftLabel = (shiftType: string) => {
    return shiftType.replace('_', ' ');
  };

  // Get the most relevant shift to show
  const primaryShift = scheduleData.todayShift || scheduleData.upcomingShifts[0];
  const upcomingCount = scheduleData.upcomingShifts.length;

  return (
    <div className="flex items-center justify-between text-sm mb-4 py-2 px-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {primaryShift ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {scheduleData.todayShift ? 'Shift hari ini:' : 'Shift berikutnya:'}
            </span>
            <div className="flex items-center gap-1.5">
              {getShiftIcon(primaryShift.shiftType)}
              <span className="font-medium">
                {!scheduleData.todayShift && formatShiftDate(primaryShift.date)}
              </span>
              <Badge variant="secondary" className="text-xs h-5">
                {getShiftLabel(primaryShift.shiftType)}
              </Badge>
            </div>
            {upcomingCount > 1 && (
              <span className="text-xs text-muted-foreground">
                +{upcomingCount - 1} lagi
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Tidak ada shift terjadwal</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/technician/shifts')}
        className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
      >
        Lihat Jadwal
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
