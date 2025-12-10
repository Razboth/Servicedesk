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
        const margin = 16;
        const contentWidth = pageWidth - margin * 2;
        let yPos = 15;

        // Modern Color Palette
        const colors = {
          primary: [15, 76, 129] as [number, number, number],        // Deep blue
          primaryLight: [59, 130, 186] as [number, number, number],  // Light blue
          primaryGradient: [25, 95, 155] as [number, number, number], // Gradient step
          accent: [16, 185, 129] as [number, number, number],        // Emerald green
          warning: [245, 158, 11] as [number, number, number],       // Amber
          danger: [239, 68, 68] as [number, number, number],         // Red
          success: [34, 197, 94] as [number, number, number],        // Green
          text: [30, 41, 59] as [number, number, number],            // Slate 800
          textMuted: [100, 116, 139] as [number, number, number],    // Slate 500
          textLight: [148, 163, 184] as [number, number, number],    // Slate 400
          background: [248, 250, 252] as [number, number, number],   // Slate 50
          cardBg: [255, 255, 255] as [number, number, number],       // White
          border: [226, 232, 240] as [number, number, number],       // Slate 200
          borderLight: [241, 245, 249] as [number, number, number],  // Slate 100
        };

        // Helper function to draw a subtle shadow effect
        const drawCardShadow = (x: number, y: number, w: number, h: number, radius: number = 3) => {
          doc.setFillColor(0, 0, 0);
          doc.setGState(new doc.GState({ opacity: 0.04 }));
          doc.roundedRect(x + 1, y + 1, w, h, radius, radius, 'F');
          doc.setGState(new doc.GState({ opacity: 0.02 }));
          doc.roundedRect(x + 2, y + 2, w, h, radius, radius, 'F');
          doc.setGState(new doc.GState({ opacity: 1 }));
        };

        // Helper function to draw a modern card
        const drawCard = (x: number, y: number, w: number, h: number, radius: number = 4) => {
          drawCardShadow(x, y, w, h, radius);
          doc.setFillColor(...colors.cardBg);
          doc.roundedRect(x, y, w, h, radius, radius, 'F');
          doc.setDrawColor(...colors.border);
          doc.setLineWidth(0.3);
          doc.roundedRect(x, y, w, h, radius, radius, 'S');
        };

        // Helper function to draw progress arc
        const drawProgressArc = (centerX: number, centerY: number, radius: number, percent: number, color: [number, number, number]) => {
          const startAngle = -90;
          const endAngle = startAngle + (percent / 100) * 360;

          // Background circle
          doc.setDrawColor(...colors.borderLight);
          doc.setLineWidth(2.5);
          doc.circle(centerX, centerY, radius, 'S');

          // Progress arc (simulated with small segments)
          doc.setDrawColor(...color);
          doc.setLineWidth(2.5);

          const segments = Math.floor(percent / 2);
          for (let i = 0; i < segments; i++) {
            const angle1 = ((startAngle + (i * 3.6 * 2)) * Math.PI) / 180;
            const angle2 = ((startAngle + ((i + 1) * 3.6 * 2)) * Math.PI) / 180;
            const x1 = centerX + Math.cos(angle1) * radius;
            const y1 = centerY + Math.sin(angle1) * radius;
            const x2 = centerX + Math.cos(angle2) * radius;
            const y2 = centerY + Math.sin(angle2) * radius;
            doc.line(x1, y1, x2, y2);
          }
        };

        // Helper function to draw checkmark icon
        const drawCheckIcon = (x: number, y: number, size: number, filled: boolean = true) => {
          if (filled) {
            doc.setFillColor(...colors.success);
            doc.circle(x + size / 2, y + size / 2, size / 2, 'F');
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.8);
            // Checkmark
            doc.line(x + size * 0.25, y + size * 0.5, x + size * 0.45, y + size * 0.7);
            doc.line(x + size * 0.45, y + size * 0.7, x + size * 0.75, y + size * 0.3);
          } else {
            doc.setDrawColor(...colors.border);
            doc.setLineWidth(0.5);
            doc.circle(x + size / 2, y + size / 2, size / 2, 'S');
          }
        };

        // Helper function to draw skip icon
        const drawSkipIcon = (x: number, y: number, size: number) => {
          doc.setFillColor(...colors.textLight);
          doc.circle(x + size / 2, y + size / 2, size / 2, 'F');
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.8);
          // Dash
          doc.line(x + size * 0.3, y + size * 0.5, x + size * 0.7, y + size * 0.5);
        };

        // Helper function to add new page with consistent styling
        const addNewPage = () => {
          doc.addPage();
          yPos = 20;
          // Add subtle header bar on subsequent pages
          doc.setFillColor(...colors.primary);
          doc.rect(0, 0, pageWidth, 8, 'F');
          doc.setFillColor(...colors.primaryLight);
          doc.rect(0, 8, pageWidth, 2, 'F');
        };

        // Helper function to check page break
        const checkPageBreak = (neededSpace: number) => {
          if (yPos + neededSpace > pageHeight - 30) {
            addNewPage();
          }
        };

        // Helper function to draw modern section header
        const drawSectionHeader = (title: string, icon?: string) => {
          checkPageBreak(20);

          // Left accent bar
          doc.setFillColor(...colors.primary);
          doc.roundedRect(margin, yPos, 3, 10, 1, 1, 'F');

          // Section title
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.text);
          doc.text(title, margin + 8, yPos + 7);

          // Subtle underline
          doc.setDrawColor(...colors.border);
          doc.setLineWidth(0.3);
          doc.line(margin, yPos + 12, margin + contentWidth, yPos + 12);

          yPos += 18;
        };

        // Helper function to draw info row in card style
        const drawInfoRowModern = (label: string, value: string, x: number, y: number, width: number) => {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.textMuted);
          doc.text(label, x, y);

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.text);
          doc.text(value, x, y + 5);
        };

        // Helper function to draw status badge
        const drawStatusBadge = (text: string, x: number, y: number, status: 'success' | 'warning' | 'info' | 'muted') => {
          const colorMap = {
            success: { bg: [220, 252, 231] as [number, number, number], text: [22, 101, 52] as [number, number, number] },
            warning: { bg: [254, 243, 199] as [number, number, number], text: [146, 64, 14] as [number, number, number] },
            info: { bg: [219, 234, 254] as [number, number, number], text: [30, 64, 175] as [number, number, number] },
            muted: { bg: [241, 245, 249] as [number, number, number], text: [71, 85, 105] as [number, number, number] },
          };

          const color = colorMap[status];
          doc.setFontSize(7);
          const textWidth = doc.getTextWidth(text);
          const padding = 4;

          doc.setFillColor(...color.bg);
          doc.roundedRect(x, y - 3.5, textWidth + padding * 2, 5, 2, 2, 'F');
          doc.setTextColor(...color.text);
          doc.setFont('helvetica', 'bold');
          doc.text(text, x + padding, y);
        };

        // Add modern header with gradient effect
        const addHeader = async () => {
          // Gradient header background (simulated with layers)
          doc.setFillColor(...colors.primary);
          doc.rect(0, 0, pageWidth, 42, 'F');
          doc.setFillColor(...colors.primaryGradient);
          doc.rect(0, 0, pageWidth, 28, 'F');

          // Decorative accent line
          doc.setFillColor(...colors.accent);
          doc.rect(0, 42, pageWidth, 3, 'F');

          // Decorative diagonal element
          doc.setFillColor(255, 255, 255);
          doc.setGState(new doc.GState({ opacity: 0.05 }));
          doc.triangle(pageWidth - 60, 0, pageWidth, 0, pageWidth, 45);
          doc.setGState(new doc.GState({ opacity: 1 }));

          // Try to add logo
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

              // Logo container with white background
              doc.setFillColor(255, 255, 255);
              doc.roundedRect(margin, 8, 28, 28, 4, 4, 'F');
              doc.addImage(logoBase64, 'PNG', margin + 2, 10, 24, 24);
            }
          } catch {
            // Logo fallback - circular badge with text
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(margin, 8, 28, 28, 4, 4, 'F');
            doc.setTextColor(...colors.primary);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('BSG', margin + 14, 24, { align: 'center' });
          }

          // Title section
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(20);
          doc.setFont('helvetica', 'bold');
          doc.text('LAPORAN STANDBY', margin + 36, 18);

          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setGState(new doc.GState({ opacity: 0.9 }));
          doc.text('PT Bank SulutGo - Divisi Teknologi Informasi', margin + 36, 26);
          doc.setGState(new doc.GState({ opacity: 1 }));

          // Date badge
          const reportDate = new Date(exportData.shiftInfo.date).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          doc.setFillColor(255, 255, 255);
          doc.setGState(new doc.GState({ opacity: 0.2 }));
          const dateWidth = doc.getTextWidth(reportDate) + 12;
          doc.roundedRect(margin + 36, 30, dateWidth, 7, 2, 2, 'F');
          doc.setGState(new doc.GState({ opacity: 1 }));
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(reportDate, margin + 42, 35);

          doc.setTextColor(0, 0, 0);
          yPos = 54;
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

        const statusLabelsMap: Record<string, { label: string; status: 'success' | 'warning' | 'info' | 'muted' }> = {
          DRAFT: { label: 'Draft', status: 'muted' },
          IN_PROGRESS: { label: 'Sedang Dikerjakan', status: 'info' },
          COMPLETED: { label: 'Selesai', status: 'success' },
        };

        // Draw info card
        const infoCardHeight = 42;
        drawCard(margin, yPos, contentWidth, infoCardHeight);

        const colWidth = contentWidth / 3;
        const infoItems = [
          { label: 'Nama Teknisi', value: exportData.shiftInfo.technician },
          { label: 'Cabang', value: exportData.shiftInfo.branch },
          { label: 'Jenis Shift', value: shiftTypeLabels[exportData.shiftInfo.shiftType] || exportData.shiftInfo.shiftType },
          { label: 'Waktu Mulai', value: new Date(exportData.reportInfo.startedAt).toLocaleString('id-ID') },
          { label: 'Waktu Selesai', value: exportData.reportInfo.completedAt ? new Date(exportData.reportInfo.completedAt).toLocaleString('id-ID') : '-' },
        ];

        // First row
        drawInfoRowModern(infoItems[0].label, infoItems[0].value, margin + 8, yPos + 8, colWidth - 16);
        drawInfoRowModern(infoItems[1].label, infoItems[1].value, margin + colWidth + 8, yPos + 8, colWidth - 16);
        drawInfoRowModern(infoItems[2].label, infoItems[2].value, margin + colWidth * 2 + 8, yPos + 8, colWidth - 16);

        // Second row
        drawInfoRowModern(infoItems[3].label, infoItems[3].value, margin + 8, yPos + 24, colWidth - 16);
        drawInfoRowModern(infoItems[4].label, infoItems[4].value, margin + colWidth + 8, yPos + 24, colWidth - 16);

        // Status badge
        const statusInfo = statusLabelsMap[exportData.reportInfo.status] || statusLabelsMap.DRAFT;
        drawStatusBadge(statusInfo.label, margin + colWidth * 2 + 8, yPos + 29, statusInfo.status);

        yPos += infoCardHeight + 10;

        // Server Metrics Section
        drawSectionHeader('KONDISI SERVER');

        if (exportData.serverMetrics) {
          const metrics = exportData.serverMetrics;

          // Metrics card
          const metricsCardHeight = 50;
          drawCard(margin, yPos, contentWidth, metricsCardHeight);

          const metricsData = [
            {
              label: 'CPU Usage',
              value: metrics.cpu.usagePercent?.toFixed(1) || '-',
              unit: '%',
              percent: metrics.cpu.usagePercent || 0,
              status: (metrics.cpu.usagePercent || 0) > 80 ? 'warning' : (metrics.cpu.usagePercent || 0) > 60 ? 'info' : 'success'
            },
            {
              label: 'RAM Usage',
              value: metrics.ram.usagePercent?.toFixed(1) || '-',
              unit: '%',
              percent: metrics.ram.usagePercent || 0,
              status: (metrics.ram.usagePercent || 0) > 80 ? 'warning' : (metrics.ram.usagePercent || 0) > 60 ? 'info' : 'success'
            },
            {
              label: 'Disk Usage',
              value: metrics.disk.usagePercent?.toFixed(1) || '-',
              unit: '%',
              percent: metrics.disk.usagePercent || 0,
              status: (metrics.disk.usagePercent || 0) > 80 ? 'warning' : (metrics.disk.usagePercent || 0) > 60 ? 'info' : 'success'
            },
            {
              label: 'Uptime',
              value: metrics.uptime.days ? `${metrics.uptime.days}` : '-',
              unit: ' hari',
              percent: 100,
              status: 'success'
            },
          ];

          const metricBoxWidth = (contentWidth - 32) / 4;
          metricsData.forEach((metric, index) => {
            const xPos = margin + 8 + (index * (metricBoxWidth + 8));
            const centerX = xPos + metricBoxWidth / 2;

            // Status color mapping
            const statusColors: Record<string, [number, number, number]> = {
              success: colors.success,
              warning: colors.warning,
              info: colors.primaryLight,
            };
            const metricColor = statusColors[metric.status] || colors.success;

            // Draw progress arc for percentage metrics
            if (metric.unit === '%') {
              drawProgressArc(centerX, yPos + 18, 10, metric.percent, metricColor);

              // Value in center
              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...colors.text);
              doc.text(`${metric.value}`, centerX, yPos + 20, { align: 'center' });
              doc.setFontSize(6);
              doc.text('%', centerX + 8, yPos + 20);
            } else {
              // For uptime, show simple display
              doc.setFillColor(...colors.background);
              doc.roundedRect(xPos + 4, yPos + 8, metricBoxWidth - 8, 20, 3, 3, 'F');
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...colors.text);
              doc.text(`${metric.value}`, centerX, yPos + 20, { align: 'center' });
              doc.setFontSize(7);
              doc.setTextColor(...colors.textMuted);
              doc.text('hari', centerX, yPos + 25, { align: 'center' });
            }

            // Label below
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.textMuted);
            doc.text(metric.label, centerX, yPos + 38, { align: 'center' });
          });

          yPos += metricsCardHeight + 10;
        } else {
          // No metrics card
          const noMetricsHeight = 25;
          drawCard(margin, yPos, contentWidth, noMetricsHeight);
          doc.setFontSize(10);
          doc.setTextColor(...colors.textMuted);
          doc.text('Metrik server tidak tersedia', pageWidth / 2, yPos + 15, { align: 'center' });
          yPos += noMetricsHeight + 10;
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
          const categoryHeight = items.length * 10 + (items.filter(i => i.notes).length * 8) + 16;
          checkPageBreak(categoryHeight);

          // Category card
          drawCard(margin, yPos, contentWidth, categoryHeight);

          // Category header with accent
          doc.setFillColor(...colors.primaryLight);
          doc.setGState(new doc.GState({ opacity: 0.1 }));
          doc.roundedRect(margin, yPos, contentWidth, 10, 4, 0, 'F');
          doc.setGState(new doc.GState({ opacity: 1 }));

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.primary);
          doc.text(category, margin + 8, yPos + 7);

          // Item count badge
          const countText = `${items.length} item`;
          const countWidth = doc.getTextWidth(countText) + 8;
          doc.setFillColor(...colors.background);
          doc.roundedRect(pageWidth - margin - countWidth - 8, yPos + 2, countWidth, 6, 2, 2, 'F');
          doc.setFontSize(7);
          doc.setTextColor(...colors.textMuted);
          doc.text(countText, pageWidth - margin - 12, yPos + 6, { align: 'right' });

          let itemY = yPos + 14;

          items.forEach((item) => {
            // Status icon
            if (item.status === 'Selesai') {
              drawCheckIcon(margin + 8, itemY - 3, 5, true);
            } else if (item.status === 'Dilewati') {
              drawSkipIcon(margin + 8, itemY - 3, 5);
            } else {
              drawCheckIcon(margin + 8, itemY - 3, 5, false);
            }

            // Item title
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.text);
            doc.text(item.title, margin + 16, itemY);

            // Required badge
            if (item.isRequired) {
              const titleWidth = doc.getTextWidth(item.title);
              doc.setFillColor(...colors.danger);
              doc.setGState(new doc.GState({ opacity: 0.1 }));
              doc.roundedRect(margin + 18 + titleWidth, itemY - 3, 14, 4.5, 1.5, 1.5, 'F');
              doc.setGState(new doc.GState({ opacity: 1 }));
              doc.setTextColor(...colors.danger);
              doc.setFontSize(6);
              doc.setFont('helvetica', 'bold');
              doc.text('Wajib', margin + 25 + titleWidth, itemY);
            }

            // Status text with color
            doc.setFontSize(7);
            const statusColor = item.status === 'Selesai' ? colors.success :
                               item.status === 'Dilewati' ? colors.textLight : colors.textMuted;
            doc.setTextColor(...statusColor);
            doc.text(item.status, pageWidth - margin - 8, itemY, { align: 'right' });

            itemY += 8;

            // Notes with modern styling
            if (item.notes) {
              doc.setFillColor(254, 249, 195); // Yellow-50
              doc.roundedRect(margin + 14, itemY - 3, contentWidth - 22, 6, 2, 2, 'F');
              doc.setFontSize(7);
              doc.setTextColor(161, 98, 7); // Yellow-700
              doc.text(`Catatan: ${item.notes}`, margin + 17, itemY);
              itemY += 8;
            }
          });

          yPos += categoryHeight + 8;
        });

        // Summary Section
        if (exportData.summary.summary || exportData.summary.handoverNotes || exportData.summary.issuesEncountered || exportData.summary.pendingActions) {
          yPos += 4;
          drawSectionHeader('RINGKASAN & CATATAN');

          const summaryFields = [
            { label: 'Ringkasan Aktivitas', value: exportData.summary.summary, icon: 'clipboard' },
            { label: 'Catatan Serah Terima', value: exportData.summary.handoverNotes, icon: 'handover' },
            { label: 'Masalah yang Ditemui', value: exportData.summary.issuesEncountered, icon: 'warning' },
            { label: 'Tindakan Tertunda', value: exportData.summary.pendingActions, icon: 'pending' },
          ];

          summaryFields.forEach((field) => {
            if (field.value) {
              doc.setFontSize(8);
              const lines = doc.splitTextToSize(field.value, contentWidth - 24);
              const fieldHeight = lines.length * 4 + 18;
              checkPageBreak(fieldHeight);

              // Summary field card
              drawCard(margin, yPos, contentWidth, fieldHeight);

              // Field label with colored indicator
              const indicatorColors: Record<string, [number, number, number]> = {
                clipboard: colors.primary,
                handover: colors.accent,
                warning: colors.warning,
                pending: colors.danger,
              };
              doc.setFillColor(...(indicatorColors[field.icon] || colors.primary));
              doc.roundedRect(margin + 6, yPos + 6, 2, 8, 1, 1, 'F');

              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...colors.text);
              doc.text(field.label, margin + 12, yPos + 11);

              // Content text
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              doc.setTextColor(...colors.textMuted);
              doc.text(lines, margin + 12, yPos + 18);

              yPos += fieldHeight + 6;
            }
          });
        }

        // Modern Footer on all pages
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);

          // Footer background
          doc.setFillColor(...colors.background);
          doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');

          // Footer accent line
          doc.setDrawColor(...colors.primary);
          doc.setLineWidth(0.5);
          doc.line(margin, pageHeight - 20, margin + 30, pageHeight - 20);
          doc.setDrawColor(...colors.border);
          doc.setLineWidth(0.3);
          doc.line(margin + 30, pageHeight - 20, pageWidth - margin, pageHeight - 20);

          // Footer content
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.textMuted);
          doc.text('Bank SulutGo ServiceDesk', margin, pageHeight - 12);
          doc.setFontSize(6);
          doc.text('Laporan Standby', margin, pageHeight - 8);

          // Page number badge
          const pageText = `${i} / ${pageCount}`;
          const pageTextWidth = doc.getTextWidth(pageText) + 8;
          doc.setFillColor(...colors.primary);
          doc.roundedRect(pageWidth / 2 - pageTextWidth / 2, pageHeight - 14, pageTextWidth, 6, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text(pageText, pageWidth / 2, pageHeight - 10, { align: 'center' });

          // Timestamp
          doc.setTextColor(...colors.textLight);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
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
