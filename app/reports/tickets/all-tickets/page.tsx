'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useSidebar } from '@/components/providers/sidebar-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Building,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  SlidersHorizontal
} from 'lucide-react'
import { format } from 'date-fns'

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description: string
  status: string
  priority: string
  service: string
  serviceCategory: string
  serviceSubcategory: string
  serviceItem: string
  supportGroup: string
  createdBy: string
  createdByEmail: string
  branch: string
  branchCode: string
  assignedTo: string
  assignedToEmail: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
  claimedAt: string | null
  responseTime: number | null
  resolutionTime: number | null
  approvalStatus: string | null
  approvedBy: string | null
  commentCount: number
  attachmentCount: number
  vendorTicketNumber: string | null
  vendorName: string | null
  vendorStatus: string | null
}

interface ReportData {
  tickets: Ticket[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: {
    total: number
    open: number
    inProgress: number
    resolved: number
    closed: number
    pending: number
  }
  filters: {
    categories: Array<{ id: string; name: string }>
    subcategories: Array<{ id: string; name: string }>
    items: Array<{ id: string; name: string }>
    branches: Array<{ id: string; name: string; code: string }>
    technicians: Array<{ id: string; name: string; email: string }>
  }
}

// Column definitions
const COLUMN_DEFS = [
  { key: 'ticketNumber', label: 'Ticket #', default: true },
  { key: 'title', label: 'Judul', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'priority', label: 'Prioritas', default: true },
  { key: 'serviceCategory', label: 'Kategori', default: true },
  { key: 'service', label: 'Layanan', default: true },
  { key: 'branch', label: 'Cabang', default: true },
  { key: 'createdBy', label: 'Pembuat', default: true },
  { key: 'assignedTo', label: 'Ditugaskan', default: false },
  { key: 'createdAt', label: 'Tanggal Dibuat', default: true },
  { key: 'claimedAt', label: 'Tanggal Klaim', default: false },
  { key: 'resolvedAt', label: 'Tanggal Selesai', default: false },
  { key: 'resolutionTime', label: 'Waktu Resolusi', default: false },
  { key: 'supportGroup', label: 'Support Group', default: false },
  { key: 'approvalStatus', label: 'Status Approval', default: false },
  { key: 'vendorTicketNumber', label: 'Tiket Vendor', default: false },
  { key: 'activity', label: 'Aktivitas', default: false },
] as const

const DEFAULT_COLUMNS = COLUMN_DEFS.filter(c => c.default).map(c => c.key)
const ALL_COLUMN_KEYS = COLUMN_DEFS.map(c => c.key)
const STORAGE_KEY = 'all-tickets-report-columns'

export default function AllTicketsReport() {
  const { data: session } = useSession()
  const { isCollapsed } = useSidebar()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReportData | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv')
  const [filtersExpanded, setFiltersExpanded] = useState(true)

  // Filters
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('ALL')
  const [priority, setPriority] = useState('ALL')
  const [tier1CategoryId, setTier1CategoryId] = useState('ALL')
  const [tier2SubcategoryId, setTier2SubcategoryId] = useState('ALL')
  const [tier3ItemId, setTier3ItemId] = useState('ALL')
  const [branchId, setBranchId] = useState('ALL')
  const [technicianId, setTechnicianId] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  // Column selection with localStorage persistence
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch {}
    }
    return [...DEFAULT_COLUMNS]
  })

  // Persist column selection
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedColumns))
  }, [selectedColumns])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (status !== 'ALL') count++
    if (priority !== 'ALL') count++
    if (tier1CategoryId !== 'ALL') count++
    if (tier2SubcategoryId !== 'ALL') count++
    if (tier3ItemId !== 'ALL') count++
    if (branchId !== 'ALL') count++
    if (technicianId !== 'ALL') count++
    if (startDate) count++
    if (endDate) count++
    if (searchTerm) count++
    return count
  }, [status, priority, tier1CategoryId, tier2SubcategoryId, tier3ItemId, branchId, technicianId, startDate, endDate, searchTerm])

  // Auto-search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page === 1) {
        fetchData()
      } else {
        setPage(1)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    fetchData()
  }, [page, status, priority, tier1CategoryId, tier2SubcategoryId, tier3ItemId, branchId, technicianId, startDate, endDate, sortBy, sortOrder])

  // Cascading tier handlers
  const handleTier1Change = (value: string) => {
    setTier1CategoryId(value)
    setTier2SubcategoryId('ALL')
    setTier3ItemId('ALL')
  }

  const handleTier2Change = (value: string) => {
    setTier2SubcategoryId(value)
    setTier3ItemId('ALL')
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(status !== 'ALL' && { status }),
        ...(priority !== 'ALL' && { priority }),
        ...(tier1CategoryId !== 'ALL' && { tier1CategoryId }),
        ...(tier2SubcategoryId !== 'ALL' && { tier2SubcategoryId }),
        ...(tier3ItemId !== 'ALL' && { tier3ItemId }),
        ...(branchId !== 'ALL' && { branchId }),
        ...(technicianId !== 'ALL' && { technicianId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(searchTerm && { search: searchTerm }),
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/reports/tickets/all-tickets?${params}`)
      if (!response.ok) throw new Error('Failed to fetch data')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatus('ALL')
    setPriority('ALL')
    setTier1CategoryId('ALL')
    setTier2SubcategoryId('ALL')
    setTier3ItemId('ALL')
    setBranchId('ALL')
    setTechnicianId('ALL')
    setStartDate('')
    setEndDate('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setPage(1)
  }

  const exportData = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/reports/tickets/all-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportFormat,
          columns: selectedColumns,
          filters: {
            status: status !== 'ALL' ? status : undefined,
            priority: priority !== 'ALL' ? priority : undefined,
            tier1CategoryId: tier1CategoryId !== 'ALL' ? tier1CategoryId : undefined,
            tier2SubcategoryId: tier2SubcategoryId !== 'ALL' ? tier2SubcategoryId : undefined,
            tier3ItemId: tier3ItemId !== 'ALL' ? tier3ItemId : undefined,
            branchId: branchId !== 'ALL' ? branchId : undefined,
            technicianId: technicianId !== 'ALL' ? technicianId : undefined,
            startDate,
            endDate,
            searchTerm
          }
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = exportFormat === 'xlsx' ? 'xlsx' : 'csv'
      a.download = `tickets-report-${format(new Date(), 'yyyy-MM-dd')}.${ext}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  // Column selection helpers
  const toggleColumn = (key: string, checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedColumns(prev => [...prev, key])
    } else {
      setSelectedColumns(prev => prev.filter(k => k !== key))
    }
  }

  const selectAllColumns = () => setSelectedColumns([...ALL_COLUMN_KEYS])
  const selectDefaultColumns = () => setSelectedColumns([...DEFAULT_COLUMNS])

  const isColumnVisible = (key: string) => selectedColumns.includes(key)

  const getStatusBadge = (status: string, vendorTicketNumber?: string | null, vendorName?: string | null) => {
    const statusConfig: Record<string, { icon: any; className: string; textClassName: string; label: string }> = {
      OPEN: {
        icon: AlertCircle,
        className: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
        textClassName: 'text-amber-700 dark:text-amber-400',
        label: 'Open'
      },
      IN_PROGRESS: {
        icon: Clock,
        className: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
        textClassName: 'text-blue-700 dark:text-blue-400',
        label: 'In Progress'
      },
      RESOLVED: {
        icon: CheckCircle,
        className: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
        textClassName: 'text-green-700 dark:text-green-400',
        label: 'Resolved'
      },
      CLOSED: {
        icon: CheckCircle,
        className: 'bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800',
        textClassName: 'text-slate-600 dark:text-slate-400',
        label: 'Closed'
      },
      PENDING: {
        icon: Clock,
        className: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
        textClassName: 'text-orange-700 dark:text-orange-400',
        label: 'Pending'
      },
      PENDING_APPROVAL: {
        icon: Clock,
        className: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
        textClassName: 'text-purple-700 dark:text-purple-400',
        label: 'Pending Approval'
      },
      PENDING_VENDOR: {
        icon: Clock,
        className: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800',
        textClassName: 'text-indigo-700 dark:text-indigo-400',
        label: 'Pending Vendor'
      },
      CANCELLED: {
        icon: XCircle,
        className: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
        textClassName: 'text-red-700 dark:text-red-400',
        label: 'Cancelled'
      }
    }

    const config = statusConfig[status] || {
      icon: AlertCircle,
      className: 'bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800',
      textClassName: 'text-slate-600 dark:text-slate-400',
      label: status.replace('_', ' ')
    }
    const Icon = config.icon

    return (
      <div className="flex flex-col gap-1">
        <Badge
          variant="outline"
          className={`${config.className} ${config.textClassName} inline-flex items-center gap-1.5 px-2.5 py-1 font-medium shadow-sm hover:shadow transition-shadow w-fit`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold">{config.label}</span>
        </Badge>
        {status === 'PENDING_VENDOR' && vendorTicketNumber && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <span className="font-medium">Vendor:</span>
            <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border">{vendorTicketNumber}</span>
            {vendorName && <span className="text-[9px] opacity-70">({vendorName})</span>}
          </div>
        )}
      </div>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { className: string; textClassName: string; dotColor: string }> = {
      URGENT: {
        className: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
        textClassName: 'text-red-700 dark:text-red-400',
        dotColor: 'bg-red-500'
      },
      HIGH: {
        className: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
        textClassName: 'text-orange-700 dark:text-orange-400',
        dotColor: 'bg-orange-500'
      },
      MEDIUM: {
        className: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
        textClassName: 'text-yellow-700 dark:text-yellow-400',
        dotColor: 'bg-yellow-500'
      },
      LOW: {
        className: 'bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800',
        textClassName: 'text-slate-600 dark:text-slate-400',
        dotColor: 'bg-slate-400'
      }
    }

    const config = priorityConfig[priority] || {
      className: 'bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800',
      textClassName: 'text-slate-600 dark:text-slate-400',
      dotColor: 'bg-slate-400'
    }

    return (
      <Badge
        variant="outline"
        className={`${config.className} ${config.textClassName} inline-flex items-center gap-1.5 px-2.5 py-1 font-medium shadow-sm hover:shadow transition-shadow`}
      >
        <div className={`h-1.5 w-1.5 rounded-full ${config.dotColor} shrink-0`} />
        <span className="text-xs font-semibold">{priority}</span>
      </Badge>
    )
  }

  // Render a table cell for a given column key
  const renderCell = (key: string, ticket: Ticket) => {
    switch (key) {
      case 'ticketNumber':
        return (
          <a
            href={`/tickets/${ticket.id}`}
            className="text-primary hover:underline font-semibold font-mono text-sm"
          >
            #{ticket.ticketNumber}
          </a>
        )
      case 'title':
        return (
          <a href={`/tickets/${ticket.id}`} className="block hover:text-primary transition-colors">
            <p className="truncate font-medium text-foreground group-hover:text-primary">
              {ticket.title}
            </p>
          </a>
        )
      case 'status':
        return getStatusBadge(ticket.status, ticket.vendorTicketNumber, ticket.vendorName)
      case 'priority':
        return getPriorityBadge(ticket.priority)
      case 'serviceCategory':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{ticket.serviceCategory || '-'}</span>
            {ticket.serviceSubcategory && ticket.serviceSubcategory !== '-' && (
              <span className="text-xs text-muted-foreground">
                {ticket.serviceSubcategory}
                {ticket.serviceItem && ticket.serviceItem !== '-' && ` > ${ticket.serviceItem}`}
              </span>
            )}
          </div>
        )
      case 'service':
        return (
          <span className="truncate block text-sm text-muted-foreground" title={ticket.service}>
            {ticket.service}
          </span>
        )
      case 'branch':
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm">{ticket.branchCode}</span>
          </div>
        )
      case 'createdBy':
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="text-sm truncate max-w-[120px]" title={ticket.createdBy}>
              {ticket.createdBy}
            </span>
          </div>
        )
      case 'assignedTo':
        return (
          <span className="text-sm text-muted-foreground truncate max-w-[120px]">
            {ticket.assignedTo || '-'}
          </span>
        )
      case 'createdAt':
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
          </span>
        )
      case 'claimedAt':
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {ticket.claimedAt ? format(new Date(ticket.claimedAt), 'MMM dd, yyyy HH:mm') : '-'}
          </span>
        )
      case 'resolvedAt':
        return (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {ticket.resolvedAt ? format(new Date(ticket.resolvedAt), 'MMM dd, yyyy') : '-'}
          </span>
        )
      case 'resolutionTime':
        return ticket.resolutionTime ? (
          <Badge variant="secondary" className="font-mono">
            {ticket.resolutionTime}h
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      case 'supportGroup':
        return (
          <span className="text-sm text-muted-foreground">
            {ticket.supportGroup || '-'}
          </span>
        )
      case 'approvalStatus':
        return (
          <span className="text-sm text-muted-foreground">
            {ticket.approvalStatus || '-'}
          </span>
        )
      case 'vendorTicketNumber':
        return (
          <span className="text-sm text-muted-foreground font-mono">
            {ticket.vendorTicketNumber || '-'}
          </span>
        )
      case 'activity':
        return (
          <div className="flex items-center justify-center gap-2">
            {ticket.commentCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-chart-2/20 text-chart-2 border-chart-2/30 text-xs font-medium"
              >
                {ticket.commentCount} {ticket.commentCount === 1 ? 'comment' : 'comments'}
              </Badge>
            )}
            {ticket.attachmentCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-chart-4/20 text-chart-4 border-chart-4/30 text-xs font-medium"
              >
                {ticket.attachmentCount} {ticket.attachmentCount === 1 ? 'file' : 'files'}
              </Badge>
            )}
            {ticket.commentCount === 0 && ticket.attachmentCount === 0 && (
              <span className="text-xs text-muted-foreground">-</span>
            )}
          </div>
        )
      default:
        return null
    }
  }

  // Column header labels for the table
  const getHeaderLabel = (key: string) => {
    const col = COLUMN_DEFS.find(c => c.key === key)
    return col?.label || key
  }

  const visibleColumns = COLUMN_DEFS.filter(c => isColumnVisible(c.key))

  if (!session) return null

  return (
    <div className={`container mx-auto py-6 space-y-6 transition-all duration-300 ${
      isCollapsed ? 'max-w-[calc(100vw-5rem)]' : 'max-w-[calc(100vw-17rem)]'
    } px-4 md:px-6`}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            All Tickets Report
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive view of all tickets with advanced filtering and export capabilities
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

          {/* Column Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="touch-target">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Kolom</span>
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {selectedColumns.length}
                </Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Pilih Kolom</h4>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={selectAllColumns}>
                      Semua
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={selectDefaultColumns}>
                      Default
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {COLUMN_DEFS.map(col => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2.5 py-1.5 px-2 hover:bg-muted/50 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedColumns.includes(col.key)}
                        onCheckedChange={(checked) => toggleColumn(col.key, checked)}
                        className="h-4 w-4 min-h-0 min-w-0"
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

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
              disabled={exporting}
              className="touch-target"
              aria-label={`Export as ${exportFormat.toUpperCase()}`}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-border hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{data.stats.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Tickets</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">{data.stats.open}</p>
                  <p className="text-xs text-muted-foreground mt-1">Open</p>
                </div>
                <div className="p-2 bg-primary/20 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-chart-2/30 bg-chart-2/5 dark:bg-chart-2/10 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-chart-2">{data.stats.inProgress}</p>
                  <p className="text-xs text-muted-foreground mt-1">In Progress</p>
                </div>
                <div className="p-2 bg-chart-2/20 rounded-lg">
                  <Clock className="h-6 w-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-chart-5/30 bg-chart-5/5 dark:bg-chart-5/10 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-chart-5">{data.stats.resolved}</p>
                  <p className="text-xs text-muted-foreground mt-1">Resolved</p>
                </div>
                <div className="p-2 bg-chart-5/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-chart-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-muted/30 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{data.stats.closed}</p>
                  <p className="text-xs text-muted-foreground mt-1">Closed</p>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <CheckCircle className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-chart-4/30 bg-chart-4/5 dark:bg-chart-4/10 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-chart-4">{data.stats.pending}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pending</p>
                </div>
                <div className="p-2 bg-chart-4/20 rounded-lg">
                  <Clock className="h-6 w-6 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
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
                <CardTitle className="text-base font-semibold">Filters & Search</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {activeFilterCount > 0
                    ? `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`
                    : 'No filters applied'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearFilters()
                  }}
                  className="h-8 px-3"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
              {filtersExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        {filtersExpanded && (
          <CardContent className="space-y-4">
            {/* Primary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ticket #, title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 touch-target"
                    aria-label="Search tickets"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="touch-target" aria-label="Filter by status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                    <SelectItem value="PENDING_VENDOR">Pending Vendor</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Priority
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="touch-target" aria-label="Filter by priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {data && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Kategori
                  </label>
                  <Select value={tier1CategoryId} onValueChange={handleTier1Change}>
                    <SelectTrigger className="touch-target" aria-label="Filter by category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Kategori</SelectItem>
                      {data.filters.categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 3-Tier Category Cascade: Subcategory & Item */}
            {data && (tier1CategoryId !== 'ALL' || tier2SubcategoryId !== 'ALL') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {tier1CategoryId !== 'ALL' && data.filters.subcategories.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sub Kategori
                    </label>
                    <Select value={tier2SubcategoryId} onValueChange={handleTier2Change}>
                      <SelectTrigger className="touch-target" aria-label="Filter by subcategory">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Sub Kategori</SelectItem>
                        {data.filters.subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {tier2SubcategoryId !== 'ALL' && data.filters.items.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Item
                    </label>
                    <Select value={tier3ItemId} onValueChange={setTier3ItemId}>
                      <SelectTrigger className="touch-target" aria-label="Filter by item">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua Item</SelectItem>
                        {data.filters.items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Secondary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-border">
              {data && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Branch
                    </label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger className="touch-target" aria-label="Filter by branch">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Branches</SelectItem>
                        {data.filters.branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name} ({branch.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Technician
                    </label>
                    <Select value={technicianId} onValueChange={setTechnicianId}>
                      <SelectTrigger className="touch-target" aria-label="Filter by technician">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Technicians</SelectItem>
                        {data.filters.technicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="touch-target"
                  aria-label="Filter by start date"
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
                  aria-label="Filter by end date"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="touch-target flex-1" aria-label="Sort by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Created</SelectItem>
                      <SelectItem value="updatedAt">Updated</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="touch-target shrink-0"
                    aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    {sortOrder === 'desc' ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
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
              <p className="text-sm text-muted-foreground">Loading tickets...</p>
            </div>
          </CardContent>
        </Card>
      ) : data && data.tickets.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {visibleColumns.map(col => (
                      <TableHead
                        key={col.key}
                        className={`font-semibold ${
                          col.key === 'ticketNumber' ? 'w-[110px]' :
                          col.key === 'title' ? 'min-w-[200px]' :
                          col.key === 'service' ? 'max-w-[150px]' :
                          col.key === 'resolutionTime' ? 'text-right' :
                          col.key === 'activity' ? 'text-center' :
                          ''
                        }`}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="group hover:bg-muted/30 transition-colors">
                      {visibleColumns.map(col => (
                        <TableCell
                          key={col.key}
                          className={
                            col.key === 'service' ? 'max-w-[150px]' :
                            col.key === 'title' ? 'max-w-[250px]' :
                            col.key === 'resolutionTime' ? 'text-right' :
                            ''
                          }
                        >
                          {renderCell(col.key, ticket)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {data.pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{((page - 1) * 50) + 1}</span> to{' '}
                  <span className="font-medium text-foreground">{Math.min(page * 50, data.pagination.total)}</span> of{' '}
                  <span className="font-medium text-foreground">{data.pagination.total}</span> tickets
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="touch-target"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                      let pageNum
                      if (data.pagination.pages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= data.pagination.pages - 2) {
                        pageNum = data.pagination.pages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-10 h-10 p-0 touch-target"
                          aria-label={`Go to page ${pageNum}`}
                          aria-current={page === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                    disabled={page === data.pagination.pages}
                    className="touch-target"
                    aria-label="Next page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
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
                Try adjusting your filters to see more results
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear all filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
