'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Clock, User, MessageSquare, AlertCircle, CheckCircle, Plus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TicketFieldValue {
  id: string;
  value: string;
  field: {
    name: string;
    label: string;
    type: string;
  };
}

interface TicketComment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface TicketTask {
  id: string;
  title: string;
  description?: string;
  estimatedMinutes?: number;
  actualMinutes?: number;
  isRequired: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  order: number;
  notes?: string;
  completedAt?: string;
  completedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  service: {
    name: string;
    category: {
      name: string;
    };
  };
  createdBy: {
    name: string;
    email: string;
    role: string;
  };
  assignedTo?: {
    name: string;
    email: string;
    role: string;
  };
  fieldValues: TicketFieldValue[];
  comments: TicketComment[];
}

export default function TicketDetailPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [tasks, setTasks] = useState<TicketTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionComment, setResolutionComment] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
      fetchTasks();
    }
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tickets/${ticketId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Ticket not found');
        } else if (response.status === 403) {
          setError('Access denied');
        } else {
          setError('Failed to load ticket');
        }
        return;
      }
      
      const data = await response.json();
      setTicket(data);
    } catch (err) {
      setError('Failed to load ticket');
      console.error('Error fetching ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      setIsSubmittingComment(true);
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          isInternal: false
        }),
      });
      
      if (response.ok) {
        setNewComment('');
        fetchTicket(); // Refresh ticket data
      } else {
        console.error('Failed to add comment');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const updateTicketStatus = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        fetchTicket(); // Refresh ticket data
      } else {
        console.error('Failed to update ticket status');
      }
    } catch (err) {
      console.error('Error updating ticket status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResolveClick = () => {
    setShowResolveModal(true);
  };

  const handleResolutionSubmit = async (finalStatus: 'RESOLVED' | 'CLOSED' | 'CANCELLED') => {
    try {
      setIsSubmittingResolution(true);
      
      // First add the resolution comment if provided
      if (resolutionComment.trim()) {
        const commentResponse = await fetch(`/api/tickets/${ticketId}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: resolutionComment,
            isInternal: false
          }),
        });
        
        if (!commentResponse.ok) {
          console.error('Failed to add resolution comment');
          return;
        }
      }
      
      // Then update the ticket status
      const statusResponse = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: finalStatus }),
      });
      
      if (statusResponse.ok) {
        setShowResolveModal(false);
        setResolutionComment('');
        fetchTicket(); // Refresh ticket data
      } else {
        console.error('Failed to update ticket status');
      }
    } catch (err) {
      console.error('Error submitting resolution:', err);
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const handleModalClose = () => {
    setShowResolveModal(false);
    setResolutionComment('');
  };

  const updateTaskStatus = async (taskId: string, status: string, actualMinutes?: number, notes?: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, actualMinutes, notes }),
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getTaskStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'SKIPPED':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'default';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'RESOLVED':
        return 'outline';
      case 'CLOSED':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'outline';
      case 'MEDIUM':
        return 'secondary';
      case 'HIGH':
        return 'destructive';
      case 'CRITICAL':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const canUpdateStatus = () => {
    if (!session?.user?.role || !ticket) return false;
    
    return (
      session.user.role === 'ADMIN' ||
      session.user.role === 'MANAGER' ||
      (session.user.role === 'TECHNICIAN' && ticket.assignedTo?.email === session.user.email)
    );
  };

  const canModifyTicket = () => {
    return canUpdateStatus();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ticket...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.back()} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
              <p className="text-gray-600">Ticket #{ticket.ticketNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(ticket.status)}>
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                {ticket.priority}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ticket Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                </CardContent>
              </Card>

              {/* Custom Fields */}
              {ticket.fieldValues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {ticket.fieldValues.map((fieldValue) => (
                        <div key={fieldValue.id} className="flex justify-between">
                          <span className="font-medium text-gray-700">{fieldValue.field.label}:</span>
                          <span className="text-gray-600">{fieldValue.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Tasks ({tasks.filter(t => t.status === 'COMPLETED').length}/{tasks.length} completed)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div key={task.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{task.title}</h4>
                                {task.isRequired && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                <Badge variant={getTaskStatusBadgeVariant(task.status)} className="text-xs">
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              {task.description && (
                                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {task.estimatedMinutes && (
                                  <span>Est: {task.estimatedMinutes}min</span>
                                )}
                                {task.actualMinutes && (
                                  <span>Actual: {task.actualMinutes}min</span>
                                )}
                                {task.completedBy && (
                                  <span>Completed by: {task.completedBy.name}</span>
                                )}
                              </div>
                              {task.notes && (
                                <p className="text-sm text-gray-600 mt-2 italic">{task.notes}</p>
                              )}
                            </div>
                            {canModifyTicket() && task.status !== 'COMPLETED' && (
                              <div className="flex gap-2">
                                {task.status === 'PENDING' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                                  >
                                    Start
                                  </Button>
                                )}
                                {task.status === 'IN_PROGRESS' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                                  >
                                    Complete
                                  </Button>
                                )}
                                {!task.isRequired && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateTaskStatus(task.id, 'SKIPPED')}
                                  >
                                    Skip
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Comments ({ticket.comments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ticket.comments.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No comments yet</p>
                    ) : (
                      ticket.comments.map((comment) => (
                        <div key={comment.id} className="border-l-4 border-blue-200 pl-4 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{comment.user.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {comment.user.role}
                              </Badge>
                              {comment.isInternal && (
                                <Badge variant="secondary" className="text-xs">
                                  Internal
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))
                    )}
                    
                    {/* Add Comment */}
                    <div className="border-t pt-4">
                      <Label htmlFor="comment">Add Comment</Label>
                      <Textarea
                        id="comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type your comment here..."
                        className="mt-2"
                        rows={3}
                      />
                      <Button
                        onClick={addComment}
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="mt-2 flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              {canUpdateStatus() && (
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ticket.status === 'OPEN' && (
                        <Button
                          onClick={() => updateTicketStatus('IN_PROGRESS')}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center gap-2"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Start Work
                        </Button>
                      )}
                      {(ticket.status === 'IN_PROGRESS' || ticket.status === 'RESOLVED') && (
                        <Button
                          onClick={handleResolveClick}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ticket Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-700">Service:</span>
                      <p className="text-gray-600">{ticket.service.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <p className="text-gray-600">{ticket.service.category.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created by:</span>
                      <p className="text-gray-600">{ticket.createdBy.name}</p>
                      <p className="text-sm text-gray-500">{ticket.createdBy.email}</p>
                    </div>
                    {ticket.assignedTo && (
                      <div>
                        <span className="font-medium text-gray-700">Assigned to:</span>
                        <p className="text-gray-600">{ticket.assignedTo.name}</p>
                        <p className="text-sm text-gray-500">{ticket.assignedTo.email}</p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <p className="text-gray-600 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Last updated:</span>
                      <p className="text-gray-600 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    {ticket.resolvedAt && (
                      <div>
                        <span className="font-medium text-gray-700">Resolved:</span>
                        <p className="text-gray-600 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(ticket.resolvedAt), { addSuffix: true })}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Resolution Modal */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Resolve Ticket</DialogTitle>
            <DialogDescription>
              Add an optional resolution comment and choose the final status for this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution-comment">Resolution Comment (Optional)</Label>
              <Textarea
                id="resolution-comment"
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
                placeholder="Describe how the issue was resolved..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <Button
                variant="outline"
                onClick={handleModalClose}
                disabled={isSubmittingResolution}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleResolutionSubmit('RESOLVED')}
                disabled={isSubmittingResolution}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isSubmittingResolution ? 'Processing...' : 'Mark Resolved'}
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
              <Button
                onClick={() => handleResolutionSubmit('CLOSED')}
                disabled={isSubmittingResolution}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isSubmittingResolution ? 'Processing...' : 'Close Ticket'}
              </Button>
              <Button
                onClick={() => handleResolutionSubmit('CANCELLED')}
                disabled={isSubmittingResolution}
                variant="destructive"
                className="w-full sm:w-auto flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                {isSubmittingResolution ? 'Processing...' : 'Cancel Ticket'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}