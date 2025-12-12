'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TicketWizard } from '@/components/tickets/modern/ticket-wizard'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { getTicketUrlId } from '@/lib/utils/ticket-utils'
import {
  TicketIcon,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Inbox,
} from 'lucide-react'

// Types
interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
  service: {
    name: string
    slaHours: number
    category?: {
      id: string
      name: string
    }
  }
  branch?: {
    id: string
    name: string
    code: string
  }
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
  _count?: {
    comments: number
  }
}

// Status labels in Indonesian
const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  OPEN: { label: 'Terbuka', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: <AlertCircle className="h-3 w-3" /> },
  PENDING: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="h-3 w-3" /> },
  PENDING_APPROVAL: { label: 'Menunggu Persetujuan', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: <Clock className="h-3 w-3" /> },
  APPROVED: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <X className="h-3 w-3" /> },
  IN_PROGRESS: { label: 'Sedang Dikerjakan', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: <Loader2 className="h-3 w-3" /> },
  PENDING_VENDOR: { label: 'Menunggu Vendor', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock className="h-3 w-3" /> },
  RESOLVED: { label: 'Selesai', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  CLOSED: { label: 'Ditutup', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400', icon: <CheckCircle2 className="h-3 w-3" /> },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <X className="h-3 w-3" /> },
}

// Priority labels in Indonesian
const priorityLabels: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Rendah', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400' },
  MEDIUM: { label: 'Sedang', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  HIGH: { label: 'Tinggi', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  CRITICAL: { label: 'Kritis', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  EMERGENCY: { label: 'Darurat', color: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
}

// Status filter options
const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  { value: 'OPEN', label: 'Terbuka' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'PENDING_APPROVAL', label: 'Menunggu Persetujuan' },
  { value: 'IN_PROGRESS', label: 'Sedang Dikerjakan' },
  { value: 'PENDING_VENDOR', label: 'Menunggu Vendor' },
  { value: 'RESOLVED', label: 'Selesai' },
  { value: 'CLOSED', label: 'Ditutup' },
]

// Priority filter options
const priorityOptions = [
  { value: 'all', label: 'Semua Prioritas' },
  { value: 'LOW', label: 'Rendah' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'HIGH', label: 'Tinggi' },
  { value: 'CRITICAL', label: 'Kritis' },
  { value: 'EMERGENCY', label: 'Darurat' },
]

function MyTicketsPageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [totalTickets, setTotalTickets] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all')
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'all')
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get('startDate') ? parseISO(searchParams.get('startDate')!) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get('endDate') ? parseISO(searchParams.get('endDate')!) : undefined
  )

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    pending: 0,
  })

  // Load tickets
  const loadTickets = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }

      const params = new URLSearchParams()
      params.append('myTickets', 'true') // Custom filter for user's own tickets
      params.append('page', currentPage.toString())
      params.append('limit', pageSize.toString())

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (priorityFilter && priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }

      if (startDate) {
        params.append('createdAfter', startDate.toISOString())
      }

      if (endDate) {
        params.append('createdBefore', endDate.toISOString())
      }

      const response = await fetch(`/api/tickets/my-tickets?${params}`)

      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
        setTotalTickets(data.total || 0)
        setTotalPages(data.pages || 0)
        setStats(data.stats || { total: 0, open: 0, inProgress: 0, resolved: 0, pending: 0 })
      } else {
        toast.error('Gagal memuat tiket')
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
      toast.error('Gagal memuat tiket')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [currentPage, pageSize, searchQuery, statusFilter, priorityFilter, startDate, endDate])

  // Load tickets on mount and when filters change
  useEffect(() => {
    loadTickets(true)
  }, [])

  // Reload when filters change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [currentPage, pageSize, statusFilter, priorityFilter, startDate, endDate])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== '') {
        setCurrentPage(1)
        loadTickets(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle row click
  const handleRowClick = (ticket: Ticket) => {
    const ticketUrlId = getTicketUrlId(ticket.ticketNumber)
    router.push(`/tickets/${ticketUrlId}`)
  }

  // Handle create ticket
  const handleCreateTicket = () => {
    setShowWizard(true)
  }

  const handleTicketCreated = () => {
    setShowWizard(false)
    loadTickets(false)
    toast.success('Tiket berhasil dibuat')
  }

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setStartDate(undefined)
    setEndDate(undefined)
    setCurrentPage(1)
  }

  // Check if any filter is active
  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || priorityFilter !== 'all' || startDate !== undefined || endDate !== undefined

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy, HH:mm', { locale: id })
  }

  // Calculate SLA status
  const getSlaStatus = (ticket: Ticket) => {
    if (!ticket.service?.slaHours || ['CLOSED', 'RESOLVED'].includes(ticket.status)) {
      return null
    }

    const createdAt = new Date(ticket.createdAt)
    const now = new Date()
    const slaDeadline = new Date(createdAt.getTime() + (ticket.service.slaHours * 60 * 60 * 1000))
    const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    const percentRemaining = hoursRemaining / ticket.service.slaHours

    if (hoursRemaining <= 0) {
      return { status: 'breached', label: 'SLA Terlewat', color: 'text-red-600 dark:text-red-400' }
    } else if (percentRemaining <= 0.25) {
      return { status: 'at_risk', label: 'Hampir Habis', color: 'text-orange-600 dark:text-orange-400' }
    }
    return { status: 'within', label: 'Dalam SLA', color: 'text-green-600 dark:text-green-400' }
  }

  return (
    <div className="w-full px-responsive py-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Tiket Saya"
        description="Lihat dan kelola tiket yang Anda buat"
        icon={<TicketIcon className="h-6 w-6" />}
        action={
          <Button
            onClick={handleCreateTicket}
            variant="default"
            size="default"
            className="shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Buat Tiket Baru
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Tiket</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Terbuka</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.open}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-500 dark:text-amber-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Dalam Proses</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.inProgress}</p>
              </div>
              <Loader2 className="h-8 w-8 text-purple-500 dark:text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Menunggu</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500 dark:text-orange-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Selesai</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.resolved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-cream-500 dark:border-warm-dark-200">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Search and Refresh */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari tiket berdasarkan nomor, judul, atau deskripsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => loadTickets(false)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Reset Filter
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={(value) => { setPriorityFilter(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Prioritas" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Start Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd MMM yyyy', { locale: id }) : 'Dari Tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => { setStartDate(date); setCurrentPage(1); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* End Date Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'dd MMM yyyy', { locale: id }) : 'Sampai Tanggal'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => { setEndDate(date); setCurrentPage(1); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card className="border-cream-500 dark:border-warm-dark-200">
        <CardContent className="p-0">
          {isLoading ? (
            // Loading skeleton
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            // Empty state
            <div className="p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {hasActiveFilters ? 'Tidak ada tiket ditemukan' : 'Belum ada tiket'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Coba ubah filter untuk menemukan tiket yang Anda cari.'
                  : 'Anda belum membuat tiket apapun. Buat tiket baru untuk memulai.'
                }
              </p>
              {!hasActiveFilters && (
                <Button onClick={handleCreateTicket} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Buat Tiket Baru
                </Button>
              )}
            </div>
          ) : (
            // Tickets table
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px]">No. Tiket</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead className="hidden md:table-cell">Layanan</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="hidden sm:table-cell w-[100px]">Prioritas</TableHead>
                      <TableHead className="hidden lg:table-cell">Tanggal Dibuat</TableHead>
                      <TableHead className="hidden xl:table-cell">Ditugaskan Ke</TableHead>
                      <TableHead className="w-[80px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => {
                      const statusInfo = statusLabels[ticket.status] || { label: ticket.status, color: 'bg-gray-100 text-gray-700' }
                      const priorityInfo = priorityLabels[ticket.priority] || { label: ticket.priority, color: 'bg-gray-100 text-gray-700' }
                      const slaInfo = getSlaStatus(ticket)

                      return (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleRowClick(ticket)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            #{ticket.ticketNumber}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground line-clamp-1">
                                {ticket.title}
                              </p>
                              {slaInfo && (
                                <p className={cn("text-xs", slaInfo.color)}>
                                  {slaInfo.label}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground line-clamp-1">
                              {ticket.service?.name || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1 font-medium", statusInfo.color)}>
                              {statusInfo.icon}
                              <span className="hidden sm:inline">{statusInfo.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className={cn("font-medium", priorityInfo.color)}>
                              {priorityInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {formatDate(ticket.createdAt)}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-sm">
                            {ticket.assignedTo ? (
                              <span className="text-foreground">{ticket.assignedTo.name}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Belum ditugaskan</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRowClick(ticket)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Menampilkan</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>dari {totalTickets} tiket</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm">
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Ticket Creation Wizard */}
      {showWizard && (
        <TicketWizard
          onClose={() => setShowWizard(false)}
          onSuccess={handleTicketCreated}
        />
      )}
    </div>
  )
}

export default function MyTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full px-responsive py-6">
          <Card className="border-border/50">
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent absolute top-0 left-0"></div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Memuat tiket...</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Mohon tunggu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <MyTicketsPageContent />
    </Suspense>
  )
}
