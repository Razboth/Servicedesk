'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Calendar,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Hammer
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ShiftSchedule {
  id: string;
  month: number;
  year: number;
  status: string;
  generatedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  branch: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    shiftAssignments: number;
    onCallAssignments: number;
    holidays: number;
  };
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const statusConfig = {
  DRAFT: { label: 'Draft', color: 'bg-gray-500', icon: FileText },
  GENERATED: { label: 'Generated', color: 'bg-blue-500', icon: Clock },
  PUBLISHED: { label: 'Published', color: 'bg-green-500', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-orange-500', icon: FileText },
};

export default function ShiftSchedulesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    if (session?.user?.branchId) {
      fetchSchedules();
    }
  }, [session, yearFilter, statusFilter]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        branchId: session?.user?.branchId || '',
        year: yearFilter,
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`/api/shifts/schedules?${params}`);
      if (!response.ok) throw new Error('Failed to fetch schedules');

      const data = await response.json();
      setSchedules(data.data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load shift schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule? This will remove all shift assignments.')) {
      return;
    }

    try {
      setDeleting(scheduleId);
      const response = await fetch(`/api/shifts/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete schedule');

      toast.success('Schedule deleted successfully');
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    } finally {
      setDeleting(null);
    }
  };

  const handlePublish = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/shifts/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });

      if (!response.ok) throw new Error('Failed to publish schedule');

      toast.success('Schedule published successfully');
      fetchSchedules();
    } catch (error) {
      console.error('Error publishing schedule:', error);
      toast.error('Failed to publish schedule');
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Shift Schedules</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage monthly shift schedules for your branch
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/manager/shift-schedules/builder/new">
            <Button variant="outline">
              <Hammer className="w-4 h-4 mr-2" />
              Shift Builder
            </Button>
          </Link>
          <Link href="/manager/shift-schedules/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="GENERATED">Generated</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No shift schedules found</p>
              <Link href="/manager/shift-schedules/new">
                <Button variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Schedule
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>On-Call</TableHead>
                  <TableHead>Holidays</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const config = statusConfig[schedule.status as keyof typeof statusConfig];
                  const Icon = config?.icon || FileText;

                  return (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {monthNames[schedule.month - 1]}
                      </TableCell>
                      <TableCell>{schedule.year}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${config?.color} text-white`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Users className="w-4 h-4 mr-1 text-gray-500" />
                          {schedule._count.shiftAssignments}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-1 text-gray-500" />
                          {schedule._count.onCallAssignments}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                          {schedule._count.holidays}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {schedule.generatedAt
                          ? new Date(schedule.generatedAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/manager/shift-schedules/${schedule.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>

                          {schedule.status === 'GENERATED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePublish(schedule.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(schedule.id)}
                            disabled={deleting === schedule.id}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}