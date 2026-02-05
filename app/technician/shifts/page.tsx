'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  Moon,
  Sun,
  Coffee,
  AlertTriangle,
  Building,
  Loader2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Download,
  FileSpreadsheet,
  ClipboardList,
  ServerCog,
  CheckCircle2,
  MessageSquare,
  Users,
  UserCheck,
  CircleDot,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ChecklistPanel } from '@/components/technician/checklist-panel';
import { CollapsibleSection } from '@/components/technician/collapsible-section';
import { ShiftIssues, ShiftIssue } from '@/components/technician/shift-issues';
import { PendingIssuesAlert } from '@/components/technician/pending-issues-alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type DailyChecklistType =
  | 'HARIAN'
  | 'SERVER_SIANG'
  | 'SERVER_MALAM'
  | 'AKHIR_HARI'
  | 'OPS_SIANG'
  | 'OPS_MALAM'
  | 'MONITORING_SIANG'
  | 'MONITORING_MALAM';

interface ShiftAssignment {
  id: string;
  date: string;
  shiftType: string;
  schedule: {
    month: number;
    year: number;
    status: string;
  };
  staffProfile: {
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface MonthlySchedule {
  id: string;
  month: number;
  year: number;
  status: string;
  shiftAssignments: ShiftAssignment[];
}

interface ChecklistStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  skipped: number;
  locked: number;
}

const shiftTypeConfig = {
  NIGHT_WEEKDAY: { label: 'Malam Weekday', icon: Moon, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300', description: '20:00-07:59 (Hari Kerja)', timeRange: '20:00 - 07:59' },
  DAY_WEEKEND: { label: 'Siang Weekend', icon: Sun, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', description: '08:00-19:00 (Akhir Pekan/Libur)', timeRange: '08:00 - 19:00' },
  NIGHT_WEEKEND: { label: 'Malam Weekend', icon: Moon, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', description: '20:00-07:59 (Akhir Pekan/Libur)', timeRange: '20:00 - 07:59' },
  STANDBY_ONCALL: { label: 'Standby On-Call', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', description: 'Siaga On-Call', timeRange: 'On-Call' },
  STANDBY_BRANCH: { label: 'Standby Cabang', icon: Building, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', description: 'Siaga Operasional Cabang', timeRange: '08:00 - 19:00' },
  OFF: { label: 'Libur', icon: Coffee, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', description: 'Hari Libur', timeRange: '-' },
  LEAVE: { label: 'Cuti', icon: Calendar, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', description: 'Sedang Cuti', timeRange: '-' },
  HOLIDAY: { label: 'Libur Nasional', icon: Calendar, color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', description: 'Hari Libur Nasional', timeRange: '-' },
};

const checklistTypeConfig: Record<DailyChecklistType, { label: string; icon: typeof ClipboardList }> = {
  HARIAN: { label: 'Harian', icon: ClipboardList },
  SERVER_SIANG: { label: 'Server Siang', icon: ServerCog },
  SERVER_MALAM: { label: 'Server Malam', icon: ServerCog },
  AKHIR_HARI: { label: 'Akhir Hari', icon: CheckCircle2 },
  OPS_SIANG: { label: 'Ops Siang', icon: ClipboardList },
  OPS_MALAM: { label: 'Ops Malam', icon: ClipboardList },
  MONITORING_SIANG: { label: 'Monitoring Siang', icon: ServerCog },
  MONITORING_MALAM: { label: 'Monitoring Malam', icon: ServerCog },
};

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function TechnicianShiftsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [todayShift, setTodayShift] = useState<ShiftAssignment | null>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftAssignment[]>([]);
  const [monthlySchedule, setMonthlySchedule] = useState<MonthlySchedule | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [availableChecklistTypes, setAvailableChecklistTypes] = useState<DailyChecklistType[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [checklistStats, setChecklistStats] = useState<Record<DailyChecklistType, ChecklistStats | null>>({
    HARIAN: null,
    SERVER_SIANG: null,
    SERVER_MALAM: null,
    AKHIR_HARI: null,
    OPS_SIANG: null,
    OPS_MALAM: null,
    MONITORING_SIANG: null,
    MONITORING_MALAM: null,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [hasServerAccess, setHasServerAccess] = useState(false);

  // Today's shift statistics
  const [todayStats, setTodayStats] = useState<{
    serverTime: {
      isDayTime: boolean;
      isNightTime: boolean;
    };
    operationalShifts: {
      today: { id: string; shiftType: string; staffName: string; staffId: string; hasServerAccess?: boolean }[];
      activeNight: { id: string; shiftType: string; staffName: string; staffId: string; hasServerAccess?: boolean; fromYesterday: boolean }[];
    };
    assignedFor: {
      ops: {
        type: string;
        staff: { id: string; name: string; shiftType: string; hasServerAccess: boolean }[];
      };
      monitoring: {
        type: string;
        staff: { id: string; name: string; shiftType: string }[];
        additionalServerAccess: { id: string; name: string }[];
      };
    };
    checklistStatus: Record<string, {
      date: string;
      claimed: boolean;
      claims: { userId: string; userName: string; status: string; progress: number; completedItems: number; totalItems: number }[];
    }>;
  } | null>(null);

  // Report data
  const [reportData, setReportData] = useState<{
    report: { id: string; status: string; notes: string | null };
    issues: ShiftIssue[];
    ongoingIssues: ShiftIssue[];
    resolvedIssues: ShiftIssue[];
  } | null>(null);
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Check if user has an active working shift (not OFF, LEAVE, or HOLIDAY)
  const hasActiveShift = todayShift && !['OFF', 'LEAVE', 'HOLIDAY'].includes(todayShift.shiftType);

  useEffect(() => {
    fetchMySchedule();
    fetchTodayStats();
  }, []);

  const fetchTodayStats = async () => {
    try {
      const response = await fetch('/api/shifts/today-stats');
      if (response.ok) {
        const data = await response.json();
        setTodayStats({
          serverTime: data.serverTime,
          operationalShifts: data.operationalShifts,
          assignedFor: data.assignedFor,
          checklistStatus: data.checklistStatus,
        });
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  useEffect(() => {
    if (userBranchId) {
      fetchMonthlySchedule();
    }
  }, [selectedMonth, selectedYear, userBranchId]);

  // Determine available checklist types when page loads
  // This runs for users with active shift OR users with server access (User E)
  useEffect(() => {
    if (!loading) {
      determineAvailableTypes();
    }
  }, [loading]);

  // Fetch report data when shift is loaded
  useEffect(() => {
    if (todayShift && hasActiveShift) {
      fetchReportData();
    }
  }, [todayShift, hasActiveShift]);

  const fetchMySchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shifts/my-schedule');
      if (!response.ok) throw new Error('Failed to fetch schedule');

      const data = await response.json();
      setTodayShift(data.data.todayShift);
      setUpcomingShifts(data.data.upcomingShifts || []);

      if (data.data.branchId) {
        setUserBranchId(data.data.branchId);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Gagal memuat jadwal shift Anda');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySchedule = async () => {
    if (!userBranchId) return;

    try {
      const url = `/api/shifts/schedules?branchId=${userBranchId}&month=${selectedMonth}&year=${selectedYear}&status=PUBLISHED`;
      const response = await fetch(url);

      if (!response.ok) {
        setMonthlySchedule(null);
        return;
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const schedule = data.data[0];
        const assignmentsResponse = await fetch(
          `/api/shifts/schedules/${schedule.id}/assignments`
        );

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          setMonthlySchedule({
            ...schedule,
            shiftAssignments: assignmentsData.data,
          });
        }
      } else {
        setMonthlySchedule(null);
      }
    } catch (error) {
      console.error('Error fetching monthly schedule:', error);
    }
  };

  const determineAvailableTypes = async () => {
    try {
      // Try different checklist types in parallel to see what the user can access
      const checklistTypesToTry: DailyChecklistType[] = [
        'HARIAN',
        'AKHIR_HARI',
        'MONITORING_SIANG',
        'MONITORING_MALAM',
        'OPS_SIANG',
        'OPS_MALAM',
        'SERVER_SIANG',
        'SERVER_MALAM',
      ];

      const results = await Promise.all(
        checklistTypesToTry.map(async (type) => {
          try {
            const response = await fetch(`/api/server-checklist?type=${type}`);
            if (response.ok) {
              const data = await response.json();
              return { type, success: true, data };
            }
            return { type, success: false, data: null };
          } catch {
            return { type, success: false, data: null };
          }
        })
      );

      const types: DailyChecklistType[] = [];
      let serverAccessFlag = false;

      // HARIAN and AKHIR_HARI go together
      const harianResult = results.find(r => r.type === 'HARIAN');
      if (harianResult?.success) {
        types.push('HARIAN', 'AKHIR_HARI');
        if (harianResult.data?.shiftInfo?.hasServerAccess !== undefined) {
          serverAccessFlag = harianResult.data.shiftInfo.hasServerAccess;
        }
      }

      // Add other successful types
      for (const result of results) {
        if (result.success && result.type !== 'HARIAN' && result.type !== 'AKHIR_HARI') {
          types.push(result.type);
          if (result.data?.shiftInfo?.hasServerAccess !== undefined) {
            serverAccessFlag = result.data.shiftInfo.hasServerAccess;
          }
        }
      }

      setHasServerAccess(serverAccessFlag);
      setAvailableChecklistTypes(types);
      if (types.length > 0 && !activeTab) {
        setActiveTab(types[0].toLowerCase().replace('_', '-'));
      }
    } catch (error) {
      console.error('Error determining available checklist types:', error);
    }
  };

  const fetchReportData = async () => {
    if (!todayShift) return;
    try {
      const response = await fetch(`/api/shifts/${todayShift.id}/report`);
      if (!response.ok) return;
      const data = await response.json();
      setReportData(data.data);
      setNotes(data.data.report.notes || '');
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const handleStatsUpdate = useCallback((type: DailyChecklistType, stats: ChecklistStats | null) => {
    setChecklistStats(prev => ({
      ...prev,
      [type]: stats,
    }));
  }, []);

  // Calculate overall progress across all checklists
  const calculateOverallProgress = () => {
    let totalItems = 0;
    let completedItems = 0;

    Object.values(checklistStats).forEach(stats => {
      if (stats) {
        totalItems += stats.total;
        completedItems += stats.completed + stats.skipped;
      }
    });

    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const handleCreateIssue = async (issue: { title: string; description?: string; priority?: string; ticketNumber?: string }) => {
    if (!todayShift) return;
    try {
      setIsUpdatingReport(true);
      const response = await fetch(`/api/shifts/${todayShift.id}/report/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue),
      });
      if (!response.ok) throw new Error('Failed to create issue');
      await fetchReportData();
      toast.success('Masalah berhasil ditambahkan');
    } catch (error) {
      console.error('Error creating issue:', error);
      toast.error('Gagal menambahkan masalah');
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleUpdateIssue = async (issue: { id: string; title?: string; description?: string; status?: string; priority?: string; resolution?: string; ticketNumber?: string }) => {
    if (!todayShift) return;
    try {
      setIsUpdatingReport(true);
      const response = await fetch(`/api/shifts/${todayShift.id}/report/issues`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issue),
      });
      if (!response.ok) throw new Error('Failed to update issue');
      await fetchReportData();
      toast.success('Masalah berhasil diperbarui');
    } catch (error) {
      console.error('Error updating issue:', error);
      toast.error('Gagal memperbarui masalah');
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!todayShift) return;
    try {
      setIsUpdatingReport(true);
      const response = await fetch(`/api/shifts/${todayShift.id}/report/issues?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete issue');
      await fetchReportData();
      toast.success('Masalah berhasil dihapus');
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Gagal menghapus masalah');
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!todayShift) return;
    try {
      setIsUpdatingReport(true);
      const response = await fetch(`/api/shifts/${todayShift.id}/report`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to save notes');
      setIsEditingNotes(false);
      toast.success('Catatan berhasil disimpan');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Gagal menyimpan catatan');
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!todayShift) return;

    try {
      setIsExporting(true);
      const response = await fetch(
        `/api/shifts/${todayShift.id}/report/export?format=${format}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export report');
      }

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

        const dateStr = new Date(todayShift.date).toISOString().split('T')[0];
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
        doc.text('LAPORAN SHIFT OPERASIONAL', margin + 28, yPos + 8);

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

        // Daily Checklists
        if (exportData.dailyChecklists && exportData.dailyChecklists.length > 0) {
          exportData.dailyChecklists.forEach((dailyChecklist: {
            type: string;
            typeLabel: string;
            status: string;
            items: { title: string; status: string; isRequired: boolean; unlockTime?: string | null }[];
            stats: { total: number; completed: number };
          }) => {
            drawSectionHeader(dailyChecklist.typeLabel.toUpperCase());
            const dailyProgress = dailyChecklist.stats.total > 0
              ? Math.round((dailyChecklist.stats.completed / dailyChecklist.stats.total) * 100)
              : 0;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...colors.gray);
            doc.text(`Progress: ${dailyProgress}% (${dailyChecklist.stats.completed}/${dailyChecklist.stats.total})`, margin, yPos);
            yPos += 6;

            dailyChecklist.items.forEach((item) => {
              checkPageBreak(10);
              doc.setFontSize(9);
              let statusSymbol = '[ ]';
              if (item.status === 'Selesai') statusSymbol = '[v]';
              else if (item.status === 'Dilewati') statusSymbol = '[-]';
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...colors.darkGray);
              doc.text(statusSymbol, margin, yPos);
              let titleText = item.title;
              if (item.unlockTime) titleText = `[${item.unlockTime}] ${titleText}`;
              if (item.isRequired) titleText += ' *';
              const lines = doc.splitTextToSize(titleText, contentWidth - 15);
              doc.text(lines, margin + 10, yPos);
              yPos += lines.length * 4 + 2;
            });
            yPos += 5;
          });
        }

        // Summary
        if (exportData.summary) {
          const { summary, handoverNotes, issuesEncountered, pendingActions } = exportData.summary;
          if (summary || handoverNotes || issuesEncountered || pendingActions) {
            drawSectionHeader('RINGKASAN');
            const summaryItems = [
              { label: 'Ringkasan', value: summary },
              { label: 'Catatan Serah Terima', value: handoverNotes },
              { label: 'Masalah', value: issuesEncountered },
              { label: 'Tindakan Tertunda', value: pendingActions },
            ].filter(item => item.value);

            summaryItems.forEach((item) => {
              checkPageBreak(15);
              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(...colors.gray);
              doc.text(item.label + ':', margin, yPos);
              yPos += 5;
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...colors.darkGray);
              const lines = doc.splitTextToSize(item.value || '-', contentWidth);
              doc.text(lines, margin, yPos);
              yPos += lines.length * 4 + 3;
            });
          }
        }

        // Notes
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
          doc.text('Bank SulutGo ServiceDesk - Laporan Shift Operasional', margin, pageHeight - 12);
          doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
          doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
        }

        const dateStr = new Date(todayShift.date).toISOString().split('T')[0];
        doc.save(`Laporan_Shift_Operasional_${dateStr}.pdf`);
        toast.success('File PDF berhasil diunduh');
      }
    } catch (error: unknown) {
      console.error('Error exporting report:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal mengekspor laporan');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const datePart = dateString.split('T')[0];
    const date = new Date(datePart + 'T00:00:00');
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDayOfWeek = (dateString: string) => {
    const datePart = dateString.split('T')[0];
    const date = new Date(datePart + 'T00:00:00');
    return dayNames[date.getDay()];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    if (!monthlySchedule) {
      return (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Tidak ada jadwal terpublikasi untuk {monthNames[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
      );
    }

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();

    const assignmentsByDate: Record<string, ShiftAssignment[]> = {};
    monthlySchedule.shiftAssignments.forEach(assignment => {
      const dateKey = assignment.date.split('T')[0];
      if (!assignmentsByDate[dateKey]) {
        assignmentsByDate[dateKey] = [];
      }
      assignmentsByDate[dateKey].push(assignment);
    });

    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-center font-semibold text-xs text-gray-600 dark:text-gray-400 p-1">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="p-1" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayAssignments = assignmentsByDate[dateStr] || [];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isWeekend = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0 ||
                            new Date(selectedYear, selectedMonth - 1, day).getDay() === 6;

            const assignmentsByType: Record<string, ShiftAssignment[]> = {};
            dayAssignments.forEach(assignment => {
              if (!assignmentsByType[assignment.shiftType]) {
                assignmentsByType[assignment.shiftType] = [];
              }
              assignmentsByType[assignment.shiftType].push(assignment);
            });

            return (
              <div
                key={day}
                className={`
                  min-h-28 p-2 border rounded text-xs overflow-hidden
                  ${isWeekend ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}
                  ${isToday ? 'border-blue-500 border-2' : 'border-gray-200 dark:border-gray-700'}
                `}
              >
                <div className={`font-bold text-sm mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {Object.entries(assignmentsByType).slice(0, 3).map(([shiftType, assignments]) => {
                    const config = shiftTypeConfig[shiftType as keyof typeof shiftTypeConfig];
                    return (
                      <div key={shiftType} className={`p-1 rounded text-[10px] ${config?.color || ''}`}>
                        <div className="font-semibold truncate">{config?.label || shiftType}</div>
                        {assignments.slice(0, 2).map((assignment) => {
                          const isCurrentUser = assignment.staffProfile.user.id === session?.user?.id;
                          return (
                            <div
                              key={assignment.id}
                              className={`truncate ${isCurrentUser ? 'font-bold' : ''}`}
                            >
                              {assignment.staffProfile.user.name.split(' ')[0]}
                              {isCurrentUser && ' (Anda)'}
                            </div>
                          );
                        })}
                        {assignments.length > 2 && (
                          <div className="text-[9px] opacity-75">+{assignments.length - 2} lagi</div>
                        )}
                      </div>
                    );
                  })}
                  {Object.keys(assignmentsByType).length > 3 && (
                    <div className="text-[9px] text-muted-foreground">
                      +{Object.keys(assignmentsByType).length - 3} shift lain
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    if (!monthlySchedule) return null;

    const assignmentsByStaff: Record<string, { name: string; email: string; shifts: ShiftAssignment[] }> = {};

    monthlySchedule.shiftAssignments.forEach(assignment => {
      const staffId = assignment.staffProfile.user.id;
      if (!assignmentsByStaff[staffId]) {
        assignmentsByStaff[staffId] = {
          name: assignment.staffProfile.user.name,
          email: assignment.staffProfile.user.email,
          shifts: [],
        };
      }
      assignmentsByStaff[staffId].shifts.push(assignment);
    });

    const sortedStaff = Object.entries(assignmentsByStaff).sort((a, b) =>
      a[1].name.localeCompare(b[1].name)
    );

    return (
      <div className="space-y-2">
        {sortedStaff.map(([staffId, staffData]) => {
          const isCurrentUser = staffId === session?.user?.id;
          const sortedShifts = staffData.shifts.sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          return (
            <div
              key={staffId}
              className={`border rounded-lg p-3 ${
                isCurrentUser
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-sm">
                    {staffData.name}
                    {isCurrentUser && <span className="ml-2 text-blue-600 dark:text-blue-400">(Anda)</span>}
                  </h3>
                </div>
                <Badge variant="outline" className="text-xs">{sortedShifts.length} shift</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {sortedShifts.slice(0, 6).map(shift => {
                  const config = shiftTypeConfig[shift.shiftType as keyof typeof shiftTypeConfig];
                  const datePart = shift.date.split('T')[0];
                  const date = new Date(datePart + 'T00:00:00');

                  return (
                    <div
                      key={shift.id}
                      className={`text-xs px-2 py-1 rounded ${config?.color || ''}`}
                    >
                      {date.getDate()}: {config?.label || shift.shiftType}
                    </div>
                  );
                })}
                {sortedShifts.length > 6 && (
                  <div className="text-xs px-2 py-1 text-muted-foreground">
                    +{sortedShifts.length - 6} lagi
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header with Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Shift Saya</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        {hasActiveShift && todayShift && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Today's Shift Statistics - 3 Separate Cards */}
      {todayStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Card 1: Active Shifts - Informational/Reference */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-slate-500" />
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <span>Shift Aktif</span>
                <Badge variant="outline" className="ml-auto text-xs font-mono">
                  {todayStats.serverTime.isDayTime ? 'Siang' : 'Malam'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {[...todayStats.operationalShifts.today, ...todayStats.operationalShifts.activeNight].length > 0 ? (
                  [...todayStats.operationalShifts.today, ...todayStats.operationalShifts.activeNight].map((shift) => {
                    const config = shiftTypeConfig[shift.shiftType as keyof typeof shiftTypeConfig];
                    return (
                      <div
                        key={shift.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors"
                      >
                        <Badge variant="secondary" className={`text-xs shrink-0 ${config?.color || ''}`}>
                          {config?.label || shift.shiftType}
                        </Badge>
                        <span className="text-sm truncate flex-1">{shift.staffName}</span>
                        {shift.hasServerAccess && (
                          <ServerCog className="h-3.5 w-3.5 text-blue-500 shrink-0" title="Server Access" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-muted-foreground italic py-2">
                    Tidak ada shift aktif
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: OPS Checklist - Simple claim status */}
          {(() => {
            const opsType = todayStats.assignedFor.ops.type;
            const status = todayStats.checklistStatus[opsType];
            const claim = status?.claims?.[0];

            const isCompleted = claim?.status === 'COMPLETED';
            const isInProgress = claim && !isCompleted;

            return (
              <Card className={`relative overflow-hidden transition-all duration-200 ${
                isCompleted ? 'ring-1 ring-green-500/30 bg-green-50/30 dark:bg-green-950/20' :
                isInProgress ? 'ring-1 ring-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20' :
                'ring-1 ring-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20'
              }`}>
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  isCompleted ? 'bg-green-500' :
                  isInProgress ? 'bg-blue-500' :
                  'bg-amber-500'
                }`} />

                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${
                      isCompleted ? 'bg-green-100 dark:bg-green-900' :
                      isInProgress ? 'bg-blue-100 dark:bg-blue-900' :
                      'bg-amber-100 dark:bg-amber-900'
                    }`}>
                      <ClipboardList className={`h-4 w-4 ${
                        isCompleted ? 'text-green-600 dark:text-green-400' :
                        isInProgress ? 'text-blue-600 dark:text-blue-400' :
                        'text-amber-600 dark:text-amber-400'
                      }`} />
                    </div>
                    <span>{opsType.replace('_', ' ')}</span>
                    {isCompleted && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-2">
                  {claim ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <CircleDot className="h-4 w-4 text-blue-600 shrink-0" />
                        )}
                        <span className="text-base font-semibold">{claim.userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${claim.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono tabular-nums min-w-[3ch]">
                          {claim.progress}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Circle className="h-4 w-4" />
                      <span className="text-sm font-medium">Belum diklaim</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Card 3: MONITORING Checklist - Simple claim status */}
          {(() => {
            const monitorType = todayStats.assignedFor.monitoring.type;
            const status = todayStats.checklistStatus[monitorType];
            const claim = status?.claims?.[0];

            const isCompleted = claim?.status === 'COMPLETED';
            const isInProgress = claim && !isCompleted;

            return (
              <Card className={`relative overflow-hidden transition-all duration-200 ${
                isCompleted ? 'ring-1 ring-green-500/30 bg-green-50/30 dark:bg-green-950/20' :
                isInProgress ? 'ring-1 ring-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20' :
                'ring-1 ring-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20'
              }`}>
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  isCompleted ? 'bg-green-500' :
                  isInProgress ? 'bg-blue-500' :
                  'bg-amber-500'
                }`} />

                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${
                      isCompleted ? 'bg-green-100 dark:bg-green-900' :
                      isInProgress ? 'bg-blue-100 dark:bg-blue-900' :
                      'bg-amber-100 dark:bg-amber-900'
                    }`}>
                      <ServerCog className={`h-4 w-4 ${
                        isCompleted ? 'text-green-600 dark:text-green-400' :
                        isInProgress ? 'text-blue-600 dark:text-blue-400' :
                        'text-amber-600 dark:text-amber-400'
                      }`} />
                    </div>
                    <span>{monitorType.replace('_', ' ')}</span>
                    {isCompleted && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-2">
                  {claim ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <CircleDot className="h-4 w-4 text-blue-600 shrink-0" />
                        )}
                        <span className="text-base font-semibold">{claim.userName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${claim.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono tabular-nums min-w-[3ch]">
                          {claim.progress}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Circle className="h-4 w-4" />
                      <span className="text-sm font-medium">Belum diklaim</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Shift Status Card */}
      <Card>
        <CardContent className="p-5">
          {todayShift ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const config = shiftTypeConfig[todayShift.shiftType as keyof typeof shiftTypeConfig];
                    const Icon = config?.icon;
                    return (
                      <>
                        <div className={`p-3 rounded-lg ${config?.color}`}>
                          {Icon && <Icon className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={config?.color}>{config?.label}</Badge>
                            {hasActiveShift && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Aktif
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {config?.timeRange}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Overall Progress */}
              {availableChecklistTypes.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress Keseluruhan</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              )}
            </div>
          ) : hasServerAccess && availableChecklistTypes.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  <ServerCog className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Staff Server Access
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Anda dapat mengakses Checklist Monitoring
                  </p>
                </div>
              </div>
              {/* Overall Progress */}
              {availableChecklistTypes.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress Keseluruhan</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Coffee className="h-6 w-6" />
              <p>Tidak ada shift yang ditugaskan untuk hari ini</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist Tabs - Main Area */}
      {/* Shows for users with active shift OR users with server access (User E) */}
      {availableChecklistTypes.length > 0 && (
        <Card>
          <CardHeader className="px-5 pt-5 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Checklist Harian
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Compact Pill-Style Tabs */}
              <div className="flex flex-wrap gap-2 mt-2 mb-5 p-1 bg-muted/50 rounded-lg">
                {availableChecklistTypes.map((type) => {
                  const config = checklistTypeConfig[type];
                  const stats = checklistStats[type];
                  const progress = stats && stats.total > 0
                    ? Math.round(((stats.completed + stats.skipped) / stats.total) * 100)
                    : 0;
                  const isComplete = stats && stats.total > 0 && progress === 100;
                  const isActive = activeTab === type.toLowerCase().replace('_', '-');

                  return (
                    <button
                      key={type}
                      onClick={() => setActiveTab(type.toLowerCase().replace('_', '-'))}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                        ${isActive
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }
                      `}
                    >
                      {isComplete && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      )}
                      <span>{config.label}</span>
                      {stats && stats.total > 0 && (
                        <span className={`
                          text-xs tabular-nums px-1.5 py-0.5 rounded
                          ${isActive
                            ? isComplete
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                              : 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          {progress}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              {availableChecklistTypes.map((type) => (
                <TabsContent key={type} value={type.toLowerCase().replace('_', '-')} className="mt-0">
                  <ChecklistPanel type={type} onStatsUpdate={handleStatsUpdate} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Info when no active shift and no available checklists */}
      {!hasActiveShift && availableChecklistTypes.length === 0 && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Info:</strong> Tidak ada checklist yang tersedia untuk Anda saat ini.
                {todayShift ? (
                  <span> Shift Anda: <strong>{shiftTypeConfig[todayShift.shiftType as keyof typeof shiftTypeConfig]?.label || todayShift.shiftType}</strong></span>
                ) : (
                  <span> Anda tidak memiliki shift yang ditugaskan hari ini.</span>
                )}
                {!hasServerAccess && (
                  <span> Hubungi admin jika Anda seharusnya memiliki akses checklist.</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Issues & Notes - Collapsible */}
      {hasActiveShift && reportData && (
        <CollapsibleSection
          title="Masalah & Catatan"
          icon={<MessageSquare className="h-4 w-4" />}
          badge={reportData.ongoingIssues.length > 0 ? `${reportData.ongoingIssues.length} aktif` : undefined}
          badgeVariant={reportData.ongoingIssues.length > 0 ? 'destructive' : 'secondary'}
          defaultOpen={reportData.ongoingIssues.length > 0}
        >
          <div className="space-y-4">
            <PendingIssuesAlert onAddIssue={handleCreateIssue} />
            <ShiftIssues
              ongoingIssues={reportData.ongoingIssues}
              resolvedIssues={reportData.resolvedIssues}
              onCreateIssue={handleCreateIssue}
              onUpdateIssue={handleUpdateIssue}
              onDeleteIssue={handleDeleteIssue}
              isLoading={isUpdatingReport}
              readOnly={reportData.report.status === 'COMPLETED'}
            />

            {/* Notes Section */}
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-sm font-medium">Catatan Umum</Label>
              {isEditingNotes || !notes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tulis catatan untuk shift ini..."
                    className="min-h-[80px]"
                    disabled={reportData.report.status === 'COMPLETED'}
                  />
                  {reportData.report.status !== 'COMPLETED' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNotes} disabled={isUpdatingReport}>
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
                  className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted text-sm"
                  onClick={() => reportData.report.status !== 'COMPLETED' && setIsEditingNotes(true)}
                >
                  {notes}
                </div>
              )}
            </div>
          </div>
        </CollapsibleSection>
      )}

      {/* Upcoming Shifts - Collapsible */}
      <CollapsibleSection
        title="Shift Mendatang"
        icon={<Clock className="h-4 w-4" />}
        badge={upcomingShifts.length > 0 ? `${upcomingShifts.length} shift` : undefined}
        defaultOpen={false}
      >
        {upcomingShifts.length > 0 ? (
          <div className="space-y-2">
            {upcomingShifts.map(shift => {
              const config = shiftTypeConfig[shift.shiftType as keyof typeof shiftTypeConfig];
              const Icon = config?.icon;
              return (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {Icon && (
                      <div className={`p-1.5 rounded ${config?.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{config?.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(shift.date)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{getDayOfWeek(shift.date)}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Tidak ada shift dalam 7 hari ke depan
          </p>
        )}
      </CollapsibleSection>

      {/* Monthly Calendar - Collapsible */}
      <CollapsibleSection
        title="Jadwal Bulanan"
        icon={<Calendar className="h-4 w-4" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('calendar')}
                className={viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : ''}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-primary text-primary-foreground' : ''}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[140px] text-center">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {viewMode === 'calendar' ? renderCalendar() : renderListView()}
        </div>
      </CollapsibleSection>
    </div>
  );
}
