'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Database,
  MessageSquare,
  Server,
  Pencil,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { ServerMetricsDisplay } from './server-metrics-display';
import { ShiftChecklist } from './shift-checklist';
import { BackupChecklist } from './backup-checklist';
import { ShiftIssues } from './shift-issues';
import { PendingIssuesAlert } from './pending-issues-alert';

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

interface BackupItem {
  id: string;
  databaseName: string;
  description: string | null;
  isChecked: boolean;
  checkedAt: string | null;
  notes: string | null;
  order: number;
}

interface ShiftIssue {
  id: string;
  title: string;
  description: string | null;
  status: 'ONGOING' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
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
    notes: string | null;
  };
  checklistItems: ChecklistItem[];
  backupChecklist: BackupItem[];
  issues: ShiftIssue[];
  ongoingIssues: ShiftIssue[];
  resolvedIssues: ShiftIssue[];
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
  backupStats: {
    total: number;
    checked: number;
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
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [completeFormData, setCompleteFormData] = useState({
    summary: '',
    handoverNotes: '',
    issuesEncountered: '',
    pendingActions: '',
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/shifts/${shiftAssignment.id}/report`);
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setReportData(data.data);
      setNotes(data.data.report.notes || '');

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

  const handleUpdateBackup = async (
    items: { id: string; isChecked?: boolean; notes?: string }[]
  ) => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report/backup`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        }
      );

      if (!response.ok) throw new Error('Failed to update backup checklist');

      const data = await response.json();
      setReportData((prev) =>
        prev
          ? {
              ...prev,
              backupChecklist: data.data.backupChecklist,
              backupStats: {
                total: data.data.backupChecklist.length,
                checked: data.data.backupChecklist.filter((b: BackupItem) => b.isChecked).length,
              },
            }
          : null
      );
      toast.success('Backup checklist diperbarui');
    } catch (error) {
      console.error('Error updating backup checklist:', error);
      toast.error('Gagal memperbarui backup checklist');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCheckAllBackup = async (checkAll: boolean) => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report/backup`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkAll }),
        }
      );

      if (!response.ok) throw new Error('Failed to update backup checklist');

      const data = await response.json();
      setReportData((prev) =>
        prev
          ? {
              ...prev,
              backupChecklist: data.data.backupChecklist,
              backupStats: {
                total: data.data.backupChecklist.length,
                checked: data.data.backupChecklist.filter((b: BackupItem) => b.isChecked).length,
              },
            }
          : null
      );
      toast.success(checkAll ? 'Semua backup ditandai' : 'Semua tanda backup dihapus');
    } catch (error) {
      console.error('Error updating backup checklist:', error);
      toast.error('Gagal memperbarui backup checklist');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateIssue = async (issue: { title: string; description?: string; priority?: string; ticketNumber?: string }) => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report/issues`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(issue),
        }
      );

      if (!response.ok) throw new Error('Failed to create issue');

      await fetchReport();
      toast.success('Masalah berhasil ditambahkan');
    } catch (error) {
      console.error('Error creating issue:', error);
      toast.error('Gagal menambahkan masalah');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateIssue = async (issue: { id: string; title?: string; description?: string; status?: string; priority?: string; resolution?: string; ticketNumber?: string }) => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report/issues`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(issue),
        }
      );

      if (!response.ok) throw new Error('Failed to update issue');

      await fetchReport();
      toast.success('Masalah berhasil diperbarui');
    } catch (error) {
      console.error('Error updating issue:', error);
      toast.error('Gagal memperbarui masalah');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report/issues?id=${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete issue');

      await fetchReport();
      toast.success('Masalah berhasil dihapus');
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Gagal menghapus masalah');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `/api/shifts/${shiftAssignment.id}/report`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes }),
        }
      );

      if (!response.ok) throw new Error('Failed to save notes');

      setIsEditingNotes(false);
      toast.success('Catatan berhasil disimpan');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Gagal menyimpan catatan');
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
        const XLSX = (await import('xlsx')).default;
        const workbook = XLSX.utils.book_new();

        data.excelData.forEach((section: { title: string; headers?: string[]; rows: string[][] }) => {
          let sheetData: string[][] = [];
          if (section.headers) {
            sheetData.push(section.headers);
          }
          sheetData = sheetData.concat(section.rows);
          const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, worksheet, section.title.substring(0, 31));
        });

        const dateStr = new Date(shiftAssignment.date).toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Laporan_Shift_${dateStr}.xlsx`);
        toast.success('File Excel berhasil diunduh');
      } else {
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        const exportData = data.data;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - margin * 2;
        let yPos = 20;

        const colors = {
          black: [0, 0, 0] as [number, number, number],
          darkGray: [51, 51, 51] as [number, number, number],
          gray: [102, 102, 102] as [number, number, number],
          lightGray: [153, 153, 153] as [number, number, number],
          lineGray: [200, 200, 200] as [number, number, number],
        };

        const drawLine = (y: number, thickness: number = 0.3) => {
          doc.setDrawColor(...colors.lineGray);
          doc.setLineWidth(thickness);
          doc.line(margin, y, pageWidth - margin, y);
        };

        const checkPageBreak = (neededSpace: number) => {
          if (yPos + neededSpace > pageHeight - 25) {
            doc.addPage();
            yPos = 20;
          }
        };

        const drawSectionHeader = (title: string) => {
          checkPageBreak(15);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.black);
          doc.text(title, margin, yPos);
          yPos += 2;
          drawLine(yPos, 0.5);
          yPos += 8;
        };

        // Header
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => resolve();
            logoImg.onerror = () => reject();
            logoImg.src = '/logo-bsg.png';
          });
          const canvas = document.createElement('canvas');
          canvas.width = logoImg.width;
          canvas.height = logoImg.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(logoImg, 0, 0);
            const logoBase64 = canvas.toDataURL('image/png');
            doc.addImage(logoBase64, 'PNG', margin, yPos, 20, 20);
          }
        } catch {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.black);
          doc.text('BSG', margin + 5, yPos + 12);
        }

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.black);
        doc.text('LAPORAN STANDBY', margin + 28, yPos + 8);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.gray);
        doc.text('PT Bank SulutGo - Divisi Teknologi Informasi', margin + 28, yPos + 14);

        const reportDate = new Date(exportData.shiftInfo.date).toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        doc.text(reportDate, margin + 28, yPos + 20);
        yPos += 28;
        drawLine(yPos, 0.8);
        yPos += 10;

        // Shift Info
        drawSectionHeader('INFORMASI SHIFT');
        const shiftTypeLabels: Record<string, string> = {
          NIGHT_WEEKDAY: 'Malam Weekday (20:00-07:59)',
          DAY_WEEKEND: 'Siang Weekend (08:00-19:00)',
          NIGHT_WEEKEND: 'Malam Weekend (20:00-07:59)',
          STANDBY_ONCALL: 'Standby On-Call',
          STANDBY_BRANCH: 'Standby Cabang',
        };
        const statusLabelsMap: Record<string, string> = {
          DRAFT: 'Draft',
          IN_PROGRESS: 'Sedang Dikerjakan',
          COMPLETED: 'Selesai',
        };
        const infoData = [
          ['Nama Teknisi', exportData.shiftInfo.technician],
          ['Cabang', exportData.shiftInfo.branch],
          ['Jenis Shift', shiftTypeLabels[exportData.shiftInfo.shiftType] || exportData.shiftInfo.shiftType],
          ['Status', statusLabelsMap[exportData.reportInfo.status] || exportData.reportInfo.status],
        ];
        infoData.forEach((row) => {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.gray);
          doc.text(row[0] + ':', margin, yPos);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.darkGray);
          doc.text(row[1], margin + 45, yPos);
          yPos += 6;
        });
        yPos += 8;

        // Server Metrics
        drawSectionHeader('KONDISI SERVER');
        if (exportData.serverMetrics) {
          const metrics = exportData.serverMetrics;
          const metricsData = [
            ['CPU Usage', `${metrics.cpu.usagePercent?.toFixed(1) || '-'}%`],
            ['RAM Usage', `${metrics.ram.usagePercent?.toFixed(1) || '-'}%`],
            ['Disk Usage', `${metrics.disk.usagePercent?.toFixed(1) || '-'}%`],
            ['Uptime', metrics.uptime.days ? `${metrics.uptime.days} hari` : '-'],
          ];
          const colWidth = contentWidth / 4;
          doc.setFontSize(8);
          metricsData.forEach((metric, index) => {
            const xPos = margin + (index * colWidth);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.gray);
            doc.text(metric[0], xPos, yPos);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.darkGray);
            doc.text(metric[1], xPos, yPos + 5);
          });
          yPos += 15;
        } else {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.gray);
          doc.text('Metrik server tidak tersedia', margin, yPos);
          yPos += 10;
        }
        yPos += 5;

        // Backup Database Section
        if (exportData.backupChecklist && exportData.backupChecklist.length > 0) {
          drawSectionHeader('BACKUP DATABASE');
          exportData.backupChecklist.forEach((item: { databaseName: string; isChecked: boolean }) => {
            checkPageBreak(8);
            doc.setFontSize(9);
            const statusSymbol = item.isChecked ? '[v]' : '[ ]';
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.darkGray);
            doc.text(statusSymbol, margin, yPos);
            doc.text(item.databaseName, margin + 10, yPos);
            yPos += 5;
          });
          yPos += 5;
        }

        // Issues Section
        if (exportData.issues && exportData.issues.length > 0) {
          drawSectionHeader('MASALAH');
          const ongoing = exportData.issues.filter((i: { status: string }) => i.status === 'ONGOING');
          const resolved = exportData.issues.filter((i: { status: string }) => i.status === 'RESOLVED');

          if (ongoing.length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.darkGray);
            doc.text('Masalah Berjalan:', margin, yPos);
            yPos += 5;
            ongoing.forEach((issue: { title: string; priority: string }) => {
              checkPageBreak(8);
              doc.setFont('helvetica', 'normal');
              doc.text(`- ${issue.title} [${issue.priority}]`, margin + 5, yPos);
              yPos += 5;
            });
            yPos += 3;
          }

          if (resolved.length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...colors.darkGray);
            doc.text('Masalah Selesai:', margin, yPos);
            yPos += 5;
            resolved.forEach((issue: { title: string; resolution: string | null }) => {
              checkPageBreak(8);
              doc.setFont('helvetica', 'normal');
              doc.text(`- ${issue.title}`, margin + 5, yPos);
              if (issue.resolution) {
                yPos += 4;
                doc.setTextColor(...colors.gray);
                doc.text(`  Resolusi: ${issue.resolution}`, margin + 5, yPos);
              }
              yPos += 5;
            });
          }
          yPos += 5;
        }

        // Checklist Section
        drawSectionHeader('DAFTAR PERIKSA');
        const categories: Record<string, { title: string; status: string; isRequired: boolean; notes: string | null }[]> = {};
        exportData.checklist.forEach((item: { category: string; title: string; status: string; isRequired: boolean; notes: string | null }) => {
          if (!categories[item.category]) {
            categories[item.category] = [];
          }
          categories[item.category].push(item);
        });
        Object.entries(categories).forEach(([category, items]) => {
          checkPageBreak(items.length * 7 + 12);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.darkGray);
          doc.text(category, margin, yPos);
          yPos += 6;
          items.forEach((item) => {
            checkPageBreak(14);
            doc.setFontSize(9);
            let statusSymbol = '[ ]';
            if (item.status === 'Selesai') statusSymbol = '[v]';
            else if (item.status === 'Dilewati') statusSymbol = '[-]';
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.darkGray);
            doc.text(statusSymbol, margin, yPos);
            let titleText = item.title;
            if (item.isRequired) titleText += ' *';
            doc.text(titleText, margin + 10, yPos);
            yPos += 5;
          });
          yPos += 5;
        });

        // Notes Section
        if (exportData.notes) {
          drawSectionHeader('CATATAN');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.darkGray);
          const notesLines = doc.splitTextToSize(exportData.notes, contentWidth);
          doc.text(notesLines, margin, yPos);
          yPos += notesLines.length * 4 + 5;
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          drawLine(pageHeight - 18, 0.3);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.lightGray);
          doc.text('Bank SulutGo ServiceDesk - Laporan Standby', margin, pageHeight - 12);
          doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
          doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
        }

        const dateStr = new Date(shiftAssignment.date).toISOString().split('T')[0];
        doc.save(`Laporan_Standby_${dateStr}.pdf`);
        toast.success('File PDF berhasil diunduh');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Gagal mengekspor laporan');
    }
  };

  const handleDeleteReport = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/shifts/${shiftAssignment.id}/report`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Gagal menghapus laporan');
      }

      toast.success('Laporan shift berhasil dihapus');
      setShowDeleteDialog(false);
      setReportData(null);
      // Trigger a refresh to recreate the report
      fetchReport();
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(error.message || 'Gagal menghapus laporan');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetReport = async () => {
    // Reset by deleting and recreating (fetchReport will create a new one)
    await handleDeleteReport();
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

  const { report, checklistItems, backupChecklist, ongoingIssues, resolvedIssues, serverMetrics, metricsAvailable, metricsStale, stats, backupStats } = reportData;
  const isCompleted = report.status === 'COMPLETED';
  const progressPercentage = Math.round(((stats.completed + stats.skipped) / stats.total) * 100);
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
                  Laporan lengkap untuk shift Anda
                </CardDescription>
              </div>
            </div>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tabs for different sections */}
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="metrics" className="text-xs">
                <Server className="h-3 w-3 mr-1" />
                Metrik
              </TabsTrigger>
              <TabsTrigger value="backup" className="text-xs">
                <Database className="h-3 w-3 mr-1" />
                Backup
              </TabsTrigger>
              <TabsTrigger value="issues" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Masalah
              </TabsTrigger>
              <TabsTrigger value="checklist" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Checklist
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                Catatan
              </TabsTrigger>
            </TabsList>

            {/* Server Metrics Tab */}
            <TabsContent value="metrics" className="mt-4">
              <ServerMetricsDisplay
                metrics={serverMetrics}
                available={metricsAvailable}
                isStale={metricsStale}
              />
            </TabsContent>

            {/* Backup Checklist Tab */}
            <TabsContent value="backup" className="mt-4">
              <BackupChecklist
                items={backupChecklist}
                onUpdateItems={handleUpdateBackup}
                onCheckAll={handleCheckAllBackup}
                isLoading={isUpdating}
                readOnly={isCompleted}
              />
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress Backup</span>
                <span className="font-medium">
                  {backupStats.checked}/{backupStats.total} ({Math.round((backupStats.checked / backupStats.total) * 100) || 0}%)
                </span>
              </div>
              <Progress value={(backupStats.checked / backupStats.total) * 100 || 0} className="h-2 mt-2" />
            </TabsContent>

            {/* Issues Tab */}
            <TabsContent value="issues" className="mt-4 space-y-4">
              {/* Alert for pending issues from previous shifts */}
              {!isCompleted && (
                <PendingIssuesAlert onAddIssue={handleCreateIssue} />
              )}
              <ShiftIssues
                ongoingIssues={ongoingIssues}
                resolvedIssues={resolvedIssues}
                onCreateIssue={handleCreateIssue}
                onUpdateIssue={handleUpdateIssue}
                onDeleteIssue={handleDeleteIssue}
                isLoading={isUpdating}
                readOnly={isCompleted}
              />
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="mt-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress Checklist</span>
                <span className="font-medium">
                  {stats.completed + stats.skipped}/{stats.total} ({progressPercentage}%)
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <ShiftChecklist
                items={checklistItems}
                onUpdateItems={handleUpdateChecklist}
                isLoading={isUpdating}
                readOnly={isCompleted}
              />
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-4">
              <div className="space-y-3">
                <Label>Catatan Umum</Label>
                {isEditingNotes || !notes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tulis catatan untuk shift ini..."
                      className="min-h-[120px]"
                      disabled={isCompleted}
                    />
                    {!isCompleted && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveNotes} disabled={isUpdating}>
                          Simpan
                        </Button>
                        {notes && (
                          <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(false)}>
                            Batal
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => !isCompleted && setIsEditingNotes(true)}
                  >
                    <p className="text-sm whitespace-pre-wrap">{notes}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

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
            {!isCompleted && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isUpdating || isDeleting}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Laporan
                </Button>
              </>
            )}
            {isCompleted && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isUpdating || isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Laporan
              </Button>
            )}
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

      {/* Delete/Reset Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {isCompleted ? 'Hapus Laporan Shift' : 'Reset Laporan Shift'}
            </DialogTitle>
            <DialogDescription>
              {isCompleted
                ? 'Apakah Anda yakin ingin menghapus laporan shift ini? Semua data termasuk checklist, backup checklist, dan masalah akan dihapus permanen.'
                : 'Apakah Anda yakin ingin mereset laporan shift ini? Semua data checklist, backup, dan masalah akan dikembalikan ke kondisi awal.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteReport}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isCompleted ? 'Menghapus...' : 'Mereset...'}
                </>
              ) : (
                <>
                  {isCompleted ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus Laporan
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Laporan
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
