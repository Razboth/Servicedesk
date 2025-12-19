'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileDown, RefreshCw, Calendar, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface ATMIssue {
  id: string
  ticketNumber: string
  atmTerminal: string
  branchName: string
  issueType: string
  status: string
  priority: string
  createdAt: string
  resolvedAt?: string
  resolutionTime?: number
}

export default function ATMIssuesReport() {
  const [data, setData] = useState<ATMIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30days')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchData()
  }, [dateRange, branchFilter, statusFilter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/reports/operational/atm-issues')
      if (!response.ok) {
        throw new Error('Failed to fetch ATM issues data')
      }
      
      const result = await response.json()
      
      // Transform recent tickets data to match the interface
      const issues: ATMIssue[] = result.recentTickets.map((ticket: any) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        atmTerminal: extractATMTerminal(ticket.title) || 'Unknown',
        branchName: ticket.branch,
        issueType: ticket.issueCategory,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt,
        resolutionTime: ticket.resolvedAt ? 
          Math.round((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60) * 10) / 10 
          : undefined
      }))
      
      setData(issues)
    } catch (error) {
      console.error('Failed to fetch ATM issues data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to extract ATM terminal from ticket title
  const extractATMTerminal = (title: string) => {
    const atmMatch = title.match(/ATM\s*(\w+)/i)
    return atmMatch ? `ATM${atmMatch[1]}` : null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'OPEN':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY':
        return 'bg-purple-100 text-purple-800'
      case 'CRITICAL':
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

  // Calculate statistics
  const stats = {
    total: data.length,
    open: data.filter(d => d.status === 'OPEN').length,
    inProgress: data.filter(d => d.status === 'IN_PROGRESS').length,
    resolved: data.filter(d => d.status === 'RESOLVED').length,
    avgResolutionTime: data
      .filter(d => d.resolutionTime)
      .reduce((acc, d) => acc + (d.resolutionTime || 0), 0) / 
      data.filter(d => d.resolutionTime).length || 0
  }

  // Prepare chart data
  const issueTypeData = Object.entries(
    data.reduce((acc, issue) => {
      acc[issue.issueType] = (acc[issue.issueType] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({ type, count }))

  const statusData = [
    { name: 'Open', value: stats.open, color: '#ef4444' },
    { name: 'In Progress', value: stats.inProgress, color: '#eab308' },
    { name: 'Resolved', value: stats.resolved, color: '#22c55e' }
  ]

  const exportToCSV = () => {
    const headers = ['Ticket Number', 'ATM Terminal', 'Branch', 'Issue Type', 'Status', 'Priority', 'Created At', 'Resolved At', 'Resolution Time (hrs)']
    const rows = data.map(d => [
      d.ticketNumber,
      d.atmTerminal,
      d.branchName,
      d.issueType,
      d.status,
      d.priority,
      format(new Date(d.createdAt), 'yyyy-MM-dd HH:mm'),
      d.resolvedAt ? format(new Date(d.resolvedAt), 'yyyy-MM-dd HH:mm') : '',
      d.resolutionTime?.toString() || ''
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `atm-issues-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ATM Issues Report</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive overview of ATM problems and maintenance issues
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Branch</label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="manado">Cabang Manado</SelectItem>
                  <SelectItem value="bitung">Cabang Bitung</SelectItem>
                  <SelectItem value="tomohon">Cabang Tomohon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-600">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Resolution (hrs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResolutionTime.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Issues by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={issueTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>ATM Issues Details</CardTitle>
          <CardDescription>
            Detailed list of all ATM issues and their current status
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
                  <TableHead>ATM Terminal</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Resolution Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-medium">{issue.ticketNumber}</TableCell>
                    <TableCell>{issue.atmTerminal}</TableCell>
                    <TableCell>{issue.branchName}</TableCell>
                    <TableCell>{issue.issueType}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(issue.status)}
                        <span>{issue.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(issue.priority)}>
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(issue.createdAt), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>
                      {issue.resolutionTime ? `${issue.resolutionTime} hrs` : '-'}
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