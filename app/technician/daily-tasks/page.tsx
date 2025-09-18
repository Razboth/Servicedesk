'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Download,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ListTodo,
  CalendarDays,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  XCircle,
  CheckCircle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { DailyTaskList } from '@/components/technician/daily-task-list';
import { DailyTaskForm } from '@/components/technician/daily-task-form';
import { DailyTaskExport } from '@/components/technician/daily-task-export';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface DailyTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  priority?: string;
  ticketId?: string;
  startTime?: string;
  endTime?: string;
  actualMinutes?: number;
  notes?: string;
  order: number;
  ticket?: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
    service: {
      name: string;
    };
  };
}

interface TaskList {
  id: string;
  date: string;
  tasks: DailyTask[];
  technician: {
    id: string;
    name: string;
    email: string;
  };
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  totalMinutes: number;
}

export default function DailyTasksPage() {
  const { data: session } = useSession();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskList, setTaskList] = useState<TaskList | null>(null);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    totalMinutes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDailyTasks();
    }
  }, [session, selectedDate]);

  const fetchDailyTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/technician/daily-tasks?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setTaskList(data.taskList);
        setStats(data.stats);
      } else {
        toast.error('Failed to fetch daily tasks');
      }
    } catch (error) {
      console.error('Error fetching daily tasks:', error);
      toast.error('Error loading daily tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreate = async (taskData: any) => {
    try {
      const response = await fetch('/api/technician/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          date: selectedDate,
        }),
      });

      if (response.ok) {
        // Success notification handled in the component
        fetchDailyTasks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Error creating task');
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    try {
      const response = await fetch(`/api/technician/daily-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success('Task updated successfully');
        setEditingTask(null);
        fetchDailyTasks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Error updating task');
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/technician/daily-tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Task deleted successfully');
        fetchDailyTasks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Error deleting task');
    }
  };

  const handleTaskReorder = async (tasks: DailyTask[]) => {
    try {
      const response = await fetch('/api/technician/daily-tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });

      if (response.ok) {
        toast.success('Tasks reordered successfully');
      } else {
        toast.error('Failed to reorder tasks');
      }
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast.error('Error reordering tasks');
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleExport = async (date: string) => {
    try {
      const response = await fetch('/api/technician/daily-tasks/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: date, endDate: date }),
      });

      if (response.ok) {
        const data = await response.json();
        // The export dialog component will handle the actual file download
        return data;
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting tasks:', error);
      toast.error('Failed to export tasks');
      throw error;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (!session || session.user?.role !== 'TECHNICIAN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to technicians.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8 px-4 md:px-8 lg:px-12">
        {/* Minimalist Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Daily Tasks</h1>
                <p className="text-sm text-muted-foreground">Track and manage your daily activities</p>
              </div>
            </div>
            <Button
              onClick={() => setShowExportDialog(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() - 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="bg-transparent border-0 focus:outline-none focus:ring-0 font-medium"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const date = new Date(selectedDate);
                  date.setDate(date.getDate() + 1);
                  setSelectedDate(date.toISOString().split('T')[0]);
                }}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="text-xs"
            >
              Today
            </Button>
          </div>
        </div>

        {/* Minimalist Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <Circle className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>

          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="text-xs text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-semibold">{stats.completed}</p>
          </div>

          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-blue-600" />
              <span className="text-xs text-muted-foreground">In Progress</span>
            </div>
            <p className="text-2xl font-semibold">{stats.inProgress}</p>
          </div>

          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <Circle className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-semibold">{stats.pending}</p>
          </div>

          <div className="p-4 bg-card rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Time Tracked</span>
            </div>
            <p className="text-2xl font-semibold">
              {stats.totalMinutes > 0 ? formatTime(stats.totalMinutes) : '0m'}
            </p>
          </div>
        </div>

        {/* Task List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <DailyTaskList
            tasks={taskList?.tasks || []}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            onTaskReorder={handleTaskReorder}
            onTaskEdit={setEditingTask}
            onTaskCreate={handleTaskCreate}
          />
        )}
      </main>

      {/* Task Form Dialog - only for editing now */}
      {editingTask && (
        <DailyTaskForm
          task={editingTask}
          onSubmit={(data) => handleTaskUpdate(editingTask.id, data)}
          onClose={() => {
            setEditingTask(null);
          }}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <DailyTaskExport
          selectedDate={selectedDate}
          onExport={handleExport}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}