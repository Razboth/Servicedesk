'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { ModernStatsCards } from '@/components/dashboard/modern-stats-cards'
import { SimpleActivityFeed } from '@/components/dashboard/simple-activity-feed'
import { AnnouncementCarousel } from '@/components/announcements/announcement-carousel'
import { ShiftScheduleNotification } from '@/components/dashboard/shift-schedule-notification'
import { Clock, AlertTriangle, Shield, LayoutDashboard, Ticket, BookOpen, FileBarChart, Zap } from 'lucide-react'

interface DashboardStats {
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  avgResolutionTime: string
  slaCompliance: number
  activeUsers: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) return

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

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session || !stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
      </div>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Section */}
        <PageHeader
          title="Dashboard"
          description="Monitor and manage IT services across all Bank SulutGo branches"
          icon={<LayoutDashboard className="h-6 w-6" />}
          action={
            <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium">
              <Clock className="w-3 h-3 mr-1.5" />
              Live Data
            </Badge>
          }
        />

        {/* Announcement Carousel */}
        <AnnouncementCarousel />

        {/* Shift Schedule Notification */}
        <ShiftScheduleNotification />

        {/* Modern Stats Cards */}
        <div>
          <ModernStatsCards />
        </div>

        {/* Activity Feed */}
        <div>
          <SimpleActivityFeed />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card hoverable className="group">
              <CardHeader transparent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Ticket className="h-5 w-5" />
                  </div>
                </div>
                <CardTitle className="text-base mt-3">Create Ticket</CardTitle>
                <CardDescription>
                  Report an issue or request
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => router.push('/tickets/create')}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </CardContent>
            </Card>

            <Card hoverable className="group">
              <CardHeader transparent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/50 text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <BookOpen className="h-5 w-5" />
                  </div>
                </div>
                <CardTitle className="text-base mt-3">Knowledge Base</CardTitle>
                <CardDescription>
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

            <Card hoverable className="group">
              <CardHeader transparent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/50 text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
                <CardTitle className="text-base mt-3">My Tickets</CardTitle>
                <CardDescription>
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

            <Card hoverable className="group">
              <CardHeader transparent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/50 text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <FileBarChart className="h-5 w-5" />
                  </div>
                </div>
                <CardTitle className="text-base mt-3">Reports</CardTitle>
                <CardDescription>
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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Security Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card hoverable className="group">
                <CardHeader transparent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                      <Shield className="h-5 w-5" />
                    </div>
                  </div>
                  <CardTitle className="text-base mt-3">SOC Parser</CardTitle>
                  <CardDescription>
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

              <Card hoverable className="group">
                <CardHeader transparent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>
                  <CardTitle className="text-base mt-3">Antivirus Alert</CardTitle>
                  <CardDescription>
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
          </div>
        )}
      </main>
    </div>
  )
}
