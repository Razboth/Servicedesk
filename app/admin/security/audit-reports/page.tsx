'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Calendar,
  Filter,
  RefreshCw,
  ChevronLeft,
  Shield,
  Activity,
  Key,
  Users,
  AlertTriangle,
  UserCog,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface ReportType {
  type: string;
  title: string;
  description: string;
}

interface ReportData {
  type: string;
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
  totalRecords: number;
  data: any[];
  summary?: Record<string, any>;
}

const reportIcons: Record<string, React.ElementType> = {
  LOGIN_ACTIVITY: Activity,
  FAILED_LOGINS: AlertTriangle,
  PASSWORD_CHANGES: Key,
  USER_ACTIVITY: Users,
  SECURITY_EVENTS: Shield,
  PROFILE_CHANGES: UserCog,
  SESSION_HISTORY: Clock
};

export default function AuditReportsPage() {
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetchReportTypes();
  }, []);

  const fetchReportTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await fetch('/api/admin/audit-reports');
      if (!response.ok) throw new Error('Failed to fetch report types');
      const data = await response.json();
      setReportTypes(data.reportTypes || []);
      if (data.reportTypes?.length > 0) {
        setSelectedType(data.reportTypes[0].type);
      }
    } catch (error) {
      console.error('Error fetching report types:', error);
      toast.error('Gagal memuat jenis laporan');
    } finally {
      setLoadingTypes(false);
    }
  };

  const generateReport = async (format: 'json' | 'csv' | 'xlsx' = 'json') => {
    if (!selectedType) {
      toast.error('Pilih jenis laporan terlebih dahulu');
      return;
    }

    try {
      if (format !== 'json') {
        setExporting(format);
      } else {
        setLoading(true);
      }

      const response = await fetch('/api/admin/audit-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          startDate,
          endDate,
          format
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      if (format === 'json') {
        const data = await response.json();
        setReport(data);
        toast.success(`Laporan berhasil dibuat: ${data.totalRecords} record`);
      } else {
        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-${selectedType.toLowerCase()}-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(`Laporan berhasil diexport ke ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal membuat laporan');
    } finally {
      setLoading(false);
      setExporting(null);
    }
  };

  const selectedReportType = reportTypes.find(r => r.type === selectedType);
  const ReportIcon = selectedType ? reportIcons[selectedType] || FileText : FileText;

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/security" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Kembali ke Security Dashboard
          </Link>
          <PageHeader
            title="Audit Reports"
            description="Generate dan export laporan audit untuk kepatuhan dan keamanan"
            icon={<FileText className="h-6 w-6" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Report Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Konfigurasi Laporan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Jenis Laporan</Label>
                  <Select
                    value={selectedType}
                    onValueChange={setSelectedType}
                    disabled={loadingTypes}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis laporan" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => {
                        const Icon = reportIcons[type.type] || FileText;
                        return (
                          <SelectItem key={type.type} value={type.type}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.title}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedReportType && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {selectedReportType.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tanggal Mulai</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Akhir</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={() => generateReport('json')}
                    disabled={loading || !selectedType}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Membuat Laporan...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Buat Laporan
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Laporan
                </CardTitle>
                <CardDescription>
                  Download laporan dalam format file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => generateReport('csv')}
                  disabled={exporting === 'csv' || !selectedType}
                  className="w-full justify-start"
                >
                  {exporting === 'csv' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Export ke CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateReport('xlsx')}
                  disabled={exporting === 'xlsx' || !selectedType}
                  className="w-full justify-start"
                >
                  {exporting === 'xlsx' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Export ke Excel
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Report Preview */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ReportIcon className="h-5 w-5" />
                    <CardTitle className="text-base">
                      {report ? selectedReportType?.title || 'Laporan' : 'Preview Laporan'}
                    </CardTitle>
                  </div>
                  {report && (
                    <Badge variant="secondary">
                      {report.totalRecords} record
                    </Badge>
                  )}
                </div>
                {report && (
                  <CardDescription>
                    Periode: {new Date(report.dateRange.start).toLocaleDateString('id-ID')} - {new Date(report.dateRange.end).toLocaleDateString('id-ID')}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!report ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      Pilih jenis laporan dan klik "Buat Laporan" untuk melihat preview
                    </p>
                  </div>
                ) : report.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">
                      Tidak ada data untuk periode yang dipilih
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary */}
                    {report.summary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {Object.entries(report.summary).map(([key, value]) => {
                          if (typeof value === 'object') return null;
                          return (
                            <div key={key} className="p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-lg font-semibold">{value}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Data Table */}
                    <div className="border rounded-lg overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-muted">
                          <TableRow>
                            {Object.keys(report.data[0] || {}).slice(0, 6).map((key) => (
                              <TableHead key={key} className="whitespace-nowrap">
                                {key}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.data.slice(0, 100).map((row, index) => (
                            <TableRow key={index}>
                              {Object.values(row).slice(0, 6).map((value, cellIndex) => (
                                <TableCell key={cellIndex} className="whitespace-nowrap">
                                  {String(value || '-')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {report.data.length > 100 && (
                      <p className="text-sm text-muted-foreground text-center">
                        Menampilkan 100 dari {report.data.length} record. Export untuk melihat semua data.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
