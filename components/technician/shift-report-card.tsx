'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList,
  FileText,
  Download,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { ServerMetricsDisplay } from './server-metrics-display';
import { ShiftChecklist } from './shift-checklist';

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: string;
}

interface ShiftReportCardProps {
  shiftAssignment: ShiftAssignment;
  onReportCreated?: () => void;
}

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string | null;
  order: number;
  isRequired: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  completedAt: string | null;
  notes: string | null;
}

interface ServerMetrics {
  cpuUsagePercent: number | null;
  cpuCores: number | null;
  cpuLoadAvg1m: number | null;
  cpuLoadAvg5m: number | null;
  cpuLoadAvg15m: number | null;
  ramTotalGB: number | null;
  ramUsedGB: number | null;
  ramUsagePercent: number | null;
  diskTotalGB: number | null;
  diskUsedGB: number | null;
  diskUsagePercent: number | null;
  networkInBytesPerSec: number | null;
  networkOutBytesPerSec: number | null;
  uptimeSeconds: number | null;
  lastBootTime: string | null;
  collectedAt: string;
}

interface ReportData {
  report: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    summary: string | null;
    handoverNotes: string | null;
    issuesEncountered: string | null;
    pendingActions: string | null;
  };
  checklistItems: ChecklistItem[];
  serverMetrics: ServerMetrics | null;
  metricsAvailable: boolean;
  metricsStale: boolean;
  stats: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    skipped: number;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  IN_PROGRESS: { label: 'Sedang Dikerjakan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  COMPLETED: { label: 'Selesai', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
};

export function ShiftReportCard({ shiftAssignment, onReportCreated }: ShiftReportCardProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeFormData, setCompleteFormData] = useState({
    summary: '',
    handoverNotes: '',
    issuesEncountered: '',
    pendingActions: '',
  });

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/shifts/${shiftAssignment.id}/report`);
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setReportData(data.data);

      // Pre-fill complete form with existing data
      if (data.data.report) {
        setCompleteFormData({
          summary: data.data.report.summary || '',
          handoverNotes: data.data.report.handoverNotes || '',
          issuesEncountered: data.data.report.issuesEncountered || '',
          pendingActions: data.data.report.pendingActions || '',
        });
      }

      onReportCreated?.();
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Gagal memuat laporan shift');
    } finally {
      setIsLoading(false);
    }
  }, [shiftAssignment.id, onReportCreated]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleUpdateChecklist = async (
    items: { id: string; status?: string; notes?: string }[]
  ) => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report/checklist`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        }
      );

      if (!response.ok) throw new Error('Failed to update checklist');

      const data = await response.json();
      setReportData((prev) =>
        prev
          ? {
              ...prev,
              checklistItems: data.data.checklistItems,
              stats: {
                ...prev.stats,
                ...data.data.stats,
              },
            }
          : null
      );
      toast.success('Checklist diperbarui');
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('Gagal memperbarui checklist');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteReport = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(completeFormData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.incompleteItems) {
          toast.error(
            `${data.message}. Item belum selesai: ${data.incompleteItems
              .map((i: { title: string }) => i.title)
              .join(', ')}`
          );
        } else {
          throw new Error(data.message || 'Failed to complete report');
        }
        return;
      }

      toast.success('Laporan shift berhasil diselesaikan');
      setShowCompleteDialog(false);
      fetchReport();
    } catch (error) {
      console.error('Error completing report:', error);
      toast.error('Gagal menyelesaikan laporan');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    try {
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report/export?format=${format}`
      );
      if (!response.ok) throw new Error('Failed to export report');

      const data = await response.json();

      if (format === 'xlsx') {
        // For now, just show the data - could integrate with xlsx library
        console.log('Export data:', data);
        toast.success('Data ekspor siap. Fitur unduh sedang dalam pengembangan.');
      } else {
        toast.success('Ekspor PDF sedang dalam pengembangan.');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Gagal mengekspor laporan');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Gagal memuat laporan shift
        </CardContent>
      </Card>
    );
  }

  const { report, checklistItems, serverMetrics, metricsAvailable, metricsStale, stats } =
    reportData;
  const isCompleted = report.status === 'COMPLETED';
  const progressPercentage = Math.round(
    ((stats.completed + stats.skipped) / stats.total) * 100
  );
  const statusInfo = statusLabels[report.status] || statusLabels.DRAFT;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Laporan Shift</CardTitle>
                <CardDescription>
                  Daftar periksa dan metrik server untuk shift Anda
                </CardDescription>
              </div>
            </div>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress Checklist</span>
              <span className="font-medium">
                {stats.completed + stats.skipped}/{stats.total} item (
                {progressPercentage}%)
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Server Metrics */}
          <ServerMetricsDisplay
            metrics={serverMetrics}
            available={metricsAvailable}
            isStale={metricsStale}
          />

          {/* Checklist */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Daftar Periksa
            </h3>
            <ShiftChecklist
              items={checklistItems}
              onUpdateItems={handleUpdateChecklist}
              isLoading={isUpdating}
              readOnly={isCompleted}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            {!isCompleted && (
              <Button
                onClick={() => setShowCompleteDialog(true)}
                disabled={isUpdating}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Selesaikan Laporan
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => handleExport('xlsx')}
              disabled={isUpdating}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Ekspor Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
              disabled={isUpdating}
            >
              <Download className="h-4 w-4 mr-2" />
              Ekspor PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Complete Report Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selesaikan Laporan Shift</DialogTitle>
            <DialogDescription>
              Lengkapi ringkasan dan catatan serah terima sebelum menyelesaikan laporan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Ringkasan</Label>
              <Textarea
                id="summary"
                placeholder="Ringkasan aktivitas selama shift..."
                value={completeFormData.summary}
                onChange={(e) =>
                  setCompleteFormData((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  }))
                }
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="handoverNotes">Catatan Serah Terima</Label>
              <Textarea
                id="handoverNotes"
                placeholder="Informasi penting untuk shift berikutnya..."
                value={completeFormData.handoverNotes}
                onChange={(e) =>
                  setCompleteFormData((prev) => ({
                    ...prev,
                    handoverNotes: e.target.value,
                  }))
                }
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issuesEncountered">Masalah yang Ditemui</Label>
              <Textarea
                id="issuesEncountered"
                placeholder="Masalah atau kendala selama shift (jika ada)..."
                value={completeFormData.issuesEncountered}
                onChange={(e) =>
                  setCompleteFormData((prev) => ({
                    ...prev,
                    issuesEncountered: e.target.value,
                  }))
                }
                className="min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pendingActions">Tindakan Tertunda</Label>
              <Textarea
                id="pendingActions"
                placeholder="Tindakan yang perlu dilanjutkan oleh shift berikutnya..."
                value={completeFormData.pendingActions}
                onChange={(e) =>
                  setCompleteFormData((prev) => ({
                    ...prev,
                    pendingActions: e.target.value,
                  }))
                }
                className="min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              disabled={isUpdating}
            >
              Batal
            </Button>
            <Button onClick={handleCompleteReport} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Selesaikan Laporan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
