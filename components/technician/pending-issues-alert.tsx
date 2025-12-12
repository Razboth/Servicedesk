'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Plus,
  User,
  Calendar,
  Ticket,
  ChevronRight,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PendingIssue {
  id: string;
  title: string;
  description: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ticketNumber: string | null;
  ticketId: string | null;
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
  } | null;
  createdAt: string;
  reportedBy: {
    id: string;
    name: string;
  };
  shiftDate: string;
  shiftType: string;
}

interface PendingIssuesAlertProps {
  onAddIssue: (issue: { title: string; description?: string; priority: string; ticketNumber?: string }) => Promise<void>;
}

const priorityConfig = {
  LOW: { label: 'Rendah', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  MEDIUM: { label: 'Sedang', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  HIGH: { label: 'Tinggi', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
  CRITICAL: { label: 'Kritis', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
};

const shiftTypeLabels: Record<string, string> = {
  NIGHT_WEEKDAY: 'Malam Weekday',
  DAY_WEEKEND: 'Siang Weekend',
  NIGHT_WEEKEND: 'Malam Weekend',
  STANDBY_ONCALL: 'Standby On-Call',
  STANDBY_BRANCH: 'Standby Cabang',
};

export function PendingIssuesAlert({ onAddIssue }: PendingIssuesAlertProps) {
  const [pendingIssues, setPendingIssues] = useState<PendingIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [addedIssueIds, setAddedIssueIds] = useState<Set<string>>(new Set());
  const [addingIssueId, setAddingIssueId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchPendingIssues();
  }, []);

  const fetchPendingIssues = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/shifts/pending-issues');
      if (!response.ok) throw new Error('Failed to fetch pending issues');
      const data = await response.json();
      setPendingIssues(data.data.issues || []);
    } catch (error) {
      console.error('Error fetching pending issues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToReport = async (issue: PendingIssue) => {
    if (addingIssueId) return;

    setAddingIssueId(issue.id);
    try {
      await onAddIssue({
        title: issue.title,
        description: issue.description || undefined,
        priority: issue.priority,
        ticketNumber: issue.ticketNumber || undefined,
      });

      setAddedIssueIds((prev) => new Set([...prev, issue.id]));
      toast.success('Masalah berhasil ditambahkan ke laporan');
    } catch (error) {
      console.error('Error adding issue:', error);
      toast.error('Gagal menambahkan masalah');
    } finally {
      setAddingIssueId(null);
    }
  };

  const handleAddAll = async () => {
    const issuesToAdd = pendingIssues.filter((issue) => !addedIssueIds.has(issue.id));

    for (const issue of issuesToAdd) {
      await handleAddToReport(issue);
    }

    setShowDialog(false);
  };

  // Don't show if loading, dismissed, or no pending issues
  if (isLoading || dismissed || pendingIssues.length === 0) {
    return null;
  }

  const remainingIssues = pendingIssues.filter((issue) => !addedIssueIds.has(issue.id));

  if (remainingIssues.length === 0) {
    return null;
  }

  return (
    <>
      <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-800 dark:text-orange-200">
          Ada {remainingIssues.length} Masalah Berjalan dari Shift Sebelumnya
        </AlertTitle>
        <AlertDescription className="text-orange-700 dark:text-orange-300">
          <p className="text-sm mt-1">
            Masalah ini belum diselesaikan oleh teknisi sebelumnya. Apakah Anda ingin menambahkannya ke laporan Anda?
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="h-7 text-xs bg-orange-600 hover:bg-orange-700"
              onClick={() => setShowDialog(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Lihat & Tambahkan ke Laporan
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950"
              onClick={() => setDismissed(true)}
            >
              Abaikan
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Dialog to view and add issues */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Masalah Berjalan dari Shift Sebelumnya
            </DialogTitle>
            <DialogDescription>
              Pilih masalah yang ingin Anda tambahkan ke laporan shift Anda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {pendingIssues.map((issue) => {
              const isAdded = addedIssueIds.has(issue.id);
              const isAdding = addingIssueId === issue.id;
              const priority = priorityConfig[issue.priority];

              return (
                <div
                  key={issue.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    isAdded ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700' : 'bg-background'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{issue.title}</span>
                        <Badge className={cn('text-[10px] h-4 px-1', priority.color)}>
                          {priority.label}
                        </Badge>
                        {issue.ticketNumber && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            <Ticket className="h-2.5 w-2.5 mr-0.5" />
                            {issue.ticketNumber}
                          </Badge>
                        )}
                      </div>
                      {issue.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {issue.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {issue.reportedBy.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(issue.shiftDate).toLocaleDateString('id-ID')}
                        </span>
                        <span>{shiftTypeLabels[issue.shiftType] || issue.shiftType}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isAdded ? (
                        <div className="flex items-center gap-1 text-green-600 text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Ditambahkan</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleAddToReport(issue)}
                          disabled={isAdding}
                        >
                          {isAdding ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Tambah
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {remainingIssues.length > 0 && (
              <Button
                onClick={handleAddAll}
                disabled={!!addingIssueId}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Semua ({remainingIssues.length})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="w-full sm:w-auto"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
