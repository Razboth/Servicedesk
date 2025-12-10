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
        // Dynamic import for xlsx
        const XLSX = (await import('xlsx')).default;
        const workbook = XLSX.utils.book_new();

        // Create sheets for each section
        data.excelData.forEach((section: { title: string; headers?: string[]; rows: string[][] }) => {
          let sheetData: string[][] = [];

          if (section.headers) {
            sheetData.push(section.headers);
          }
          sheetData = sheetData.concat(section.rows);

          const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, worksheet, section.title.substring(0, 31));
        });

        // Generate and download
        const dateStr = new Date(shiftAssignment.date).toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Laporan_Shift_${dateStr}.xlsx`);
        toast.success('File Excel berhasil diunduh');
      } else {
        // Dynamic import for jsPDF
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();

        const exportData = data.data;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;
        let yPos = 15;
        const lineHeight = 6;

        // Colors
        const primaryColor: [number, number, number] = [0, 82, 147]; // BSG Blue
        const secondaryColor: [number, number, number] = [100, 100, 100];
        const lightGray: [number, number, number] = [245, 245, 245];
        const borderColor: [number, number, number] = [200, 200, 200];

        // Helper function to add new page with header
        const addNewPage = () => {
          doc.addPage();
          yPos = 15;
          addHeader();
        };

        // Helper function to check page break
        const checkPageBreak = (neededSpace: number) => {
          if (yPos + neededSpace > pageHeight - 25) {
            addNewPage();
          }
        };

        // Helper function to draw section header
        const drawSectionHeader = (title: string) => {
          checkPageBreak(15);
          doc.setFillColor(...primaryColor);
          doc.rect(margin, yPos, contentWidth, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(title, margin + 3, yPos + 5.5);
          doc.setTextColor(0, 0, 0);
          yPos += 12;
        };

        // Helper function to draw info row
        const drawInfoRow = (label: string, value: string, isAlternate: boolean = false) => {
          if (isAlternate) {
            doc.setFillColor(...lightGray);
            doc.rect(margin, yPos - 4, contentWidth, 7, 'F');
          }
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...secondaryColor);
          doc.text(label, margin + 3, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(value, margin + 45, yPos);
          yPos += 7;
        };

        // Add header with logo
        const addHeader = async () => {
          // Header background
          doc.setFillColor(...primaryColor);
          doc.rect(0, 0, pageWidth, 35, 'F');

          // Try to add logo
          try {
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              logoImg.onload = () => resolve();
              logoImg.onerror = () => reject();
              logoImg.src = '/logo-bsg.png';
            });

            // Create canvas to get base64
            const canvas = document.createElement('canvas');
            canvas.width = logoImg.width;
            canvas.height = logoImg.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(logoImg, 0, 0);
              const logoBase64 = canvas.toDataURL('image/png');
              doc.addImage(logoBase64, 'PNG', margin, 5, 25, 25);
            }
          } catch {
            // If logo fails, just add text
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('BSG', margin + 5, 20);
          }

          // Title text
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.text('LAPORAN STANDBY', pageWidth / 2 + 10, 15, { align: 'center' });

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('PT Bank SulutGo - Divisi Teknologi Informasi', pageWidth / 2 + 10, 22, { align: 'center' });

          // Date on header
          const reportDate = new Date(exportData.shiftInfo.date).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          doc.setFontSize(9);
          doc.text(reportDate, pageWidth / 2 + 10, 29, { align: 'center' });

          doc.setTextColor(0, 0, 0);
          yPos = 42;
        };

        // Add header to first page
        await addHeader();

        // Shift Information Section
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

        drawInfoRow('Nama Teknisi', exportData.shiftInfo.technician, true);
        drawInfoRow('Cabang', exportData.shiftInfo.branch, false);
        drawInfoRow('Jenis Shift', shiftTypeLabels[exportData.shiftInfo.shiftType] || exportData.shiftInfo.shiftType, true);
        drawInfoRow('Status Laporan', statusLabelsMap[exportData.reportInfo.status] || exportData.reportInfo.status, false);
        drawInfoRow('Waktu Mulai', new Date(exportData.reportInfo.startedAt).toLocaleString('id-ID'), true);
        drawInfoRow('Waktu Selesai', exportData.reportInfo.completedAt ? new Date(exportData.reportInfo.completedAt).toLocaleString('id-ID') : '-', false);

        yPos += 5;

        // Server Metrics Section
        drawSectionHeader('KONDISI SERVER');

        if (exportData.serverMetrics) {
          const metrics = exportData.serverMetrics;

          // Draw metrics in a grid
          const metricsData = [
            { label: 'CPU Usage', value: `${metrics.cpu.usagePercent?.toFixed(1) || '-'}%`, status: (metrics.cpu.usagePercent || 0) > 80 ? 'warning' : 'normal' },
            { label: 'RAM Usage', value: `${metrics.ram.usagePercent?.toFixed(1) || '-'}%`, status: (metrics.ram.usagePercent || 0) > 80 ? 'warning' : 'normal' },
            { label: 'Disk Usage', value: `${metrics.disk.usagePercent?.toFixed(1) || '-'}%`, status: (metrics.disk.usagePercent || 0) > 80 ? 'warning' : 'normal' },
            { label: 'Uptime', value: metrics.uptime.days ? `${metrics.uptime.days} hari` : '-', status: 'normal' },
          ];

          const boxWidth = (contentWidth - 10) / 4;
          metricsData.forEach((metric, index) => {
            const xPos = margin + (index * (boxWidth + 3));

            // Box background
            doc.setFillColor(...lightGray);
            doc.roundedRect(xPos, yPos, boxWidth, 20, 2, 2, 'F');

            // Border based on status
            if (metric.status === 'warning') {
              doc.setDrawColor(255, 150, 0);
            } else {
              doc.setDrawColor(...borderColor);
            }
            doc.roundedRect(xPos, yPos, boxWidth, 20, 2, 2, 'S');

            // Label
            doc.setFontSize(8);
            doc.setTextColor(...secondaryColor);
            doc.setFont('helvetica', 'normal');
            doc.text(metric.label, xPos + boxWidth / 2, yPos + 6, { align: 'center' });

            // Value
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text(metric.value, xPos + boxWidth / 2, yPos + 15, { align: 'center' });
          });

          yPos += 28;
        } else {
          doc.setFillColor(...lightGray);
          doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, 'F');
          doc.setFontSize(10);
          doc.setTextColor(...secondaryColor);
          doc.text('Laporan metrik tidak tersedia', pageWidth / 2, yPos + 9, { align: 'center' });
          yPos += 22;
        }

        // Checklist Section
        drawSectionHeader('DAFTAR PERIKSA');

        // Group checklist by category
        const categories: Record<string, { title: string; status: string; isRequired: boolean; notes: string | null }[]> = {};
        exportData.checklist.forEach((item: { category: string; title: string; status: string; isRequired: boolean; notes: string | null }) => {
          if (!categories[item.category]) {
            categories[item.category] = [];
          }
          categories[item.category].push(item);
        });

        Object.entries(categories).forEach(([category, items]) => {
          checkPageBreak(20);

          // Category header
          doc.setFillColor(230, 240, 250);
          doc.rect(margin, yPos - 4, contentWidth, 7, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...primaryColor);
          doc.text(category, margin + 3, yPos);
          yPos += 6;

          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');

          items.forEach((item, index) => {
            checkPageBreak(12);

            // Alternating row background
            if (index % 2 === 0) {
              doc.setFillColor(252, 252, 252);
              doc.rect(margin, yPos - 3, contentWidth, 6, 'F');
            }

            // Status checkbox
            const checkX = margin + 3;
            doc.setDrawColor(...borderColor);
            doc.rect(checkX, yPos - 3, 4, 4, 'S');

            if (item.status === 'Selesai') {
              doc.setFillColor(0, 150, 0);
              doc.rect(checkX + 0.5, yPos - 2.5, 3, 3, 'F');
            } else if (item.status === 'Dilewati') {
              doc.setFillColor(200, 200, 200);
              doc.rect(checkX + 0.5, yPos - 2.5, 3, 3, 'F');
            }

            // Item title
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(item.title, margin + 10, yPos);

            // Required badge
            if (item.isRequired) {
              doc.setFillColor(220, 53, 69);
              const badgeX = margin + 10 + doc.getTextWidth(item.title) + 2;
              doc.roundedRect(badgeX, yPos - 3, 12, 4, 1, 1, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(6);
              doc.text('Wajib', badgeX + 6, yPos - 0.5, { align: 'center' });
              doc.setTextColor(0, 0, 0);
            }

            // Status text
            doc.setFontSize(7);
            doc.setTextColor(...secondaryColor);
            doc.text(item.status, pageWidth - margin - 3, yPos, { align: 'right' });
            doc.setTextColor(0, 0, 0);

            yPos += 6;

            // Notes if any
            if (item.notes) {
              doc.setFillColor(255, 253, 230);
              doc.rect(margin + 8, yPos - 3, contentWidth - 8, 5, 'F');
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);
              doc.text(`Catatan: ${item.notes}`, margin + 10, yPos);
              doc.setTextColor(0, 0, 0);
              yPos += 6;
            }
          });

          yPos += 4;
        });

        // Summary Section
        if (exportData.summary.summary || exportData.summary.handoverNotes || exportData.summary.issuesEncountered || exportData.summary.pendingActions) {
          yPos += 3;
          drawSectionHeader('RINGKASAN & CATATAN');

          const summaryFields = [
            { label: 'Ringkasan Aktivitas', value: exportData.summary.summary },
            { label: 'Catatan Serah Terima', value: exportData.summary.handoverNotes },
            { label: 'Masalah yang Ditemui', value: exportData.summary.issuesEncountered },
            { label: 'Tindakan Tertunda', value: exportData.summary.pendingActions },
          ];

          summaryFields.forEach((field) => {
            if (field.value) {
              checkPageBreak(25);

              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...primaryColor);
              doc.text(field.label + ':', margin + 3, yPos);
              yPos += 5;

              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(8);
              const lines = doc.splitTextToSize(field.value, contentWidth - 6);

              // Background for text
              doc.setFillColor(...lightGray);
              doc.roundedRect(margin, yPos - 3, contentWidth, lines.length * 4 + 4, 2, 2, 'F');

              doc.text(lines, margin + 3, yPos);
              yPos += lines.length * 4 + 8;
            }
          });
        }

        // Footer on all pages
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);

          // Footer line
          doc.setDrawColor(...borderColor);
          doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

          // Footer text
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...secondaryColor);
          doc.text('Bank SulutGo ServiceDesk - Laporan Standby', margin, pageHeight - 10);
          doc.text(
            `Dicetak: ${new Date().toLocaleString('id-ID')} | Halaman ${i} dari ${pageCount}`,
            pageWidth - margin,
            pageHeight - 10,
            { align: 'right' }
          );
        }

        // Save the PDF
        const dateStr = new Date(shiftAssignment.date).toISOString().split('T')[0];
        doc.save(`Laporan_Standby_${dateStr}.pdf`);
        toast.success('File PDF berhasil diunduh');
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
