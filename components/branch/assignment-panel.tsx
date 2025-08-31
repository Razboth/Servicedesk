'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
  MessageSquare
} from 'lucide-react';

interface AssignmentPanelProps {
  ticketId: string;
  branchId: string;
  currentAssignments?: any[];
  onUpdate?: () => void;
}

interface BranchStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  currentTasks: number;
  avatar?: string;
}

const TASK_TYPES = [
  { value: 'JOURNAL_CHECK', label: 'Journal Verification' },
  { value: 'EJ_ANALYSIS', label: 'Electronic Journal Analysis' },
  { value: 'CASH_COUNT', label: 'Cash Reconciliation' },
  { value: 'CCTV_REVIEW', label: 'CCTV Review' },
  { value: 'CORE_BANKING', label: 'Core Banking Check' },
  { value: 'CUSTOMER_CONTACT', label: 'Customer Contact' },
  { value: 'ATM_VENDOR', label: 'ATM Vendor Coordination' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
  { value: 'GENERAL', label: 'General Task' }
];

export default function AssignmentPanel({ ticketId, branchId, currentAssignments = [], onUpdate }: AssignmentPanelProps) {
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [assignments, setAssignments] = useState(currentAssignments);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    assignedToId: '',
    taskType: '',
    description: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchBranchStaff();
    fetchAssignments();
  }, [branchId]);

  const fetchBranchStaff = async () => {
    try {
      const response = await fetch(`/api/branch/staff?branchId=${branchId}`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/assign`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleAssign = async () => {
    if (!newAssignment.assignedToId || !newAssignment.taskType) {
      toast.error('Please select staff and task type');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment)
      });

      if (response.ok) {
        toast.success('Task assigned successfully');
        fetchAssignments();
        setShowAssignForm(false);
        setNewAssignment({
          assignedToId: '',
          taskType: '',
          description: '',
          dueDate: ''
        });
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to assign task');
      }
    } catch (error) {
      toast.error('Error assigning task');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (assignmentId: string, status: string, notes?: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/branch/atm-claims/${ticketId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          status,
          completionNotes: notes
        })
      });

      if (response.ok) {
        toast.success(`Task ${status.toLowerCase()}`);
        fetchAssignments();
        if (onUpdate) onUpdate();
      } else {
        toast.error('Failed to update task status');
      }
    } catch (error) {
      toast.error('Error updating task');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Form */}
      {showAssignForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Assign New Task
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="taskType">Task Type</Label>
                <Select
                  value={newAssignment.taskType}
                  onValueChange={(value) => setNewAssignment({...newAssignment, taskType: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select
                  value={newAssignment.assignedToId}
                  onValueChange={(value) => setNewAssignment({...newAssignment, assignedToId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map(person => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} - {person.role} ({person.currentTasks} tasks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Task Description</Label>
              <Textarea
                id="description"
                value={newAssignment.description}
                onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                placeholder="Provide detailed instructions for this task..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={newAssignment.dueDate}
                onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignForm(false);
                  setNewAssignment({
                    assignedToId: '',
                    taskType: '',
                    description: '',
                    dueDate: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={loading}
              >
                Assign Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Current Assignments ({assignments.length})
            </span>
            {!showAssignForm && (
              <Button
                size="sm"
                onClick={() => setShowAssignForm(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Assign Task
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No tasks assigned yet. Click "Assign Task" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment: any) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {assignment.assignedTo?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{assignment.assignedTo?.name}</span>
                          <Badge variant={getStatusColor(assignment.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(assignment.status)}
                              {assignment.status}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {TASK_TYPES.find(t => t.value === assignment.taskType)?.label || assignment.taskType}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(assignment.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>

                  {assignment.description && (
                    <p className="text-sm text-gray-700 mb-3 pl-13">
                      {assignment.description}
                    </p>
                  )}

                  {assignment.dueDate && (
                    <div className="flex items-center gap-2 text-sm text-orange-600 mb-3 pl-13">
                      <Clock className="w-4 h-4" />
                      Due: {new Date(assignment.dueDate).toLocaleString('id-ID')}
                    </div>
                  )}

                  {assignment.status === 'PENDING' && (
                    <div className="flex gap-2 pl-13">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(assignment.id, 'IN_PROGRESS')}
                      >
                        Start Task
                      </Button>
                    </div>
                  )}

                  {assignment.status === 'IN_PROGRESS' && (
                    <div className="flex gap-2 pl-13">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          const notes = prompt('Add completion notes (optional):');
                          handleStatusUpdate(assignment.id, 'COMPLETED', notes || undefined);
                        }}
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const notes = prompt('Reason for cancellation:');
                          if (notes) {
                            handleStatusUpdate(assignment.id, 'CANCELLED', notes);
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {assignment.completionNotes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg pl-13">
                      <p className="text-sm font-medium">
                        {assignment.status === 'COMPLETED' ? 'Completion Notes' : 'Cancellation Reason'}:
                      </p>
                      <p className="text-sm text-gray-700">{assignment.completionNotes}</p>
                    </div>
                  )}

                  {assignment.completedAt && (
                    <p className="text-xs text-gray-500 mt-2 pl-13">
                      {assignment.status === 'COMPLETED' ? 'Completed' : 'Cancelled'} at:{' '}
                      {new Date(assignment.completedAt).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
              <p className="text-sm text-gray-600">Total Tasks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {assignments.filter((a: any) => a.status === 'PENDING').length}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {assignments.filter((a: any) => a.status === 'IN_PROGRESS').length}
              </p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {assignments.filter((a: any) => a.status === 'COMPLETED').length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}