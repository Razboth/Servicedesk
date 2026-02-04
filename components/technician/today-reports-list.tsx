'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
  Eye,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DailyChecklistStat {
  total: number;
  completed: number;
  status: string;
}

interface TechnicianReport {
  shiftAssignmentId: string;
  reportId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  shiftType: string;
  date: string;
  technician: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  branch: {
    id: string;
    name: string;
    code: string;
  } | null;
  isOwner: boolean;
  canEdit: boolean;
  canDelete: boolean;
  stats: {
    checklist: { total: number; completed: number; skipped: number };
    backup: { total: number; checked: number };
    issues: { total: number; ongoing: number; resolved: number };
    dailyChecklists?: Record<string, DailyChecklistStat>;
  };
  serverMetrics: any;
  issues: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    description: string | null;
  }>;
}

interface TodayReportsListProps {
  currentUserId: string;
  onViewOwnReport?: () => void;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  IN_PROGRESS: { label: 'Sedang Dikerjakan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  COMPLETED: { label: 'Selesai', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
};

const shiftTypeLabels: Record<string, string> = {
  NIGHT_WEEKDAY: 'Malam Weekday',
  DAY_WEEKEND: 'Siang Weekend',
  NIGHT_WEEKEND: 'Malam Weekend',
  STANDBY_ONCALL: 'Standby On-Call',
  STANDBY_BRANCH: 'Standby Cabang',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const dailyChecklistLabels: Record<string, string> = {
  HARIAN: 'Harian',
  SERVER_SIANG: 'Server Siang',
  SERVER_MALAM: 'Server Malam',
  AKHIR_HARI: 'Akhir Hari',
};

export function TodayReportsList({ currentUserId, onViewOwnReport }: TodayReportsListProps) {
  const [reports, setReports] = useState<TechnicianReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<TechnicianReport | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/shifts/today-reports');
      if (!response.ok) throw new Error('Failed to fetch reports');
      const data = await response.json();
      // Filter out own report (shown separately)
      const otherReports = data.data.reports.filter(
        (r: TechnicianReport) => !r.isOwner
      );
      setReports(otherReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Gagal memuat laporan hari ini');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (reportId: string) => {
    setExpandedReports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Laporan Teknisi Lain Hari Ini</CardTitle>
              <CardDescription>
                Belum ada laporan dari teknisi lain hari ini
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Laporan Teknisi Lain Hari Ini</CardTitle>
              <CardDescription>
                {reports.length} laporan dari teknisi lain
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reports.map((report) => {
            const statusInfo = statusLabels[report.status] || statusLabels.DRAFT;
            const isExpanded = expandedReports.has(report.reportId);
            const checklistProgress = report.stats.checklist.total > 0
              ? Math.round(
                  ((report.stats.checklist.completed + report.stats.checklist.skipped) /
                    report.stats.checklist.total) *
                    100
                )
              : 0;

            return (
              <div
                key={report.reportId}
                className="border rounded-lg overflow-hidden"
              >
                {/* Report header - clickable */}
                <button
                  onClick={() => toggleExpand(report.reportId)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(report.technician.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-sm">{report.technician.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.branch?.name || '-'} • {shiftTypeLabels[report.shiftType] || report.shiftType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.stats.issues.ongoing > 0 && (
                      <Badge variant="destructive" className="text-[10px] h-5">
                        {report.stats.issues.ongoing} masalah
                      </Badge>
                    )}
                    <Badge className={cn('text-xs', statusInfo.color)}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                </button>

                {/* Collapsed summary - show quick stats */}
                {!isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {/* Daily Checklists */}
                      {report.stats.dailyChecklists && Object.entries(report.stats.dailyChecklists).map(([type, stat]) => {
                        const progress = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                        return (
                          <div key={type} className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{dailyChecklistLabels[type] || type}: <span className={cn("font-medium", progress > 0 ? "text-foreground" : "text-muted-foreground")}>{progress}%</span></span>
                          </div>
                        );
                      })}
                      {/* Fallback to legacy checklist if no daily checklists */}
                      {(!report.stats.dailyChecklists || Object.keys(report.stats.dailyChecklists).length === 0) && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Checklist: <span className={cn("font-medium", checklistProgress > 0 ? "text-foreground" : "text-muted-foreground")}>{checklistProgress}%</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                    {/* Daily Checklists Progress */}
                    {report.stats.dailyChecklists && Object.keys(report.stats.dailyChecklists).length > 0 && (
                      <div className="pt-3 space-y-3">
                        {Object.entries(report.stats.dailyChecklists).map(([type, stat]) => {
                          const progress = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                          return (
                            <div key={type} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5" /> {dailyChecklistLabels[type] || type}
                                </span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <Progress
                                value={progress}
                                className={cn(
                                  "h-2.5",
                                  progress === 0 && "[&>div]:bg-muted"
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Fallback to legacy checklist if no daily checklists */}
                    {(!report.stats.dailyChecklists || Object.keys(report.stats.dailyChecklists).length === 0) && (
                      <div className="pt-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" /> Checklist
                            </span>
                            <span className="font-medium">{checklistProgress}%</span>
                          </div>
                          <Progress
                            value={checklistProgress}
                            className={cn(
                              "h-2.5",
                              checklistProgress === 0 && "[&>div]:bg-muted"
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {/* Issues section */}
                    {report.issues.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Masalah yang Dilaporkan:
                        </p>
                        <div className="space-y-1">
                          {report.issues.map((issue) => (
                            <div
                              key={issue.id}
                              className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
                            >
                              <div className="flex items-center gap-2">
                                {issue.status === 'ONGOING' ? (
                                  <Clock className="h-3 w-3 text-orange-500" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                )}
                                <span>{issue.title}</span>
                              </div>
                              <Badge className={cn('text-[10px] h-4 px-1', priorityColors[issue.priority])}>
                                {issue.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes preview */}
                    {report.notes && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Catatan:</p>
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded line-clamp-2">
                          {report.notes}
                        </p>
                      </div>
                    )}

                    {/* View details button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={() => setSelectedReport(report)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Lihat Detail
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {selectedReport && getInitials(selectedReport.technician.name)}
                </AvatarFallback>
              </Avatar>
              Laporan {selectedReport?.technician.name}
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.branch?.name || '-'} • {selectedReport && (shiftTypeLabels[selectedReport.shiftType] || selectedReport.shiftType)}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={statusLabels[selectedReport.status]?.color}>
                  {statusLabels[selectedReport.status]?.label}
                </Badge>
              </div>

              {/* Daily Checklists Progress */}
              {selectedReport.stats.dailyChecklists && Object.keys(selectedReport.stats.dailyChecklists).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Progress Checklist</h4>
                  {Object.entries(selectedReport.stats.dailyChecklists).map(([type, stat]) => {
                    const progress = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {dailyChecklistLabels[type] || type}
                          </span>
                          <span className="font-medium">
                            {stat.completed}/{stat.total}
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fallback to legacy checklist if no daily checklists */}
              {(!selectedReport.stats.dailyChecklists || Object.keys(selectedReport.stats.dailyChecklists).length === 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Progress Checklist
                    </span>
                    <span className="font-medium">
                      {selectedReport.stats.checklist.completed + selectedReport.stats.checklist.skipped}/
                      {selectedReport.stats.checklist.total}
                    </span>
                  </div>
                  <Progress
                    value={
                      selectedReport.stats.checklist.total > 0
                        ? ((selectedReport.stats.checklist.completed + selectedReport.stats.checklist.skipped) /
                            selectedReport.stats.checklist.total) *
                          100
                        : 0
                    }
                    className="h-3"
                  />
                </div>
              )}

              {/* Issues */}
              {selectedReport.issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Masalah ({selectedReport.stats.issues.total})
                  </h4>
                  <div className="space-y-2">
                    {selectedReport.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className={cn(
                          'p-3 rounded-lg border',
                          issue.status === 'RESOLVED' ? 'bg-muted/30' : 'bg-background'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {issue.status === 'ONGOING' ? (
                              <Clock className="h-4 w-4 text-orange-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            <span className="font-medium text-sm">{issue.title}</span>
                          </div>
                          <Badge className={cn('text-xs', priorityColors[issue.priority])}>
                            {issue.priority}
                          </Badge>
                        </div>
                        {issue.description && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">
                            {issue.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedReport.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Catatan</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                    {selectedReport.notes}
                  </p>
                </div>
              )}

              {/* Read-only notice */}
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Anda hanya dapat melihat laporan ini. Hanya pembuat yang dapat mengedit.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
