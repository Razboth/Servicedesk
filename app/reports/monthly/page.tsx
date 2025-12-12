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
  UserCheck,
  UserX,
  Clock,
  BarChart3,
  AlertCircle,
  Calendar,
  Layers
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

interface MonthlyReportData {
  summary: {
    totalTickets: number
    claimedTickets: number
    unclaimedTickets: number
    claimedPercentage: number
    unclaimedPercentage: number
  }
  categoryBreakdown: {
    categoryId: string
    categoryName: string
    count: number
    percentage: number
  }[]
  commonServicesByCategory: {
    categoryId: string
    categoryName: string
    serviceId: string
    serviceName: string
    ticketCount: number
    totalInCategory: number
    percentage: number
  }[]
  commonIssues: {
    categoryId: string
    categoryName: string
    mostCommonStatus: string
    statusCount: number
    totalInCategory: number
  }[]
  durationMetrics: {
    averageApprovalToClose: number
    byCategory: {
      categoryId: string
      categoryName: string
      avgDuration: number
      ticketCount: number
    }[]
  }
  statusDistribution: {
    status: string
    count: number
  }[]
  period: {
    month: number
    year: number
    startDate: string
    endDate: string
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

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function MonthlyReport() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MonthlyReportData | null>(null)
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
      const response = await fetch(`/api/reports/monthly?month=${selectedMonth}&year=${selectedYear}`)
      if (!response.ok) throw new Error('Failed to fetch data')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching monthly report:', error)
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

    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()

    // Sheet 1: Summary
    const summaryData = [
      { 'Metric': 'Report Period', 'Value': `${MONTHS[selectedMonth - 1]} ${selectedYear}` },
      { 'Metric': 'Generated On', 'Value': format(new Date(), 'MMMM dd, yyyy HH:mm') },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'Total Tickets', 'Value': data.summary.totalTickets },
      { 'Metric': 'Claimed Tickets', 'Value': data.summary.claimedTickets },
      { 'Metric': 'Claimed Percentage', 'Value': `${data.summary.claimedPercentage}%` },
      { 'Metric': 'Unclaimed Tickets', 'Value': data.summary.unclaimedTickets },
      { 'Metric': 'Unclaimed Percentage', 'Value': `${data.summary.unclaimedPercentage}%` },
      { 'Metric': '', 'Value': '' },
      { 'Metric': 'Avg Duration (Approval to Close)', 'Value': formatDuration(data.durationMetrics.averageApprovalToClose) }
    ]
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 25 }]
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // Sheet 2: Category Breakdown
    const categoryData = data.categoryBreakdown.map(cat => ({
      'Category': cat.categoryName,
      'Ticket Count': cat.count,
      'Percentage': `${cat.percentage}%`
    }))
    const categorySheet = XLSX.utils.json_to_sheet(categoryData)
    categorySheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Category Breakdown')

    // Sheet 3: Most Common Services
    if (data.commonServicesByCategory && data.commonServicesByCategory.length > 0) {
      const servicesData = data.commonServicesByCategory.map(item => ({
        'Category': item.categoryName,
        'Most Common Service': item.serviceName,
        'Service Count': item.ticketCount,
        'Total in Category': item.totalInCategory,
        'Percentage': `${item.percentage}%`
      }))
      const servicesSheet = XLSX.utils.json_to_sheet(servicesData)
      servicesSheet['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 18 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Common Services')
    }

    // Sheet 4: Most Common Status
    const statusData = data.commonIssues.map(issue => {
      const durationData = data.durationMetrics.byCategory.find(d => d.categoryId === issue.categoryId)
      return {
        'Category': issue.categoryName,
        'Most Common Status': STATUS_LABELS[issue.mostCommonStatus] || issue.mostCommonStatus,
        'Status Count': issue.statusCount,
        'Total in Category': issue.totalInCategory,
        'Avg Duration': durationData ? formatDuration(durationData.avgDuration) : '-'
      }
    })
    const statusSheet = XLSX.utils.json_to_sheet(statusData)
    statusSheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Common Status')

    // Sheet 5: Duration by Category
    const durationData = data.durationMetrics.byCategory.map(cat => ({
      'Category': cat.categoryName,
      'Average Duration': formatDuration(cat.avgDuration),
      'Duration (Hours)': cat.avgDuration,
      'Ticket Count': cat.ticketCount
    }))
    const durationSheet = XLSX.utils.json_to_sheet(durationData)
    durationSheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, durationSheet, 'Duration Metrics')

    // Sheet 6: Status Distribution
    const distributionData = data.statusDistribution.map(s => ({
      'Status': STATUS_LABELS[s.status] || s.status,
      'Count': s.count
    }))
    const distributionSheet = XLSX.utils.json_to_sheet(distributionData)
    distributionSheet['!cols'] = [{ wch: 20 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, distributionSheet, 'Status Distribution')

    // Save file
    const filename = `monthly-report-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`
    XLSX.writeFile(workbook, filename)
  }

  if (!session) return null

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading monthly report...</p>
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
          <p className="text-muted-foreground text-sm">Unable to load the monthly report</p>
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
            <h1 className="text-3xl font-bold">Monthly Report</h1>
            <p className="text-muted-foreground mt-1">
              Ticket statistics for {MONTHS[selectedMonth - 1]} {selectedYear}
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
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-l-4 border-l-info shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{data.summary.totalTickets}</p>
                  <p className="text-sm text-muted-foreground">Total Tickets</p>
                </div>
                <Ticket className="h-10 w-10 text-info/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{data.summary.claimedTickets}</p>
                  <p className="text-sm text-muted-foreground">
                    Claimed ({data.summary.claimedPercentage}%)
                  </p>
                </div>
                <UserCheck className="h-10 w-10 text-success/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{data.summary.unclaimedTickets}</p>
                  <p className="text-sm text-muted-foreground">
                    Unclaimed ({data.summary.unclaimedPercentage}%)
                  </p>
                </div>
                <UserX className="h-10 w-10 text-warning/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                Category Distribution
              </CardTitle>
              <CardDescription>Tickets by tier-1 category</CardDescription>
            </CardHeader>
            <CardContent>
              {data.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="count"
                      nameKey="categoryName"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ categoryName, percentage }) =>
                        `${categoryName}: ${percentage}%`
                      }
                    >
                      {data.categoryBreakdown.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} tickets`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Table */}
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Category Breakdown</CardTitle>
              <CardDescription>Detailed ticket counts by category</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.categoryBreakdown.length > 0 ? (
                    data.categoryBreakdown.map((category, index) => (
                      <TableRow key={category.categoryId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            {category.categoryName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{category.count}</TableCell>
                        <TableCell className="text-right">{category.percentage}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Most Common Services by Category */}
        <Card className="mb-6 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              Most Common Services by Category
            </CardTitle>
            <CardDescription>
              Shows the most frequently requested service for each tier-1 category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Most Common Service</TableHead>
                  <TableHead className="text-right">Service Count</TableHead>
                  <TableHead className="text-right">Total in Category</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.commonServicesByCategory && data.commonServicesByCategory.length > 0 ? (
                  data.commonServicesByCategory.map((item) => (
                    <TableRow key={item.categoryId}>
                      <TableCell className="font-medium">{item.categoryName}</TableCell>
                      <TableCell>
                        <span className="text-sm">{item.serviceName}</span>
                      </TableCell>
                      <TableCell className="text-right">{item.ticketCount}</TableCell>
                      <TableCell className="text-right">{item.totalInCategory}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Most Common Issues */}
        <Card className="mb-6 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <AlertCircle className="h-4 w-4 text-warning" />
              Most Common Issues by Category
            </CardTitle>
            <CardDescription>
              Shows the most frequent status for each tier-1 category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Most Common Status</TableHead>
                  <TableHead className="text-right">Status Count</TableHead>
                  <TableHead className="text-right">Total in Category</TableHead>
                  <TableHead className="text-right">Avg Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.commonIssues.length > 0 ? (
                  data.commonIssues.map((issue) => {
                    const durationData = data.durationMetrics.byCategory.find(
                      d => d.categoryId === issue.categoryId
                    )
                    return (
                      <TableRow key={issue.categoryId}>
                        <TableCell className="font-medium">{issue.categoryName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${STATUS_COLORS[issue.mostCommonStatus]}20`,
                              borderColor: STATUS_COLORS[issue.mostCommonStatus],
                              color: STATUS_COLORS[issue.mostCommonStatus]
                            }}
                          >
                            {STATUS_LABELS[issue.mostCommonStatus] || issue.mostCommonStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{issue.statusCount}</TableCell>
                        <TableCell className="text-right">{issue.totalInCategory}</TableCell>
                        <TableCell className="text-right">
                          {durationData ? formatDuration(durationData.avgDuration) : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Duration Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Duration Summary */}
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-info" />
                Duration Analysis
              </CardTitle>
              <CardDescription>Average time from approval to closure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4 mb-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Overall Average</p>
                <p className="text-3xl font-bold">
                  {formatDuration(data.durationMetrics.averageApprovalToClose)}
                </p>
              </div>

              {data.durationMetrics.byCategory.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.durationMetrics.byCategory.slice(0, 6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="categoryName"
                      fontSize={10}
                      tickFormatter={(value) =>
                        value.length > 10 ? `${value.slice(0, 10)}...` : value
                      }
                    />
                    <YAxis fontSize={10} />
                    <Tooltip
                      formatter={(value: number) => [formatDuration(value), 'Avg Duration']}
                    />
                    <Bar dataKey="avgDuration" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="shadow-sm border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                Status Distribution
              </CardTitle>
              <CardDescription>All tickets by current status</CardDescription>
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
                      label={({ status, count }) =>
                        `${STATUS_LABELS[status] || status}: ${count}`
                      }
                    >
                      {data.statusDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STATUS_COLORS[entry.status] || '#999'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} tickets`,
                        STATUS_LABELS[name as string] || name
                      ]}
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
        </div>
      </div>
    </div>
  )
}
