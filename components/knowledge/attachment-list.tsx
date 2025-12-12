'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Table,
  Image as ImageIcon,
  File,
  Paperclip,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize, isPreviewableFile, getFileTypeCategory } from '@/lib/document-converter';
import { DocumentPreviewModal, DocumentPreviewAttachment } from './document-preview-modal';
import { toast } from 'sonner';

// Indonesian labels
const labels = {
  attachments: 'Lampiran',
  noAttachments: 'Tidak ada lampiran',
  preview: 'Pratinjau',
  download: 'Unduh',
  delete: 'Hapus',
  previewNotAvailable: 'Pratinjau tidak tersedia',
  deleteConfirmTitle: 'Hapus Lampiran',
  deleteConfirmDescription: 'Apakah Anda yakin ingin menghapus lampiran ini? Tindakan ini tidak dapat dibatalkan.',
  cancel: 'Batal',
  deleting: 'Menghapus...',
  deleteSuccess: 'Lampiran berhasil dihapus',
  deleteError: 'Gagal menghapus lampiran'
};

// File type icon mapping with colors
const getFileIcon = (mimeType: string) => {
  const fileType = getFileTypeCategory(mimeType);

  switch (fileType) {
    case 'pdf':
      return { icon: FileText, color: 'text-red-500' };
    case 'docx':
      return { icon: FileText, color: 'text-blue-500' };
    case 'xlsx':
      return { icon: Table, color: 'text-green-500' };
    case 'image':
      return { icon: ImageIcon, color: 'text-purple-500' };
    default:
      return { icon: File, color: 'text-gray-500' };
  }
};

// File type badge
const getFileTypeBadge = (mimeType: string) => {
  const fileType = getFileTypeCategory(mimeType);

  switch (fileType) {
    case 'pdf':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">PDF</Badge>;
    case 'docx':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">Word</Badge>;
    case 'xlsx':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">Excel</Badge>;
    case 'image':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">Gambar</Badge>;
    default:
      return <Badge variant="outline">Lainnya</Badge>;
  }
};

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader: {
    name: string;
  };
}

interface AttachmentListProps {
  attachments: Attachment[];
  articleId: string;
  canManage?: boolean;
  onAttachmentDeleted?: (attachmentId: string) => void;
  className?: string;
}

export function AttachmentList({
  attachments,
  articleId,
  canManage = false,
  onAttachmentDeleted,
  className
}: AttachmentListProps) {
  const [previewAttachment, setPreviewAttachment] = useState<DocumentPreviewAttachment | null>(null);
  const [deleteAttachment, setDeleteAttachment] = useState<Attachment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePreview = (attachment: Attachment) => {
    if (!isPreviewableFile(attachment.mimeType)) {
      toast.info(labels.previewNotAvailable);
      return;
    }

    setPreviewAttachment({
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size
    });
  };

  const handleDownload = (attachment: Attachment) => {
    const downloadUrl = `/api/knowledge/${articleId}/attachments/${attachment.id}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!deleteAttachment) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/knowledge/${articleId}/attachments/${deleteAttachment.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      toast.success(labels.deleteSuccess);
      onAttachmentDeleted?.(deleteAttachment.id);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error(labels.deleteError);
    } finally {
      setIsDeleting(false);
      setDeleteAttachment(null);
    }
  };

  if (attachments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-5 w-5" />
            {labels.attachments}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{labels.noAttachments}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-5 w-5" />
            {labels.attachments} ({attachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attachments.map((attachment) => {
            const { icon: FileIcon, color } = getFileIcon(attachment.mimeType);
            const canPreview = isPreviewableFile(attachment.mimeType);

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* File icon */}
                <div className={cn('p-2 rounded-lg bg-gray-100 dark:bg-gray-800', color)}>
                  <FileIcon className="h-5 w-5" />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                      {attachment.originalName}
                    </span>
                    {getFileTypeBadge(attachment.mimeType)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(attachment.size)}</span>
                    <span className="hidden sm:inline">-</span>
                    <span className="hidden sm:inline">{attachment.uploader.name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Preview button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(attachment)}
                    disabled={!canPreview}
                    title={canPreview ? labels.preview : labels.previewNotAvailable}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className={cn('h-4 w-4', !canPreview && 'opacity-50')} />
                  </Button>

                  {/* Download button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    title={labels.download}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {/* Delete button (if can manage) */}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteAttachment(attachment)}
                      title={labels.delete}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewAttachment && (
        <DocumentPreviewModal
          isOpen={!!previewAttachment}
          onClose={() => setPreviewAttachment(null)}
          attachment={previewAttachment}
          articleId={articleId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteAttachment}
        onOpenChange={(open) => !open && setDeleteAttachment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {labels.deleteConfirmDescription}
              {deleteAttachment && (
                <span className="block mt-2 font-medium text-gray-900 dark:text-gray-100">
                  {deleteAttachment.originalName}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {labels.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? labels.deleting : labels.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Export a simpler inline attachment item for other use cases
interface AttachmentItemProps {
  attachment: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  articleId: string;
  onPreview?: () => void;
  compact?: boolean;
}

export function AttachmentItem({
  attachment,
  articleId,
  onPreview,
  compact = false
}: AttachmentItemProps) {
  const { icon: FileIcon, color } = getFileIcon(attachment.mimeType);
  const canPreview = isPreviewableFile(attachment.mimeType);

  const handleDownload = () => {
    const downloadUrl = `/api/knowledge/${articleId}/attachments/${attachment.id}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-gray-700">
        <FileIcon className={cn('h-4 w-4', color)} />
        <span className="flex-1 text-sm truncate">{attachment.originalName}</span>
        {canPreview && onPreview && (
          <Button variant="ghost" size="sm" onClick={onPreview} className="h-6 px-2">
            <Eye className="h-3 w-3" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 px-2">
          <Download className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className={cn('p-2 rounded-lg bg-gray-100 dark:bg-gray-800', color)}>
        <FileIcon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm truncate block">{attachment.originalName}</span>
        <span className="text-xs text-gray-500">{formatFileSize(attachment.size)}</span>
      </div>
      <div className="flex items-center gap-1">
        {canPreview && onPreview && (
          <Button variant="ghost" size="sm" onClick={onPreview} className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleDownload} className="h-8 w-8 p-0">
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
