'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Activity,
  User,
  Ticket,
  MessageSquare,
  Settings,
  Shield,
  FileText,
  Download,
  Upload,
  Trash,
  Edit,
  Plus,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart
} from 'lucide-react'
import { toast } from 'sonner'

interface ActivityLog {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string
  oldValues: any
  newValues: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    branch?: {
      name: string
      code: string
    }
  } | null
}

interface ActivityData {
  logs: ActivityLog[]
  stats: {
    total: number
    actionStats: { action: string; count: number }[]
    entityStats: { entity: string; count: number }[]
    activeUsers: { user: any; count: number }[]
  }
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

const actionIcons: Record<string, any> = {
  CREATE_TICKET: Plus,
  UPDATE_TICKET: Edit,
  DELETE_TICKET: Trash,
  STATUS_UPDATE: Activity,
  ADD_COMMENT: MessageSquare,
  CREATE_USER: User,
  UPDATE_USER: Edit,
  DELETE_USER: Trash,
  CREATE_SERVICE: Settings,
  UPDATE_SERVICE: Edit,
  DELETE_SERVICE: Trash,
  UPLOAD_FILE: Upload,
  DOWNLOAD_FILE: Download,
  LOGIN: Shield,
  LOGIN_FAILED: XCircle,
  GENERATE_REPORT: FileText,
  DEFAULT: Activity
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
  LOGIN: 'bg-purple-100 text-purple-800',
  FAILED: 'bg-red-100 text-red-800',
  STATUS: 'bg-yellow-100 text-yellow-800',
  DEFAULT: 'bg-gray-100 text-gray-800'
}

export default function ActivityLogs() {
  const [data, setData] = useState<ActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [days, setDays] = useState(7)
  const [page, setPage] = useState(1)

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        days: days.toString(),
        page: page.toString(),
        limit: '50'
      })

      if (search) params.append('search', search)
      if (entityFilter !== 'ALL') params.append('entity', entityFilter)
      if (actionFilter !== 'ALL') params.append('action', actionFilter)

      const response = await fetch(`/api/admin/activity-logs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch activity logs')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
      toast.error('Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, search ? 500 : 0)

    return () => clearTimeout(timer)
  }, [search, entityFilter, actionFilter, days, page])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || actionIcons.DEFAULT
    return <Icon className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return actionColors.CREATE
    if (action.includes('UPDATE')) return actionColors.UPDATE
    if (action.includes('DELETE')) return actionColors.DELETE
    if (action.includes('LOGIN')) return action.includes('FAILED') ? actionColors.FAILED : actionColors.LOGIN
    if (action.includes('STATUS')) return actionColors.STATUS
    return actionColors.DEFAULT
  }

  const getActionLabel = (action: string) => {
    return action.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ')
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Filters</CardTitle>
          <CardDescription>Filter and search activity logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Entities</SelectItem>
                <SelectItem value="TICKET">Tickets</SelectItem>
                <SelectItem value="USER">Users</SelectItem>
                <SelectItem value="COMMENT">Comments</SelectItem>
                <SelectItem value="SERVICE">Services</SelectItem>
                <SelectItem value="CATEGORY">Categories</SelectItem>
                <SelectItem value="VENDOR">Vendors</SelectItem>
                <SelectItem value="REPORT">Reports</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Actions</SelectItem>
                <SelectItem value="CREATE">Create Actions</SelectItem>
                <SelectItem value="UPDATE">Update Actions</SelectItem>
                <SelectItem value="DELETE">Delete Actions</SelectItem>
                <SelectItem value="STATUS">Status Changes</SelectItem>
                <SelectItem value="LOGIN">Login Activities</SelectItem>
              </SelectContent>
            </Select>

            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.total}</div>
              <p className="text-xs text-muted-foreground">Last {days} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active Entity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.stats.entityStats[0]?.entity || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.stats.entityStats[0]?.count || 0} activities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Action</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {getActionLabel(data.stats.actionStats[0]?.action || 'N/A')}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.stats.actionStats[0]?.count || 0} times
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.activeUsers.length}</div>
              <p className="text-xs text-muted-foreground">Unique users</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            All user activities across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div>
                          <div className="font-medium">{log.user.name}</div>
                          <div className="text-xs text-muted-foreground">{log.user.email}</div>
                          <Badge variant="outline" className="text-xs mt-1">
                            {log.user.role}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <Badge className={getActionColor(log.action)}>
                          {getActionLabel(log.action)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.entity}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm">
                        {log.newValues?.ticketNumber && (
                          <div>Ticket: #{log.newValues.ticketNumber}</div>
                        )}
                        {log.newValues?.title && (
                          <div className="truncate">{log.newValues.title}</div>
                        )}
                        {log.newValues?.name && (
                          <div>{log.newValues.name}</div>
                        )}
                        {log.newValues?.service && (
                          <div>Service: {log.newValues.service}</div>
                        )}
                        {log.newValues?.reason && (
                          <div className="text-xs text-muted-foreground">{log.newValues.reason}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.ipAddress || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page === data.pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Most Active Users */}
      {data?.stats.activeUsers && data.stats.activeUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Active Users</CardTitle>
            <CardDescription>Users with the most activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.stats.activeUsers.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{item.user.name}</div>
                      <div className="text-sm text-muted-foreground">{item.user.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{item.count} activities</div>
                    <Badge variant="outline" className="text-xs">
                      {item.user.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}