'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  FileDown,
  RefreshCw,
  Ticket,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Building2,
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  AlertTriangle,
  Server
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

interface CustomFieldDefinition {
  id: string
  name: string
  label: string
  type: string
}

interface TicketData {
  ticketNumber: string
  title: string
  status: string
  priority: string
  createdAt: string
  resolvedAt: string | null
  closedAt: string | null
  branch: { name: string; code: string } | null
  assignedTo: { name: string } | null
  customFields: Record<string, string>
}

interface ATMMetrics {
  atmCode: string
  atmName: string
  atmLocation: string
  branchName: string
  branchCode: string
  currentMonthTickets: number
  lastMonthTickets: number
  changeFromLastMonth: number
  changePercentage: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  closedTickets: number
  avgResolutionTime: number
  availability: number | null
  totalDowntimeHours: number
  activeIncidents: number
  lastPingStatus: string | null
  networkVendor: string | null
  ipAddress: string | null
  errorTypes: { type: string; count: number }[]
}

interface ErrorTypeBreakdown {
  errorType: string
  count: number
  percentage: number
}

interface ATMReportData {
  summary: {
    totalTickets: number
    openTickets: number
    inProgressTickets: number
    resolvedTickets: number
    closedTickets: number
    avgResolutionTime: number
    lastMonthTotal: number
    changeFromLastMonth: number
  }
  statusDistribution: {
    status: string
    count: number
    percentage: number
  }[]
  priorityDistribution: {
    priority: string
    count: number
    percentage: number
  }[]
  branchBreakdown: {
    branchName: string
    branchCode: string
    count: number
  }[]
  atmMetrics: ATMMetrics[]
  errorTypeBreakdown: ErrorTypeBreakdown[]
  tickets: TicketData[]
  customFieldDefinitions: CustomFieldDefinition[]
  period: {
    month: number
    year: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#eab308',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#10b981',
  CLOSED: '#6b7280',
  PENDING: '#f97316',
  PENDING_APPROVAL: '#a855f7',
  CANCELLED: '#ef4444',
  ON_HOLD: '#64748b'
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  PENDING: 'Pending',
  PENDING_APPROVAL: 'Pending Approval',
  CANCELLED: 'Cancelled',
  ON_HOLD: 'On Hold'
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#f97316',
  URGENT: '#ef4444'
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent'
}

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function ATMTechnicalIssuesReport() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [data, setData] = useState<ATMReportData | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session, selectedMonth, selectedYear])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reports/atm-technical-issues?month=${selectedMonth}&year=${selectedYear}`)
      if (!response.ok) throw new Error('Failed to fetch data')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching ATM technical issues report:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hrs`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = Math.round(hours % 24)
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`
    }
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getAvailabilityColor = (availability: number | null) => {
    if (availability === null) return 'text-gray-400'
    if (availability >= 99) return 'text-green-600'
    if (availability >= 95) return 'text-yellow-600'
    return 'text-red-600'
  }

  const exportToExcel = async () => {
    if (!data) return

    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.utils.book_new()

      // Sheet 1: Summary
      const summaryData = [
        { 'Metric': 'Report Period', 'Value': `${MONTHS[selectedMonth - 1]} ${selectedYear}` },
        { 'Metric': 'Generated On', 'Value': format(new Date(), 'MMMM dd, yyyy HH:mm') },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Total Tickets', 'Value': data.summary.totalTickets },
        { 'Metric': 'Last Month Total', 'Value': data.summary.lastMonthTotal },
        { 'Metric': 'Change from Last Month', 'Value': data.summary.changeFromLastMonth },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Open Tickets', 'Value': data.summary.openTickets },
        { 'Metric': 'In Progress Tickets', 'Value': data.summary.inProgressTickets },
        { 'Metric': 'Resolved Tickets', 'Value': data.summary.resolvedTickets },
        { 'Metric': 'Closed Tickets', 'Value': data.summary.closedTickets },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Avg Resolution Time', 'Value': formatDuration(data.summary.avgResolutionTime) }
      ]
      const summarySheet = XLSX.utils.json_to_sheet(summaryData)
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }]
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

      // Sheet 2: ATM Metrics (Most Problematic ATMs)
      const atmData = data.atmMetrics.map(atm => ({
        'ATM Code': atm.atmCode,
        'ATM Name': atm.atmName,
        'Location': atm.atmLocation,
        'Branch': atm.branchName,
        'This Month': atm.currentMonthTickets,
        'Last Month': atm.lastMonthTickets,
        'Change': atm.changeFromLastMonth,
        'Change %': `${atm.changePercentage}%`,
        'Open': atm.openTickets,
        'In Progress': atm.inProgressTickets,
        'Resolved': atm.resolvedTickets,
        'Closed': atm.closedTickets,
        'Avg Resolution': formatDuration(atm.avgResolutionTime),
        'Availability %': atm.availability !== null ? `${atm.availability}%` : 'N/A',
        'Downtime (hrs)': atm.totalDowntimeHours,
        'Active Incidents': atm.activeIncidents,
        'Network Vendor': atm.networkVendor || '-',
        'IP Address': atm.ipAddress || '-',
        'Error Types': atm.errorTypes.map(e => `${e.type} (${e.count})`).join(', ')
      }))
      const atmSheet = XLSX.utils.json_to_sheet(atmData)
      atmSheet['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 25 }, { wch: 20 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 40 }
      ]
      XLSX.utils.book_append_sheet(workbook, atmSheet, 'ATM Metrics')

      // Sheet 3: Error Type Breakdown
      const errorData = data.errorTypeBreakdown.map(e => ({
        'Error Type': e.errorType,
        'Count': e.count,
        'Percentage': `${e.percentage}%`
      }))
      const errorSheet = XLSX.utils.json_to_sheet(errorData)
      errorSheet['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, errorSheet, 'Error Types')

      // Sheet 4: Status Distribution
      const statusData = data.statusDistribution.map(s => ({
        'Status': STATUS_LABELS[s.status] || s.status,
        'Count': s.count,
        'Percentage': `${s.percentage}%`
      }))
      const statusSheet = XLSX.utils.json_to_sheet(statusData)
      statusSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Distribution')

      // Sheet 5: Priority Distribution
      const priorityData = data.priorityDistribution.map(p => ({
        'Priority': PRIORITY_LABELS[p.priority] || p.priority,
        'Count': p.count,
        'Percentage': `${p.percentage}%`
      }))
      const prioritySheet = XLSX.utils.json_to_sheet(priorityData)
      prioritySheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Priority Distribution')

      // Sheet 6: Branch Breakdown
      const branchData = data.branchBreakdown.map(b => ({
        'Branch': b.branchName,
        'Code': b.branchCode,
        'Count': b.count
      }))
      const branchSheet = XLSX.utils.json_to_sheet(branchData)
      branchSheet['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(workbook, branchSheet, 'Branch Breakdown')

      // Sheet 7: Tickets (with custom fields)
      const ticketsData = data.tickets.map(t => {
        const row: Record<string, string> = {
          'Ticket #': t.ticketNumber,
          'Title': t.title,
          'Status': STATUS_LABELS[t.status] || t.status,
          'Priority': PRIORITY_LABELS[t.priority] || t.priority,
          'Branch': t.branch?.name || '-',
          'Assigned To': t.assignedTo?.name || 'Unassigned',
          'Created': format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
          'Resolved': t.resolvedAt ? format(new Date(t.resolvedAt), 'yyyy-MM-dd HH:mm') : '-',
          'Closed': t.closedAt ? format(new Date(t.closedAt), 'yyyy-MM-dd HH:mm') : '-'
        }
        // Add custom fields
        for (const field of data.customFieldDefinitions) {
          row[field.label] = t.customFields[field.name] || '-'
        }
        return row
      })
      const ticketsSheet = XLSX.utils.json_to_sheet(ticketsData)
      XLSX.utils.book_append_sheet(workbook, ticketsSheet, 'Tickets')

      // Save file
      const filename = `atm-technical-issues-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`
      XLSX.writeFile(workbook, filename)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
    } finally {
      setExporting(false)
    }
  }

  if (!session) return null

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ATM technical issues report...</p>
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
          <p className="text-muted-foreground text-sm">Unable to load the ATM technical issues report</p>
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
            <h1 className="text-3xl font-bold">ATM Technical Issues Report</h1>
            <p className="text-muted-foreground mt-1">
              Monthly statistics for {MONTHS[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(selectedMonth)}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index + 1} value={String(index + 1)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="sm" disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Export Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.totalTickets}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <Ticket className="h-8 w-8 text-blue-500/20" />
              </div>
              <div className="mt-2 flex items-center text-xs">
                {getChangeIcon(data.summary.changeFromLastMonth)}
                <span className={`ml-1 ${data.summary.changeFromLastMonth > 0 ? 'text-red-500' : data.summary.changeFromLastMonth < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                  {data.summary.changeFromLastMonth > 0 ? '+' : ''}{data.summary.changeFromLastMonth} vs last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.openTickets}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.inProgressTickets}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <Clock className="h-8 w-8 text-blue-400/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.resolvedTickets}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.closedTickets}</p>
                  <p className="text-xs text-muted-foreground">Closed</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-500/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{formatDuration(data.summary.avgResolutionTime)}</p>
                  <p className="text-xs text-muted-foreground">Avg Resolution</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ATM Metrics - Most Problematic ATMs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Most Problematic ATMs
            </CardTitle>
            <CardDescription>
              ATMs ranked by number of technical issues with comparison to last month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">ATM Code</TableHead>
                    <TableHead className="min-w-[150px]">Name / Location</TableHead>
                    <TableHead className="text-center">This Month</TableHead>
                    <TableHead className="text-center">Last Month</TableHead>
                    <TableHead className="text-center">Change</TableHead>
                    <TableHead className="text-center">Open</TableHead>
                    <TableHead className="text-center">Availability</TableHead>
                    <TableHead className="text-center">Downtime</TableHead>
                    <TableHead className="text-center">Incidents</TableHead>
                    <TableHead>Error Types</TableHead>
                    <TableHead>Network</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.atmMetrics.length > 0 ? (
                    data.atmMetrics.slice(0, 20).map((atm) => (
                      <TableRow key={atm.atmCode}>
                        <TableCell className="font-mono font-medium">
                          {atm.atmCode}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{atm.atmName}</div>
                          <div className="text-xs text-muted-foreground">{atm.atmLocation}</div>
                          <div className="text-xs text-muted-foreground">{atm.branchName}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-lg">{atm.currentMonthTickets}</span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {atm.lastMonthTickets}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getChangeIcon(atm.changeFromLastMonth)}
                            <span className={`text-sm ${atm.changeFromLastMonth > 0 ? 'text-red-500' : atm.changeFromLastMonth < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                              {atm.changeFromLastMonth > 0 ? '+' : ''}{atm.changeFromLastMonth}
                            </span>
                          </div>
                          {atm.changePercentage !== 0 && (
                            <div className={`text-xs ${atm.changePercentage > 0 ? 'text-red-500' : 'text-green-500'}`}>
                              ({atm.changePercentage > 0 ? '+' : ''}{atm.changePercentage}%)
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {atm.openTickets > 0 ? (
                            <Badge variant="destructive">{atm.openTickets}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {atm.availability !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              {atm.availability >= 95 ? (
                                <Wifi className="h-4 w-4 text-green-500" />
                              ) : (
                                <WifiOff className="h-4 w-4 text-red-500" />
                              )}
                              <span className={`font-medium ${getAvailabilityColor(atm.availability)}`}>
                                {atm.availability}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {atm.totalDowntimeHours > 0 ? (
                            <span className="text-red-600 font-medium">
                              {formatDuration(atm.totalDowntimeHours)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {atm.activeIncidents > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              <span className="text-red-600 font-medium">{atm.activeIncidents}</span>
                            </div>
                          ) : (
                            <span className="text-green-600">✓</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {atm.errorTypes.slice(0, 3).map((error, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {error.type} ({error.count})
                              </Badge>
                            ))}
                            {atm.errorTypes.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{atm.errorTypes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {atm.networkVendor && (
                              <div className="text-muted-foreground">{atm.networkVendor}</div>
                            )}
                            {atm.ipAddress && (
                              <div className="font-mono text-muted-foreground">{atm.ipAddress}</div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        No ATM data found for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {data.atmMetrics.length > 20 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Showing top 20 of {data.atmMetrics.length} ATMs. Export to Excel for full list.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Error Type Breakdown */}
        {data.errorTypeBreakdown.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Error Type Distribution
              </CardTitle>
              <CardDescription>Most common ATM error types this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.errorTypeBreakdown.slice(0, 8)}
                      dataKey="count"
                      nameKey="errorType"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ errorType, percentage }) =>
                        `${errorType.length > 15 ? errorType.slice(0, 15) + '...' : errorType}: ${percentage}%`
                      }
                    >
                      {data.errorTypeBreakdown.slice(0, 8).map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.errorTypeBreakdown.map((error, index) => (
                    <div key={error.errorType} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-sm">{error.errorType}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{error.count}</span>
                        <span className="text-muted-foreground text-xs ml-2">({error.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Status Distribution
              </CardTitle>
              <CardDescription>Tickets by status</CardDescription>
            </CardHeader>
            <CardContent>
              {data.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.statusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ status, percentage }) =>
                        `${STATUS_LABELS[status] || status}: ${percentage}%`
                      }
                    >
                      {data.statusDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} tickets`,
                        STATUS_LABELS[name as string] || name
                      ]}
                    />
                    <Legend
                      formatter={(value) => STATUS_LABELS[value] || value}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  No status data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Priority Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Priority Distribution
              </CardTitle>
              <CardDescription>Tickets by priority level</CardDescription>
            </CardHeader>
            <CardContent>
              {data.priorityDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.priorityDistribution}
                      dataKey="count"
                      nameKey="priority"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ priority, percentage }) =>
                        `${PRIORITY_LABELS[priority] || priority}: ${percentage}%`
                      }
                    >
                      {data.priorityDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PRIORITY_COLORS[entry.priority] || CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} tickets`,
                        PRIORITY_LABELS[name as string] || name
                      ]}
                    />
                    <Legend
                      formatter={(value) => PRIORITY_LABELS[value] || value}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                  No priority data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Branch Breakdown Bar Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Branch Breakdown
            </CardTitle>
            <CardDescription>ATM technical issues by branch (Top 15)</CardDescription>
          </CardHeader>
          <CardContent>
            {data.branchBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, data.branchBreakdown.slice(0, 15).length * 35)}>
                <BarChart
                  data={data.branchBreakdown.slice(0, 15)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="branchName"
                    fontSize={11}
                    width={110}
                    tickFormatter={(value) =>
                      value.length > 18 ? `${value.slice(0, 18)}...` : value
                    }
                  />
                  <Tooltip
                    formatter={(value) => [`${value} tickets`, 'Count']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No branch data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Tickets List
            </CardTitle>
            <CardDescription>
              All ATM technical issue tickets for {MONTHS[selectedMonth - 1]} {selectedYear}
              {data.customFieldDefinitions.length > 0 && (
                <span className="ml-2 text-xs">
                  • {data.customFieldDefinitions.length} custom field{data.customFieldDefinitions.length !== 1 ? 's' : ''}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Ticket #</TableHead>
                    <TableHead className="min-w-[200px]">Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    {data.customFieldDefinitions.map(field => (
                      <TableHead key={field.id} className="whitespace-nowrap">
                        {field.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tickets.length > 0 ? (
                    data.tickets.map((ticket) => (
                      <TableRow key={ticket.ticketNumber}>
                        <TableCell className="font-mono text-sm">
                          {ticket.ticketNumber}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={ticket.title}>
                          {ticket.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${STATUS_COLORS[ticket.status]}20`,
                              borderColor: STATUS_COLORS[ticket.status],
                              color: STATUS_COLORS[ticket.status]
                            }}
                          >
                            {STATUS_LABELS[ticket.status] || ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${PRIORITY_COLORS[ticket.priority]}20`,
                              borderColor: PRIORITY_COLORS[ticket.priority],
                              color: PRIORITY_COLORS[ticket.priority]
                            }}
                          >
                            {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {ticket.branch ? (
                            <span title={ticket.branch.name}>
                              {ticket.branch.code || ticket.branch.name}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {ticket.assignedTo?.name || (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        {data.customFieldDefinitions.map(field => (
                          <TableCell key={field.id} className="whitespace-nowrap">
                            {ticket.customFields[field.name] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7 + data.customFieldDefinitions.length}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No tickets found for this period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
