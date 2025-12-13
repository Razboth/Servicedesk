'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  // Common icons
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  RefreshCw,
  Activity,
  ChevronRight,
  // Admin/System icons
  Users,
  Settings,
  Shield,
  Database,
  Server,
  FileText,
  BarChart3,
  Building2,
  Cog,
  // Manager icons
  ClipboardCheck,
  Target,
  UserCheck,
  Building,
  CreditCard,
  // IT Manager icons
  Network,
  Cpu,
  HardDrive,
  Wifi,
  MonitorSpeaker,
  // Technician icons
  Wrench,
  ListTodo,
  Timer,
  Briefcase,
  CalendarClock,
  // User icons
  Send,
  MessageSquare,
  BookOpen,
  History,
  Search
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  resolvedThisMonth: number;
  avgResolutionTime: string;
  slaCompliance: number;
  activeUsers: number;
  trends: {
    ticketTrend: number;
    weeklyTrend: number;
    thisMonthTickets: number;
    lastMonthTickets: number;
  };
  priority: {
    urgent: number;
    high: number;
  };
  roleSpecific: {
    // Technician specific
    myOpenTickets?: number;
    myAssignedTickets?: number;
    myWorkload?: number;
    // Manager specific
    pendingApprovals?: number;
    branchTickets?: number;
    teamPerformance?: number;
    branchUsers?: number;
    branchATMs?: number;
    atmAlerts?: number;
    // Admin specific
    systemWideTickets?: number;
    allBranches?: boolean;
    totalUsers?: number;
    totalBranches?: number;
    systemHealth?: number;
    // IT Manager specific
    networkIncidents?: number;
    atmDowntime?: number;
    infrastructureAlerts?: number;
    // User specific
    mySubmittedTickets?: number;
    myPendingTickets?: number;
    myResolvedTickets?: number;
  };
}

export type UserRole = 'USER' | 'TECHNICIAN' | 'MANAGER' | 'MANAGER_IT' | 'ADMIN' | 'SUPER_ADMIN' | 'SECURITY_ANALYST';

interface RoleDashboardProps {
  stats: DashboardStats;
  userRole: UserRole;
  branchName?: string;
  supportGroupName?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  trend?: number;
  icon: React.ElementType;
  variant: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'default';
  href?: string;
}

