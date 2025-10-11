'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { ModernStatsCards } from '@/components/dashboard/modern-stats-cards'
import { SimpleActivityFeed } from '@/components/dashboard/simple-activity-feed'
import { AnnouncementCarousel } from '@/components/announcements/announcement-carousel'
import { ShiftScheduleNotification } from '@/components/dashboard/shift-schedule-notification'
import { CalendarDays, Clock, Users, AlertTriangle, CheckCircle, XCircle, Pause, Play, Shield, LayoutDashboard } from 'lucide-react'
// Simple SVG icons as components
const TicketIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
)

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
)

const UserGroupIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const ChartBarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

interface DashboardStats {
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  avgResolutionTime: string
  slaCompliance: number
  activeUsers: number
}



// Remove mock data - will be fetched from API

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'LOW': return 'priority-low'
    case 'MEDIUM': return 'priority-medium'
    case 'HIGH': return 'priority-high'
    case 'CRITICAL': return 'priority-critical'
    case 'EMERGENCY': return 'priority-emergency'
    default: return 'priority-low'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'OPEN': return 'status-open'
    case 'IN_PROGRESS': return 'status-in-progress'
    case 'RESOLVED': return 'status-resolved'
    case 'CLOSED': return 'status-closed'
    default: return 'status-open'
  }
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Trust middleware to handle authentication redirects
    if (status === 'loading') return
    if (!session) return

    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        } else {
          console.error('Failed to fetch dashboard data')
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [session, status])

  // Show loading state while session or data is loading
  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-cream-100 dark:bg-brown-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-400 dark:border-brown-200"></div>
          <span className="text-brown-700 dark:text-cream-200">Loading...</span>
        </div>
      </div>
    )
  }

  // Don't render if no session (middleware will redirect)
  if (!session || !stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-brown-950">
      {/* Decorative background elements - subtle warm */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-cream-400/20 to-brown-400/20 dark:from-warm-dark-100/20 dark:to-brown-700/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-cream-300/20 to-cream-400/20 dark:from-warm-dark-200/20 dark:to-warm-dark-100/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-brown-300/20 to-brown-400/20 dark:from-brown-700/20 dark:to-brown-600/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <PageHeader
          title="Dashboard"
          description="Monitor and manage IT services across all Bank SulutGo branches"
          icon={<LayoutDashboard className="h-6 w-6" />}
          action={
            <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-brown-400 dark:border-brown-600 text-brown-700 dark:text-brown-200">
              <Clock className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
          }
        />

        {/* Announcement Carousel */}
        <AnnouncementCarousel />

        {/* Shift Schedule Notification - Shows today's shift and upcoming schedule */}
        <ShiftScheduleNotification />

        {/* Modern Stats Cards */}
        <div className="mb-8">
          <ModernStatsCards />
        </div>

        {/* Activity Feed and Quick Actions Grid */}
        {/* Activity Feed - Full width */}
        <div className="mb-8">
          <SimpleActivityFeed />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-brown-900 dark:text-cream-100">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Create Ticket</CardTitle>
                  <TicketIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="text-sm">
                  Report an issue or request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => router.push('/tickets/create')}
                >
                  New Ticket
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Knowledge Base</CardTitle>
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <CardDescription className="text-sm">
                  Browse solutions and guides
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push('/knowledge')}
                >
                  Browse Articles
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">My Tickets</CardTitle>
                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="text-sm">
                  View your open tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/tickets')}
                >
                  View Tickets
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Reports</CardTitle>
                  <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="text-sm">
                  View analytics and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/reports')}
                >
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Security Actions - Only visible for Security Analysts */}
        {(session.user.role === 'SECURITY_ANALYST' || session.user.supportGroupCode === 'SECURITY_OPS') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">SOC Parser</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardDescription className="text-sm">
                  Parse security alerts and create SOC tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => router.push('/security/soc-parser')}
                >
                  Open SOC Parser
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Antivirus Alert</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <CardDescription className="text-sm">
                  Report antivirus detections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => router.push('/security/antivirus-alert')}
                >
                  Report Alert
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}