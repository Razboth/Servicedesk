'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor, RichTextViewer } from '@/components/ui/rich-text-editor';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  ModernDialog, 
  ModernDialogContent, 
  ModernDialogHeader, 
  ModernDialogTitle, 
  ModernDialogDescription, 
  ModernDialogBody, 
  ModernDialogFooter 
} from '@/components/ui/modern-dialog';
import { ProgressTracker } from '@/components/ui/progress-tracker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, User, MessageSquare, AlertCircle, CheckCircle, CheckCheck, Plus, X, Paperclip, Download, FileText, Eye, Edit, Sparkles, Shield, UserCheck, UserX, Timer, Trash2, Image as ImageIcon, File, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { RelatedArticles } from '@/components/knowledge/related-articles';
import { AttachmentPreview } from '@/components/ui/attachment-preview';

interface TicketFieldValue {
  id: string;
  value: string;
  field: {
    name: string;
    label: string;
    type: string;
  };
}

interface CommentAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
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
  attachments?: CommentAttachment[];
}

interface TicketTask {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  actualMinutes?: number;
  notes?: string;
  completedAt?: string;
  taskTemplateItem: {
    id: string;
    title: string;
    description?: string;
    estimatedMinutes?: number;
    isRequired: boolean;
    order: number;
  };
  completedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface TicketAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface TicketApproval {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  createdAt: string;
  updatedAt: string;
  approver: {
    id: string;
    name: string;
    email: string;
    role: string;
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
  closedAt?: string;
  assignedToId?: string;
  service: {
    name: string;
    requiresApproval?: boolean;
    category: {
      name: string;
    };
  };
  createdBy: {
    name: string;
    email: string;
    role: string;
    branch?: {
      id: string;
      name: string;
      code: string;
    };
  };
  assignedTo?: {
    name: string;
    email: string;
    role: string;
  };
  fieldValues: TicketFieldValue[];
  comments: TicketComment[];
  attachments: TicketAttachment[];
  approvals: TicketApproval[];
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
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionComment, setResolutionComment] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [selectedResolutionStatus, setSelectedResolutionStatus] = useState<string>('RESOLVED');
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Helper function to check if file is previewable
  const isPreviewable = (mimeType: string) => {
    const previewableMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ];
    return previewableMimeTypes.includes(mimeType);
  };

