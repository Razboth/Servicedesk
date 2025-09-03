'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  FileDown, 
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
  Building
} from 'lucide-react'
import { format } from 'date-fns'

interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description: string
  status: string
  priority: string
  category: string
  service: string
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
  responseTime: number | null
  resolutionTime: number | null
  approvalStatus: string | null
  approvedBy: string | null
  commentCount: number
  attachmentCount: number
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
    branches: Array<{ id: string; name: string; code: string }>
    technicians: Array<{ id: string; name: string; email: string }>
  }
}

export default function AllTicketsReport() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReportData | null>(null)
  const [exporting, setExporting] = useState(false)
  
  // Filters
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [status, setStatus] = useState('ALL')
  const [priority, setPriority] = useState('ALL')
  const [categoryId, setCategoryId] = useState('ALL')
  const [branchId, setBranchId] = useState('ALL')
  const [technicianId, setTechnicianId] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')

  useEffect(() => {
    fetchData()
  }, [page, status, priority, categoryId, branchId, technicianId, startDate, endDate, sortBy, sortOrder])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(status !== 'ALL' && { status }),
        ...(priority !== 'ALL' && { priority }),
        ...(categoryId !== 'ALL' && { categoryId }),
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

  const handleSearch = () => {
    setPage(1)
    fetchData()
  }

  const exportToCSV = async () => {
    try {
      setExporting(true)
      const response = await fetch('/api/reports/tickets/all-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'csv',
          filters: {
            status: status !== 'ALL' ? status : undefined,
            priority: priority !== 'ALL' ? priority : undefined,
            categoryId: categoryId !== 'ALL' ? categoryId : undefined,
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
      a.download = `tickets-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; icon: any; className: string }> = {
      OPEN: { variant: 'default', icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      IN_PROGRESS: { variant: 'default', icon: Clock, className: 'bg-blue-100 text-blue-800 border-blue-300' },
      RESOLVED: { variant: 'default', icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-300' },
      CLOSED: { variant: 'default', icon: CheckCircle, className: 'bg-gray-100 text-gray-800 border-gray-300' },
      PENDING: { variant: 'default', icon: Clock, className: 'bg-orange-100 text-orange-800 border-orange-300' },
      PENDING_APPROVAL: { variant: 'default', icon: Clock, className: 'bg-purple-100 text-purple-800 border-purple-300' },
      CANCELLED: { variant: 'default', icon: XCircle, className: 'bg-red-100 text-red-800 border-red-300' }
    }
    
    const config = statusConfig[status] || { variant: 'default', icon: AlertCircle, className: '' }
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      URGENT: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-green-100 text-green-800 border-green-300'
    }
    
    return (
      <Badge className={colors[priority] || ''}>
        {priority}
      </Badge>
    )
  }

  if (!session) return null

  return (
    <div className="container mx-auto py-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">All Tickets Report</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive view of all tickets with advanced filtering and export capabilities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm" disabled={exporting}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{data.stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{data.stats.open}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{data.stats.inProgress}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{data.stats.resolved}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{data.stats.closed}</p>
                    <p className="text-xs text-muted-foreground">Closed</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{data.stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ticket #, title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
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
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Priorities</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {data && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Category</label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Categories</SelectItem>
                        {data.filters.categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Branch</label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Branches</SelectItem>
                        {data.filters.branches.map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name} ({branch.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Technician</label>
                    <Select value={technicianId} onValueChange={setTechnicianId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Technicians</SelectItem>
                        {data.filters.technicians.map(tech => (
                          <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="updatedAt">Updated Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Order</label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        {loading ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading tickets...</p>
              </div>
            </CardContent>
          </Card>
        ) : data && data.tickets.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Ticket #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Resolution Time</TableHead>
                      <TableHead className="text-center">Comments</TableHead>
                      <TableHead className="text-center">Files</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tickets.map((ticket) => (
                      <TableRow key={ticket.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          <a href={`/tickets/${ticket.id}`} className="text-blue-600 hover:underline">
                            #{ticket.ticketNumber}
                          </a>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="truncate font-medium">{ticket.title}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                        <TableCell className="text-sm">{ticket.category}</TableCell>
                        <TableCell className="text-sm">{ticket.service}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{ticket.branchCode}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[100px]" title={ticket.createdBy}>
                              {ticket.createdBy}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {ticket.assignedTo}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ticket.resolutionTime ? `${ticket.resolutionTime} hrs` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {ticket.commentCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {ticket.commentCount}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {ticket.attachmentCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {ticket.attachmentCount}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data.pagination.pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * 50) + 1} to {Math.min(page * 50, data.pagination.total)} of {data.pagination.total} tickets
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (data.pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= data.pagination.pages - 2) {
                          pageNum = data.pagination.pages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                      disabled={page === data.pagination.pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
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
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No tickets found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your filters to see more results</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}