function StatCard({ title, value, description, trend, icon: Icon, variant, href }: StatCardProps) {
  const variantStyles = {
    primary: 'from-primary/10 to-primary/5 border-primary/20 dark:from-primary/20 dark:to-primary/10',
    success: 'from-[hsl(var(--success)/0.1)] to-[hsl(var(--success)/0.05)] border-[hsl(var(--success)/0.2)]',
    warning: 'from-[hsl(var(--warning)/0.1)] to-[hsl(var(--warning)/0.05)] border-[hsl(var(--warning)/0.2)]',
    destructive: 'from-destructive/10 to-destructive/5 border-destructive/20',
    info: 'from-[hsl(var(--info)/0.1)] to-[hsl(var(--info)/0.05)] border-[hsl(var(--info)/0.2)]',
    default: 'from-muted/50 to-muted/25 border-border'
  };

  const iconStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
    destructive: 'bg-destructive/10 text-destructive',
    info: 'bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]',
    default: 'bg-muted text-muted-foreground'
  };

  const content = (
    <Card
      className={cn(
        'relative overflow-hidden bg-gradient-to-br transition-all duration-300',
        variantStyles[variant],
        href && 'hover:shadow-md hover:scale-[1.02] cursor-pointer'
      )}
    >
      <div className="absolute right-0 top-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-background/5" />
      <div className="absolute right-0 top-0 -mt-12 -mr-12 h-32 w-32 rounded-full bg-background/3" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <div className={cn('rounded-lg p-2', iconStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>

          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                trend >= 0
                  ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'warning' | 'success';
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  variant = 'default',
  badge,
  badgeVariant = 'default'
}: QuickActionCardProps) {
  const iconVariantStyles = {
    default: 'bg-muted text-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
    info: 'bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]'
  };

  return (
    <Link href={href}>
      <Card className="h-full transition-all duration-300 hover:shadow-md hover:scale-[1.01] cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={cn('rounded-lg p-2.5', iconVariantStyles[variant])}>
              <Icon className="h-5 w-5" />
            </div>
            {badge && (
              <Badge variant={badgeVariant === 'warning' ? 'warning-soft' : badgeVariant === 'success' ? 'success-soft' : badgeVariant === 'destructive' ? 'destructive-soft' : 'secondary'}>
                {badge}
              </Badge>
            )}
          </div>
          <CardTitle className="text-base mt-3">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center text-sm text-primary group-hover:underline">
            Buka
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================================
// ADMIN / SUPER_ADMIN Dashboard Cards
// ============================================================================

interface AdminDashboardCardsProps {
  stats: DashboardStats;
}

export function AdminDashboardCards({ stats }: AdminDashboardCardsProps) {
  return (
    <div className="space-y-6">
      {/* System-wide Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistik Sistem
          </h2>
          <Link href="/reports" className="text-sm text-primary hover:underline flex items-center gap-1">
            Lihat Semua Laporan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tiket"
            value={stats.totalTickets.toLocaleString()}
            description="Seluruh sistem"
            trend={stats.trends.ticketTrend}
            icon={Ticket}
            variant="primary"
            href="/tickets"
          />
          <StatCard
            title="Pengguna Aktif"
            value={stats.activeUsers}
            description="30 hari terakhir"
            icon={Users}
            variant="info"
            href="/admin/users"
          />
          <StatCard
            title="Kepatuhan SLA"
            value={`${stats.slaCompliance}%`}
            description="Target tercapai"
            icon={Target}
            variant={stats.slaCompliance >= 90 ? 'success' : stats.slaCompliance >= 70 ? 'warning' : 'destructive'}
            href="/reports/sla"
          />
          <StatCard
            title="Kesehatan Sistem"
            value={stats.roleSpecific.systemHealth ? `${stats.roleSpecific.systemHealth}%` : '98%'}
            description="Status operasional"
            icon={Activity}
            variant="success"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Cabang"
            value={stats.roleSpecific.totalBranches || 80}
            description="Cabang terdaftar"
            icon={Building2}
            variant="default"
            href="/admin/branches"
          />
          <StatCard
            title="Total Pengguna"
            value={stats.roleSpecific.totalUsers || stats.activeUsers}
            description="Akun terdaftar"
            icon={Users}
            variant="default"
            href="/admin/users"
          />
          <StatCard
            title="Tiket Terbuka"
            value={stats.openTickets}
            description="Menunggu penanganan"
            icon={AlertCircle}
            variant="warning"
            href="/tickets?status=OPEN"
          />
          <StatCard
            title="Tiket Bulan Ini"
            value={stats.trends.thisMonthTickets}
            description="Tiket baru"
            trend={stats.trends.weeklyTrend}
            icon={TrendingUp}
            variant="default"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Cog className="h-5 w-5" />
          Aksi Cepat Admin
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Kelola Pengguna"
            description="Tambah, edit, atau nonaktifkan pengguna"
            icon={Users}
            href="/admin/users"
            variant="primary"
          />
          <QuickActionCard
            title="Kelola Cabang"
            description="Pengaturan cabang dan wilayah"
            icon={Building2}
            href="/admin/branches"
            variant="info"
          />
          <QuickActionCard
            title="Layanan & Kategori"
            description="Kelola katalog layanan"
            icon={Settings}
            href="/admin/services"
            variant="success"
          />
          <QuickActionCard
            title="Keamanan Sistem"
            description="Log aktivitas dan audit"
            icon={Shield}
            href="/admin/security"
            variant="warning"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Monitor Jaringan"
            description="Status jaringan cabang dan ATM"
            icon={Network}
            href="/admin/network-monitoring"
          />
          <QuickActionCard
            title="Kelola ATM"
            description="Daftar ATM dan status"
            icon={CreditCard}
            href="/admin/atms"
          />
          <QuickActionCard
            title="Support Groups"
            description="Tim teknisi dan support"
            icon={UserCheck}
            href="/admin/support-groups"
          />
          <QuickActionCard
            title="Laporan Lengkap"
            description="Akses semua laporan sistem"
            icon={FileText}
            href="/reports"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MANAGER Dashboard Cards
// ============================================================================

interface ManagerDashboardCardsProps {
  stats: DashboardStats;
  branchName?: string;
}

export function ManagerDashboardCards({ stats, branchName }: ManagerDashboardCardsProps) {
  const pendingApprovals = stats.roleSpecific.pendingApprovals || 0;

  return (
    <div className="space-y-6">
      {/* Branch Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Building className="h-5 w-5" />
            Statistik Cabang {branchName && `- ${branchName}`}
          </h2>
          <Link href="/manager/reports" className="text-sm text-primary hover:underline flex items-center gap-1">
            Lihat Laporan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tiket Cabang"
            value={stats.roleSpecific.branchTickets || stats.totalTickets}
            description="Total tiket cabang"
            trend={stats.trends.ticketTrend}
            icon={Ticket}
            variant="primary"
            href="/tickets"
          />
          <StatCard
            title="Menunggu Persetujuan"
            value={pendingApprovals}
            description="Perlu ditinjau"
            icon={ClipboardCheck}
            variant={pendingApprovals > 0 ? 'warning' : 'success'}
            href="/manager/approvals"
            badge={pendingApprovals > 0 ? `${pendingApprovals}` : undefined}
          />
          <StatCard
            title="Performa Tim"
            value={`${stats.roleSpecific.teamPerformance || stats.slaCompliance}%`}
            description="Kepatuhan SLA"
            icon={Target}
            variant={stats.slaCompliance >= 90 ? 'success' : stats.slaCompliance >= 70 ? 'warning' : 'destructive'}
          />
          <StatCard
            title="Rata-rata Resolusi"
            value={stats.avgResolutionTime}
            description="Waktu penyelesaian"
            icon={Clock}
            variant="default"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Pengguna Cabang"
            value={stats.roleSpecific.branchUsers || 0}
            description="Staf terdaftar"
            icon={Users}
            variant="info"
            href="/manager/users"
          />
          <StatCard
            title="ATM Cabang"
            value={stats.roleSpecific.branchATMs || 0}
            description="Unit terdaftar"
            icon={CreditCard}
            variant="default"
            href="/manager/atms"
          />
          <StatCard
            title="Tiket Terbuka"
            value={stats.openTickets}
            description="Perlu penanganan"
            icon={AlertCircle}
            variant="warning"
            href="/tickets?status=OPEN"
          />
          <StatCard
            title="Diselesaikan Bulan Ini"
            value={stats.resolvedThisMonth}
            description="Tiket selesai"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovals > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Persetujuan Menunggu
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pendingApprovals} tiket memerlukan persetujuan Anda
                  </p>
                </div>
              </div>
              <Link href="/manager/approvals">
                <Button variant="warning" size="sm">
                  Tinjau Sekarang
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Cog className="h-5 w-5" />
          Aksi Cepat Manager
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Persetujuan Tiket"
            description="Tinjau dan setujui permintaan"
            icon={ClipboardCheck}
            href="/manager/approvals"
            variant="warning"
            badge={pendingApprovals > 0 ? `${pendingApprovals} baru` : undefined}
            badgeVariant={pendingApprovals > 0 ? 'warning' : 'default'}
          />
          <QuickActionCard
            title="Kelola Staf"
            description="Pengguna cabang Anda"
            icon={Users}
            href="/manager/users"
            variant="primary"
          />
          <QuickActionCard
            title="Status ATM"
            description="Monitor ATM cabang"
            icon={CreditCard}
            href="/manager/atms"
            variant="info"
          />
          <QuickActionCard
            title="Laporan Cabang"
            description="Performa dan statistik"
            icon={BarChart3}
            href="/reports/branch"
            variant="success"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MANAGER_IT Dashboard Cards
// ============================================================================

interface ManagerITDashboardCardsProps {
  stats: DashboardStats;
}

export function ManagerITDashboardCards({ stats }: ManagerITDashboardCardsProps) {
  const networkIncidents = stats.roleSpecific.networkIncidents || 0;
  const infrastructureAlerts = stats.roleSpecific.infrastructureAlerts || 0;

  return (
    <div className="space-y-6">
      {/* IT Infrastructure Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Server className="h-5 w-5" />
            Overview Infrastruktur IT
          </h2>
          <Link href="/reports/infrastructure" className="text-sm text-primary hover:underline flex items-center gap-1">
            Lihat Laporan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tiket IT"
            value={stats.totalTickets}
            description="Semua tiket"
            trend={stats.trends.ticketTrend}
            icon={Ticket}
            variant="primary"
            href="/tickets"
          />
          <StatCard
            title="Insiden Jaringan"
            value={networkIncidents}
            description="Sedang ditangani"
            icon={Network}
            variant={networkIncidents > 0 ? 'destructive' : 'success'}
            href="/admin/network-monitoring"
          />
          <StatCard
            title="Kepatuhan SLA"
            value={`${stats.slaCompliance}%`}
            description="Layanan IT"
            icon={Target}
            variant={stats.slaCompliance >= 90 ? 'success' : stats.slaCompliance >= 70 ? 'warning' : 'destructive'}
            href="/reports/sla"
          />
          <StatCard
            title="Rata-rata Resolusi"
            value={stats.avgResolutionTime}
            description="Waktu penyelesaian"
            icon={Clock}
            variant="default"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="ATM Downtime"
            value={stats.roleSpecific.atmDowntime || 0}
            description="Unit bermasalah"
            icon={CreditCard}
            variant={stats.roleSpecific.atmDowntime ? 'warning' : 'success'}
            href="/admin/atms?status=down"
          />
          <StatCard
            title="Alert Infrastruktur"
            value={infrastructureAlerts}
            description="Perlu perhatian"
            icon={AlertTriangle}
            variant={infrastructureAlerts > 0 ? 'warning' : 'success'}
          />
          <StatCard
            title="Tiket In Progress"
            value={stats.inProgressTickets}
            description="Sedang dikerjakan"
            icon={Clock}
            variant="info"
            href="/tickets?status=IN_PROGRESS"
          />
          <StatCard
            title="Diselesaikan Bulan Ini"
            value={stats.resolvedThisMonth}
            description="Tiket selesai"
            icon={CheckCircle2}
            variant="success"
          />
        </div>
      </div>

      {/* Infrastructure Alerts */}
      {(networkIncidents > 0 || infrastructureAlerts > 0) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Perhatian Diperlukan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {networkIncidents > 0 && `${networkIncidents} insiden jaringan`}
                    {networkIncidents > 0 && infrastructureAlerts > 0 && ' dan '}
                    {infrastructureAlerts > 0 && `${infrastructureAlerts} alert infrastruktur`}
                  </p>
                </div>
              </div>
              <Link href="/admin/network-monitoring">
                <Button variant="destructive" size="sm">
                  Lihat Detail
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Cog className="h-5 w-5" />
          Aksi Cepat IT Manager
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Monitor Jaringan"
            description="Status jaringan real-time"
            icon={Network}
            href="/admin/network-monitoring"
            variant="primary"
            badge={networkIncidents > 0 ? `${networkIncidents} insiden` : undefined}
            badgeVariant="destructive"
          />
          <QuickActionCard
            title="Kelola Shift"
            description="Jadwal shift teknisi"
            icon={CalendarClock}
            href="/shifts"
            variant="info"
          />
          <QuickActionCard
            title="Status ATM"
            description="Monitor semua ATM"
            icon={CreditCard}
            href="/admin/atms"
            variant="warning"
          />
          <QuickActionCard
            title="Laporan IT"
            description="Analisis performa IT"
            icon={BarChart3}
            href="/reports/it"
            variant="success"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Kelola PC"
            description="Inventaris PC dan perangkat"
            icon={MonitorSpeaker}
            href="/admin/pc-management"
          />
          <QuickActionCard
            title="Support Groups"
            description="Tim teknisi"
            icon={UserCheck}
            href="/admin/support-groups"
          />
          <QuickActionCard
            title="Insiden Teknis"
            description="Tracking insiden"
            icon={AlertCircle}
            href="/tickets?category=INCIDENT"
          />
          <QuickActionCard
            title="SLA Performance"
            description="Kepatuhan SLA layanan"
            icon={Target}
            href="/reports/sla"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TECHNICIAN Dashboard Cards
// ============================================================================

interface TechnicianDashboardCardsProps {
  stats: DashboardStats;
  supportGroupName?: string;
}

export function TechnicianDashboardCards({ stats, supportGroupName }: TechnicianDashboardCardsProps) {
  const myOpenTickets = stats.roleSpecific.myOpenTickets || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Aksi Cepat Teknisi
          {supportGroupName && (
            <Badge variant="outline" className="ml-2">{supportGroupName}</Badge>
          )}
        </h2>
      </div>

      {/* Quick Actions - Only 4 main actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          title="Workbench"
          description="Kelola tiket yang ditugaskan"
          icon={Briefcase}
          href="/tickets?assignedToMe=true"
          variant="primary"
          badge={myOpenTickets > 0 ? `${myOpenTickets} aktif` : undefined}
          badgeVariant="warning"
        />
        <QuickActionCard
          title="Semua Tiket"
          description="Lihat semua tiket"
          icon={Ticket}
          href="/tickets"
          variant="info"
        />
        <QuickActionCard
          title="Tugas Harian"
          description="Checklist tugas hari ini"
          icon={ListTodo}
          href="/technician/daily-tasks"
          variant="warning"
        />
        <QuickActionCard
          title="Shift"
          description="Jadwal dan laporan shift"
          icon={CalendarClock}
          href="/technician/shift"
          variant="success"
        />
      </div>
    </div>
  );
}

// ============================================================================
// USER Dashboard Cards
// ============================================================================

interface UserDashboardCardsProps {
  stats: DashboardStats;
  branchName?: string;
}

export function UserDashboardCards({ stats, branchName }: UserDashboardCardsProps) {
  const mySubmittedTickets = stats.roleSpecific.mySubmittedTickets || stats.totalTickets;
  const myPendingTickets = stats.roleSpecific.myPendingTickets || (stats.openTickets + stats.inProgressTickets);
  const myResolvedTickets = stats.roleSpecific.myResolvedTickets || stats.resolvedTickets;

  return (
    <div className="space-y-6">
      {/* My Tickets Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Tiket Saya
            {branchName && (
              <Badge variant="outline" className="ml-2">{branchName}</Badge>
            )}
          </h2>
          <Link href="/tickets/my-tickets" className="text-sm text-primary hover:underline flex items-center gap-1">
            Lihat Semua <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tiket Saya"
            value={mySubmittedTickets}
            description="Yang pernah dibuat"
            icon={Ticket}
            variant="primary"
            href="/tickets/my-tickets"
          />
          <StatCard
            title="Sedang Diproses"
            value={myPendingTickets}
            description="Menunggu penyelesaian"
            icon={Clock}
            variant={myPendingTickets > 0 ? 'warning' : 'success'}
            href="/tickets/my-tickets?status=OPEN,IN_PROGRESS"
          />
          <StatCard
            title="Selesai"
            value={myResolvedTickets}
            description="Tiket terselesaikan"
            icon={CheckCircle2}
            variant="success"
            href="/tickets/my-tickets?status=RESOLVED,CLOSED"
          />
          <StatCard
            title="Rata-rata Waktu"
            value={stats.avgResolutionTime}
            description="Penyelesaian tiket"
            icon={Timer}
            variant="default"
          />
        </div>
      </div>

      {/* Pending Tickets Alert */}
      {myPendingTickets > 0 && (
        <Card className="border-info/50 bg-info/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-info" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Tiket Dalam Proses
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {myPendingTickets} tiket sedang ditangani tim IT
                  </p>
                </div>
              </div>
              <Link href="/tickets/my-tickets?status=OPEN,IN_PROGRESS">
                <Button variant="info" size="sm">
                  Lihat Status
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Layanan Cepat
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Buat Tiket Baru"
            description="Laporkan masalah atau permintaan"
            icon={Plus}
            href="/tickets"
            variant="primary"
          />
          <QuickActionCard
            title="Tiket Saya"
            description="Lihat status tiket"
            icon={Ticket}
            href="/tickets/my-tickets"
            variant="info"
            badge={myPendingTickets > 0 ? `${myPendingTickets} aktif` : undefined}
            badgeVariant="warning"
          />
          <QuickActionCard
            title="Basis Pengetahuan"
            description="Cari solusi mandiri"
            icon={BookOpen}
            href="/knowledge"
            variant="success"
          />
          <QuickActionCard
            title="Riwayat Tiket"
            description="Lihat tiket sebelumnya"
            icon={History}
            href="/tickets/my-tickets?status=RESOLVED,CLOSED"
          />
        </div>
      </div>

      {/* Service Catalog Teaser */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">
                  Butuh Bantuan?
                </p>
                <p className="text-sm text-muted-foreground">
                  Jelajahi katalog layanan IT kami atau cari solusi di basis pengetahuan
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/knowledge">
                <Button variant="outline" size="sm">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Basis Pengetahuan
                </Button>
              </Link>
              <Link href="/tickets">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Tiket
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Export - Role-Based Dashboard
// ============================================================================

export function RoleDashboardCards({ stats, userRole, branchName, supportGroupName }: RoleDashboardProps) {
  switch (userRole) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return <AdminDashboardCards stats={stats} />;

    case 'MANAGER':
      return <ManagerDashboardCards stats={stats} branchName={branchName} />;

    case 'MANAGER_IT':
      return <ManagerITDashboardCards stats={stats} />;

    case 'TECHNICIAN':
      return <TechnicianDashboardCards stats={stats} supportGroupName={supportGroupName} />;

    case 'USER':
    default:
      return <UserDashboardCards stats={stats} branchName={branchName} />;
  }
}

export default RoleDashboardCards;
