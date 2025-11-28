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
  Loader2
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

interface ATMReportData {
  summary: {
    totalTickets: number
    openTickets: number
    inProgressTickets: number
    resolvedTickets: number
    closedTickets: number
    avgResolutionTime: number
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

      // Sheet 2: Status Distribution
      const statusData = data.statusDistribution.map(s => ({
        'Status': STATUS_LABELS[s.status] || s.status,
        'Count': s.count,
        'Percentage': `${s.percentage}%`
      }))
      const statusSheet = XLSX.utils.json_to_sheet(statusData)
      statusSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Distribution')

      // Sheet 3: Priority Distribution
      const priorityData = data.priorityDistribution.map(p => ({
        'Priority': PRIORITY_LABELS[p.priority] || p.priority,
        'Count': p.count,
        'Percentage': `${p.percentage}%`
      }))
      const prioritySheet = XLSX.utils.json_to_sheet(priorityData)
      prioritySheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, prioritySheet, 'Priority Distribution')

      // Sheet 4: Branch Breakdown
      const branchData = data.branchBreakdown.map(b => ({
        'Branch': b.branchName,
        'Code': b.branchCode,
        'Count': b.count
      }))
      const branchSheet = XLSX.utils.json_to_sheet(branchData)
      branchSheet['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 10 }]
      XLSX.utils.book_append_sheet(workbook, branchSheet, 'Branch Breakdown')

      // Sheet 5: Tickets (with custom fields)
      const ticketsData = data.tickets.map(t => {
        const row: Record<string, string> = {
          'Ticket #': t.ticketNumber,
          'Title': t.title,
          'Status': STATUS_LABELS[t.status] || t.status,
          'Priority': PRIORITY_LABELS[t.priority] || t.priority,
          'Branch': t.branch?.name || '-',
          'Branch Code': t.branch?.code || '-',
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
      // Set column widths
      const ticketsCols = [
        { wch: 15 }, // Ticket #
        { wch: 40 }, // Title
        { wch: 15 }, // Status
        { wch: 12 }, // Priority
        { wch: 25 }, // Branch
        { wch: 12 }, // Branch Code
        { wch: 20 }, // Assigned To
        { wch: 18 }, // Created
        { wch: 18 }, // Resolved
        { wch: 18 }  // Closed
      ]
      // Add custom field columns
      for (const field of data.customFieldDefinitions) {
        ticketsCols.push({ wch: 20 })
      }
      ticketsSheet['!cols'] = ticketsCols
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{data.summary.totalTickets}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <Ticket className="h-8 w-8 text-blue-500/20" />
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
        </div>

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

        {/* Resolution Time Summary */}
        {data.summary.avgResolutionTime > 0 && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
                <div>
                  <p className="text-sm text-muted-foreground">Average Resolution Time</p>
                  <p className="text-2xl font-bold">{formatDuration(data.summary.avgResolutionTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
