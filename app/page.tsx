'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { AnnouncementCarousel } from '@/components/announcements/announcement-carousel'
import { ShiftScheduleNotification } from '@/components/dashboard/shift-schedule-notification'
import { RoleDashboardCards, type DashboardStats, type UserRole } from '@/components/dashboard/role-dashboard-cards'
import {
  LayoutDashboard,
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTicketUrlId } from '@/lib/utils/ticket-utils'

// Types
interface RecentTicket {
  id: string
  ticketNumber: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY'
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ON_HOLD'
  service: string
  assignee: string
  creator: string
  branch: string
  createdAt: string
  updatedAt: string
}

interface DashboardUser {
  name: string
  role: string
  branch: string
  supportGroup: string
}

// Helper functions
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    OPEN: 'bg-info/10 text-info border-info/20',
    IN_PROGRESS: 'bg-warning/10 text-warning border-warning/20',
    RESOLVED: 'bg-success/10 text-success border-success/20',
    CLOSED: 'bg-muted text-muted-foreground border-muted',
    ON_HOLD: 'bg-secondary text-secondary-foreground border-secondary/50'
  }
  return colors[status] || colors.OPEN
}

const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    LOW: 'bg-info/10 text-info border-info/20',
    MEDIUM: 'bg-warning/10 text-warning border-warning/20',
    HIGH: 'bg-destructive/10 text-destructive border-destructive/20',
    CRITICAL: 'bg-destructive text-destructive-foreground border-destructive',
    EMERGENCY: 'bg-destructive text-destructive-foreground border-destructive'
  }
  return colors[priority] || colors.MEDIUM
}

