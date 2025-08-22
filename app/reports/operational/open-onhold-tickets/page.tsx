'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileDown, RefreshCw, AlertTriangle, Clock, User, Building } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

interface OpenTicket {
  id: string
  ticketNumber: string
  title: string
  status: 'OPEN' | 'ON_HOLD'
  priority: string
  category: string
  assignedTo?: string
  branch: string
  createdAt: string
  daysOpen: number
  lastUpdated: string
  holdReason?: string
}

export default function OpenOnHoldTicketsReport() {
  const [data, setData] = useState<OpenTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [year] = useState(2024)

  useEffect(() => {
    fetchData()
  }, [year])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Simulated data for open and on-hold tickets
      const mockData: OpenTicket[] = [
        {
          id: '1',
          ticketNumber: 'TKT-2024-001234',
          title: 'Network connectivity issue at main branch',
          status: 'OPEN',
          priority: 'HIGH',
          category: 'Network',
          assignedTo: 'John Doe',
          branch: 'Cabang Manado',
          createdAt: '2024-12-15T08:00:00Z',
          daysOpen: 38,
          lastUpdated: '2024-12-20T14:30:00Z'
        },
        {
          id: '2',
          ticketNumber: 'TKT-2024-001456',
          title: 'Printer malfunction in customer service area',
          status: 'ON_HOLD',
          priority: 'MEDIUM',
          category: 'Hardware',
          assignedTo: 'Jane Smith',
          branch: 'Cabang Bitung',
          createdAt: '2024-12-10T09:15:00Z',
          daysOpen: 43,
          lastUpdated: '2024-12-18T11:00:00Z',
          holdReason: 'Waiting for spare parts'
        },
        {
          id: '3',
          ticketNumber: 'TKT-2024-001789',
          title: 'Software license renewal required',
          status: 'OPEN',
          priority: 'LOW',
          category: 'Software',
          branch: 'Cabang Tomohon',
          createdAt: '2024-12-20T14:00:00Z',
          daysOpen: 33,
          lastUpdated: '2024-12-21T10:00:00Z'
        },
        {
          id: '4',
          ticketNumber: 'TKT-2024-001890',
          title: 'Database backup failure',
          status: 'OPEN',
          priority: 'URGENT',
          category: 'Database',
          assignedTo: 'Mike Johnson',
          branch: 'Cabang Kotamobagu',
          createdAt: '2024-12-18T07:00:00Z',
          daysOpen: 35,
          lastUpdated: '2024-12-22T16:00:00Z'
        },
        {
          id: '5',
          ticketNumber: 'TKT-2024-001923',
          title: 'Access card system not responding',
          status: 'ON_HOLD',
          priority: 'HIGH',
          category: 'Security',
          assignedTo: 'Sarah Wilson',
          branch: 'Cabang Airmadidi',
          createdAt: '2024-12-05T11:30:00Z',
          daysOpen: 48,
          lastUpdated: '2024-12-15T13:45:00Z',
          holdReason: 'Vendor support required'
        },
        {
          id: '6',
          ticketNumber: 'TKT-2024-001945',
          title: 'Email server performance degradation',
          status: 'OPEN',
          priority: 'HIGH',
          category: 'Infrastructure',
          assignedTo: 'Tom Brown',
          branch: 'Cabang Tondano',
          createdAt: '2024-12-22T08:30:00Z',
          daysOpen: 31,
          lastUpdated: '2024-12-23T09:15:00Z'
        }
      ]
      
      setData(mockData)
    } catch (error) {
      console.error('Failed to fetch open/on-hold tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800'
      case 'LOW':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAgingColor = (days: number) => {
    if (days > 30) return 'text-red-600 font-bold'
    if (days > 14) return 'text-orange-600 font-medium'
    if (days > 7) return 'text-yellow-600'
    return 'text-gray-600'
  }

  // Calculate statistics
  const stats = {
    totalOpen: data.filter(d => d.status === 'OPEN').length,
    totalOnHold: data.filter(d => d.status === 'ON_HOLD').length,
    avgDaysOpen: Math.round(data.reduce((acc, d) => acc + d.daysOpen, 0) / data.length || 0),
    criticalAging: data.filter(d => d.daysOpen > 30).length,
    unassigned: data.filter(d => !d.assignedTo).length
  }

  // Group by category
  const byCategory = data.reduce((acc, ticket) => {
    acc[ticket.category] = (acc[ticket.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const exportToCSV = () => {
    const headers = ['Ticket Number', 'Title', 'Status', 'Priority', 'Category', 'Assigned To', 'Branch', 'Created Date', 'Days Open', 'Last Updated', 'Hold Reason']
    const rows = data.map(d => [
      d.ticketNumber,
      d.title,
      d.status,
      d.priority,
      d.category,
      d.assignedTo || 'Unassigned',
      d.branch,
      format(new Date(d.createdAt), 'yyyy-MM-dd'),
      d.daysOpen.toString(),
      format(new Date(d.lastUpdated), 'yyyy-MM-dd HH:mm'),
      d.holdReason || ''
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `open-onhold-tickets-${year}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Open & On-Hold Tickets {year}</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage tickets requiring immediate attention
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <FileDown className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Alert for critical aging */}
      {stats.criticalAging > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Critical Aging Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              {stats.criticalAging} ticket(s) have been open for more than 30 days and require immediate attention.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.totalOpen}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">On-Hold Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalOnHold}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Days Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDaysOpen}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Critical (>30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalAging}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.unassigned}</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribution by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {Object.entries(byCategory).map(([category, count]) => (
              <div key={category} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">{category}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
          <CardDescription>
            All open and on-hold tickets from {year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Days Open</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div>{ticket.title}</div>
                        {ticket.holdReason && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Hold reason: {ticket.holdReason}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{ticket.category}</TableCell>
                    <TableCell>
                      {ticket.assignedTo ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.assignedTo}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {ticket.branch}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={getAgingColor(ticket.daysOpen)}>
                        {ticket.daysOpen} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(ticket.lastUpdated), 'MMM dd, HH:mm')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}