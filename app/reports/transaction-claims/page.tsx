'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  FileDown,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  FileSpreadsheet,
  Building,
  User,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  CreditCard
} from 'lucide-react'
import { format } from 'date-fns'

interface TransactionClaimsReportData {
  tickets: Array<{
    ticketNumber: string
    subject: string
    description: string
    status: string
    priority: string
    category: string
    subcategory: string
    serviceItem: string
    serviceName: string
    supportGroup: string
    creatorName: string
    creatorEmail: string
    creatorEmployeeId: string
    branchName: string
    branchCode: string
    assignedToName: string
    assignedToEmail: string
    assignedToEmployeeId: string
    createdAt: string
    updatedAt: string
    resolvedAt: string
    closedAt: string
    estimatedHours: number
    actualHours: number
    progressPercentage: number
    responseDeadline: string
    resolutionDeadline: string
    isResponseBreached: string
    isResolutionBreached: string
    responseTime: number
    resolutionTime: number
    approvalStatus: string
    lastComment: string
    lastCommentDate: string
    // Transaction claim specific fields
    transactionDate: string | null
    customerName: string | null
    transactionAmount: string | null
    accountNumber: string | null
  }>
  summary: {
    totalTickets: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    byBranch: Record<string, number>
    bySupportGroup: Record<string, number>
    resolvedTickets: number
    avgResolutionTime: number
    slaBreaches: {
      response: number
      resolution: number
    }
  }
  period: {
    startDate: string
    endDate: string
  }
  recordCount: number
}

