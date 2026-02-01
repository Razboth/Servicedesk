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
import { ArrowLeft, Clock, User, MessageSquare, AlertCircle, CheckCircle, CheckCheck, Plus, X, Paperclip, Download, FileText, Eye, Edit, Sparkles, Shield, UserCheck, UserX, Timer, Trash2, Image as ImageIcon, File, MoreVertical, Building2, Briefcase, UserCircle, Calendar, Hash, MapPin, PlayCircle, XCircle, Printer, Send, RefreshCw, ChevronDown } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { RelatedArticles } from '@/components/knowledge/related-articles';

// WITA timezone (GMT+8)
const WITA_TIMEZONE = 'Asia/Makassar';

// Helper function to format date in WITA timezone
const formatWITA = (date: string | Date, formatStr: string = 'dd MMM yyyy, HH:mm') => {
  const zonedDate = toZonedTime(new Date(date), WITA_TIMEZONE);
  return format(zonedDate, formatStr) + ' WITA';
};
import { AttachmentPreview } from '@/components/ui/attachment-preview';
import { getAvatarById } from '@/components/ui/avatar-presets';
import { VendorAssignmentDialog } from '@/components/tickets/vendor-assignment-dialog';
import { useReactToPrint } from 'react-to-print';
import { TicketPrintView } from '@/components/tickets/ticket-print-view';

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
  category?: string;
  issueClassification?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  assignedToId?: string;
  sociomileTicketId?: string | null;
  sociomileTicketNumber?: number | null;
  service: {
    name: string;
    requiresApproval?: boolean;
    supportGroupId?: string;
    tier1Category?: {
      id?: string;
      name: string;
    };
    tier2Subcategory?: {
      name: string;
    };
    tier3Item?: {
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

// Status badge variant mapping using design system colors
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info" | "warning-soft" | "success-soft" | "info-soft" | "default-soft" | "destructive-soft" => {
  switch (status) {
    case 'OPEN':
      return 'info-soft';
    case 'IN_PROGRESS':
      return 'warning-soft';
    case 'PENDING':
    case 'PENDING_APPROVAL':
    case 'PENDING_VENDOR':
      return 'warning-soft';
    case 'RESOLVED':
      return 'success-soft';
    case 'CLOSED':
      return 'secondary';
    case 'APPROVED':
      return 'success-soft';
    case 'REJECTED':
    case 'CANCELLED':
      return 'destructive-soft';
    default:
      return 'secondary';
  }
};

// Priority badge variant mapping
const getPriorityBadgeVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info" | "warning-soft" | "success-soft" | "info-soft" | "default-soft" | "destructive-soft" => {
  switch (priority) {
    case 'LOW':
      return 'secondary';
    case 'MEDIUM':
      return 'info-soft';
    case 'HIGH':
      return 'warning-soft';
    case 'EMERGENCY':
    case 'CRITICAL':
      return 'destructive-soft';
    default:
      return 'secondary';
  }
};

// Category (ITIL type) badge variant mapping
const getCategoryBadgeVariant = (category: string): "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info" | "warning-soft" | "success-soft" | "info-soft" | "default-soft" | "destructive-soft" => {
  switch (category) {
    case 'INCIDENT':
      return 'warning-soft';
    case 'SERVICE_REQUEST':
      return 'info-soft';
    case 'CHANGE_REQUEST':
      return 'default-soft';
    case 'EVENT_REQUEST':
      return 'success-soft';
    default:
      return 'secondary';
  }
};

const CATEGORY_LABELS: Record<string, string> = {
  INCIDENT: 'Insiden',
  SERVICE_REQUEST: 'Permintaan Layanan',
  CHANGE_REQUEST: 'Permintaan Perubahan',
  EVENT_REQUEST: 'Permintaan Event'
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  HUMAN_ERROR: 'Human Error',
  SYSTEM_ERROR: 'System Error',
  HARDWARE_FAILURE: 'Hardware Failure',
  NETWORK_ISSUE: 'Network Issue',
  SECURITY_INCIDENT: 'Security Incident',
  DATA_ISSUE: 'Data Issue',
  PROCESS_GAP: 'Process Gap',
  EXTERNAL_FACTOR: 'External Factor'
};