  // Helper functions for approval status
  const getApprovalStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <UserCheck className="h-4 w-4" />;
      case 'REJECTED':
        return <UserX className="h-4 w-4" />;
      case 'PENDING':
        return <Timer className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getApprovalStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'destructive';
      case 'PENDING':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getLatestApproval = () => {
    if (!ticket?.approvals || ticket.approvals.length === 0) return null;
    return ticket.approvals[0]; // Already ordered by createdAt desc from API
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
      fetchTasks();
    }
  }, [ticketId]);

  // Poll for approval status changes every 10 seconds if ticket is pending approval
  useEffect(() => {
    if (!ticket) return;
    
    // Check if ticket requires approval and is pending
    const requiresApproval = ticket.service?.requiresApproval;
    const latestApproval = ticket.approvals?.[0];
    const isPendingApproval = requiresApproval && (!latestApproval || latestApproval.status === 'PENDING');
    
    if (isPendingApproval) {
      // Set up polling interval
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/tickets/${ticketId}`);
          if (response.ok) {
            const updatedTicket = await response.json();
            const updatedApproval = updatedTicket.approvals?.[0];
            
            // Check if approval status changed
            if (updatedApproval?.status === 'APPROVED') {
              // Reload the page to refresh all data and UI
              window.location.reload();
            } else if (updatedApproval?.status === 'REJECTED') {
              // Update ticket data without full reload for rejections
              setTicket(updatedTicket);
            }
          }
        } catch (error) {
          console.error('Error polling for approval status:', error);
        }
      }, 10000); // Poll every 10 seconds
      
      return () => clearInterval(pollInterval);
    }
  }, [ticket, ticketId]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tickets/${ticketId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Ticket not found');
        } else if (response.status === 403) {
          setError('Access denied. This ticket may require approval or you may not have permission to view it.');
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

  const handleClaimTicket = async () => {
    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`/api/tickets/${ticketId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchTicket(); // Refresh ticket data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to claim ticket');
      }
    } catch (err) {
      console.error('Error claiming ticket:', err);
      alert('Failed to claim ticket');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReleaseTicket = async () => {
    if (!confirm('Are you sure you want to release this ticket?')) return;
    
    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`/api/tickets/${ticketId}/claim`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchTicket(); // Refresh ticket data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to release ticket');
      }
    } catch (err) {
      console.error('Error releasing ticket:', err);
      alert('Failed to release ticket');
    } finally {
      setIsUpdatingStatus(false);
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
    if (!newComment.trim() && commentAttachments.length === 0) return;
    
    try {
      setIsSubmittingComment(true);
      setIsUploading(true);
      setUploadProgress(0);
      
      // Upload attachments first if any
      const uploadedAttachments = [];
      const totalFiles = commentAttachments.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = commentAttachments[i];
        setUploadProgress(Math.round((i / totalFiles) * 80)); // Up to 80% for uploads
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:type;base64, prefix
          };
          reader.readAsDataURL(file);
        });
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'application/octet-stream', // Default for unknown types
            size: file.size,
            content: base64
          })
        });
        
        if (uploadResponse.ok) {
          const uploadedFile = await uploadResponse.json();
          uploadedAttachments.push({
            filename: uploadedFile.filename,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size
          });
        }
      }
      
      setUploadProgress(90); // 90% before submitting comment
      
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment || 'Attached files',
          isInternal: false,
          attachments: uploadedAttachments
        }),
      });
      
      if (response.ok) {
        setUploadProgress(100);
        setNewComment('');
        setCommentAttachments([]);
        fetchTicket(); // Refresh ticket data
        setTimeout(() => {
          setUploadProgress(0);
          setIsUploading(false);
        }, 500);
      } else {
        const errorData = await response.json().catch(() => null);
        console.error('Failed to add comment:', errorData);
        alert(errorData?.error || 'Failed to add comment. Please try again.');
        setUploadProgress(0);
        setIsUploading(false);
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      setUploadProgress(0);
      setIsUploading(false);
    } finally {
      setIsSubmittingComment(false);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    
    const validFiles = files.filter(file => {
      if (file.size > MAX_SIZE) {
        alert(`File "${file.name}" is too large. Maximum size is 50MB.`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      setCommentAttachments(prev => [...prev, ...validFiles]);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeAttachment = (index: number) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  const deleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchTicket(); // Refresh ticket data
        setDeleteCommentId(null);
      } else {
        const error = await response.json();
        alert('Failed to delete comment: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };
  
  const getFileIcon = (mimeType: string, filename?: string) => {
    // Check by MIME type first
    if (mimeType) {
      if (mimeType.startsWith('image/')) return ImageIcon;
      if (mimeType.includes('pdf')) return FileText;
      if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
      if (mimeType.includes('sheet') || mimeType.includes('excel')) return FileText;
      if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileText;
      if (mimeType.includes('text')) return FileText;
      if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('tar')) return File;
      if (mimeType.includes('video')) return File;
      if (mimeType.includes('audio')) return File;
    }
    
    // Check by file extension if filename is provided
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext) {
        // Images
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) return ImageIcon;
        // Documents
        if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext)) return FileText;
        // Archives and others
        if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return File;
      }
    }
    
    return File;
  };
  
  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };
  
  const isPdfFile = (mimeType: string, filename?: string) => {
    if (mimeType === 'application/pdf' || mimeType.includes('pdf')) return true;
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      return ext === 'pdf';
    }
    return false;
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

  const handleResolutionSubmit = async () => {
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
        body: JSON.stringify({ status: selectedResolutionStatus }),
      });
      
      if (statusResponse.ok) {
        setShowResolveModal(false);
        setResolutionComment('');
        setSelectedResolutionStatus('RESOLVED');
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
    setSelectedResolutionStatus('RESOLVED');
  };

  const handleResolveAndClose = async () => {
    try {
      setIsUpdatingStatus(true);
      
      // First update to RESOLVED
      const resolveResponse = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      
      if (!resolveResponse.ok) {
        console.error('Failed to resolve ticket');
        return;
      }
      
      // Then immediately update to CLOSED
      const closeResponse = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'CLOSED' }),
      });
      
      if (closeResponse.ok) {
        fetchTicket(); // Refresh ticket data
      } else {
        console.error('Failed to close ticket');
      }
    } catch (err) {
      console.error('Error in resolve and close:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
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
    
    // Admin can always update
    if (session.user.role === 'ADMIN') return true;
    
    // Only assigned technician can update status (not just any technician)
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      return ticket.assignedTo?.email === session.user.email;
    }
    
    return false;
  };

  const canModifyTicket = () => {
    return canUpdateStatus();
  };

  const canEditBasicInfo = () => {
    if (!session?.user?.role || !ticket) return false;
    
    return (
      session.user.role === 'ADMIN' ||
      (session.user.role === 'MANAGER' && ticket.createdBy?.email === session.user.email) ||
      (session.user.role === 'TECHNICIAN' && ticket.assignedTo?.email === session.user.email) ||
      (session.user.role === 'SECURITY_ANALYST' && ticket.assignedTo?.email === session.user.email) ||
      (session.user.role === 'SECURITY_ANALYST' && ticket.createdBy?.email === session.user.email) ||
      (session.user.role === 'USER' && ticket.createdBy?.email === session.user.email)
    );
  };

  const canViewTicket = () => {
    if (!session?.user?.role || !ticket) return false;
    
    // Admin can always view
    if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') return true;
    
    // User who created the ticket can always view
    if (ticket.createdBy?.email === session.user.email) return true;
    
    // Assigned technician can always view
    if (ticket.assignedTo?.email === session.user.email) return true;
    
    // Managers can view tickets from their branch
    if (session.user.role === 'MANAGER') {
      // Add branch check if needed
      return true;
    }
    
    // All technicians can view tickets that are approved (if approval required)
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // If ticket doesn't require approval, all technicians can view
      if (!ticket.service?.requiresApproval) return true;
      
      // If ticket requires approval, check if it's approved
      const latestApproval = getLatestApproval();
      return latestApproval?.status === 'APPROVED';
    }
    
    return false;
  };

  const canClaimTicket = () => {
    if (!session?.user?.role || !ticket) return false;
    
    // Only technicians can claim tickets
    if (!['TECHNICIAN', 'SECURITY_ANALYST', 'ADMIN'].includes(session.user.role)) return false;
    
    // Can't claim if already assigned
    if (ticket.assignedToId) return false;
    
    // Check if ticket requires approval
    if (ticket.service?.requiresApproval) {
      const latestApproval = getLatestApproval();
      // Must have an approval and it must be APPROVED status
      if (!latestApproval || latestApproval.status !== 'APPROVED') {
        return false;
      }
    }
    
    // Ticket must be in a claimable status (OPEN)
    if (!['OPEN'].includes(ticket.status)) {
      return false;
    }
    
    return true;
  };

  const canReleaseTicket = () => {
    if (!session?.user?.role || !ticket) return false;
    
    // Admin can always release
    if (session.user.role === 'ADMIN') return true;
    
    // Only the assigned technician can release their own ticket
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      return ticket.assignedTo?.email === session.user.email;
    }
    
    return false;
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
        <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
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

  // Check if user can view this ticket after it's loaded
  if (!canViewTicket()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              {ticket.service?.requiresApproval && !getLatestApproval() 
                ? 'This ticket requires manager approval before it can be viewed by technicians.'
                : ticket.service?.requiresApproval && getLatestApproval()?.status === 'PENDING'
                ? 'This ticket is pending approval from a manager.'
                : ticket.service?.requiresApproval && getLatestApproval()?.status === 'REJECTED'
                ? 'This ticket has been rejected by a manager.'
                : 'You do not have permission to view this ticket.'}
            </p>
            <Button onClick={() => router.back()} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
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
              <div className="flex items-center gap-3">
                <p className="text-gray-600">Ticket #{ticket.ticketNumber}</p>
                {!ticket.assignedToId && (
                  <Badge variant="outline" className="border-orange-300 text-orange-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unassigned
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Prominent Claim Button for unclaimed tickets */}
              {canClaimTicket() && (
                <Button
                  onClick={handleClaimTicket}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg"
                >
                  <UserCheck className="h-4 w-4" />
                  Claim Ticket
                </Button>
              )}
              <Badge variant={getStatusBadgeVariant(ticket.status)}>
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                {ticket.priority}
              </Badge>
            </div>
          </div>

          {/* Progress Tracker */}
          <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Ticket Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressTracker 
                steps={[]} 
                currentStatus={ticket.status}
                showTimestamps={true}
                showUsers={true}
                variant="vertical"
                ticketData={{
                  createdAt: ticket.createdAt,
                  updatedAt: ticket.updatedAt,
                  resolvedAt: ticket.resolvedAt,
                  closedAt: ticket.closedAt,
                  approvals: ticket.approvals,
                  createdBy: ticket.createdBy,
                  assignedTo: ticket.assignedTo,
                  comments: ticket.comments
                }}
              />
            </CardContent>
          </Card>

          {/* Approval Status */}
          {((ticket.approvals && ticket.approvals.length > 0) || ticket.status === 'PENDING_APPROVAL') && (
            <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Approval Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticket.status === 'PENDING_APPROVAL' && (!ticket.approvals || ticket.approvals.length === 0) ? (
                  <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Timer className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Waiting for Manager Approval</p>
                      <p className="text-sm text-yellow-600">Your ticket is pending approval from your branch manager.</p>
                    </div>
                  </div>
                ) : getLatestApproval() ? (
                  <div className="space-y-4">
                    {ticket.approvals.map((approval, index) => (
                      <div key={approval.id} className={`flex items-start gap-3 p-4 rounded-lg border ${
                        approval.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                        approval.status === 'REJECTED' ? 'bg-red-50 border-red-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className={`mt-1 ${
                          approval.status === 'APPROVED' ? 'text-green-600' :
                          approval.status === 'REJECTED' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          {getApprovalStatusIcon(approval.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getApprovalStatusBadgeVariant(approval.status)} className="flex items-center gap-1">
                              {approval.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-900">
                              {approval.status === 'APPROVED' ? 'Approved' : 
                               approval.status === 'REJECTED' ? 'Rejected' : 'Reviewed'} by {approval.approver.name}
                            </p>
                            <p className="text-xs text-gray-500">{approval.approver.email} • {approval.approver.role}</p>
                            {approval.reason && (
                              <div className="mt-2 p-2 bg-gray-50 rounded border">
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  {approval.status === 'REJECTED' ? 'Reason for rejection:' : 'Comments:'}
                                </p>
                                <p className="text-sm text-gray-600">{approval.reason}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Ticket Details */}
              <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                </CardContent>
              </Card>

              {/* Custom Fields - Enhanced Display */}
              {ticket.fieldValues.length > 0 && (
                <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ticket.fieldValues.map((fieldValue) => {
                        const renderFieldValue = () => {
                          const fieldType = fieldValue.field.type;
                          const value = fieldValue.value;
                          
                          // Handle different field types
                          switch (fieldType) {
                            case 'MULTISELECT':
                              const selectedValues = value ? value.split(',') : [];
                              return (
                                <div className="flex flex-wrap gap-2">
                                  {selectedValues.map((val, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {val.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              );
                              
                            case 'FILE':
                              if (!value) return <span className="text-gray-400 italic">No file attached</span>;
                              return (
                                <div className="inline-flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                  <span className="text-sm font-medium">{value}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2"
                                    onClick={() => {
                                      // Handle file download
                                      console.log('Download file:', value);
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                              
                            case 'CHECKBOX':
                              return (
                                <div className="flex items-center gap-2">
                                  {value === 'true' ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <X className="h-4 w-4 text-gray-400" />
                                  )}
                                  <span>{value === 'true' ? 'Yes' : 'No'}</span>
                                </div>
                              );
                              
                            case 'DATE':
                              return (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span>{value ? new Date(value).toLocaleDateString() : '-'}</span>
                                </div>
                              );
                              
                            case 'DATETIME':
                              return (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-400" />
                                  <span>{value ? new Date(value).toLocaleString() : '-'}</span>
                                </div>
                              );
                              
                            case 'URL':
                              return value ? (
                                <a 
                                  href={value} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700 underline inline-flex items-center gap-1"
                                >
                                  <span>{value}</span>
                                  <Eye className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
                              );
                              
                            case 'EMAIL':
                              return value ? (
                                <a 
                                  href={`mailto:${value}`}
                                  className="text-blue-500 hover:text-blue-700 underline"
                                >
                                  {value}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
                              );
                              
                            case 'PHONE':
                              return value ? (
                                <a 
                                  href={`tel:${value}`}
                                  className="text-blue-500 hover:text-blue-700 underline"
                                >
                                  {value}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
                              );
                              
                            case 'NUMBER':
                              return (
                                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                  {value || '0'}
                                </span>
                              );
                              
                            case 'TEXTAREA':
                              return (
                                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                  <p className="text-sm whitespace-pre-wrap">{value || '-'}</p>
                                </div>
                              );
                              
                            case 'SELECT':
                            case 'RADIO':
                              return (
                                <Badge variant="outline" className="font-normal">
                                  {value || '-'}
                                </Badge>
                              );
                              
                            case 'TEXT':
                            case 'STRING':
                            default:
                              // Handle empty or undefined values better
                              if (!value || value.trim() === '') {
                                return <span className="text-gray-400 italic">Not provided</span>;
                              }
                              return <span className="text-gray-700 dark:text-gray-300">{value}</span>;
                          }
                        };
                        
                        // For TEXTAREA fields, use full width layout
                        if (fieldValue.field.type === 'TEXTAREA') {
                          return (
                            <div key={fieldValue.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                                {fieldValue.field.label}
                              </Label>
                              {renderFieldValue()}
                            </div>
                          );
                        }
                        
                        // For other fields, use two-column layout
                        return (
                          <div key={fieldValue.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0">
                            <div className="sm:col-span-1">
                              <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {fieldValue.field.label}
                              </Label>
                            </div>
                            <div className="sm:col-span-2">
                              {renderFieldValue()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attachments */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Paperclip className="h-5 w-5" />
                      Attachments ({ticket.attachments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {ticket.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium text-gray-900">{attachment.originalName}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                                <span>•</span>
                                <span>{formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(isPreviewable(attachment.mimeType) || attachment.mimeType === 'application/pdf') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPreviewAttachment(attachment);
                                  setShowPreview(true);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                Preview
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Create download link
                                const link = document.createElement('a');
                                link.href = `/api/tickets/${ticketId}/attachments/${attachment.id}/download`;
                                link.download = attachment.originalName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
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
                                <h4 className="font-medium">{task.taskTemplateItem.title}</h4>
                                {task.taskTemplateItem.isRequired && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                <Badge variant={getTaskStatusBadgeVariant(task.status)} className="text-xs">
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              {task.taskTemplateItem.description && (
                                <p className="text-sm text-gray-600 mb-2">{task.taskTemplateItem.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {task.taskTemplateItem.estimatedMinutes && (
                                  <span>Est: {task.taskTemplateItem.estimatedMinutes}min</span>
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
                                {!task.taskTemplateItem.isRequired && (
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
              <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <span>Discussion</span>
                    <Badge variant="secondary" className="ml-auto">
                      {ticket.comments.length} {ticket.comments.length === 1 ? 'comment' : 'comments'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {ticket.comments.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No comments yet</p>
                        <p className="text-sm text-gray-400 mt-1">Be the first to comment on this ticket</p>
                      </div>
                    ) : (
                      ticket.comments.map((comment) => (
                        <div key={comment.id} className="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                          {/* Comment Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {/* User Avatar */}
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                                {comment.user.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                                    {comment.user.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {comment.user.role}
                                  </Badge>
                                  {comment.isInternal && (
                                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                      Internal
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            {(session?.user?.id === comment.user.id || session?.user?.role === 'ADMIN') && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteCommentId(comment.id)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {/* Comment Content */}
                          <div className="pl-13">
                            <RichTextViewer content={comment.content} className="text-gray-700 dark:text-gray-300" />
                            
                            {/* Attachments */}
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                  <Paperclip className="h-4 w-4" />
                                  Attached Files ({comment.attachments.length})
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {comment.attachments.map((attachment: any) => {
                                    const Icon = getFileIcon(attachment.mimeType, attachment.originalName);
                                    const isImage = isImageFile(attachment.mimeType);
                                    const isPdf = isPdfFile(attachment.mimeType, attachment.originalName);
                                    const downloadUrl = `/api/tickets/${ticket.id}/comments/${comment.id}/attachments/${attachment.id}/download`;
                                    
                                    return (
                                      <div
                                        key={attachment.id}
                                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all"
                                      >
                                        <div className={`p-2.5 rounded-lg ${
                                          isImage ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 
                                          isPdf ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                          'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                          <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {attachment.originalName}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {attachment.size < 1024 
                                              ? `${attachment.size} B`
                                              : attachment.size < 1024 * 1024
                                              ? `${(attachment.size / 1024).toFixed(1)} KB`
                                              : `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
                                            }
                                          </p>
                                        </div>
                                        <div className="flex gap-1">
                                          {(isImage || isPdf) && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                if (isImage) {
                                                  setImagePreview({ url: downloadUrl, name: attachment.originalName });
                                                } else if (isPdf) {
                                                  setPdfPreview({ url: downloadUrl, name: attachment.originalName });
                                                }
                                              }}
                                              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                              title="Preview"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(downloadUrl, '_blank')}
                                            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Download"
                                          >
                                            <Download className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Add Comment */}
                    <div className="border-t pt-4">
                      <Label htmlFor="comment">Add Comment</Label>
                      <div className="mt-2">
                        <RichTextEditor
                          content={newComment}
                          onChange={setNewComment}
                          placeholder="Type your comment here... (You can paste images directly)"
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Tip: You can paste images directly from clipboard or drag & drop them into the editor
                      </div>
                      
                      {/* File attachments */}
                      {commentAttachments.length > 0 && (
                        <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="text-sm font-medium mb-2">Attachments:</div>
                          <div className="space-y-1">
                            {commentAttachments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm">{file.name}</span>
                                  <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(index)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Upload Progress Bar */}
                      {isUploading && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              {uploadProgress < 90 ? 'Uploading files...' : 'Posting comment...'}
                            </span>
                            <span className="text-sm text-blue-600 dark:text-blue-400">
                              {uploadProgress}%
                            </span>
                          </div>
                          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-blue-600 dark:bg-blue-400 h-full rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={addComment}
                          disabled={(!newComment.trim() && commentAttachments.length === 0) || isSubmittingComment}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                        </Button>
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2"
                        >
                          <Paperclip className="h-4 w-4" />
                          Attach Files
                        </Button>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                          accept="*"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions */}
              {(canUpdateStatus() || canClaimTicket() || canReleaseTicket()) && (
                <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {/* Claim/Release Button */}
                      {canClaimTicket() && (
                        <Button
                          onClick={handleClaimTicket}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg"
                        >
                          <UserCheck className="h-4 w-4" />
                          Claim Ticket
                        </Button>
                      )}
                      {canReleaseTicket() && (
                        <Button
                          onClick={handleReleaseTicket}
                          disabled={isUpdatingStatus}
                          variant="outline"
                          className="w-full flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <UserX className="h-4 w-4" />
                          Release Ticket
                        </Button>
                      )}
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
                          <Edit className="h-4 w-4" />
                          Update Status
                        </Button>
                      )}
                      {(ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN') && 
                       ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '') && (
                        <Button
                          onClick={handleResolveAndClose}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                        >
                          <CheckCheck className="h-4 w-4" />
                          Resolve + Close
                        </Button>
                      )}
                      {ticket.status === 'PENDING_VENDOR' && ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role) && (
                        <>
                          <Button
                            onClick={() => updateTicketStatus('IN_PROGRESS')}
                            disabled={isUpdatingStatus}
                            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                          >
                            <AlertCircle className="h-4 w-4" />
                            Resume Work
                          </Button>
                          <Button
                            onClick={handleResolveClick}
                            disabled={isUpdatingStatus}
                            className="w-full flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Update Status
                          </Button>
                        </>
                      )}
                      {/* Allow reopening from any closed/resolved/cancelled status */}
                      {['CLOSED', 'CANCELLED', 'RESOLVED', 'REJECTED', 'PENDING_APPROVAL', 'APPROVED', 'PENDING', 'PENDING_VENDOR'].includes(ticket.status) && canUpdateStatus() && (
                        <Button
                          onClick={() => updateTicketStatus('OPEN')}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Reopen Ticket
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ticket Information */}
              <Card className="bg-white/[0.7] dark:bg-gray-800/[0.7] backdrop-blur-sm border-0 shadow-lg">
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
                      {ticket.createdBy.branch && (
                        <p className="text-sm text-gray-500">
                          Branch: {ticket.createdBy.branch.name} ({ticket.createdBy.branch.code})
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Assigned to:</span>
                      {ticket.assignedTo ? (
                        <>
                          <p className="text-gray-600">{ticket.assignedTo.name}</p>
                          <p className="text-sm text-gray-500">{ticket.assignedTo.email}</p>
                        </>
                      ) : (
                        <p className="text-gray-500 italic">Unassigned</p>
                      )}
                    </div>
                    {/* Show approval status if required */}
                    {ticket.service?.requiresApproval && (
                      <div>
                        <span className="font-medium text-gray-700">Approval Status:</span>
                        {(() => {
                          const approval = getLatestApproval();
                          if (!approval) {
                            return <p className="text-yellow-600">Pending Approval</p>;
                          }
                          return (
                            <>
                              <p className="text-gray-600">
                                <Badge variant={getApprovalStatusBadgeVariant(approval.status)}>
                                  {approval.status}
                                </Badge>
                              </p>
                              <p className="text-sm text-gray-500">
                                by {approval.approver.name}
                              </p>
                            </>
                          );
                        })()}
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

              {/* Related Knowledge Articles */}
              <RelatedArticles 
                ticketId={ticket.id} 
                canManageArticles={
                  session?.user?.role === 'ADMIN' || 
                  session?.user?.role === 'MANAGER' ||
                  session?.user?.role === 'TECHNICIAN' ||
                  session?.user?.role === 'SECURITY_ANALYST'
                }
              />
            </div>
          </div>
        </div>
      </main>

      {/* Resolution Modal - Modern Style */}
      <ModernDialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <ModernDialogContent className="sm:max-w-[500px]">
          <ModernDialogHeader variant="gradient" icon={<Edit className="w-5 h-5" />}>
            <ModernDialogTitle>Update Ticket Status</ModernDialogTitle>
            <ModernDialogDescription>
              Add an optional comment and select the new status for this ticket.
            </ModernDialogDescription>
          </ModernDialogHeader>
          <ModernDialogBody>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-select" className="text-sm font-medium">New Status</Label>
                <Select value={selectedResolutionStatus} onValueChange={setSelectedResolutionStatus}>
                  <SelectTrigger id="status-select" className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="PENDING_VENDOR">Pending Vendor</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution-comment" className="text-sm font-medium">Comment (Optional)</Label>
                <Textarea
                  id="resolution-comment"
                  value={resolutionComment}
                  onChange={(e) => setResolutionComment(e.target.value)}
                  placeholder="Add a comment about this status change..."
                  className="min-h-[100px] resize-none bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                />
              </div>
            </div>
          </ModernDialogBody>
          <ModernDialogFooter>
            <Button
              variant="outline"
              onClick={handleModalClose}
              disabled={isSubmittingResolution}
              className="bg-white/50 hover:bg-white/70"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolutionSubmit}
              disabled={isSubmittingResolution}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
            >
              {isSubmittingResolution ? 'Processing...' : 'Update Status'}
            </Button>
          </ModernDialogFooter>
        </ModernDialogContent>
      </ModernDialog>


      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <AttachmentPreview
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewAttachment(null);
          }}
          attachment={previewAttachment}
          ticketTitle={ticket?.title}
        />
      )}

      {/* Delete Comment Confirmation Dialog */}
      <ModernDialog open={!!deleteCommentId} onOpenChange={() => setDeleteCommentId(null)}>
        <ModernDialogContent className="sm:max-w-[400px]">
          <ModernDialogHeader icon={<Trash2 className="w-5 h-5 text-red-500" />}>
            <ModernDialogTitle>Delete Comment</ModernDialogTitle>
            <ModernDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </ModernDialogDescription>
          </ModernDialogHeader>
          <ModernDialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteCommentId(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteCommentId && deleteComment(deleteCommentId)}
            >
              Delete Comment
            </Button>
          </ModernDialogFooter>
        </ModernDialogContent>
      </ModernDialog>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">{imagePreview.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setImagePreview(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              <img 
                src={imagePreview.url} 
                alt={imagePreview.name}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPdfPreview(null)}
        >
          <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold">{pdfPreview.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pdfPreview.url, '_blank')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPdfPreview(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <iframe
              src={pdfPreview.url}
              className="w-full h-[calc(100%-73px)]"
              title={pdfPreview.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}