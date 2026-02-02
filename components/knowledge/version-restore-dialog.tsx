'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { History, AlertTriangle, CheckCircle } from 'lucide-react';

interface Version {
  id: string;
  version: number;
  title: string;
  content: string;
  summary: string | null;
  changeNotes: string | null;
  createdAt: string;
  isStable?: boolean;
  author: {
    name: string;
  };
}

interface VersionRestoreDialogProps {
  articleId: string;
  version: Version | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored?: () => void;
}

export function VersionRestoreDialog({
  articleId,
  version,
  open,
  onOpenChange,
  onRestored,
}: VersionRestoreDialogProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (!version) return;

    setIsRestoring(true);
    try {
      const response = await fetch(
        `/api/knowledge/${articleId}/versions/${version.id}/restore`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Artikel berhasil dipulihkan ke versi ${version.version}`);
        onOpenChange(false);
        onRestored?.();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Gagal memulihkan versi');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Gagal memulihkan versi');
    } finally {
      setIsRestoring(false);
    }
  };

  if (!version) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Pulihkan ke Versi {version.version}
          </DialogTitle>
          <DialogDescription>
            Artikel akan dipulihkan ke kondisi pada versi ini. Perubahan saat ini akan
            disimpan sebagai versi baru.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version Info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Versi {version.version}</span>
                {version.isStable && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Stabil
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Oleh {version.author.name} &middot;{' '}
                {formatDistanceToNow(new Date(version.createdAt), {
                  addSuffix: true,
                  locale: idLocale,
                })}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {format(new Date(version.createdAt), 'dd MMM yyyy, HH:mm')}
            </div>
          </div>

          {/* Change Notes */}
          {version.changeNotes && (
            <div>
              <p className="text-sm font-medium mb-1">Catatan Perubahan</p>
              <p className="text-sm text-muted-foreground">{version.changeNotes}</p>
            </div>
          )}

          <Separator />

          {/* Content Preview */}
          <div>
            <p className="text-sm font-medium mb-2">Preview Konten</p>
            <div className="border rounded-lg">
              <div className="px-3 py-2 border-b bg-muted/50">
                <p className="font-medium">{version.title}</p>
                {version.summary && (
                  <p className="text-sm text-muted-foreground mt-1">{version.summary}</p>
                )}
              </div>
              <ScrollArea className="h-[200px]">
                <div className="p-3 text-sm whitespace-pre-wrap">{version.content}</div>
              </ScrollArea>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Perhatian</p>
              <p className="text-yellow-700 dark:text-yellow-300">
                Memulihkan versi ini akan mengganti konten artikel saat ini dengan konten dari
                versi {version.version}. Konten saat ini akan tetap tersimpan dalam riwayat versi.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRestoring}>
            Batal
          </Button>
          <Button onClick={handleRestore} disabled={isRestoring}>
            {isRestoring ? 'Memulihkan...' : 'Pulihkan Versi Ini'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
