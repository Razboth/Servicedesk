'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, Users, AlertTriangle, CheckCircle, XCircle, Pause, Play, Shield } from 'lucide-react'
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
    if (status === 'loading') return // Still loading
    if (!session) redirect('/auth/signin')
    
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
    
    if (session) {
      fetchDashboardData()
    }
  }, [session, status])

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 dark:border-amber-400"></div>
          <span className="text-amber-700 dark:text-amber-400">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session || !stats) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Decorative background elements - warm colors */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-r from-amber-300 to-orange-300 dark:from-amber-900/20 dark:to-orange-900/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-yellow-300 to-amber-300 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-orange-300 to-red-300 dark:from-orange-900/20 dark:to-red-900/20 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
        {/* Header Section */}
        <div className="mb-8">
          <Card className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 dark:bg-gray-900/70 backdrop-blur-xl border-amber-200/30 dark:border-gray-700/30 shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                  <p className="text-amber-800 dark:text-gray-400 mt-2">
                    Monitor and manage IT services across all Bank SulutGo branches
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <Badge variant="outline" className="px-3 py-1 text-xs font-medium border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
                    <Clock className="w-3 h-3 mr-1" />
                    Live Data
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-white/80 to-amber-50/50 dark:bg-gray-900/70 backdrop-blur-xl border-amber-100/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tickets</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-400/10 dark:to-blue-500/10 rounded-lg flex items-center justify-center">
                <TicketIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTickets.toLocaleString()}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-amber-50/50 dark:bg-gray-900/70 backdrop-blur-xl border-amber-100/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Open Tickets</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/10 dark:to-orange-500/10 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.openTickets}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500">Requires attention</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-amber-50/50 dark:bg-gray-900/70 backdrop-blur-xl border-amber-100/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-400/10 dark:to-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolvedTickets.toLocaleString()}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500">This month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-amber-50/50 dark:bg-gray-900/70 backdrop-blur-xl border-amber-100/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Resolution</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-400/10 dark:to-purple-500/10 rounded-lg flex items-center justify-center">
                <ClockIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgResolutionTime}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-amber-50/50 dark:bg-gray-900/70 backdrop-blur-xl border-amber-100/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">SLA Compliance</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 dark:from-indigo-400/10 dark:to-indigo-500/10 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.slaCompliance}%</div>
              <p className="text-xs text-gray-500 dark:text-gray-500">This month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-amber-50/50 dark:bg-gray-900/70 backdrop-blur-xl border-amber-100/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</CardTitle>
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500/10 to-teal-600/10 dark:from-teal-400/10 dark:to-teal-500/10 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsers}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500">Online now</p>
            </CardContent>
          </Card>
        </div>



        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-white/80 to-amber-50/50 dark:bg-gray-900/70 backdrop-blur-xl border-amber-100/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
            <CardHeader>
              <CardTitle className="text-lg text-amber-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                Create New Ticket
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-gray-400">
                Report an incident or request service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-500 dark:to-orange-500 text-white hover:from-amber-700 hover:to-orange-700 dark:hover:from-amber-600 dark:hover:to-orange-600 shadow-lg transition-all duration-300"
                onClick={() => router.push('/tickets')}
              >
                Create Ticket
              </Button>
            </CardContent>
          </Card>

          {/* SOC Parser Card - Only visible for Security Analysts */}
          {(session.user.role === 'SECURITY_ANALYST' || session.user.supportGroupCode === 'SECURITY_OPS') && (
            <Card className="bg-gradient-to-br from-red-50/80 to-orange-50/50 dark:bg-gray-900/70 backdrop-blur-xl border-red-200/30 dark:border-red-800/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    SOC Parser
                  </CardTitle>
                  <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Parse security alerts and create SOC tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg transition-all duration-300"
                  onClick={() => router.push('/security/soc-parser')}
                >
                  Open SOC Parser
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}