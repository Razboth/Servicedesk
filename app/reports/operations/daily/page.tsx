'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  FileDown, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  Building,
  Activity,
  Calendar,
  AlertCircle,
  Timer,
  Zap
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface DailyReportData {
  date: string
  summary: {
    todayTotal: number
    yesterdayTotal: number
    changePercent: number
    openUrgent: number
    openHigh: number
    overdueCount: number
    criticalCount: number
    resolvedCount: number
    averageResolutionTime: number
    technicianCount: number
    availableTechnicians: number
  }
  todaysTickets: any[]
  openTickets: any[]
  overdueTickets: any[]
  criticalIncidents: any[]
  resolvedToday: any[]
  technicianWorkload: any[]
  statusDistribution: { status: string; count: number }[]
  priorityDistribution: { priority: string; count: number }[]
  weekTrend: { date: string; count: number }[]
  branchStats: any[]
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#eab308',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#10b981',
  CLOSED: '#6b7280',
  PENDING: '#f97316',
  PENDING_APPROVAL: '#a855f7',
  CANCELLED: '#ef4444'
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#eab308',
  LOW: '#22c55e'
}

export default function DailyOperationsReport() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DailyReportData | null>(null)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session, selectedDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/operations/daily?date=${selectedDate}`)
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching daily report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async () => {
    if (!data) return
    
    const reportContent = `
DAILY OPERATIONS REPORT
Date: ${format(new Date(selectedDate), 'MMMM dd, yyyy')}

SUMMARY
=======
Today's Tickets: ${data.summary.todayTotal}
Change from Yesterday: ${data.summary.changePercent}%
Open Urgent: ${data.summary.openUrgent}
Open High Priority: ${data.summary.openHigh}
Overdue Tickets: ${data.summary.overdueCount}
Critical Incidents: ${data.summary.criticalCount}
Resolved Today: ${data.summary.resolvedCount}
Average Resolution Time: ${data.summary.averageResolutionTime} hours

TECHNICIAN STATUS
================
Active Technicians: ${data.summary.technicianCount}
Available Technicians: ${data.summary.availableTechnicians}

TOP ISSUES
==========
${data.openTickets.slice(0, 5).map((t: any, i: number) => 
  `${i + 1}. [${t.priority}] ${t.title} - ${t.service.name}`
).join('\n')}

CRITICAL INCIDENTS
==================
${data.criticalIncidents.map((t: any) => 
  `• #${t.ticketNumber}: ${t.title} - Assigned to: ${t.assignedTo?.name || 'Unassigned'}`
).join('\n')}
    `.trim()

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daily-report-${selectedDate}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!session) return null

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading daily report...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No data available</h3>
          <p className="text-muted-foreground text-sm">Unable to load the daily operations report</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Daily Operations Report</h1>
            <p className="text-muted-foreground mt-1">
              Real-time operational snapshot for {format(new Date(selectedDate), 'MMMM dd, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              max={format(new Date(), 'yyyy-MM-dd')}
            />
            <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportReport} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          <Card className={`border-l-4 ${data.summary.changePercent >= 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.todayTotal}</p>
                  <p className="text-xs text-muted-foreground">Today's Tickets</p>
                </div>
                <div className="text-right">
                  {data.summary.changePercent !== 0 && (
                    <div className="flex items-center gap-1">
                      {data.summary.changePercent > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                      <span className={`text-sm font-bold ${data.summary.changePercent > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {Math.abs(data.summary.changePercent)}%
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">vs yesterday</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.openUrgent}</p>
                  <p className="text-xs text-muted-foreground">Open Urgent</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.overdueCount}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.criticalCount}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.resolvedCount}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.availableTechnicians}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <Users className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Week Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                7-Day Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.weekTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(date) => format(new Date(date as string), 'MMMM dd, yyyy')}
                    formatter={(value) => [`${value} tickets`, 'Count']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {data.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#999'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Critical Incidents */}
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Critical Incidents ({data.criticalIncidents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.criticalIncidents.length > 0 ? (
                <div className="space-y-2">
                  {data.criticalIncidents.slice(0, 5).map((ticket: any) => (
                    <div key={ticket.id} className="p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-mono text-xs text-red-600 dark:text-red-400">
                            #{ticket.ticketNumber}
                          </p>
                          <p className="text-sm font-medium truncate">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {ticket.assignedTo ? (
                              <>Assigned to: {ticket.assignedTo.name}</>
                            ) : (
                              <span className="text-red-500">Unassigned</span>
                            )}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs">
                          URGENT
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No critical incidents
                </p>
              )}
            </CardContent>
          </Card>

          {/* Overdue Tickets */}
          <Card className="border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                Overdue Tickets ({data.overdueTickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.overdueTickets.length > 0 ? (
                <div className="space-y-2">
                  {data.overdueTickets.slice(0, 5).map((ticket: any) => (
                    <div key={ticket.id} className="p-2 bg-orange-50 dark:bg-orange-900/10 rounded border border-orange-200 dark:border-orange-800">
                      <p className="font-mono text-xs text-orange-600 dark:text-orange-400">
                        #{ticket.ticketNumber}
                      </p>
                      <p className="text-sm truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {format(new Date(ticket.createdAt), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No overdue tickets
                </p>
              )}
            </CardContent>
          </Card>

          {/* Technician Workload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Technician Workload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.technicianWorkload.slice(0, 5).map((tech: any) => (
                  <div key={tech.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{tech.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {tech.totalActive} active
                        </Badge>
                        {tech.urgentTickets > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {tech.urgentTickets} urgent
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={Math.min((tech.totalActive / 10) * 100, 100)} 
                      className="w-16 h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branch Statistics */}
        {data.branchStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Branch Activity Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {data.branchStats.slice(0, 10).map((branch: any) => (
                  <div key={branch.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="font-medium text-sm">{branch.code}</p>
                    <p className="text-xs text-muted-foreground truncate">{branch.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {branch.totalTickets} tickets
                      </Badge>
                      {branch.urgentTickets > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {branch.urgentTickets}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}