export default function TransactionClaimsReport() {
  const { data: session } = useSession()
  const { isCollapsed } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TransactionClaimsReportData | null>(null)
  const [exporting, setExporting] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(true)

  // Date filters (default: last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // Transaction date filter (Tanggal Transaksi)
  const [transactionStartDate, setTransactionStartDate] = useState('')
  const [transactionEndDate, setTransactionEndDate] = useState('')

  useEffect(() => {
    fetchData()
  }, [startDate, endDate, transactionStartDate, transactionEndDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString()
      })

      // Add transaction date filters if provided
      if (transactionStartDate) {
        params.append('transactionStartDate', new Date(transactionStartDate).toISOString())
      }
      if (transactionEndDate) {
        params.append('transactionEndDate', new Date(transactionEndDate + 'T23:59:59').toISOString())
      }

      const response = await fetch(`/api/reports/transaction-claims?${params}`)
      if (!response.ok) throw new Error('Failed to fetch data')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching transaction claims report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (exportFormat: 'csv' | 'xlsx') => {
    try {
      setExporting(true)
      const params = new URLSearchParams({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString(),
        format: exportFormat
      })

      // Add transaction date filters if provided
      if (transactionStartDate) {
        params.append('transactionStartDate', new Date(transactionStartDate).toISOString())
      }
      if (transactionEndDate) {
        params.append('transactionEndDate', new Date(transactionEndDate + 'T23:59:59').toISOString())
      }

      const response = await fetch(`/api/reports/transaction-claims?${params}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = exportFormat === 'xlsx' ? 'xlsx' : 'csv'
      a.download = `transaction-claims-report-${format(new Date(), 'yyyy-MM-dd')}.${ext}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; className: string; textClassName: string; label: string }> = {
      OPEN: {
        icon: AlertCircle,
        className: 'bg-amber-50 border-amber-200',
        textClassName: 'text-amber-700',
        label: 'Open'
      },
      IN_PROGRESS: {
        icon: Clock,
        className: 'bg-blue-50 border-blue-200',
        textClassName: 'text-blue-700',
        label: 'In Progress'
      },
      RESOLVED: {
        icon: CheckCircle,
        className: 'bg-green-50 border-green-200',
        textClassName: 'text-green-700',
        label: 'Resolved'
      },
      CLOSED: {
        icon: CheckCircle,
        className: 'bg-slate-50 border-slate-200',
        textClassName: 'text-slate-600',
        label: 'Closed'
      }
    }

    const config = statusConfig[status] || {
      icon: AlertCircle,
      className: 'bg-slate-50 border-slate-200',
      textClassName: 'text-slate-600',
      label: status.replace('_', ' ')
    }
    const Icon = config.icon

    return (
      <Badge
        variant="outline"
        className={`${config.className} ${config.textClassName} inline-flex items-center gap-1.5 px-2.5 py-1 font-medium`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-semibold">{config.label}</span>
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { className: string; textClassName: string; dotColor: string }> = {
      URGENT: {
        className: 'bg-red-50 border-red-200',
        textClassName: 'text-red-700',
        dotColor: 'bg-red-500'
      },
      HIGH: {
        className: 'bg-orange-50 border-orange-200',
        textClassName: 'text-orange-700',
        dotColor: 'bg-orange-500'
      },
      MEDIUM: {
        className: 'bg-yellow-50 border-yellow-200',
        textClassName: 'text-yellow-700',
        dotColor: 'bg-yellow-500'
      },
      LOW: {
        className: 'bg-slate-50 border-slate-200',
        textClassName: 'text-slate-600',
        dotColor: 'bg-slate-400'
      }
    }

    const config = priorityConfig[priority] || {
      className: 'bg-slate-50 border-slate-200',
      textClassName: 'text-slate-600',
      dotColor: 'bg-slate-400'
    }

    return (
      <Badge
        variant="outline"
        className={`${config.className} ${config.textClassName} inline-flex items-center gap-1.5 px-2.5 py-1 font-medium`}
      >
        <div className={`h-1.5 w-1.5 rounded-full ${config.dotColor} shrink-0`} />
        <span className="text-xs font-semibold">{priority}</span>
      </Badge>
    )
  }

  if (!session) return null

  return (
    <div className={`container mx-auto py-6 space-y-6 transition-all duration-300 ${
      isCollapsed ? 'max-w-[calc(100vw-5rem)]' : 'max-w-[calc(100vw-17rem)]'
    } px-4 md:px-6`}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Transaction Claims Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            All tickets related to Transaction Claims category
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="touch-target"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {/* Export Buttons */}
          <Button
            onClick={() => exportData('csv')}
            variant="outline"
            size="sm"
            disabled={exporting}
            className="touch-target"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          <Button
            onClick={() => exportData('xlsx')}
            variant="outline"
            size="sm"
            disabled={exporting}
            className="touch-target"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export XLSX
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{data.summary.totalTickets}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Tickets</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-700">{data.summary.resolvedTickets}</p>
                  <p className="text-xs text-muted-foreground mt-1">Resolved</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-700">
                    {data.summary.avgResolutionTime.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Avg Resolution</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-red-700">
                    {data.summary.slaBreaches.response + data.summary.slaBreaches.resolution}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">SLA Breaches</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-700">
                    {Object.keys(data.summary.byBranch).length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Branches</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date Range Filter */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Date Range Filter</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Select the period for transaction claims data
                </CardDescription>
              </div>
            </div>
            {filtersExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {filtersExpanded && (
          <CardContent className="space-y-4">
            {/* Ticket Created Date Filter */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Tanggal Dibuat Tiket</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Dari Tanggal
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="touch-target"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sampai Tanggal
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="touch-target"
                  />
                </div>
              </div>
            </div>

            {/* Transaction Date Filter (Tanggal Transaksi) */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-foreground mb-3">Tanggal Transaksi</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Dari Tanggal
                  </label>
                  <Input
                    type="date"
                    value={transactionStartDate}
                    onChange={(e) => setTransactionStartDate(e.target.value)}
                    className="touch-target"
                    placeholder="Filter by transaction date"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sampai Tanggal
                  </label>
                  <Input
                    type="date"
                    value={transactionEndDate}
                    onChange={(e) => setTransactionEndDate(e.target.value)}
                    className="touch-target"
                    placeholder="Filter by transaction date"
                  />
                </div>
              </div>
              {(transactionStartDate || transactionEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTransactionStartDate('')
                    setTransactionEndDate('')
                  }}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Transaction Date Filter
                </Button>
              )}
            </div>

            {/* Quick date presets */}
            <div className="flex gap-2 flex-wrap pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const end = new Date()
                  const start = new Date()
                  start.setDate(end.getDate() - 7)
                  setStartDate(start.toISOString().split('T')[0])
                  setEndDate(end.toISOString().split('T')[0])
                }}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const end = new Date()
                  const start = new Date()
                  start.setDate(end.getDate() - 30)
                  setStartDate(start.toISOString().split('T')[0])
                  setEndDate(end.toISOString().split('T')[0])
                }}
              >
                Last 30 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const end = new Date()
                  const start = new Date()
                  start.setDate(end.getDate() - 90)
                  setStartDate(start.toISOString().split('T')[0])
                  setEndDate(end.toISOString().split('T')[0])
                }}
              >
                Last 90 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const end = new Date()
                  const start = new Date(end.getFullYear(), 0, 1)
                  setStartDate(start.toISOString().split('T')[0])
                  setEndDate(end.toISOString().split('T')[0])
                }}
              >
                This Year
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Data Table */}
      {loading ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading transaction claims data...</p>
            </div>
          </CardContent>
        </Card>
      ) : data && data.tickets.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Transaction Claims Tickets</span>
              <Badge variant="outline" className="font-mono">{data.recordCount} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Ticket #</TableHead>
                    <TableHead className="min-w-[250px] font-semibold">Subject</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Priority</TableHead>
                    <TableHead className="font-semibold">Branch</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Tgl Transaksi</TableHead>
                    <TableHead className="font-semibold text-right">Nominal</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold">SLA Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tickets.map((ticket, index) => (
                    <TableRow key={index} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-sm">
                        <span className="font-semibold text-primary">#{ticket.ticketNumber}</span>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="font-medium text-foreground truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {ticket.serviceName}
                        </p>
                      </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm">{ticket.branchCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm truncate max-w-[120px]" title={ticket.customerName || ticket.creatorName}>
                            {ticket.customerName || ticket.creatorName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {ticket.transactionDate && !isNaN(new Date(ticket.transactionDate).getTime()) ? (
                          format(new Date(ticket.transactionDate), 'dd MMM yyyy')
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {ticket.transactionAmount ? (
                          <span>Rp {Number(ticket.transactionAmount).toLocaleString('id-ID')}</span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {ticket.createdAt && !isNaN(new Date(ticket.createdAt).getTime())
                          ? format(new Date(ticket.createdAt), 'dd MMM yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {ticket.isResponseBreached === 'Yes' || ticket.isResolutionBreached === 'Yes' ? (
                          <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            Breached
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            On Track
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No transaction claims tickets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting the date range to see more results
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
