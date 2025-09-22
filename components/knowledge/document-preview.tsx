'use client';

import { useState } from 'react';
import { FileText, Image as ImageIcon, File, Download, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface DocumentPreviewProps {
  filename: string;
  url: string;
  mimeType: string;
  size?: number;
  className?: string;
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.includes('pdf')) return FileText;
  return File;
};

export function DocumentPreview({ filename, url, mimeType, size, className }: DocumentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const Icon = getFileIcon(mimeType);

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType.includes('pdf');
  const isPreviewable = isImage || isPdf;

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <>
      <div className={cn("flex items-center gap-2 p-2 rounded-lg border bg-card", className)}>
        <div className="p-2 rounded bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{filename}</p>
          {size && (
            <p className="text-xs text-muted-foreground">{formatFileSize(size)}</p>
          )}
        </div>

        <div className="flex gap-1">
          {isPreviewable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="h-8 px-2"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs">Preview</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 px-2"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="ml-1 text-xs">Download</span>
          </Button>
        </div>
      </div>

      {isPreviewable && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className={cn(
            "max-w-4xl",
            isFullscreen && "max-w-[95vw] h-[95vh]"
          )}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate pr-4">{filename}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className={cn(
              "relative overflow-auto",
              isFullscreen ? "h-[calc(95vh-100px)]" : "max-h-[70vh]"
            )}>
              {isImage ? (
                <div className="relative min-h-[300px]">
                  <Image
                    src={url}
                    alt={filename}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              ) : isPdf ? (
                <iframe
                  src={`${url}#toolbar=0`}
                  className="w-full h-full min-h-[600px]"
                  title={filename}
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

interface DocumentListProps {
  documents: Array<{
    id?: string;
    filename: string;
    url: string;
    mimeType: string;
    size?: number;
  }>;
  className?: string;
}

export function DocumentList({ documents, className }: DocumentListProps) {
  if (documents.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {documents.map((doc, index) => (
        <DocumentPreview
          key={doc.id || index}
          filename={doc.filename}
          url={doc.url}
          mimeType={doc.mimeType}
          size={doc.size}
        />
      ))}
    </div>
  );
}