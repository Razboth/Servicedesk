'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  // Common icons
  Ticket,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  // Admin/System icons
  Users,
  Settings,
  Shield,
  FileText,
  Building2,
  Cog,
  // Manager icons
  ClipboardCheck,
  UserCheck,
  CreditCard,
  BarChart3,
  // IT Manager icons
  Network,
  MonitorSpeaker,
  // Technician icons
  Wrench,
  ListTodo,
  Briefcase,
  CalendarClock,
  // User icons
  BookOpen,
  History
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
  icon: React.ElementType;
  variant: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'default';
  href?: string;
}

function StatCard({ title, value, description, icon: Icon, variant, href }: StatCardProps) {
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <div className={cn('rounded-lg p-2', iconStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
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
// ADMIN / SUPER_ADMIN Dashboard Cards - Simplified
// ============================================================================

interface AdminDashboardCardsProps {
  stats: DashboardStats;
}

export function AdminDashboardCards({ stats }: AdminDashboardCardsProps) {
  return (
    <div className="space-y-6">
      {/* Ticket Statistics - All System Tickets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistik Tiket Sistem
          </h2>
          <Link href="/tickets" className="text-sm text-primary hover:underline flex items-center gap-1">
            Lihat Semua <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Tiket"
            value={stats.totalTickets.toLocaleString()}
            description="Seluruh sistem"
            icon={Ticket}
            variant="primary"
            href="/tickets"
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
            title="Sedang Dikerjakan"
            value={stats.inProgressTickets}
            description="Dalam proses"
            icon={Clock}
            variant="info"
            href="/tickets?status=IN_PROGRESS"
          />
          <StatCard
            title="Selesai Bulan Ini"
            value={stats.resolvedThisMonth}
            description="Tiket terselesaikan"
            icon={CheckCircle2}
            variant="success"
            href="/tickets?status=RESOLVED"
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
      </div>
    </div>
  );
}

// ============================================================================
// MANAGER Dashboard Cards - Simplified
// ============================================================================

interface ManagerDashboardCardsProps {
  stats: DashboardStats;
  branchName?: string;
}

export function ManagerDashboardCards({ stats, branchName }: ManagerDashboardCardsProps) {
  const pendingApprovals = stats.roleSpecific.pendingApprovals || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Aksi Cepat Manager
          {branchName && (
            <Badge variant="outline" className="ml-2">{branchName}</Badge>
          )}
        </h2>
      </div>

      {/* Quick Actions - Only 4 main actions */}
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
          title="Tiket Cabang"
          description="Lihat tiket cabang Anda"
          icon={Ticket}
          href="/manager/tickets"
          variant="primary"
        />
        <QuickActionCard
          title="Laporan Cabang"
          description="Performa dan statistik"
          icon={BarChart3}
          href="/reports/branch"
          variant="success"
        />
        <QuickActionCard
          title="Kelola Staf"
          description="Pengguna cabang Anda"
          icon={Users}
          href="/manager/users"
          variant="info"
        />
      </div>
    </div>
  );
}

// ============================================================================
// MANAGER_IT Dashboard Cards - Simplified
// ============================================================================

interface ManagerITDashboardCardsProps {
  stats: DashboardStats;
}

export function ManagerITDashboardCards({ stats }: ManagerITDashboardCardsProps) {
  const networkIncidents = stats.roleSpecific.networkIncidents || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Network className="h-5 w-5" />
          Aksi Cepat IT Manager
        </h2>
      </div>

      {/* Quick Actions - Only 4 main actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          title="Monitor Jaringan"
          description="Status jaringan real-time"
          icon={Network}
          href="/monitoring/network"
          variant="primary"
          badge={networkIncidents > 0 ? `${networkIncidents} insiden` : undefined}
          badgeVariant="destructive"
        />
        <QuickActionCard
          title="Kelola Shift"
          description="Jadwal shift teknisi"
          icon={CalendarClock}
          href="/manager/shift-schedules"
          variant="info"
        />
        <QuickActionCard
          title="Status ATM"
          description="Monitor semua ATM"
          icon={MonitorSpeaker}
          href="/monitoring/atms"
          variant="warning"
        />
        <QuickActionCard
          title="Laporan IT"
          description="Analisis performa IT"
          icon={FileText}
          href="/reports"
          variant="success"
        />
      </div>
    </div>
  );
}

// ============================================================================
// TECHNICIAN Dashboard Cards - Already Simplified
// ============================================================================

interface TechnicianDashboardCardsProps {
  stats: DashboardStats;
  supportGroupName?: string;
}

export function TechnicianDashboardCards({ stats, supportGroupName }: TechnicianDashboardCardsProps) {
  const myOpenTickets = stats.roleSpecific.myOpenTickets || 0;
  const myAssignedTickets = stats.roleSpecific.myAssignedTickets || 0;

  return (
    <div className="space-y-6">
      {/* Ticket Statistics - Support Group Tickets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistik Tiket
            {supportGroupName && (
              <Badge variant="outline" className="ml-2">{supportGroupName}</Badge>
            )}
          </h2>
          <Link href="/tickets" className="text-sm text-primary hover:underline flex items-center gap-1">
            Lihat Semua <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tiket Grup"
            value={stats.totalTickets}
            description="Total tiket support group"
            icon={Ticket}
            variant="primary"
            href="/tickets"
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
            title="Sedang Dikerjakan"
            value={stats.inProgressTickets}
            description="Dalam proses"
            icon={Clock}
            variant="info"
            href="/tickets?status=IN_PROGRESS"
          />
          <StatCard
            title="Selesai Bulan Ini"
            value={stats.resolvedThisMonth}
            description="Tiket terselesaikan"
            icon={CheckCircle2}
            variant="success"
            href="/tickets?status=RESOLVED"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Aksi Cepat Teknisi
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Workbench"
            description="Kelola tiket yang ditugaskan"
            icon={Briefcase}
            href="/technician/workbench"
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
            href="/technician/shifts"
            variant="success"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// USER Dashboard Cards - Simplified
// ============================================================================

interface UserDashboardCardsProps {
  stats: DashboardStats;
  branchName?: string;
}

export function UserDashboardCards({ stats, branchName }: UserDashboardCardsProps) {
  const myPendingTickets = stats.roleSpecific.myPendingTickets || (stats.openTickets + stats.inProgressTickets);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Layanan Cepat
          {branchName && (
            <Badge variant="outline" className="ml-2">{branchName}</Badge>
          )}
        </h2>
      </div>

      {/* Quick Actions - Only 4 main actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          title="Buat Tiket Baru"
          description="Laporkan masalah atau permintaan"
          icon={Plus}
          href="/tickets/new"
          variant="primary"
        />
        <QuickActionCard
          title="Lihat Tiket"
          description="Lihat status tiket Anda"
          icon={Ticket}
          href="/tickets"
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
          href="/tickets?status=RESOLVED,CLOSED"
          variant="default"
        />
      </div>
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
