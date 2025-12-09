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
import {
  LayoutDashboard,
  Ticket,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Users,
  Target,
  ArrowRight,
  RefreshCw,
  Plus,
  ClipboardCheck,
  Activity,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTicketUrlId } from '@/lib/utils/ticket-utils'

// Types
interface DashboardStats {
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  resolvedThisMonth: number
  avgResolutionTime: string
  slaCompliance: number
  activeUsers: number
  trends: {
    ticketTrend: number
    weeklyTrend: number
    thisMonthTickets: number
    lastMonthTickets: number
  }
  priority: {
    urgent: number
    high: number
  }
  roleSpecific: {
    myOpenTickets?: number
    myAssignedTickets?: number
    myWorkload?: number
    pendingApprovals?: number
    branchTickets?: number
    teamPerformance?: number
    systemWideTickets?: number
    allBranches?: boolean
  }
}

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

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
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

// Stats Card Component
interface StatCardProps {
  title: string
  value: string | number
  description: string
  trend?: number
  icon: React.ElementType
  variant: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'default'
  href?: string
}

function StatCard({ title, value, description, trend, icon: Icon, variant, href }: StatCardProps) {
  const variantStyles = {
    primary: 'from-primary/10 to-primary/5 border-primary/20 dark:from-primary/20 dark:to-primary/10',
    success: 'from-[hsl(var(--success)/0.1)] to-[hsl(var(--success)/0.05)] border-[hsl(var(--success)/0.2)]',
    warning: 'from-[hsl(var(--warning)/0.1)] to-[hsl(var(--warning)/0.05)] border-[hsl(var(--warning)/0.2)]',
    destructive: 'from-destructive/10 to-destructive/5 border-destructive/20',
    info: 'from-[hsl(var(--info)/0.1)] to-[hsl(var(--info)/0.05)] border-[hsl(var(--info)/0.2)]',
    default: 'from-muted/50 to-muted/25 border-border'
  }

  const iconStyles = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]',
    destructive: 'bg-destructive/10 text-destructive',
    info: 'bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))]',
    default: 'bg-muted text-muted-foreground'
  }

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
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

