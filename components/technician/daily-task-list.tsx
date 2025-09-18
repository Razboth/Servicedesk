'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  Edit2,
  Circle,
  Clock,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

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

interface DailyTaskListProps {
  tasks: DailyTask[];
  onTaskUpdate: (taskId: string, updates: any) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskReorder: (tasks: DailyTask[]) => void;
  onTaskEdit: (task: DailyTask) => void;
  onTaskCreate: (taskData: any) => void;
}

export function DailyTaskList({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onTaskReorder,
  onTaskEdit,
  onTaskCreate,
}: DailyTaskListProps) {
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Map<string, string>>(new Map());
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    category: 'OTHER',
    priority: 'MEDIUM',
    status: 'PENDING',
    notes: '',
    description: '',
  });


  const handleStatusChange = (taskId: string, status: string) => {
    onTaskUpdate(taskId, { status });
  };

  const getCategoryDisplay = (category: string) => {
    const categoryMap: Record<string, string> = {
      'TICKET': 'Ticket',
      'MAINTENANCE': 'Maintenance',
      'MEETING': 'Meeting',
      'TRAINING': 'Training',
      'DOCUMENTATION': 'Docs',
      'SUPPORT': 'Support',
      'OTHER': 'Other'
    };
    return categoryMap[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'TICKET': 'bg-blue-50 text-blue-700 border-blue-200',
      'MAINTENANCE': 'bg-orange-50 text-orange-700 border-orange-200',
      'MEETING': 'bg-purple-50 text-purple-700 border-purple-200',
      'TRAINING': 'bg-green-50 text-green-700 border-green-200',
      'DOCUMENTATION': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'SUPPORT': 'bg-pink-50 text-pink-700 border-pink-200',
      'OTHER': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    return colorMap[category] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getPriorityIcon = (priority: string | undefined) => {
    if (!priority) return null;
    switch (priority) {
      case 'URGENT':
        return <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />;
      case 'HIGH':
        return <div className="w-2 h-2 rounded-full bg-orange-500" />;
      case 'MEDIUM':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
      case 'LOW':
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-400" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'DEFERRED':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleNoteSave = (taskId: string) => {
    const notes = noteValues.get(taskId) || '';
    onTaskUpdate(taskId, { notes });
    setEditingNotes(null);
  };

  const formatTime = (minutes: number | undefined) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    await onTaskCreate({
      ...newTask,
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      notes: newTask.notes.trim(),
    });

    // Reset form
    setNewTask({
      title: '',
      category: 'OTHER',
      priority: 'MEDIUM',
      status: 'PENDING',
      notes: '',
      description: '',
    });
    setIsAddingNew(false);
    toast.success('Task added successfully');
  };

  const handleCancelNew = () => {
    setNewTask({
      title: '',
      category: 'OTHER',
      priority: 'MEDIUM',
      status: 'PENDING',
      notes: '',
      description: '',
    });
    setIsAddingNew(false);
  };

  // Auto-show new row when list is empty or user wants to add
  useEffect(() => {
    if (tasks.filter(t => t.category !== 'TICKET').length === 0 && !isAddingNew) {
      setIsAddingNew(true);
    }
  }, [tasks, isAddingNew]);

  return (
    <div className="w-full space-y-4">
      {/* Minimalist header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </h3>
        {!isAddingNew && (
          <Button
            onClick={() => setIsAddingNew(true)}
            size="sm"
            variant="ghost"
            className="h-8 px-2 lg:px-3"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* Clean table design */}
      <div className="rounded-lg border bg-card">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[140px] text-xs font-medium text-muted-foreground">ID</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Task</TableHead>
                <TableHead className="w-[120px] text-xs font-medium text-muted-foreground">Category</TableHead>
                <TableHead className="w-[100px] text-xs font-medium text-muted-foreground">Priority</TableHead>
                <TableHead className="w-[140px] text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Notes</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* New task row */}
              {isAddingNew && (
                <TableRow className="bg-muted/30 hover:bg-muted/40">
                  <TableCell className="py-3">
                    <span className="text-xs text-muted-foreground">NEW</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <Input
                      placeholder="What needs to be done?"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTask.title.trim()) {
                          handleCreateTask();
                        } else if (e.key === 'Escape') {
                          handleCancelNew();
                        }
                      }}
                      className="h-8 bg-background"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell className="py-3">
                    <Select
                      value={newTask.category}
                      onValueChange={(value) => setNewTask({ ...newTask, category: value })}
                    >
                      <SelectTrigger className="h-8 bg-background">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          newTask.category && getCategoryColor(newTask.category).split(' ').slice(1).join(' ')
                        )}>
                          {newTask.category && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />}
                          {getCategoryDisplay(newTask.category)}
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAINTENANCE">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 opacity-40" />
                            Maintenance
                          </div>
                        </SelectItem>
                        <SelectItem value="MEETING">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 opacity-40" />
                            Meeting
                          </div>
                        </SelectItem>
                        <SelectItem value="TRAINING">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 opacity-40" />
                            Training
                          </div>
                        </SelectItem>
                        <SelectItem value="DOCUMENTATION">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 opacity-40" />
                            Documentation
                          </div>
                        </SelectItem>
                        <SelectItem value="SUPPORT">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500 opacity-40" />
                            Support
                          </div>
                        </SelectItem>
                        <SelectItem value="OTHER">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 opacity-40" />
                            Other
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-3">
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger className="h-8 bg-background">
                        <div className="flex items-center gap-1.5">
                          {getPriorityIcon(newTask.priority)}
                          <span className="text-xs font-medium">
                            {newTask.priority.charAt(0) + newTask.priority.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Low
                          </div>
                        </SelectItem>
                        <SelectItem value="MEDIUM">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            Medium
                          </div>
                        </SelectItem>
                        <SelectItem value="HIGH">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            High
                          </div>
                        </SelectItem>
                        <SelectItem value="URGENT">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Urgent
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon('PENDING')}
                      <span className="text-sm text-muted-foreground">Pending</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Input
                      placeholder="Add notes (optional)"
                      value={newTask.notes}
                      onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                      className="h-8 bg-background"
                    />
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleCreateTask}
                        disabled={!newTask.title.trim()}
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={handleCancelNew}
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing tasks */}
              {tasks.map((task, index) => (
                <TableRow
                  key={task.id}
                  className={cn(
                    "group transition-colors hover:bg-muted/50",
                    task.status === 'COMPLETED' && "opacity-60"
                  )}
                >
                  <TableCell className="py-3">
                    {task.ticket ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {task.ticket.ticketNumber}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">TASK-{index + 1}</span>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="space-y-1">
                      <p className={cn(
                        "text-sm font-medium leading-none",
                        task.status === 'COMPLETED' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      {(task.ticket?.service || task.description) && (
                        <p className="text-xs text-muted-foreground">
                          {task.ticket?.service?.name || task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                      getCategoryColor(task.category)
                    )}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                      {getCategoryDisplay(task.category)}
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    {task.priority && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border">
                        {getPriorityIcon(task.priority)}
                        <span className="text-xs font-medium">
                          {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                        </span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    {task.category === 'TICKET' ? (
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.ticket?.status || task.status)}
                        <span className="text-sm capitalize">
                          {(task.ticket?.status || task.status).toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                    ) : (
                      <Select
                        value={task.status}
                        onValueChange={(value) => onTaskUpdate(task.id, { status: value })}
                      >
                        <SelectTrigger className="h-8 border-0 bg-transparent px-2 hover:bg-muted">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="text-sm capitalize">
                              {task.status.toLowerCase().replace('_', ' ')}
                            </span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">
                            <div className="flex items-center gap-2">
                              {getStatusIcon('PENDING')}
                              <span>Pending</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="IN_PROGRESS">
                            <div className="flex items-center gap-2">
                              {getStatusIcon('IN_PROGRESS')}
                              <span>In Progress</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="COMPLETED">
                            <div className="flex items-center gap-2">
                              {getStatusIcon('COMPLETED')}
                              <span>Completed</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="CANCELLED">
                            <div className="flex items-center gap-2">
                              {getStatusIcon('CANCELLED')}
                              <span>Cancelled</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="DEFERRED">
                            <div className="flex items-center gap-2">
                              {getStatusIcon('DEFERRED')}
                              <span>Deferred</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    {editingNotes === task.id ? (
                      <Input
                        className="h-8"
                        value={noteValues.get(task.id) || task.notes || ''}
                        onChange={(e) => {
                          const newNotes = new Map(noteValues);
                          newNotes.set(task.id, e.target.value);
                          setNoteValues(newNotes);
                        }}
                        onBlur={() => handleNoteSave(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleNoteSave(task.id);
                          } else if (e.key === 'Escape') {
                            setEditingNotes(null);
                          }
                        }}
                        placeholder="Add notes..."
                        autoFocus
                      />
                    ) : (
                      <div
                        className="text-sm cursor-pointer hover:text-foreground transition-colors min-h-[32px] flex items-center"
                        onClick={() => {
                          setEditingNotes(task.id);
                          const newNotes = new Map(noteValues);
                          newNotes.set(task.id, task.notes || '');
                          setNoteValues(newNotes);
                        }}
                      >
                        {task.notes || (
                          <span className="text-muted-foreground">Add notes...</span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="py-3">
                    {task.category !== 'TICKET' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem onClick={() => onTaskEdit(task)}>
                            <Edit2 className="mr-2 h-3 w-3" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onTaskDelete(task.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-3 w-3" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {/* Empty state */}
              {tasks.length === 0 && !isAddingNew && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Circle className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No tasks for today</p>
                      <Button
                        onClick={() => setIsAddingNew(true)}
                        size="sm"
                        variant="outline"
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add your first task
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Footer with summary */}
      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{tasks.filter(t => t.status === 'COMPLETED').length} completed</span>
          <Separator orientation="vertical" className="h-4" />
          <span>{tasks.filter(t => t.status === 'IN_PROGRESS').length} in progress</span>
          <Separator orientation="vertical" className="h-4" />
          <span>{tasks.filter(t => t.status === 'PENDING').length} pending</span>
        </div>
      </div>
    </div>
  );
}