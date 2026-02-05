'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Calendar,
  Plus,
  Trash2,
  Users,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface StaffProfile {
  id: string;
  user: {
    name: string;
    email: string;
  };
  canWorkNightShift: boolean;
  canWorkWeekendDay: boolean;
  hasServerAccess: boolean;
  hasSabbathRestriction: boolean;
  isActive: boolean;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function NewSchedulePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [holidayDates, setHolidayDates] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [generating, setGenerating] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);

  useEffect(() => {
    if (session?.user?.branchId) {
      fetchStaffProfiles();
    }
  }, [session]);

  const fetchStaffProfiles = async () => {
    try {
      setLoadingProfiles(true);
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
      setLoadingProfiles(false);
    }
  };

  const addHoliday = () => {
    if (!newHoliday) return;

    const selectedDate = new Date(newHoliday);
    const selectedMonth = selectedDate.getMonth() + 1;
    const selectedYear = selectedDate.getFullYear();

    if (selectedMonth !== parseInt(month) || selectedYear !== parseInt(year)) {
      toast.error('Holiday date must be in the selected month and year');
      return;
    }

    if (holidayDates.includes(newHoliday)) {
      toast.error('This date is already added');
      return;
    }

    setHolidayDates([...holidayDates, newHoliday]);
    setNewHoliday('');
  };

  const removeHoliday = (date: string) => {
    setHolidayDates(holidayDates.filter(d => d !== date));
  };

  const handleGenerate = async () => {
    // Prevent double submission
    if (generating) return;

    if (!session?.user?.branchId) {
      toast.error('Branch ID is required');
      return;
    }

    if (staffProfiles.length === 0) {
      toast.error('No active staff profiles found. Please add staff profiles first.');
      return;
    }

    const activeStaff = staffProfiles.filter(p => p.isActive);
    if (activeStaff.length < 3) {
      toast.error('At least 3 active staff members are required to generate a schedule');
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/shifts/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: session.user.branchId,
          month: parseInt(month),
          year: parseInt(year),
          holidayDates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle duplicate schedule error
        if (response.status === 409 && data.existingScheduleId) {
          toast.error('Schedule sudah ada untuk bulan ini');
          router.push(`/manager/shift-schedules/${data.existingScheduleId}`);
          return;
        }
        throw new Error(data.error || 'Failed to generate schedule');
      }

      toast.success('Schedule generated successfully');
      router.push(`/manager/shift-schedules/${data.data.scheduleId}`);
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      toast.error(error.message || 'Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  if (!session) {
    return null;
  }

  const nightShiftStaff = staffProfiles.filter(p => p.canWorkNightShift && p.isActive);
  const weekendStaff = staffProfiles.filter(p => p.canWorkWeekendDay && p.isActive);
  const serverAccessStaff = staffProfiles.filter(p => p.hasServerAccess && p.isActive);
  const sabbathStaff = staffProfiles.filter(p => p.hasSabbathRestriction && p.isActive);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Generate Shift Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create a new monthly shift schedule for your branch
          </p>
        </div>
        <Link href="/manager/shift-schedules">
          <Button variant="outline">
            Cancel
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule Period */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Period</CardTitle>
              <CardDescription>Select the month and year for this schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
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
                  <Label>Year</Label>
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
              </div>
            </CardContent>
          </Card>

          {/* Holidays */}
          <Card>
            <CardHeader>
              <CardTitle>Public Holidays</CardTitle>
              <CardDescription>Add holiday dates that will affect shift assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={addHoliday} disabled={!newHoliday}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {holidayDates.length > 0 ? (
                <div className="space-y-2">
                  {holidayDates.map((date) => (
                    <div
                      key={date}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHoliday(date)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm">No holidays added</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleGenerate}
                disabled={generating || loadingProfiles || staffProfiles.length === 0}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Schedule...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Generate Schedule
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Staff Preview Sidebar */}
        <div className="space-y-6">
          {/* Staff Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staff Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProfiles ? (
                <div className="text-center py-8 text-gray-500">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                  <p className="text-sm">Loading staff...</p>
                </div>
              ) : staffProfiles.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    No staff profiles found
                  </p>
                  <Link href="/manager/staff-profiles">
                    <Button variant="outline" size="sm">
                      Add Staff Profiles
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium">Total Active</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      {staffProfiles.filter(p => p.isActive).length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Night Shift Capable</span>
                    </div>
                    <Badge variant="outline">
                      {nightShiftStaff.length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Weekend Available</span>
                    </div>
                    <Badge variant="outline">
                      {weekendStaff.length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Server Access</span>
                    </div>
                    <Badge variant="outline">
                      {serverAccessStaff.length}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Sabbath Restrictions</span>
                    </div>
                    <Badge variant="outline">
                      {sabbathStaff.length}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generation Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generation Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Max 5 night shifts per month per staff</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Minimum 3 days between night shifts</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Mandatory off-day after night shift</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Weekend: 2 day staff, 3 night staff</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Server access staff on-call rotation</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Sabbath restrictions honored</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}