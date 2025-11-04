'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw, Download, Calendar, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

interface ServiceData {
  name: string
  open: number
  inProgress: number
  pending: number
  resolved: number
  closed: number
  cancelled: number
  total: number
}

interface CategoryData {
  name: string
  open: number
  inProgress: number
  pending: number
  resolved: number
  closed: number
  cancelled: number
  total: number
  services: ServiceData[]
}

interface ReportData {
  dateRange: {
    start: string
    end: string
  }
  categories: CategoryData[]
  totals: {
    open: number
    inProgress: number
    pending: number
    resolved: number
    closed: number
    cancelled: number
    total: number
  }
  ticketCount: number
  mergeInfo?: {
    message: string
    stats: {
      totalCategories: number
      fromOldSystem: number
      fromNewSystem: number
      fromBothSystems: number
      mergedSuccessfully: number
    }
  }
}

export default function MonthlyReport() {
  const { data: session } = useSession()
  const router = useRouter()
  const { isCollapsed } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReportData | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // Date filters - default to previous month
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    date.setDate(1)
    return format(date, 'yyyy-MM-dd')
  })
  const [endDate, setEndDate] = useState(() => {
    const date = new Date()
    date.setDate(0) // Last day of previous month
    return format(date, 'yyyy-MM-dd')
  })

  // Check access
  useEffect(() => {
    if (session && !['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user?.role)) {
      router.push('/reports')
    }
  }, [session, router])

  useEffect(() => {
    if (session && ['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user?.role)) {
      fetchData()
    }
  }, [startDate, endDate, session])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        startDate,
        endDate
      })

      const response = await fetch(`/api/reports/technician/monthly?${params}`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/reports')
          return
        }
        throw new Error('Failed to fetch data')
      }

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching monthly report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams({
        startDate,
        endDate,
        format: exportFormat
      })

      const response = await fetch(`/api/reports/technician/monthly?${params}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = exportFormat === 'xlsx' ? 'xlsx' : 'csv'
      a.download = `monthly-report-${startDate}-to-${endDate}.${ext}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const setCurrentMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setStartDate(format(firstDay, 'yyyy-MM-dd'))
    setEndDate(format(lastDay, 'yyyy-MM-dd'))
  }

  const setLastMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
    setStartDate(format(firstDay, 'yyyy-MM-dd'))
    setEndDate(format(lastDay, 'yyyy-MM-dd'))
  }

  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  if (!session || !['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user?.role)) {
    return null
  }

  // Filter categories based on selection
  const filteredCategories = data?.categories.filter(cat =>
    selectedCategory === 'ALL' || cat.name === selectedCategory
  ) || []

  // Calculate filtered totals
  const filteredTotals = filteredCategories.reduce((acc, cat) => ({
    open: acc.open + cat.open,
    inProgress: acc.inProgress + cat.inProgress,
    pending: acc.pending + cat.pending,
    resolved: acc.resolved + cat.resolved,
    closed: acc.closed + cat.closed,
    cancelled: acc.cancelled + cat.cancelled,
    total: acc.total + cat.total
  }), {
    open: 0,
    inProgress: 0,
    pending: 0,
    resolved: 0,
    closed: 0,
    cancelled: 0,
    total: 0
  })

  return (
    <div className={`container mx-auto py-6 space-y-6 transition-all duration-300 ${
      isCollapsed ? 'max-w-[calc(100vw-5rem)]' : 'max-w-[calc(100vw-17rem)]'
    } px-4 md:px-6`}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Monthly Ticket Report
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-14">
            View ticket counts by category and status for the selected period
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="touch-target"
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Export Controls Group */}
          <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg border border-border">
            <Select
              value={exportFormat}
              onValueChange={(v) => setExportFormat(v as 'csv' | 'xlsx')}
            >
              <SelectTrigger className="w-[120px] h-9 border-0 bg-background/50 touch-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV Format</SelectItem>
                <SelectItem value="xlsx">Excel Format</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={exportData}
              variant="default"
              size="sm"
              disabled={exporting || !data}
              className="touch-target"
              aria-label={`Export as ${exportFormat.toUpperCase()}`}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Date Range</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Select the period for the report
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="touch-target"
                aria-label="Start date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="touch-target"
                aria-label="End date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Select
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setCurrentMonth}
                  className="flex-1 touch-target"
                >
                  This Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={setLastMonth}
                  className="flex-1 touch-target"
                >
                  Last Month
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total Tickets
              </label>
              <div className="h-10 flex items-center justify-center bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-2xl font-bold text-primary">
                  {data?.ticketCount || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          {data && data.categories.length > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Filter by Category
                </label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-full touch-target">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {data.categories.map((cat, index) => (
                      <SelectItem key={index} value={cat.name}>
                        {cat.name} ({cat.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      {loading ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading report data...</p>
            </div>
          </CardContent>
        </Card>
      ) : data && data.categories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category Breakdown</CardTitle>
            <CardDescription>
              Ticket counts by category and status for {format(new Date(startDate), 'MMM dd, yyyy')} to {format(new Date(endDate), 'MMM dd, yyyy')}
            </CardDescription>
            {data.mergeInfo && data.mergeInfo.stats.mergedSuccessfully > 0 && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    <strong>Dual System Merge:</strong> This report merges categories from both OLD (ServiceCategory) and NEW (3-tier) systems.
                    {' '}{data.mergeInfo.stats.mergedSuccessfully} categor{data.mergeInfo.stats.mergedSuccessfully === 1 ? 'y' : 'ies'} combined data from both systems.
                  </span>
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10">Category</TableHead>
                    <TableHead className="text-center font-semibold">Open</TableHead>
                    <TableHead className="text-center font-semibold">In Progress</TableHead>
                    <TableHead className="text-center font-semibold">On Hold</TableHead>
                    <TableHead className="text-center font-semibold">Resolved</TableHead>
                    <TableHead className="text-center font-semibold">Closed</TableHead>
                    <TableHead className="text-center font-semibold">Cancelled</TableHead>
                    <TableHead className="text-center font-semibold bg-primary/10">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category, index) => {
                    const isExpanded = expandedCategories.has(category.name)
                    const hasServices = category.services && category.services.length > 0

                    return (
                      <>
                        {/* Category Row */}
                        <TableRow
                          key={index}
                          className={`hover:bg-muted/30 ${hasServices ? 'cursor-pointer' : ''}`}
                          onClick={() => hasServices && toggleCategoryExpansion(category.name)}
                        >
                          <TableCell className="font-medium sticky left-0 bg-background">
                            <div className="flex items-center gap-2">
                              {hasServices && (
                                <button
                                  className="p-0.5 hover:bg-muted rounded transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleCategoryExpansion(category.name)
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              )}
                              {!hasServices && <span className="w-5" />}
                              <span>{category.name}</span>
                              {hasServices && (
                                <span className="text-xs text-muted-foreground">
                                  ({category.services.length})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{category.open}</TableCell>
                          <TableCell className="text-center">{category.inProgress}</TableCell>
                          <TableCell className="text-center">{category.pending}</TableCell>
                          <TableCell className="text-center">{category.resolved}</TableCell>
                          <TableCell className="text-center">{category.closed}</TableCell>
                          <TableCell className="text-center">{category.cancelled}</TableCell>
                          <TableCell className="text-center font-bold bg-primary/5">
                            {category.total}
                          </TableCell>
                        </TableRow>

                        {/* Service Rows (when expanded) */}
                        {isExpanded && hasServices && category.services.map((service, sIndex) => (
                          <TableRow
                            key={`${index}-service-${sIndex}`}
                            className="bg-muted/20 hover:bg-muted/40 border-l-4 border-l-primary/30"
                          >
                            <TableCell className="pl-12 text-sm text-muted-foreground sticky left-0 bg-muted/20">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground/50">└─</span>
                                {service.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm">{service.open}</TableCell>
                            <TableCell className="text-center text-sm">{service.inProgress}</TableCell>
                            <TableCell className="text-center text-sm">{service.pending}</TableCell>
                            <TableCell className="text-center text-sm">{service.resolved}</TableCell>
                            <TableCell className="text-center text-sm">{service.closed}</TableCell>
                            <TableCell className="text-center text-sm">{service.cancelled}</TableCell>
                            <TableCell className="text-center text-sm font-medium bg-muted/30">
                              {service.total}
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )
                  })}

                  {/* Totals Row */}
                  <TableRow className="bg-primary/20 hover:bg-primary/20 font-bold border-t-2 border-primary">
                    <TableCell className="sticky left-0 bg-primary/20">
                      {selectedCategory === 'ALL' ? 'TOTAL' : 'SUBTOTAL'}
                    </TableCell>
                    <TableCell className="text-center">{filteredTotals.open}</TableCell>
                    <TableCell className="text-center">{filteredTotals.inProgress}</TableCell>
                    <TableCell className="text-center">{filteredTotals.pending}</TableCell>
                    <TableCell className="text-center">{filteredTotals.resolved}</TableCell>
                    <TableCell className="text-center">{filteredTotals.closed}</TableCell>
                    <TableCell className="text-center">{filteredTotals.cancelled}</TableCell>
                    <TableCell className="text-center text-lg bg-primary/30">
                      {filteredTotals.total}
                    </TableCell>
                  </TableRow>
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
              <h3 className="text-lg font-semibold mb-1">No tickets found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                No tickets were found for the selected date range
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