const getClassificationBadgeVariant = (classification: string): "default" | "secondary" | "destructive" | "outline" | "warning" | "success" | "info" | "warning-soft" | "success-soft" | "info-soft" | "default-soft" | "destructive-soft" => {
  switch (classification) {
    case 'HUMAN_ERROR':
      return 'warning-soft';
    case 'SYSTEM_ERROR':
      return 'destructive-soft';
    case 'HARDWARE_FAILURE':
      return 'destructive-soft';
    case 'NETWORK_ISSUE':
      return 'info-soft';
    case 'SECURITY_INCIDENT':
      return 'destructive';
    case 'DATA_ISSUE':
      return 'warning-soft';
    case 'PROCESS_GAP':
      return 'default-soft';
    case 'EXTERNAL_FACTOR':
      return 'secondary';
    default:
      return 'secondary';
  }
};

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
  const [commentAttachmentPreview, setCommentAttachmentPreview] = useState<any | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isUpdatingClassification, setIsUpdatingClassification] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionComment, setResolutionComment] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);
  const [selectedResolutionStatus, setSelectedResolutionStatus] = useState<string>('RESOLVED');
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [userSupportGroup, setUserSupportGroup] = useState<{ code?: string; name?: string } | null>(null);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Omni/Sociomile integration states
  const [isSendingToOmni, setIsSendingToOmni] = useState(false);
  const [isSyncingOmniStatus, setIsSyncingOmniStatus] = useState(false);
  const [isOmniExpanded, setIsOmniExpanded] = useState(false);
  const [omniSyncResult, setOmniSyncResult] = useState<{
    success?: boolean;
    message?: string;
    lastSynced?: Date;
  } | null>(null);
  const [omniStatus, setOmniStatus] = useState<{
    isSentToOmni: boolean;
    sociomileTicketId?: string | null;
    sociomileTicketNumber?: number | null;
  }>({
    isSentToOmni: false,
    sociomileTicketId: null,
    sociomileTicketNumber: null
  });

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
      fetchUserDetails();
    }
  }, [ticketId]);

  const fetchUserDetails = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data.user?.supportGroup) {
          setUserSupportGroup(data.user.supportGroup);
        }
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  // Helper function to check if ticket is a Transaction Claims ticket
  const isTransactionClaimTicket = (ticket: Ticket | null): boolean => {
    if (!ticket) return false;
    const categoryName = (ticket.service?.tier1Category?.name || '').toLowerCase();

    // Check by tier 1 category name (case-insensitive, flexible matching)
    return categoryName.includes('transaction claim') ||
           categoryName.includes('klaim transaksi') ||
           categoryName.includes('atm service');
  };

  // Handle sending ticket to Omni/Sociomile
  const handleSendToOmni = async (resend: boolean = false) => {
    if (!ticket) return;

    // Confirm resend action
    if (resend) {
      const confirmed = confirm(
        'Ticket ini sudah pernah dikirim ke Omni. Apakah Anda yakin ingin mengirim ulang?'
      );
      if (!confirmed) return;
    }

    setIsSendingToOmni(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}/omni`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resend }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send ticket to Omni');
      }

      // Update local state with Omni info
      setOmniStatus({
        isSentToOmni: true,
        sociomileTicketId: data.omni?.ticketId,
        sociomileTicketNumber: data.omni?.ticketNumber
      });

      // Update ticket in state
      if (ticket) {
        setTicket({
          ...ticket,
          sociomileTicketId: data.omni?.ticketId,
          sociomileTicketNumber: data.omni?.ticketNumber
        });
      }

      // Refresh ticket to get the comment that was added
      await fetchTicket();

      alert(resend
        ? 'Ticket berhasil dikirim ulang ke Omni/Sociomile!'
        : 'Ticket berhasil dikirim ke Omni/Sociomile!'
      );
    } catch (error) {
      console.error('Error sending to Omni:', error);
      alert(error instanceof Error ? error.message : 'Gagal mengirim ticket ke Omni');
    } finally {
      setIsSendingToOmni(false);
    }
  };

  // Handle syncing ticket status to Omni/Sociomile
  const handleSyncOmniStatus = async () => {
    if (!ticket || !omniStatus.sociomileTicketId) return;

    setIsSyncingOmniStatus(true);
    setOmniSyncResult(null);

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/omni/sync-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: ticket.status
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setOmniSyncResult({
          success: false,
          message: data.error || data.message || 'Gagal sinkronisasi status'
        });
        return;
      }

      setOmniSyncResult({
        success: true,
        message: `Status "${ticket.status}" berhasil disinkronkan ke Omni`,
        lastSynced: new Date()
      });

    } catch (error) {
      console.error('Error syncing Omni status:', error);
      setOmniSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Gagal sinkronisasi status'
      });
    } finally {
      setIsSyncingOmniStatus(false);
    }
  };

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

      // Update Omni status from ticket data
      if (data.sociomileTicketId || data.sociomileTicketNumber) {
        setOmniStatus({
          isSentToOmni: !!data.sociomileTicketId,
          sociomileTicketId: data.sociomileTicketId,
          sociomileTicketNumber: data.sociomileTicketNumber
        });
      }

      // Check if we accessed via CUID and should redirect to ticket number
      // CUIDs typically start with 'c' and are 25 characters long
      const isCuid = ticketId.startsWith('c') && ticketId.length > 20;
      if (isCuid && data.ticketNumber) {
        // Extract just the numeric part from ticket number
        let numericId = data.ticketNumber;
        // Handle various formats: "50", "TKT-2025-000050", etc.
        if (numericId.includes('-')) {
          const parts = numericId.split('-');
          numericId = parseInt(parts[parts.length - 1]).toString();
        }
        // Replace the current URL without adding to history
        router.replace(`/tickets/${numericId}`);
        setShouldRedirect(true);
        return;
      }
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
      const response = await fetch(`/api/tickets/${ticket?.id || ticketId}/claim`, {
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
      const response = await fetch(`/api/tickets/${ticket?.id || ticketId}/claim`, {
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
      const response = await fetch(`/api/tickets/${ticket?.id || ticketId}/tasks`);
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

      const response = await fetch(`/api/tickets/${ticket?.id || ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment || 'Attached files',
          // Transaction Claims Support group members can only add internal comments
          isInternal: isTransactionClaimsSupport() ? true : false,
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
      const response = await fetch(`/api/tickets/${ticket?.id || ticketId}/comments/${commentId}`, {
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
      const response = await fetch(`/api/tickets/${ticket?.id || ticketId}`, {
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
    // Check if status is PENDING_VENDOR and show vendor dialog instead
    if (selectedResolutionStatus === 'PENDING_VENDOR') {
      setShowResolveModal(false);
      setShowVendorDialog(true);
      return;
    }

    try {
      setIsSubmittingResolution(true);

      // First add the resolution comment if provided
      if (resolutionComment.trim()) {
        const commentResponse = await fetch(`/api/tickets/${ticket?.id || ticketId}/comments`, {
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
      const statusResponse = await fetch(`/api/tickets/${ticket?.id || ticketId}`, {
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

  const handleVendorAssignment = async (data: {
    vendorId: string;
    vendorTicketNumber: string;
    vendorNotes?: string;
    reason?: string;
  }) => {
    try {
      const response = await fetch(`/api/tickets/${ticket?.id || ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'PENDING_VENDOR',
          vendorId: data.vendorId,
          vendorTicketNumber: data.vendorTicketNumber,
          vendorNotes: data.vendorNotes,
          reason: data.reason
        }),
      });

      if (response.ok) {
        setShowVendorDialog(false);
        fetchTicket(); // Refresh ticket data
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign vendor');
      }
    } catch (err) {
      console.error('Error assigning vendor:', err);
      throw err;
    }
  };

  const handleResolveAndClose = async () => {
    try {
      setIsUpdatingStatus(true);

      // First update to RESOLVED
      const resolveResponse = await fetch(`/api/tickets/${ticket?.id || ticketId}`, {
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
      const closeResponse = await fetch(`/api/tickets/${ticket?.id || ticketId}`, {
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

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ticket-${ticket?.ticketNumber || ticketId}`,
  });

  const updateTaskStatus = async (taskId: string, status: string, actualMinutes?: number, notes?: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticket?.id || ticketId}/tasks/${taskId}`, {
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
        return 'success-soft';
      case 'IN_PROGRESS':
        return 'warning-soft';
      case 'SKIPPED':
        return 'secondary';
      default:
        return 'default-soft';
    }
  };

  const canUpdateStatus = () => {
    if (!session?.user?.role || !ticket) return false;

    // Transaction Claims Support group members cannot update status
    if (session.user.role === 'TECHNICIAN' && userSupportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT') {
      return false;
    }

    // Admin can always update
    if (session.user.role === 'ADMIN') return true;

    // Only assigned technician can update status (not just any technician)
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      return ticket.assignedTo?.email === session.user.email;
    }

    return false;
  };

  const canModifyTicket = () => {
    // Transaction Claims Support group members cannot modify tickets
    if (session?.user?.role === 'TECHNICIAN' && userSupportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT') {
      return false;
    }
    return canUpdateStatus();
  };

  const canAddComments = () => {
    if (!session?.user?.role || !ticket) return false;

    // Transaction Claims Support group members can add internal comments
    if (session.user.role === 'TECHNICIAN' && userSupportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT') {
      return true;
    }

    // Other roles with standard comment permissions
    return true; // Allow comments for all authenticated users
  };

  const isTransactionClaimsSupport = () => {
    return session?.user?.role === 'TECHNICIAN' && userSupportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
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

    // Admin, Super Admin, and Manager IT can always view
    if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' || session.user.role === 'MANAGER_IT') return true;

    // User who created the ticket can always view
    if (ticket.createdBy?.email === session.user.email) return true;

    // Assigned technician can always view
    if (ticket.assignedTo?.email === session.user.email) return true;

    // Managers can view tickets from their branch
    if (session.user.role === 'MANAGER') {
      // Add branch check if needed
      return true;
    }

    // Regular users and agents can view tickets from their branch
    if (session.user.role === 'USER' || session.user.role === 'AGENT') {
      // Check if user is from the same branch as the ticket
      if (session.user.branchId && ticket.createdBy?.branch?.id === session.user.branchId) {
        return true;
      }
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

  const canReclassifyTicket = () => {
    if (!session?.user?.role || !ticket) return false;
    // Admin and Super Admin can always reclassify
    if (['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) return true;
    // Any technician or security analyst can reclassify
    if (['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user.role)) return true;
    // Manager and Manager IT can reclassify
    if (['MANAGER', 'MANAGER_IT'].includes(session.user.role)) return true;
    return false;
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!ticket || newCategory === ticket.category) return;
    setIsUpdatingCategory(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error || `HTTP ${response.status}`;
        alert(`Gagal mengubah kategori: ${msg}`);
        throw new Error(msg);
      }
      const updatedTicket = await response.json();
      setTicket(prev => prev ? { ...prev, category: updatedTicket.category, comments: updatedTicket.comments || prev.comments } : prev);
      await fetchTicket();
    } catch (err) {
      console.error('Error updating category:', err);
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleIssueClassificationChange = async (newClassification: string) => {
    if (!ticket || newClassification === ticket.issueClassification) return;
    setIsUpdatingClassification(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueClassification: newClassification })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData.error || `HTTP ${response.status}`;
        alert(`Gagal mengubah klasifikasi: ${msg}`);
        throw new Error(msg);
      }
      const updatedTicket = await response.json();
      setTicket(prev => prev ? { ...prev, issueClassification: updatedTicket.issueClassification, comments: updatedTicket.comments || prev.comments } : prev);
      await fetchTicket();
    } catch (err) {
      console.error('Error updating issue classification:', err);
    } finally {
      setIsUpdatingClassification(false);
    }
  };

  const canClaimTicket = () => {
    if (!session?.user?.role || !ticket) return false;

    // Transaction Claims Support group members cannot claim tickets
    if (session.user.role === 'TECHNICIAN' && session.user.supportGroupCode === 'TRANSACTION_CLAIMS_SUPPORT') {
      return false;
    }

    // Only technicians and admins can claim tickets
    if (!['TECHNICIAN', 'SECURITY_ANALYST', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) return false;

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

    // For technicians and security analysts, check if ticket's service support group matches their support group
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // If ticket has a support group assigned
      if (ticket.service?.supportGroupId) {
        // User must have the same support group
        if (!session.user.supportGroupId || ticket.service.supportGroupId !== session.user.supportGroupId) {
          return false;
        }
      }
      // If ticket has no support group, any technician can claim it
    }

    // Admins can always claim any ticket
    if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
      return true;
    }

    return true;
  };

  const canReleaseTicket = () => {
    if (!session?.user?.role || !ticket) return false;

    // Cannot release tickets in final statuses
    if (['CLOSED', 'CANCELLED'].includes(ticket.status)) return false;

    // Transaction Claims Support group members cannot release tickets
    if (session.user.role === 'TECHNICIAN' && userSupportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT') {
      return false;
    }

    // Admin can always release
    if (session.user.role === 'ADMIN') return true;

    // Only the assigned technician can release their own ticket
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      return ticket.assignedTo?.email === session.user.email;
    }

    return false;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // ============================================
  // RENDER STATES
  // ============================================

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-card">
        <div className="flex items-center justify-center h-64">
          <Card className="max-w-md mx-4">
            <CardContent className="p-12 text-center">
              <div className="relative mx-auto mb-4 w-12 h-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent absolute top-0 left-0"></div>
              </div>
              <p className="text-muted-foreground">Loading ticket...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-card">
        <main className="w-full px-responsive py-6">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => router.back()} variant="outline" size="lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
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
      <div className="min-h-screen bg-card">
        <main className="w-full px-responsive py-6">
          <Card className="max-w-2xl mx-auto border-[hsl(var(--warning)/0.5)]">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-[hsl(var(--warning)/0.1)] flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-[hsl(var(--warning))]" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {ticket.service?.requiresApproval && !getLatestApproval()
                  ? 'This ticket requires manager approval before it can be viewed by technicians.'
                  : ticket.service?.requiresApproval && getLatestApproval()?.status === 'PENDING'
                  ? 'This ticket is pending approval from a manager.'
                  : ticket.service?.requiresApproval && getLatestApproval()?.status === 'REJECTED'
                  ? 'This ticket has been rejected by a manager.'
                  : 'You do not have permission to view this ticket.'}
              </p>
              <Button onClick={() => router.back()} variant="outline" size="lg">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-card">
      <main className="w-full px-responsive py-6">
        <div className="space-y-6">

          {/* ============================================ */}
          {/* HEADER SECTION */}
          {/* ============================================ */}
          <div className="flex flex-col gap-4">
            {/* Top row: Back button and actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Prominent Claim Button for unclaimed tickets */}
                {canClaimTicket() && (
                  <Button
                    onClick={handleClaimTicket}
                    loading={isUpdatingStatus}
                    disabled={isUpdatingStatus}
                    variant="default"
                    className="shadow-md hover:shadow-lg"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Claim Ticket
                  </Button>
                )}
              </div>
            </div>

            {/* Title and badges row */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    #{ticket.ticketNumber}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(ticket.status)}>
                    {ticket.status.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                  {ticket.category && (
                    canReclassifyTicket() ? (
                      <Select
                        value={ticket.category}
                        onValueChange={handleCategoryChange}
                        disabled={isUpdatingCategory}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent p-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                          <Badge variant={getCategoryBadgeVariant(ticket.category)}>
                            {CATEGORY_LABELS[ticket.category] || ticket.category}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INCIDENT">Insiden</SelectItem>
                          <SelectItem value="SERVICE_REQUEST">Permintaan Layanan</SelectItem>
                          <SelectItem value="CHANGE_REQUEST">Permintaan Perubahan</SelectItem>
                          <SelectItem value="EVENT_REQUEST">Permintaan Event</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getCategoryBadgeVariant(ticket.category)}>
                        {CATEGORY_LABELS[ticket.category] || ticket.category}
                      </Badge>
                    )
                  )}
                  {ticket.issueClassification && (
                    canReclassifyTicket() ? (
                      <Select
                        value={ticket.issueClassification}
                        onValueChange={handleIssueClassificationChange}
                        disabled={isUpdatingClassification}
                      >
                        <SelectTrigger className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent p-0 focus:ring-0 [&>svg]:h-3 [&>svg]:w-3">
                          <Badge variant={getClassificationBadgeVariant(ticket.issueClassification)}>
                            {CLASSIFICATION_LABELS[ticket.issueClassification] || ticket.issueClassification}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HUMAN_ERROR">Human Error</SelectItem>
                          <SelectItem value="SYSTEM_ERROR">System Error</SelectItem>
                          <SelectItem value="HARDWARE_FAILURE">Hardware Failure</SelectItem>
                          <SelectItem value="NETWORK_ISSUE">Network Issue</SelectItem>
                          <SelectItem value="SECURITY_INCIDENT">Security Incident</SelectItem>
                          <SelectItem value="DATA_ISSUE">Data Issue</SelectItem>
                          <SelectItem value="PROCESS_GAP">Process Gap</SelectItem>
                          <SelectItem value="EXTERNAL_FACTOR">External Factor</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getClassificationBadgeVariant(ticket.issueClassification)}>
                        {CLASSIFICATION_LABELS[ticket.issueClassification] || ticket.issueClassification}
                      </Badge>
                    )
                  )}
                  {!ticket.assignedToId && (
                    <Badge variant="warning-soft" size="sm">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Unassigned
                    </Badge>
                  )}
                  {isTransactionClaimsSupport() && (
                    <Badge variant="info-soft" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Read-Only
                    </Badge>
                  )}
                </div>
                <h1 className="text-responsive-2xl font-bold text-foreground leading-tight">
                  {ticket.title}
                </h1>
                {/* Branch Information */}
                {ticket.createdBy?.branch && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{ticket.createdBy.branch.name}</span>
                    {ticket.createdBy.branch.code && (
                      <Badge variant="outline" className="text-xs">
                        {ticket.createdBy.branch.code}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* MAIN CONTENT GRID */}
          {/* ============================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ============================================ */}
            {/* LEFT COLUMN - Main Content */}
            {/* ============================================ */}
            <div className="lg:col-span-2 space-y-6">

              {/* Description Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {ticket.description}
                  </p>
                </CardContent>
              </Card>

              {/* Custom Fields Card */}
              {ticket.fieldValues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ticket.fieldValues.map((fieldValue) => {
                        const renderFieldValue = () => {
                          const fieldType = fieldValue.field.type;
                          const value = fieldValue.value;

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
                              if (!value) return <span className="text-muted-foreground italic">No file attached</span>;

                              const fileData = value.includes('|') ? value.split('|') : [value, ''];
                              const fileName = fileData[0];
                              const base64Data = fileData[1];
                              const isImage = fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);

                              return (
                                <div className="space-y-2">
                                  {isImage && base64Data && (
                                    <div className="relative group">
                                      <img
                                        src={base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`}
                                        alt={fileName}
                                        className="max-w-full h-auto max-h-64 rounded-lg border border-border"
                                      />
                                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="shadow-lg"
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = base64Data.startsWith('data:') ? base64Data : `data:image/jpeg;base64,${base64Data}`;
                                            link.download = fileName;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                          }}
                                        >
                                          <Download className="h-3 w-3 mr-1" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="inline-flex items-center gap-2 p-2 bg-muted rounded-lg">
                                    {isImage ? (
                                      <ImageIcon className="h-4 w-4 text-primary" />
                                    ) : (
                                      <FileText className="h-4 w-4 text-primary" />
                                    )}
                                    <span className="text-sm font-medium text-foreground">{fileName}</span>
                                    {base64Data && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2"
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          if (base64Data.startsWith('data:')) {
                                            link.href = base64Data;
                                          } else {
                                            const ext = fileName.split('.').pop()?.toLowerCase() || '';
                                            const mimeTypes: Record<string, string> = {
                                              'pdf': 'application/pdf',
                                              'doc': 'application/msword',
                                              'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                              'xls': 'application/vnd.ms-excel',
                                              'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                              'jpg': 'image/jpeg',
                                              'jpeg': 'image/jpeg',
                                              'png': 'image/png',
                                              'gif': 'image/gif',
                                              'txt': 'text/plain'
                                            };
                                            const mimeType = mimeTypes[ext] || 'application/octet-stream';
                                            link.href = `data:${mimeType};base64,${base64Data}`;
                                          }
                                          link.download = fileName;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                      >
                                        <Download className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {!base64Data && (
                                      <span className="text-xs text-muted-foreground">(File data not available)</span>
                                    )}
                                  </div>
                                </div>
                              );

                            case 'CHECKBOX':
                              return (
                                <div className="flex items-center gap-2">
                                  {value === 'true' ? (
                                    <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                                  ) : (
                                    <X className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="text-foreground">{value === 'true' ? 'Yes' : 'No'}</span>
                                </div>
                              );

                            case 'DATE':
                              return (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-foreground">{value ? formatWITA(value, 'dd MMM yyyy') : '-'}</span>
                                </div>
                              );

                            case 'DATETIME':
                              return (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-foreground">{value ? formatWITA(value) : '-'}</span>
                                </div>
                              );

                            case 'URL':
                              return value ? (
                                <a
                                  href={value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 underline inline-flex items-center gap-1"
                                >
                                  <span>{value}</span>
                                  <Eye className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              );

                            case 'EMAIL':
                              return value ? (
                                <a
                                  href={`mailto:${value}`}
                                  className="text-primary hover:text-primary/80 underline"
                                >
                                  {value}
                                </a>
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              );

                            case 'PHONE':
                              return value ? (
                                <a
                                  href={`tel:${value}`}
                                  className="text-primary hover:text-primary/80 underline"
                                >
                                  {value}
                                </a>
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              );

                            case 'NUMBER':
                              return (
                                <span className="font-mono bg-muted px-2 py-1 rounded text-foreground">
                                  {value || '0'}
                                </span>
                              );

                            case 'TEXTAREA':
                              return (
                                <div className="mt-2 p-3 bg-muted rounded-lg">
                                  <p className="text-sm whitespace-pre-wrap text-foreground">{value || '-'}</p>
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
                              if (!value || value.trim() === '') {
                                return <span className="text-muted-foreground italic">Not provided</span>;
                              }
                              return <span className="text-foreground">{value}</span>;
                          }
                        };

                        if (fieldValue.field.type === 'TEXTAREA') {
                          return (
                            <div key={fieldValue.id} className="border-b border-border pb-4 last:border-0">
                              <Label className="text-sm font-semibold text-foreground mb-2 block">
                                {fieldValue.field.label}
                              </Label>
                              {renderFieldValue()}
                            </div>
                          );
                        }

                        return (
                          <div key={fieldValue.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start border-b border-border pb-3 last:border-0">
                            <div className="sm:col-span-1">
                              <Label className="text-sm font-medium text-muted-foreground">
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

              {/* Attachments Card */}
              {ticket.attachments && ticket.attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Paperclip className="h-5 w-5 text-primary" />
                      Attachments
                      <Badge variant="secondary" className="ml-auto">{ticket.attachments.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {ticket.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-background rounded-lg">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{attachment.originalName}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatFileSize(attachment.size)}</span>
                                <span>-</span>
                                <span>{formatWITA(attachment.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(isPreviewable(attachment.mimeType) || attachment.mimeType === 'application/pdf') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const allTicketAttachments = ticket.attachments.map((att: any) => ({
                                    id: att.id,
                                    filename: att.filename,
                                    originalName: att.originalName,
                                    mimeType: att.mimeType,
                                    size: att.size,
                                    ticketId: ticket.id
                                  }));

                                  const currentAttachmentIndex = ticket.attachments.findIndex(
                                    (att: any) => att.id === attachment.id
                                  );

                                  setPreviewAttachment({
                                    current: attachment,
                                    attachments: allTicketAttachments,
                                    currentIndex: currentAttachmentIndex >= 0 ? currentAttachmentIndex : 0
                                  });
                                  setShowPreview(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `/api/tickets/${ticketId}/attachments/${attachment.id}/download`;
                                link.download = attachment.originalName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tasks Card */}
              {tasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Tasks
                      <Badge variant="secondary" className="ml-auto">
                        {tasks.filter(t => t.status === 'COMPLETED').length}/{tasks.length} completed
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {tasks.map((task) => (
                        <div key={task.id} className="p-4 bg-muted/50 border border-border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-foreground">{task.taskTemplateItem.title}</h4>
                                {task.taskTemplateItem.isRequired && (
                                  <Badge variant="destructive-soft" className="text-xs">Required</Badge>
                                )}
                                <Badge variant={getTaskStatusBadgeVariant(task.status)} className="text-xs">
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              {task.taskTemplateItem.description && (
                                <p className="text-sm text-muted-foreground mb-2">{task.taskTemplateItem.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                                <p className="text-sm text-muted-foreground mt-2 italic">{task.notes}</p>
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
                                    variant="success"
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

              {/* Comments/Discussion Card */}
              <Card>
                <CardHeader className="border-b border-border">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
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
                        <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No comments yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Be the first to comment on this ticket</p>
                      </div>
                    ) : (
                      ticket.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="group relative bg-muted/30 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                        >
                          {/* Comment Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {/* User Avatar */}
                              <div className="w-10 h-10">
                                {(comment.user as any)?.avatar && getAvatarById((comment.user as any).avatar) ? (
                                  <div className="w-full h-full scale-90">
                                    {getAvatarById((comment.user as any).avatar)?.component}
                                  </div>
                                ) : (
                                  <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                                    {comment.user.name?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">
                                    {comment.user.name}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {comment.user.role}
                                  </Badge>
                                  {comment.isInternal && (
                                    <Badge variant="warning-soft" size="sm">
                                      Internal
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatWITA(comment.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Delete Action */}
                            {(session?.user?.email === comment.user.email || session?.user?.role === 'ADMIN') && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteCommentId(comment.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Comment Content */}
                          <div className="pl-13">
                            <RichTextViewer content={comment.content} className="text-foreground" />

                            {/* Comment Attachments */}
                            {comment.attachments && comment.attachments.length > 0 && (
                              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                                <div className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
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
                                        className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:shadow-sm transition-shadow"
                                      >
                                        <div className={`p-2.5 rounded-lg ${
                                          isImage ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]' :
                                          isPdf ? 'bg-destructive/10 text-destructive' :
                                          'bg-primary/10 text-primary'
                                        }`}>
                                          <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-foreground truncate">
                                            {attachment.originalName}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {formatFileSize(attachment.size)}
                                          </p>
                                        </div>
                                        <div className="flex gap-1">
                                          {(isImage || isPdf) && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                const allCommentAttachments = comment.attachments.map((att: any) => ({
                                                  id: att.id,
                                                  filename: att.filename,
                                                  originalName: att.originalName,
                                                  mimeType: att.mimeType,
                                                  size: att.size,
                                                  ticketId: ticket.id,
                                                  commentId: comment.id
                                                }));

                                                const currentAttachmentIndex = comment.attachments.findIndex(
                                                  (att: any) => att.id === attachment.id
                                                );

                                                setCommentAttachmentPreview({
                                                  current: {
                                                    id: attachment.id,
                                                    filename: attachment.filename,
                                                    originalName: attachment.originalName,
                                                    mimeType: attachment.mimeType,
                                                    size: attachment.size,
                                                    ticketId: ticket.id,
                                                    commentId: comment.id
                                                  },
                                                  attachments: allCommentAttachments,
                                                  currentIndex: currentAttachmentIndex >= 0 ? currentAttachmentIndex : 0
                                                });
                                              }}
                                              className="h-8 w-8 p-0"
                                              title="Preview"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(downloadUrl, '_blank')}
                                            className="h-8 w-8 p-0"
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

                    {/* Add Comment Form */}
                    {canAddComments() && (
                      <div className="border-t border-border pt-4">
                        <Label htmlFor="comment" className="text-foreground">
                          Add Comment
                          {isTransactionClaimsSupport() && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Internal Only
                            </Badge>
                          )}
                        </Label>
                        <div className="mt-2">
                          <RichTextEditor
                            content={newComment}
                            onChange={setNewComment}
                            placeholder="Type your comment here... (You can paste images directly)"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Tip: You can paste images directly from clipboard or drag & drop them into the editor
                        </div>

                        {/* File attachments preview */}
                        {commentAttachments.length > 0 && (
                          <div className="mt-3 p-2 bg-muted rounded-lg">
                            <div className="text-sm font-medium text-foreground mb-2">Attachments:</div>
                            <div className="space-y-1">
                              {commentAttachments.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-background rounded border border-border">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAttachment(index)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                          <div className="mt-3 p-3 bg-[hsl(var(--warning)/0.1)] rounded-lg border border-[hsl(var(--warning)/0.2)]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-[hsl(var(--warning))]">
                                {uploadProgress < 90 ? 'Uploading files...' : 'Posting comment...'}
                              </span>
                              <span className="text-sm text-[hsl(var(--warning))]">
                                {uploadProgress}%
                              </span>
                            </div>
                            <div className="w-full bg-[hsl(var(--warning)/0.2)] rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-[hsl(var(--warning))] h-full rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={addComment}
                            disabled={(!newComment.trim() && commentAttachments.length === 0) || isSubmittingComment}
                            loading={isSubmittingComment}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4 mr-1" />
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
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ============================================ */}
            {/* RIGHT COLUMN - Sidebar */}
            {/* ============================================ */}
            <div className="space-y-4">

              {/* Actions Card */}
              {(canUpdateStatus() || canClaimTicket() || canReleaseTicket()) && (
                <Card>
                  <CardHeader className="border-b border-border pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      {/* Claim/Release Button */}
                      {canClaimTicket() && (
                        <Button
                          onClick={handleClaimTicket}
                          loading={isUpdatingStatus}
                          disabled={isUpdatingStatus}
                          variant="default"
                          size="lg"
                          className="w-full"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Claim Ticket
                        </Button>
                      )}
                      {canReleaseTicket() && (
                        <Button
                          onClick={handleReleaseTicket}
                          loading={isUpdatingStatus}
                          disabled={isUpdatingStatus}
                          variant="destructive"
                          size="lg"
                          className="w-full"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Release Ticket
                        </Button>
                      )}

                      {/* Status Update Buttons */}
                      {canUpdateStatus() && (
                        <>
                          {ticket.status === 'OPEN' && (
                            <Button
                              onClick={() => updateTicketStatus('IN_PROGRESS')}
                              loading={isUpdatingStatus}
                              disabled={isUpdatingStatus}
                              variant="warning"
                              size="lg"
                              className="w-full"
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Start Work
                            </Button>
                          )}
                          {(ticket.status === 'IN_PROGRESS' || ticket.status === 'RESOLVED') && (
                            <Button
                              onClick={handleResolveClick}
                              loading={isUpdatingStatus}
                              disabled={isUpdatingStatus}
                              variant="outline"
                              size="lg"
                              className="w-full"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Update Status
                            </Button>
                          )}
                          {(ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN') &&
                           ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session?.user?.role || '') && (
                            <Button
                              onClick={handleResolveAndClose}
                              loading={isUpdatingStatus}
                              disabled={isUpdatingStatus}
                              variant="success"
                              size="lg"
                              className="w-full"
                            >
                              <CheckCheck className="h-4 w-4 mr-2" />
                              Resolve + Close
                            </Button>
                          )}
                          {ticket.status === 'PENDING_VENDOR' && (
                            <>
                              <Button
                                onClick={() => updateTicketStatus('IN_PROGRESS')}
                                loading={isUpdatingStatus}
                                disabled={isUpdatingStatus}
                                variant="info"
                                size="lg"
                                className="w-full"
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Resume Work
                              </Button>
                              <Button
                                onClick={() => updateTicketStatus('RESOLVED')}
                                loading={isUpdatingStatus}
                                disabled={isUpdatingStatus}
                                variant="success"
                                size="lg"
                                className="w-full"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Resolve Ticket
                              </Button>
                              <Button
                                onClick={() => updateTicketStatus('CLOSED')}
                                disabled={isUpdatingStatus}
                                variant="secondary"
                                size="lg"
                                className="w-full"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Close Ticket
                              </Button>
                            </>
                          )}

                          {/* Print Button */}
                          {['TECHNICIAN', 'SECURITY_ANALYST', 'ADMIN'].includes(session?.user?.role || '') && (
                            <Button
                              onClick={handlePrint}
                              variant="outline"
                              className="w-full"
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print Ticket
                            </Button>
                          )}

                          {/* Reopen Button */}
                          {['CLOSED', 'CANCELLED', 'RESOLVED', 'REJECTED', 'PENDING_APPROVAL', 'APPROVED', 'PENDING'].includes(ticket.status) && (
                            <Button
                              onClick={() => updateTicketStatus('OPEN')}
                              disabled={isUpdatingStatus}
                              variant="warning"
                              className="w-full"
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Reopen Ticket
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Omni/Sociomile Integration Card - Sidebar, Collapsible */}
              {isTransactionClaimTicket(ticket) && (
                ticket?.assignedTo?.email === session?.user?.email || // Assigned technician
                ticket?.createdBy?.email === session?.user?.email || // Ticket creator
                ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session?.user?.role || '') // Admins and managers
              ) && (
                <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 overflow-hidden">
                  <button
                    onClick={() => setIsOmniExpanded(!isOmniExpanded)}
                    className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Omni
                      </span>
                      {omniStatus.isSentToOmni && (
                        <Badge variant="success" className="text-xs py-0 px-1.5">
                          <CheckCheck className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform duration-200 ${
                        isOmniExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOmniExpanded && (
                    <CardContent className="pt-0 pb-3 px-3">
                      <div className="space-y-2">
                        {omniStatus.isSentToOmni && omniStatus.sociomileTicketId ? (
                          <>
                            <div className="p-2 bg-white dark:bg-gray-800 border border-border rounded text-xs">
                              <span className="text-muted-foreground">ID: </span>
                              <span className="font-mono break-all">{omniStatus.sociomileTicketId}</span>
                            </div>
                            {omniStatus.sociomileTicketNumber && (
                              <div className="p-2 bg-white dark:bg-gray-800 border border-border rounded text-xs">
                                <span className="text-muted-foreground">No: </span>
                                <span className="font-mono">#{omniStatus.sociomileTicketNumber}</span>
                              </div>
                            )}
                            {omniSyncResult && (
                              <div className={`p-2 rounded text-xs ${
                                omniSyncResult.success
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                              }`}>
                                {omniSyncResult.message}
                              </div>
                            )}
                            <div className="flex flex-col gap-1.5">
                              <Button
                                onClick={handleSyncOmniStatus}
                                disabled={isSyncingOmniStatus || isSendingToOmni}
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-7"
                              >
                                {isSyncingOmniStatus ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                )}
                                Sync Status
                              </Button>
                              <Button
                                onClick={() => handleSendToOmni(true)}
                                disabled={isSendingToOmni || isSyncingOmniStatus}
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
                              >
                                {isSendingToOmni ? (
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3 mr-1" />
                                )}
                                Kirim Ulang
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                              Klaim Transaksi - belum dikirim ke Omni
                            </p>
                            <Button
                              onClick={() => handleSendToOmni(false)}
                              disabled={isSendingToOmni}
                              size="sm"
                              className="w-full text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              {isSendingToOmni ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3 mr-1" />
                              )}
                              Kirim ke Omni
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Progress Tracker Card */}
              <Card>
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Progress</span>
                    </div>
                    <Badge variant={getStatusBadgeVariant(ticket.status)} size="sm">
                      {ticket.status.replace(/_/g, ' ')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ProgressTracker
                    steps={[]}
                    currentStatus={ticket.status}
                    showTimestamps={true}
                    showUsers={false}
                    variant="vertical"
                    className="scale-95 origin-top"
                    ticketData={{
                      createdAt: ticket.createdAt,
                      updatedAt: ticket.updatedAt,
                      resolvedAt: ticket.resolvedAt,
                      closedAt: ticket.closedAt,
                      claimedAt: ticket.claimedAt,
                      approvals: ticket.approvals,
                      createdBy: ticket.createdBy,
                      assignedTo: ticket.assignedTo,
                      comments: ticket.comments
                    }}
                  />
                </CardContent>
              </Card>

              {/* Ticket Information Card */}
              <Card>
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Ticket Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Ticket Number */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Hash className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticket Number</span>
                        <p className="text-sm font-mono text-foreground mt-1">#{ticket.ticketNumber}</p>
                      </div>
                    </div>

                    {/* Service */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Service</span>
                        <p className="text-sm text-foreground mt-1 font-medium">{ticket.service.name}</p>
                        {ticket.service.tier1Category && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ticket.service.tier1Category.name}
                            {ticket.service.tier2Subcategory && ` > ${ticket.service.tier2Subcategory.name}`}
                            {ticket.service.tier3Item && ` > ${ticket.service.tier3Item.name}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Issue Classification */}
                    {ticket.issueClassification && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[hsl(var(--warning)/0.1)] rounded-lg">
                          <Shield className="h-4 w-4 text-[hsl(var(--warning))]" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Klasifikasi Masalah</span>
                          <div className="mt-1">
                            <Badge variant={getClassificationBadgeVariant(ticket.issueClassification)}>
                              {CLASSIFICATION_LABELS[ticket.issueClassification] || ticket.issueClassification}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Branch */}
                    {ticket.createdBy.branch && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[hsl(var(--success)/0.1)] rounded-lg">
                          <Building2 className="h-4 w-4 text-[hsl(var(--success))]" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Branch</span>
                          <p className="text-sm text-foreground mt-1 font-medium">{ticket.createdBy.branch.name}</p>
                          <Badge variant="success-soft" size="sm" className="mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {ticket.createdBy.branch.code}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Created By */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[hsl(var(--info)/0.1)] rounded-lg">
                        <UserCircle className="h-4 w-4 text-[hsl(var(--info))]" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created By</span>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="w-8 h-8">
                            {(ticket.createdBy as any)?.avatar && getAvatarById((ticket.createdBy as any).avatar) ? (
                              <div className="w-full h-full scale-75">
                                {getAvatarById((ticket.createdBy as any).avatar)?.component}
                              </div>
                            ) : (
                              <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                                {ticket.createdBy.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-foreground font-medium">{ticket.createdBy.name}</p>
                            <p className="text-xs text-muted-foreground">{ticket.createdBy.email}</p>
                            <Badge variant="outline" size="sm" className="mt-1">
                              {ticket.createdBy.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Assigned To */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[hsl(var(--warning)/0.1)] rounded-lg">
                        <UserCheck className="h-4 w-4 text-[hsl(var(--warning))]" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned To</span>
                        {ticket.assignedTo ? (
                          <div className="flex items-center gap-3 mt-1">
                            <div className="w-8 h-8">
                              {(ticket.assignedTo as any)?.avatar && getAvatarById((ticket.assignedTo as any).avatar) ? (
                                <div className="w-full h-full scale-75">
                                  {getAvatarById((ticket.assignedTo as any).avatar)?.component}
                                </div>
                              ) : (
                                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                                  {ticket.assignedTo.name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-foreground font-medium">{ticket.assignedTo.name}</p>
                              <p className="text-xs text-muted-foreground">{ticket.assignedTo.email}</p>
                              <Badge variant="outline" size="sm" className="mt-1">
                                {ticket.assignedTo.role}
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <Badge variant="warning-soft" size="sm">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unassigned
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Approval Status */}
                    {ticket.service?.requiresApproval && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[hsl(var(--warning)/0.1)] rounded-lg">
                          <Shield className="h-4 w-4 text-[hsl(var(--warning))]" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approval Status</span>
                          {(() => {
                            const approval = getLatestApproval();
                            if (!approval || approval.status === 'PENDING') {
                              return (
                                <div className="mt-1">
                                  <Badge variant="warning-soft" size="sm">
                                    <Timer className="h-3 w-3 mr-1" />
                                    Pending Approval
                                  </Badge>
                                </div>
                              );
                            }
                            return (
                              <div className="mt-1 space-y-1">
                                <Badge variant={getApprovalStatusBadgeVariant(approval.status)} size="sm">
                                  {getApprovalStatusIcon(approval.status)}
                                  <span className="ml-1">{approval.status}</span>
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  by {approval.approver.name}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Dates Divider */}
                    <div className="border-t border-border pt-4">
                      <div className="space-y-3">
                        {/* Created Date */}
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <span className="text-xs text-muted-foreground">Created</span>
                            <p className="text-xs text-foreground">
                              {formatWITA(ticket.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Last Updated */}
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <span className="text-xs text-muted-foreground">Last updated</span>
                            <p className="text-xs text-foreground">
                              {formatWITA(ticket.updatedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Resolved Date */}
                        {ticket.resolvedAt && (
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />
                            <div className="flex-1">
                              <span className="text-xs text-muted-foreground">Resolved</span>
                              <p className="text-xs text-foreground">
                                {formatWITA(ticket.resolvedAt)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Resolution Modal */}
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
                  <SelectTrigger id="status-select" className="bg-background">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PENDING_VENDOR">Pending Vendor</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    {/* Approval statuses only for Admin/Manager */}
                    {(session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'MANAGER') && (
                      <>
                        <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </>
                    )}
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
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
          </ModernDialogBody>
          <ModernDialogFooter>
            <Button
              variant="outline"
              onClick={handleModalClose}
              disabled={isSubmittingResolution}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolutionSubmit}
              disabled={isSubmittingResolution}
              loading={isSubmittingResolution}
            >
              Update Status
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
          attachment={previewAttachment.current || previewAttachment}
          attachments={previewAttachment.attachments}
          currentIndex={previewAttachment.currentIndex}
          onNavigate={(index) => {
            if (previewAttachment.attachments) {
              setPreviewAttachment({
                ...previewAttachment,
                currentIndex: index,
                current: previewAttachment.attachments[index]
              });
            }
          }}
          ticketTitle={ticket?.title}
        />
      )}

      {/* Delete Comment Confirmation Dialog */}
      <ModernDialog open={!!deleteCommentId} onOpenChange={() => setDeleteCommentId(null)}>
        <ModernDialogContent className="sm:max-w-[400px]">
          <ModernDialogHeader icon={<Trash2 className="w-5 h-5 text-destructive" />}>
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
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-card rounded-lg overflow-hidden border border-border shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{imagePreview.name}</h3>
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
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPdfPreview(null)}
        >
          <div
            className="relative w-full max-w-6xl h-[90vh] bg-card rounded-lg overflow-hidden border border-border shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-foreground">{pdfPreview.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(pdfPreview.url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-1" />
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

      {/* Vendor Assignment Dialog */}
      <VendorAssignmentDialog
        open={showVendorDialog}
        onOpenChange={setShowVendorDialog}
        ticketId={ticketId}
        ticketNumber={ticket?.ticketNumber || ''}
        onAssign={handleVendorAssignment}
      />

      {/* Comment Attachment Preview Modal */}
      {commentAttachmentPreview && (
        <AttachmentPreview
          isOpen={!!commentAttachmentPreview}
          onClose={() => setCommentAttachmentPreview(null)}
          attachment={commentAttachmentPreview.current || {
            ...commentAttachmentPreview,
            ticketId: ticket?.id
          }}
          attachments={commentAttachmentPreview.attachments}
          currentIndex={commentAttachmentPreview.currentIndex}
          onNavigate={(index) => {
            if (commentAttachmentPreview.attachments) {
              setCommentAttachmentPreview({
                ...commentAttachmentPreview,
                currentIndex: index,
                current: commentAttachmentPreview.attachments[index]
              });
            }
          }}
          ticketTitle={ticket?.title}
        />
      )}

      {/* Hidden Print View */}
      <div style={{ display: 'none' }}>
        {ticket && <TicketPrintView ref={printRef} ticket={ticket} />}
      </div>
    </div>
  );
}
