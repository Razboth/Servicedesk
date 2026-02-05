'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  RefreshCw,
  Download,
  Loader2,
  HardDrive,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface StorageAlert {
  serverId: string;
  ipAddress: string;
  serverName: string | null;
  partition: string;
  usagePercent: number;
}

export interface ServerMetricsData {
  fetchedAt: string;
  stats: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    avgCpu: number | null;
    avgMemory: number | null;
  };
  storageAlerts: StorageAlert[];
  pdfGenerated?: boolean;
  pdfGeneratedAt?: string;
}

interface ServerMetricsInputProps {
  value?: ServerMetricsData;
  onChange: (data: ServerMetricsData) => void;
  onSubmit?: (data: ServerMetricsData) => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

function getStorageStatusColor(usage: number): string {
  if (usage >= 95) return 'text-red-600';
  if (usage >= 90) return 'text-orange-600';
  return 'text-yellow-600';
}

function getStorageBadgeVariant(usage: number): 'destructive' | 'secondary' | 'outline' {
  if (usage >= 95) return 'destructive';
  if (usage >= 90) return 'secondary';
  return 'outline';
}

export function ServerMetricsInput({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  isLoading = false,
}: ServerMetricsInputProps) {
  const [data, setData] = useState<ServerMetricsData | null>(value || null);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (value) {
      setData(value);
    }
  }, [value]);

  // Auto-fetch on mount if no data
  useEffect(() => {
    if (!data && !readOnly) {
      fetchServerMetrics();
    }
  }, []);

  const fetchServerMetrics = async () => {
    setFetching(true);
    try {
      // Fetch analytics for today (1 day)
      const response = await fetch('/api/server-metrics/analytics?days=1');
      if (!response.ok) throw new Error('Failed to fetch server metrics');

      const result = await response.json();
      if (result.success) {
        const metricsData: ServerMetricsData = {
          fetchedAt: new Date().toISOString(),
          stats: {
            total: result.data.summary.totalServers,
            healthy: result.data.summary.healthyCount,
            warning: result.data.summary.warningCount,
            critical: result.data.summary.criticalCount,
            avgCpu: result.data.summary.avgCpu,
            avgMemory: result.data.summary.avgMemory,
          },
          storageAlerts: result.data.storageAlerts || [],
        };
        setData(metricsData);
        onChange(metricsData);
        toast.success('Server metrics berhasil diambil');
      }
    } catch (error) {
      console.error('Error fetching server metrics:', error);
      toast.error('Gagal mengambil server metrics');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = () => {
    if (data) {
      // Only call onSubmit - it will save data + mark as complete
      onSubmit?.(data);
    }
  };

  const generatePDF = async () => {
    if (!data) {
      toast.error('Tidak ada data untuk di-export');
      return;
    }

    setGenerating(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 20;

      // Title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Laporan Status Server Harian', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Tanggal: ${format(new Date(), 'dd MMMM yyyy, HH:mm')} WITA`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );
      y += 15;

      // Summary Stats Box
      pdf.setFillColor(245, 245, 245);
      pdf.rect(15, y, pageWidth - 30, 35, 'F');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ringkasan Status Server', 20, y + 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const statsLine1 = `Total Server: ${data.stats.total} | Healthy: ${data.stats.healthy} | Warning: ${data.stats.warning} | Critical: ${data.stats.critical}`;
      pdf.text(statsLine1, 20, y + 18);

      const avgCpuText = data.stats.avgCpu !== null ? `${data.stats.avgCpu.toFixed(1)}%` : '-';
      const avgMemText = data.stats.avgMemory !== null ? `${data.stats.avgMemory.toFixed(1)}%` : '-';
      const statsLine2 = `Rata-rata CPU: ${avgCpuText} | Rata-rata Memory: ${avgMemText}`;
      pdf.text(statsLine2, 20, y + 28);
      y += 45;

      // Storage Alerts Section
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Server dengan Storage > 80%', 20, y);
      y += 8;

      if (data.storageAlerts.length === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(40, 167, 69);
        pdf.text('Tidak ada server dengan storage di atas 80%. Semua server dalam kondisi baik.', 20, y);
        pdf.setTextColor(0, 0, 0);
        y += 10;
      } else {
        // Table Header
        pdf.setFillColor(66, 66, 66);
        pdf.setTextColor(255, 255, 255);
        pdf.rect(15, y, pageWidth - 30, 8, 'F');
        pdf.setFontSize(9);
        pdf.text('IP Address', 18, y + 6);
        pdf.text('Server Name', 55, y + 6);
        pdf.text('Partition', 110, y + 6);
        pdf.text('Usage', 165, y + 6);
        y += 10;

        // Reset text color
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');

        // Storage Alert Rows
        data.storageAlerts.forEach((alert, index) => {
          // Check if we need a new page
          if (y > 270) {
            pdf.addPage();
            y = 20;
          }

          // Alternate row background
          if (index % 2 === 0) {
            pdf.setFillColor(255, 250, 245);
            pdf.rect(15, y - 4, pageWidth - 30, 8, 'F');
          }

          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0);
          pdf.text(alert.ipAddress || '-', 18, y);
          pdf.text((alert.serverName || '-').substring(0, 25), 55, y);
          pdf.text(alert.partition.substring(0, 25), 110, y);

          // Color code the usage
          if (alert.usagePercent >= 95) {
            pdf.setTextColor(220, 53, 69);
          } else if (alert.usagePercent >= 90) {
            pdf.setTextColor(255, 140, 0);
          } else {
            pdf.setTextColor(255, 193, 7);
          }
          pdf.text(`${alert.usagePercent.toFixed(1)}%`, 165, y);
          pdf.setTextColor(0, 0, 0);

          y += 7;
        });

        // Summary count
        y += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Total: ${data.storageAlerts.length} partisi dengan storage > 80%`, 20, y);
        pdf.setTextColor(0, 0, 0);
      }

      // Footer
      y = Math.max(y + 15, 270);
      if (y > 280) {
        pdf.addPage();
        y = 285;
      }
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')} WITA - ServiceDesk IT Portal`,
        pageWidth / 2,
        285,
        { align: 'center' }
      );

      // Save PDF
      const filename = `server-storage-report-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
      pdf.save(filename);

      // Update data with PDF generation info
      const updatedData = {
        ...data,
        pdfGenerated: true,
        pdfGeneratedAt: new Date().toISOString(),
      };
      setData(updatedData);
      onChange(updatedData);

      toast.success(`PDF berhasil di-generate: ${filename}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Gagal generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Mengambil data server metrics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground mb-3">Belum ada data server metrics.</p>
        {!readOnly && (
          <Button size="sm" onClick={fetchServerMetrics} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Ambil Data Server
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2 bg-muted/50 rounded text-center">
          <div className="text-lg font-bold">{data.stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded text-center">
          <div className="text-lg font-bold text-green-600">{data.stats.healthy}</div>
          <div className="text-xs text-green-600">Healthy</div>
        </div>
        <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded text-center">
          <div className="text-lg font-bold text-yellow-600">{data.stats.warning}</div>
          <div className="text-xs text-yellow-600">Warning</div>
        </div>
        <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded text-center">
          <div className="text-lg font-bold text-red-600">{data.stats.critical}</div>
          <div className="text-xs text-red-600">Critical</div>
        </div>
      </div>

      {/* Average Stats */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Avg CPU:</span>
          <span className="font-medium">
            {data.stats.avgCpu !== null ? `${data.stats.avgCpu.toFixed(1)}%` : '-'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">Avg Memory:</span>
          <span className="font-medium">
            {data.stats.avgMemory !== null ? `${data.stats.avgMemory.toFixed(1)}%` : '-'}
          </span>
        </div>
      </div>

      {/* Storage Alerts (>80%) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-yellow-500" />
          <p className="text-xs font-medium">Server dengan Storage &gt; 80%:</p>
          <Badge variant={data.storageAlerts.length > 0 ? 'secondary' : 'outline'} className="text-xs">
            {data.storageAlerts.length}
          </Badge>
        </div>

        {data.storageAlerts.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Semua server storage dalam kondisi baik (&lt;80%)</span>
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {data.storageAlerts.slice(0, 10).map((alert, idx) => (
              <div
                key={`${alert.serverId}-${alert.partition}-${idx}`}
                className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${getStorageStatusColor(alert.usagePercent)}`} />
                  <span className="font-mono text-xs truncate">{alert.ipAddress}</span>
                  <span className="text-muted-foreground truncate">
                    {alert.serverName ? `(${alert.serverName})` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{alert.partition}</span>
                  <Badge variant={getStorageBadgeVariant(alert.usagePercent)} className="text-xs">
                    {alert.usagePercent.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
            {data.storageAlerts.length > 10 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{data.storageAlerts.length - 10} partisi lainnya
              </p>
            )}
          </div>
        )}
      </div>

      {/* PDF Status */}
      {data.pdfGenerated && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 p-2 rounded">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>
            PDF di-generate pada {format(new Date(data.pdfGeneratedAt!), 'HH:mm')} WITA
          </span>
        </div>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchServerMetrics}
            disabled={fetching || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={generatePDF}
            disabled={generating || isLoading}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            PDF
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            Simpan
          </Button>
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-muted-foreground">
        Data diambil: {format(new Date(data.fetchedAt), 'dd MMM yyyy, HH:mm')} WITA
      </p>
    </div>
  );
}
