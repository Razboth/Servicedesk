'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  Moon,
  Sun,
  Coffee,
  AlertTriangle,
  Building,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { toast } from 'sonner';
import { ShiftReportCard } from '@/components/technician/shift-report-card';
import { TodayReportsList } from '@/components/technician/today-reports-list';

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: string;
  schedule: {
    month: number;
    year: number;
    status: string;
  };
  staffProfile: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface MonthlySchedule {
  id: string;
  month: number;
  year: number;
  status: string;
  shiftAssignments: ShiftAssignment[];
}

const shiftTypeConfig = {
  NIGHT_WEEKDAY: { label: 'Malam Weekday', icon: Moon, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300', description: '20:00-07:59 (Hari Kerja)' },
  DAY_WEEKEND: { label: 'Siang Weekend', icon: Sun, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', description: '08:00-19:00 (Akhir Pekan/Libur)' },
  NIGHT_WEEKEND: { label: 'Malam Weekend', icon: Moon, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', description: '20:00-07:59 (Akhir Pekan/Libur)' },
  STANDBY_ONCALL: { label: 'Standby On-Call', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', description: 'Siaga On-Call' },
  STANDBY_BRANCH: { label: 'Standby Cabang', icon: Building, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', description: 'Siaga Operasional Cabang' },
  OFF: { label: 'Libur', icon: Coffee, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', description: 'Hari Libur' },
  LEAVE: { label: 'Cuti', icon: Calendar, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', description: 'Sedang Cuti' },
  HOLIDAY: { label: 'Libur Nasional', icon: Calendar, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', description: 'Hari Libur Nasional' },
};

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function TechnicianShiftsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [todayShift, setTodayShift] = useState<ShiftAssignment | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftAssignment[]>([]);
  const [monthlySchedule, setMonthlySchedule] = useState<MonthlySchedule | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    fetchMySchedule();
  }, []);

  useEffect(() => {
    if (userBranchId) {
      fetchMonthlySchedule();
    }
  }, [selectedMonth, selectedYear, userBranchId]);

  const fetchMySchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shifts/my-schedule');
      if (!response.ok) throw new Error('Failed to fetch schedule');

      const data = await response.json();
      setTodayShift(data.data.todayShift);
      setUpcomingShifts(data.data.upcomingShifts || []);

      // Get branchId from the response
      if (data.data.branchId) {
        setUserBranchId(data.data.branchId);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Gagal memuat jadwal shift Anda');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySchedule = async () => {
    if (!userBranchId) {
      console.log('No branchId available yet');
      return;
    }

    try {
      // Fetch published schedule for the selected month
      const url = `/api/shifts/schedules?branchId=${userBranchId}&month=${selectedMonth}&year=${selectedYear}&status=PUBLISHED`;
      console.log('Fetching schedule from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        console.error('Failed to fetch schedule:', response.status, response.statusText);
        setMonthlySchedule(null);
        return;
      }

      const data = await response.json();
      console.log('Schedule data received:', data);

      if (data.data && data.data.length > 0) {
        const schedule = data.data[0];
        console.log('Found schedule:', schedule.id, 'Status:', schedule.status);

        // Fetch assignments for this schedule
        const assignmentsResponse = await fetch(
          `/api/shifts/schedules/${schedule.id}/assignments`
        );

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          console.log('Assignments loaded:', assignmentsData.data.length);

          // Show all staff assignments (not filtered to current user)
          setMonthlySchedule({
            ...schedule,
            shiftAssignments: assignmentsData.data,
          });
        }
      } else {
        console.log('No published schedules found for', selectedMonth, selectedYear);
        setMonthlySchedule(null);
      }
    } catch (error) {
      console.error('Error fetching monthly schedule:', error);
    }
  };

  const formatDate = (dateString: string) => {
    // Extract just the date part from ISO string (YYYY-MM-DD)
    const datePart = dateString.split('T')[0];
    const date = new Date(datePart + 'T00:00:00');
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDayOfWeek = (dateString: string) => {
    const datePart = dateString.split('T')[0];
    const date = new Date(datePart + 'T00:00:00');
    return dayNames[date.getDay()];
  };

  const renderListView = () => {
    if (!monthlySchedule) return null;

    // Group assignments by staff member
    const assignmentsByStaff: Record<string, { name: string; email: string; shifts: ShiftAssignment[] }> = {};

    monthlySchedule.shiftAssignments.forEach(assignment => {
      const staffId = assignment.staffProfile.user.id;
      if (!assignmentsByStaff[staffId]) {
        assignmentsByStaff[staffId] = {
          name: assignment.staffProfile.user.name,
          email: assignment.staffProfile.user.email,
          shifts: [],
        };
      }
      assignmentsByStaff[staffId].shifts.push(assignment);
    });

    // Sort staff alphabetically
    const sortedStaff = Object.entries(assignmentsByStaff).sort((a, b) =>
      a[1].name.localeCompare(b[1].name)
    );

    return (
      <div className="space-y-3">
        {sortedStaff.map(([staffId, staffData]) => {
          const isCurrentUser = staffId === session?.user?.id;
          // Sort shifts by date
          const sortedShifts = staffData.shifts.sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          return (
            <div
              key={staffId}
              className={`border rounded-lg p-4 ${
                isCurrentUser
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">
                    {staffData.name}
                    {isCurrentUser && <span className="ml-2 text-blue-600 dark:text-blue-400">(Anda)</span>}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{staffData.email}</p>
                </div>
                <Badge variant="outline">{sortedShifts.length} shift</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {sortedShifts.map(shift => {
                  const config = shiftTypeConfig[shift.shiftType as keyof typeof shiftTypeConfig];
                  const Icon = config?.icon;
                  // Handle date parsing - extract just the date part if it's ISO format
                  const datePart = shift.date.split('T')[0];
                  const date = new Date(datePart + 'T00:00:00');

                  return (
                    <div
                      key={shift.id}
                      className={`flex items-center gap-2 p-2 rounded ${config?.color || ''}`}
                    >
                      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{config?.label || shift.shiftType}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCalendar = () => {
    if (!monthlySchedule) {
      return (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Tidak ada jadwal terpublikasi untuk {monthNames[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
      );
    }

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();

    // Group assignments by date (allow multiple per date)
    const assignmentsByDate: Record<string, ShiftAssignment[]> = {};
    monthlySchedule.shiftAssignments.forEach(assignment => {
      if (!assignmentsByDate[assignment.date]) {
        assignmentsByDate[assignment.date] = [];
      }
      assignmentsByDate[assignment.date].push(assignment);
    });

    return (
      <div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for first week */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayAssignments = assignmentsByDate[dateStr] || [];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isWeekend = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0 ||
                            new Date(selectedYear, selectedMonth - 1, day).getDay() === 6;

            // Group assignments by shift type
            const assignmentsByType: Record<string, ShiftAssignment[]> = {};
            dayAssignments.forEach(assignment => {
              if (!assignmentsByType[assignment.shiftType]) {
                assignmentsByType[assignment.shiftType] = [];
              }
              assignmentsByType[assignment.shiftType].push(assignment);
            });

            return (
              <div
                key={day}
                className={`
                  min-h-32 p-2 border rounded-lg overflow-hidden
                  ${isWeekend ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}
                  ${isToday ? 'border-blue-500 border-2' : 'border-gray-200 dark:border-gray-700'}
                `}
              >
                <div className={`font-semibold text-sm mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                  {day}
                </div>
                <div className="space-y-1 text-xs">
                  {Object.entries(assignmentsByType).map(([shiftType, assignments]) => {
                    const config = shiftTypeConfig[shiftType as keyof typeof shiftTypeConfig];
                    const Icon = config?.icon;

                    return (
                      <div key={shiftType} className="space-y-0.5">
                        <div className={`p-1 rounded ${config?.color || ''}`}>
                          <div className="flex items-center gap-1 mb-0.5">
                            {Icon && <Icon className="w-3 h-3 flex-shrink-0" />}
                            <span className="font-semibold">{config?.label || shiftType}</span>
                          </div>
                          <div className="pl-4 space-y-0.5">
                            {assignments.map((assignment) => {
                              const isCurrentUser = assignment.staffProfile.user.id === session?.user?.id;
                              return (
                                <div
                                  key={assignment.id}
                                  className={`text-xs ${isCurrentUser ? 'font-bold underline' : ''}`}
                                  title={assignment.staffProfile.user.email}
                                >
                                  {assignment.staffProfile.user.name.split(' ')[0]}
                                  {isCurrentUser && ' (Anda)'}
                                </div>
                              );
                            })}
                          </div>
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
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // Check if user has an active working shift (not OFF, LEAVE, or HOLIDAY)
  const hasActiveShift = todayShift && !['OFF', 'LEAVE', 'HOLIDAY'].includes(todayShift.shiftType);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Shift Saya</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Lihat jadwal shift dan tugas Anda
        </p>
      </div>

      {/* Today's Shift */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Shift Hari Ini
          </CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayShift ? (
            <div className="flex items-center gap-4">
              {(() => {
                const config = shiftTypeConfig[todayShift.shiftType as keyof typeof shiftTypeConfig];
                const Icon = config?.icon;
                return (
                  <>
                    <div className={`p-4 rounded-lg ${config?.color}`}>
                      {Icon && <Icon className="w-8 h-8" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{config?.description}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Status Jadwal: <Badge className="ml-2">{todayShift.schedule.status === 'PUBLISHED' ? 'Terpublikasi' : todayShift.schedule.status}</Badge>
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Tidak ada shift yang ditugaskan untuk hari ini</p>
          )}
        </CardContent>
      </Card>

      {/* Shift Report Card - Show when user has active working shift */}
      {hasActiveShift && todayShift && (
        <ShiftReportCard
          shiftAssignment={todayShift}
          onReportCreated={() => {
            // Optionally refresh data after report is created
          }}
        />
      )}

      {/* Other Technicians' Reports */}
      {session?.user?.id && (
        <TodayReportsList currentUserId={session.user.id} />
      )}

      {/* Info when no active shift */}
      {!hasActiveShift && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Info:</strong> Laporan shift akan muncul ketika Anda memiliki shift aktif hari ini.
              {todayShift ? (
                <span> Shift Anda saat ini: <strong>{todayShift.shiftType}</strong> (bukan shift kerja aktif)</span>
              ) : (
                <span> Anda tidak memiliki shift yang ditugaskan untuk hari ini.</span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Shift Mendatang
          </CardTitle>
          <CardDescription>7 hari ke depan</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingShifts.length > 0 ? (
            <div className="space-y-2">
              {upcomingShifts.map(shift => {
                const config = shiftTypeConfig[shift.shiftType as keyof typeof shiftTypeConfig];
                const Icon = config?.icon;
                return (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {Icon && (
                        <div className={`p-2 rounded ${config?.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{config?.description}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(shift.date)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{getDayOfWeek(shift.date)}</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Tidak ada shift dalam 7 hari ke depan</p>
          )}
        </CardContent>
      </Card>

      {/* Monthly Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Jadwal Bulanan - Semua Staff</CardTitle>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="rounded-none"
                >
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  Kalender
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none"
                >
                  <List className="w-4 h-4 mr-1" />
                  Daftar
                </Button>
              </div>

              {/* Month Navigation */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-lg font-semibold min-w-[180px] text-center">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {monthlySchedule
              ? `${monthlySchedule.status === 'PUBLISHED' ? 'Terpublikasi' : monthlySchedule.status} • Menampilkan semua penugasan staff`
              : 'Pilih bulan untuk melihat'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === 'calendar' ? renderCalendar() : renderListView()}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Jenis Shift</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(shiftTypeConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className={`p-2 rounded ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