const getStatusIcon = (status: string) => {
  const icons: Record<string, React.ElementType> = {
    OPEN: AlertCircle,
    IN_PROGRESS: Clock,
    RESOLVED: CheckCircle2,
    CLOSED: CheckCircle2,
    ON_HOLD: AlertTriangle
  }
  return icons[status] || AlertCircle
}

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Baru saja'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`
  return date.toLocaleDateString('id-ID')
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-5 w-32 mt-3" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent tickets skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// Recent Ticket Item Component
function RecentTicketItem({ ticket, onClick }: { ticket: RecentTicket; onClick: () => void }) {
  const StatusIcon = getStatusIcon(ticket.status)

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      OPEN: 'Terbuka',
      IN_PROGRESS: 'Diproses',
      RESOLVED: 'Selesai',
      CLOSED: 'Ditutup',
      ON_HOLD: 'Ditunda'
    }
    return labels[status] || status
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      LOW: 'Rendah',
      MEDIUM: 'Sedang',
      HIGH: 'Tinggi',
      CRITICAL: 'Kritis',
      EMERGENCY: 'Darurat'
    }
    return labels[priority] || priority
  }

  return (
    <div
      className="group flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className={cn('mt-0.5 p-1.5 rounded-md', getStatusColor(ticket.status))}>
        <StatusIcon className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate text-foreground">{ticket.title}</p>
          <span className="text-xs text-muted-foreground flex-shrink-0">#{ticket.ticketNumber}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span>{ticket.creator}</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{getRelativeTime(ticket.createdAt)}</span>
          <span className="text-muted-foreground/50">|</span>
          <Badge variant="outline" className={cn('text-xs px-1.5 py-0', getPriorityColor(ticket.priority))}>
            {getPriorityLabel(ticket.priority)}
          </Badge>
          <Badge variant="outline" className={cn('text-xs px-1.5 py-0', getStatusColor(ticket.status))}>
            {getStatusLabel(ticket.status)}
          </Badge>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [dashboardUser, setDashboardUser] = useState<DashboardUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true)
    try {
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setRecentTickets(data.recentTickets)
        setDashboardUser(data.user)
        setError(null)
      } else {
        setError('Gagal memuat data dashboard')
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Terjadi kesalahan saat memuat dashboard')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) return

    fetchDashboardData()

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchDashboardData()
    }, 60000)

    return () => clearInterval(interval)
  }, [session, status, fetchDashboardData])

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // Loading state
  if (status === 'loading' || isLoading) {
    return <DashboardSkeleton />
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Gagal Memuat Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => fetchDashboardData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session || !stats) {
    return null
  }

  const userRole = (session.user?.role || 'USER') as UserRole
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole)
  const isManager = userRole === 'MANAGER'
  const isManagerIT = userRole === 'MANAGER_IT'
  const isTechnician = userRole === 'TECHNICIAN'

  // Get role-specific greeting in Indonesian
  const getRoleGreeting = () => {
    if (isAdmin) return 'Overview Sistem'
    if (isManager) return 'Operasional Cabang'
    if (isManagerIT) return 'Infrastruktur IT'
    if (isTechnician) return 'Beban Kerja Anda'
    return 'Portal Layanan'
  }

  // Get role label in Indonesian
  const getRoleLabel = () => {
    const roleLabels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Administrator',
      MANAGER: 'Manager Cabang',
      MANAGER_IT: 'Manager IT',
      TECHNICIAN: 'Teknisi',
      USER: 'Pengguna',
      SECURITY_ANALYST: 'Security Analyst'
    }
    return roleLabels[userRole] || 'Pengguna'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      </div>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Section */}
        <PageHeader
          title={`Selamat datang, ${dashboardUser?.name || session.user?.name || 'Pengguna'}`}
          description={`${getRoleGreeting()} - ${dashboardUser?.branch || 'Semua Cabang'}`}
          icon={<LayoutDashboard className="h-6 w-6" />}
          action={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium">
                {getRoleLabel()}
              </Badge>
              <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium">
                <Activity className="w-3 h-3 mr-1.5 animate-pulse text-success" />
                Data Langsung
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchDashboardData(true)}
                disabled={isRefreshing}
                className="h-9 w-9"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </div>
          }
        />

        {/* Announcement Carousel */}
        <AnnouncementCarousel />

        {/* Shift Schedule Notification - Only for Technicians and IT Managers */}
        {(isTechnician || isManagerIT) && <ShiftScheduleNotification />}

        {/* Priority Alert Banner - For Admin, Manager, and Technician */}
        {(isAdmin || isManager || isManagerIT || isTechnician) && (stats.priority.urgent > 0 || stats.priority.high > 0) && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Perhatian Diperlukan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.priority.urgent > 0 && (
                        <span className="text-destructive font-medium">{stats.priority.urgent} darurat</span>
                      )}
                      {stats.priority.urgent > 0 && stats.priority.high > 0 && ' dan '}
                      {stats.priority.high > 0 && (
                        <span className="text-[hsl(var(--warning))] font-medium">{stats.priority.high} prioritas tinggi</span>
                      )}
                      {' '}tiket memerlukan perhatian
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => router.push('/tickets?priority=CRITICAL,EMERGENCY,HIGH&status=OPEN,IN_PROGRESS')}
                >
                  Lihat Sekarang
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role-Based Dashboard Cards */}
        <RoleDashboardCards
          stats={stats}
          userRole={userRole}
          branchName={dashboardUser?.branch}
          supportGroupName={dashboardUser?.supportGroup}
        />

        {/* Recent Tickets Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tickets List */}
          <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-foreground">Tiket Terbaru</CardTitle>
                <Link href="/tickets">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Lihat Semua
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentTickets.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada tiket</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => router.push('/tickets/simple/create')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Buat tiket pertama
                  </Button>
                </div>
              ) : (
                recentTickets.slice(0, 7).map((ticket) => (
                  <RecentTicketItem
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => {
                      const ticketUrlId = getTicketUrlId(ticket.ticketNumber) || ticket.id
                      router.push(`/tickets/${ticketUrlId}`)
                    }}
                  />
                ))
              )}
            </CardContent>
            {recentTickets.length > 7 && (
              <CardFooter className="pt-0">
                <Link href="/tickets" className="w-full">
                  <Button variant="outline" className="w-full">
                    Lihat semua {recentTickets.length} tiket
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          {/* Status Summary */}
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">Ringkasan Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-info" />
                    <span className="text-sm text-foreground">Terbuka</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{stats.openTickets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-sm text-foreground">Diproses</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{stats.inProgressTickets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-sm text-foreground">Selesai</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{stats.resolvedTickets}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Priority breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Distribusi Prioritas</h4>
                {stats.priority.urgent > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">Darurat</Badge>
                    </div>
                    <span className="text-sm font-medium text-destructive">{stats.priority.urgent}</span>
                  </div>
                )}
                {stats.priority.high > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning-soft" className="text-xs">Tinggi</Badge>
                    </div>
                    <span className="text-sm font-medium text-[hsl(var(--warning))]">{stats.priority.high}</span>
                  </div>
                )}
                {stats.priority.urgent === 0 && stats.priority.high === 0 && (
                  <p className="text-sm text-muted-foreground">Tidak ada tiket darurat atau prioritas tinggi</p>
                )}
              </div>

              {/* Quick links */}
              <div className="border-t border-border pt-4 space-y-2">
                <Link href="/tickets?status=OPEN">
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>Lihat tiket terbuka</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/reports/monthly">
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>Ringkasan bulanan</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