// Recent Ticket Item Component
function RecentTicketItem({ ticket, onClick }: { ticket: RecentTicket; onClick: () => void }) {
  const StatusIcon = getStatusIcon(ticket.status)

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
            {ticket.priority}
          </Badge>
          <Badge variant="outline" className={cn('text-xs px-1.5 py-0', getStatusColor(ticket.status))}>
            {ticket.status.replace('_', ' ')}
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
        setError('Failed to fetch dashboard data')
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Error loading dashboard')
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
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => fetchDashboardData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session || !stats) {
    return null
  }

  const userRole = session.user?.role || 'USER'
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole)
  const isManager = userRole === 'MANAGER'
  const isTechnician = userRole === 'TECHNICIAN'

  // Get role-specific greeting
  const getRoleGreeting = () => {
    if (isAdmin) return 'System Overview'
    if (isManager) return 'Branch Operations'
    if (isTechnician) return 'Your Workload'
    return 'Service Portal'
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
          title={`Welcome back, ${dashboardUser?.name || session.user?.name || 'User'}`}
          description={`${getRoleGreeting()} - ${dashboardUser?.branch || 'All Branches'}`}
          icon={<LayoutDashboard className="h-6 w-6" />}
          action={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium">
                <Activity className="w-3 h-3 mr-1.5 animate-pulse text-success" />
                Live Data
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

        {/* Shift Schedule Notification */}
        <ShiftScheduleNotification />

        {/* Priority Alert Banner */}
        {(stats.priority.urgent > 0 || stats.priority.high > 0) && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Attention Required
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.priority.urgent > 0 && (
                        <span className="text-destructive font-medium">{stats.priority.urgent} urgent</span>
                      )}
                      {stats.priority.urgent > 0 && stats.priority.high > 0 && ' and '}
                      {stats.priority.high > 0 && (
                        <span className="text-[hsl(var(--warning))] font-medium">{stats.priority.high} high priority</span>
                      )}
                      {' '}ticket{(stats.priority.urgent + stats.priority.high) > 1 ? 's' : ''} need attention
                    </p>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => router.push('/tickets?priority=CRITICAL,EMERGENCY,HIGH&status=OPEN,IN_PROGRESS')}
                >
                  View Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            <Link href="/reports" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all reports <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Tickets"
              value={stats.totalTickets.toLocaleString()}
              description="All time"
              trend={stats.trends.ticketTrend}
              icon={Ticket}
              variant="primary"
              href="/tickets"
            />
            <StatCard
              title="Open Tickets"
              value={stats.openTickets}
              description="Awaiting action"
              icon={AlertCircle}
              variant="warning"
              href="/tickets?status=OPEN"
            />
            <StatCard
              title="In Progress"
              value={stats.inProgressTickets}
              description="Being worked on"
              icon={Clock}
              variant="info"
              href="/tickets?status=IN_PROGRESS"
            />
            <StatCard
              title="Resolved This Month"
              value={stats.resolvedThisMonth}
              description={`${stats.avgResolutionTime} avg resolution`}
              icon={CheckCircle2}
              variant="success"
              href="/tickets?status=RESOLVED,CLOSED"
            />
          </div>

          {/* Secondary Stats Row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="SLA Compliance"
              value={`${stats.slaCompliance}%`}
              description="Meeting targets"
              icon={Target}
              variant={stats.slaCompliance >= 90 ? 'success' : stats.slaCompliance >= 70 ? 'warning' : 'destructive'}
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers}
              description="Last 30 days"
              icon={Users}
              variant="default"
            />

            {/* Role-specific stats */}
            {isTechnician && stats.roleSpecific.myOpenTickets !== undefined && (
              <StatCard
                title="My Open Tickets"
                value={stats.roleSpecific.myOpenTickets}
                description="Assigned to you"
                icon={ClipboardCheck}
                variant="info"
                href="/tickets?assignedToMe=true&status=OPEN,IN_PROGRESS"
              />
            )}

            {isManager && stats.roleSpecific.pendingApprovals !== undefined && (
              <StatCard
                title="Pending Approvals"
                value={stats.roleSpecific.pendingApprovals}
                description="Awaiting your review"
                icon={ClipboardCheck}
                variant={stats.roleSpecific.pendingApprovals > 0 ? 'warning' : 'success'}
                href="/manager/approvals"
              />
            )}

            {(isAdmin || !isTechnician && !isManager) && (
              <StatCard
                title="This Week"
                value={stats.trends.thisMonthTickets}
                description="New tickets"
                trend={stats.trends.weeklyTrend}
                icon={Activity}
                variant="default"
              />
            )}

            <StatCard
              title="Avg Resolution"
              value={stats.avgResolutionTime}
              description="Response time"
              icon={Clock}
              variant="default"
            />
          </div>
        </div>

        {/* Recent Tickets Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Tickets List */}
          <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-foreground">Recent Tickets</CardTitle>
                <Link href="/tickets">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentTickets.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No recent tickets</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => router.push('/tickets/simple/create')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first ticket
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
                    View all {recentTickets.length} tickets
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          {/* Status Summary */}
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">Status Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-info" />
                    <span className="text-sm text-foreground">Open</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{stats.openTickets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-sm text-foreground">In Progress</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{stats.inProgressTickets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-sm text-foreground">Resolved</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">{stats.resolvedTickets}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Priority breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Priority Distribution</h4>
                {stats.priority.urgent > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    </div>
                    <span className="text-sm font-medium text-destructive">{stats.priority.urgent}</span>
                  </div>
                )}
                {stats.priority.high > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning-soft" className="text-xs">High</Badge>
                    </div>
                    <span className="text-sm font-medium text-[hsl(var(--warning))]">{stats.priority.high}</span>
                  </div>
                )}
                {stats.priority.urgent === 0 && stats.priority.high === 0 && (
                  <p className="text-sm text-muted-foreground">No urgent or high priority tickets</p>
                )}
              </div>

              {/* Quick links */}
              <div className="border-t border-border pt-4 space-y-2">
                <Link href="/tickets?status=OPEN">
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>View open tickets</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/reports/monthly">
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>Monthly summary</span>
                    <ChevronRight className="h-4 w-4" />
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
