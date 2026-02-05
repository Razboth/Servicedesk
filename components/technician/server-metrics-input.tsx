'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  RefreshCw,
  Download,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ServerMetricsData {
  fetchedAt: string;
  stats: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
  servers: Array<{
    ipAddress: string;
    serverName: string;
    category: string;
    status: 'healthy' | 'warning' | 'critical';
    latestMetrics: {
      cpuPercent: number | null;
      memoryPercent: number | null;
      maxStorageUsage: number;
      maxStoragePartition: string;
    } | null;
  }>;
  pdfGenerated?: boolean;
  pdfGeneratedAt?: string;
}

interface ServerMetricsInputProps {
  value?: ServerMetricsData;
  onChange: (data: ServerMetricsData) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'critical':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Server className="h-4 w-4 text-gray-400" />;
  }
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'healthy':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'critical':
      return 'destructive';
    default:
      return 'outline';
  }
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
      const response = await fetch('/api/server-metrics?limit=100');
      if (!response.ok) throw new Error('Failed to fetch server metrics');

      const result = await response.json();
      if (result.success) {
        const metricsData: ServerMetricsData = {
          fetchedAt: new Date().toISOString(),
          stats: result.data.stats,
          servers: result.data.servers.map((s: any) => ({
            ipAddress: s.ipAddress,
            serverName: s.serverName,
            category: s.category,
            status: s.status,
            latestMetrics: s.latestMetrics,
          })),
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
      pdf.text('Laporan Status Server', pageWidth / 2, y, { align: 'center' });
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
      pdf.rect(15, y, pageWidth - 30, 25, 'F');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ringkasan Status', 20, y + 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      const statsText = `Total: ${data.stats.total} | Healthy: ${data.stats.healthy} | Warning: ${data.stats.warning} | Critical: ${data.stats.critical}`;
      pdf.text(statsText, 20, y + 18);
      y += 35;

      // Server Table Header
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detail Server', 20, y);
      y += 8;

      // Table Header
      pdf.setFillColor(66, 66, 66);
      pdf.setTextColor(255, 255, 255);
      pdf.rect(15, y, pageWidth - 30, 8, 'F');
      pdf.setFontSize(9);
      pdf.text('IP Address', 18, y + 6);
      pdf.text('Server Name', 55, y + 6);
      pdf.text('Category', 100, y + 6);
      pdf.text('CPU %', 135, y + 6);
      pdf.text('Memory %', 155, y + 6);
      pdf.text('Storage %', 180, y + 6);
      y += 10;

      // Reset text color
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');

      // Server Rows
      data.servers.forEach((server, index) => {
        // Check if we need a new page
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }

        // Alternate row background
        if (index % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(15, y - 4, pageWidth - 30, 8, 'F');
        }

        // Status color indicator
        if (server.status === 'critical') {
          pdf.setTextColor(220, 53, 69);
        } else if (server.status === 'warning') {
          pdf.setTextColor(255, 193, 7);
        } else {
          pdf.setTextColor(40, 167, 69);
        }

        pdf.setFontSize(8);
        pdf.text(server.ipAddress || '-', 18, y);

        pdf.setTextColor(0, 0, 0);
        pdf.text((server.serverName || '-').substring(0, 20), 55, y);
        pdf.text((server.category || '-').substring(0, 15), 100, y);

        const cpu = server.latestMetrics?.cpuPercent;
        const mem = server.latestMetrics?.memoryPercent;
        const storage = server.latestMetrics?.maxStorageUsage;

        pdf.text(cpu !== null && cpu !== undefined ? `${cpu.toFixed(1)}%` : '-', 135, y);
        pdf.text(mem !== null && mem !== undefined ? `${mem.toFixed(1)}%` : '-', 155, y);
        pdf.text(storage ? `${storage.toFixed(1)}%` : '-', 180, y);

        y += 7;
      });

      // Footer
      y = Math.max(y + 10, 270);
      if (y > 280) {
        pdf.addPage();
        y = 20;
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
      const filename = `server-metrics-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
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

      {/* Critical/Warning Servers (if any) */}
      {(data.stats.critical > 0 || data.stats.warning > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Server yang perlu perhatian:</p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {data.servers
              .filter((s) => s.status !== 'healthy')
              .slice(0, 5)
              .map((server) => (
                <div
                  key={server.ipAddress}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(server.status)}
                    <span>{server.ipAddress}</span>
                    <span className="text-muted-foreground">({server.serverName})</span>
                  </div>
                  <Badge variant={getStatusBadgeVariant(server.status)} className="text-xs">
                    {server.status}
                  </Badge>
                </div>
              ))}
            {data.stats.critical + data.stats.warning > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{data.stats.critical + data.stats.warning - 5} server lainnya
              </p>
            )}
          </div>
        </div>
      )}

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
            onClick={generatePDF}
            disabled={generating || isLoading}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Generate PDF
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
