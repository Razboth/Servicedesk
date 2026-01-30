'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Users,
  Target,
  Clock,
  BarChart3,
  TrendingUp,
  FileText,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Activity,
  CreditCard,
  ClipboardCheck,
  Calendar,
  PieChart,
  LineChart
} from 'lucide-react';

interface BranchSummary {
  branch: {
    id: string;
    name: string;
    code: string;
    city: string;
  };
  stats: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    slaCompliance: number;
    avgResolutionTime: number;
    pendingApprovals: number;
    teamSize: number;
    atmCount: number;
  };
  trends: {
    ticketTrend: number;
    resolutionTrend: number;
  };
}

interface ReportCard {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  variant: 'default' | 'primary' | 'success' | 'warning' | 'info';
  badge?: string;
}

export default function ManagerReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<BranchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user?.role !== 'MANAGER') {
      router.push('/reports');
      return;
    }

    fetchBranchSummary();
  }, [session, status, router]);

  const fetchBranchSummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/manager/reports/summary');

      if (!response.ok) {
        throw new Error('Gagal memuat data laporan');
      }

      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching branch summary:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <LoadingSkeleton />;
  }

  if (!session || session.user?.role !== 'MANAGER') {
    return null;
  }

  const reportCategories: { title: string; description: string; reports: ReportCard[] }[] = [
    {
      title: 'Laporan Operasional',
      description: 'Pantau kinerja operasional cabang Anda',
      reports: [
        {
          title: 'Operasi Cabang',
          description: 'Statistik lengkap tiket, SLA, dan performa tim cabang',
          icon: Building2,
          href: '/reports/manager/branch-operations',
          variant: 'primary',
          badge: 'Utama'
        },
        {
          title: 'Performa Tim',
          description: 'Analisis kinerja dan beban kerja setiap anggota tim',
          icon: Users,
          href: '/reports/manager/team-performance',
          variant: 'info'
        },
        {
          title: 'Alur Persetujuan',
          description: 'Lacak status persetujuan tiket yang memerlukan approval',
          icon: ClipboardCheck,
          href: '/reports/manager/approval-workflow',
          variant: 'warning'
        }
      ]
    },
    {
      title: 'Laporan Analitik',
      description: 'Analisis data tiket dan tren cabang',
      reports: [
        {
          title: 'Tiket per Kategori',
          description: 'Distribusi tiket berdasarkan kategori layanan',
          icon: PieChart,
          href: '/reports/analytics/requests-by-category',
          variant: 'default'
        },
        {
          title: 'Tiket per Prioritas',
          description: 'Distribusi tiket berdasarkan tingkat prioritas',
          icon: Target,
          href: '/reports/analytics/requests-by-priority',
          variant: 'default'
        },
        {
          title: 'Tiket per Status',
          description: 'Status tiket (open, in progress, resolved, closed)',
          icon: Activity,
          href: '/reports/analytics/requests-by-status',
          variant: 'default'
        },
      ]
    },
    {
      title: 'Laporan Layanan',
      description: 'Evaluasi kualitas dan kepatuhan layanan',
      reports: [
        {
          title: 'Kepatuhan SLA',
          description: 'Tingkat kepatuhan terhadap Service Level Agreement',
          icon: Shield,
          href: '/reports/services/sla-compliance',
          variant: 'success'
        },
        {
          title: 'Performa Layanan',
          description: 'Performa setiap jenis layanan yang diberikan',
          icon: BarChart3,
          href: '/reports/services/performance',
          variant: 'default'
        },
        {
          title: 'Penggunaan Layanan',
          description: 'Statistik penggunaan layanan IT oleh cabang',
          icon: TrendingUp,
          href: '/reports/services/usage',
          variant: 'default'
        }
      ]
    },
    {
      title: 'Laporan ATM',
      description: 'Monitoring ATM cabang Anda',
      reports: [
        {
          title: 'Selisih Transaksi',
          description: 'Laporan klaim selisih transaksi ATM',
          icon: FileText,
          href: '/reports/atm-discrepancy',
          variant: 'default'
        }
      ]
    }
  ];

  const getVariantStyles = (variant: string) => {
    const styles: Record<string, string> = {
      default: 'bg-muted/50 text-foreground',
      primary: 'bg-primary/10 text-primary',
      success: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
      warning: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
      info: 'bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]'
    };
    return styles[variant] || styles.default;
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="h-8 w-8" />
              Laporan Manager Cabang
            </h1>
            {summary && (
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {summary.branch.name} ({summary.branch.code}) - {summary.branch.city}
              </p>
            )}
          </div>
          <Link href="/manager/dashboard">
            <Button variant="outline">
              Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Branch Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : error ? (
        <Card className="mb-8 border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-foreground">Gagal Memuat Data</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchBranchSummary} className="ml-auto">
                Coba Lagi
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tiket Bulan Ini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{summary.stats.totalTickets}</div>
                {summary.trends.ticketTrend !== 0 && (
                  <Badge variant={summary.trends.ticketTrend > 0 ? 'destructive' : 'default'} className="text-xs">
                    {summary.trends.ticketTrend > 0 ? '+' : ''}{summary.trends.ticketTrend}%
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.stats.openTickets} terbuka, {summary.stats.resolvedTickets} selesai
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Kepatuhan SLA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{summary.stats.slaCompliance}%</div>
                <Badge
                  variant={summary.stats.slaCompliance >= 90 ? 'default' : summary.stats.slaCompliance >= 80 ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  {summary.stats.slaCompliance >= 90 ? 'Baik' : summary.stats.slaCompliance >= 80 ? 'Cukup' : 'Perlu Perbaikan'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Rata-rata resolusi: {summary.stats.avgResolutionTime}h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Menunggu Persetujuan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{summary.stats.pendingApprovals}</div>
                {summary.stats.pendingApprovals > 0 && (
                  <Badge variant="warning" className="text-xs">Tindakan Diperlukan</Badge>
                )}
              </div>
              <Link href="/manager/approvals" className="text-xs text-primary hover:underline mt-1 inline-block">
                Lihat persetujuan &rarr;
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tim & ATM</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-bold">{summary.stats.teamSize}</div>
                <Badge variant="outline" className="text-xs">Staf Aktif</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.stats.atmCount} ATM terdaftar
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Categories */}
      <div className="space-y-8">
        {reportCategories.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {category.reports.map((report, reportIndex) => {
                const IconComponent = report.icon;
                return (
                  <Link key={reportIndex} href={report.href}>
                    <Card className="h-full transition-all duration-300 hover:shadow-md hover:scale-[1.01] cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className={`rounded-lg p-2.5 ${getVariantStyles(report.variant)}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          {report.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {report.badge}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base mt-3">{report.title}</CardTitle>
                        <CardDescription className="text-sm">{report.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center text-sm text-primary group-hover:underline">
                          Buka Laporan
                          <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 p-6 bg-muted/30 rounded-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">Aksi Cepat</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/reports/builder">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Buat Laporan Kustom
            </Button>
          </Link>
          <Link href="/manager/approvals">
            <Button variant="outline">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Kelola Persetujuan
            </Button>
          </Link>
          <Link href="/manager/users">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Kelola Staf
            </Button>
          </Link>
          <Link href="/manager/atms">
            <Button variant="outline">
              <CreditCard className="h-4 w-4 mr-2" />
              Kelola ATM
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      <Skeleton className="h-10 w-64 mb-2" />
      <Skeleton className="h-5 w-48 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="space-y-8">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-40" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
