'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileDown, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { format } from 'date-fns'

interface StatusData {
  status: string
  count: number
  percentage: number
  color: string
  trend: number // percentage change from previous period
}

interface TrendData {
  date: string
  OPEN: number
  IN_PROGRESS: number
  RESOLVED: number
  CLOSED: number
  CANCELLED: number
  ON_HOLD: number
}

export default function RequestsByStatusReport() {
  const [statusData, setStatusData] = useState<StatusData[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [department, setDepartment] = useState('all')

  useEffect(() => {
    fetchData()
  }, [period, department])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Check if we should use mock data (for demo/development)
      const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
      
      if (useMockData) {
        // Simulated data for demo purposes
        const mockStatusData: StatusData[] = [
          { status: 'OPEN', count: 145, percentage: 18.2, color: '#eab308', trend: 5.3 },
          { status: 'IN_PROGRESS', count: 234, percentage: 29.4, color: '#3b82f6', trend: -2.1 },
          { status: 'RESOLVED', count: 189, percentage: 23.7, color: '#10b981', trend: 8.5 },
          { status: 'CLOSED', count: 156, percentage: 19.6, color: '#22c55e', trend: -3.2 },
          { status: 'ON_HOLD', count: 45, percentage: 5.6, color: '#f97316', trend: 12.5 },
          { status: 'CANCELLED', count: 28, percentage: 3.5, color: '#ef4444', trend: -1.8 }
        ]

        const mockTrendData: TrendData[] = [
          { date: '2025-01', OPEN: 120, IN_PROGRESS: 210, RESOLVED: 150, CLOSED: 140, CANCELLED: 20, ON_HOLD: 35 },
          { date: '2025-02', OPEN: 135, IN_PROGRESS: 225, RESOLVED: 165, CLOSED: 145, CANCELLED: 22, ON_HOLD: 38 },
          { date: '2025-03', OPEN: 125, IN_PROGRESS: 240, RESOLVED: 175, CLOSED: 150, CANCELLED: 25, ON_HOLD: 40 },
          { date: '2025-04', OPEN: 140, IN_PROGRESS: 230, RESOLVED: 180, CLOSED: 155, CANCELLED: 24, ON_HOLD: 42 },
          { date: '2025-05', OPEN: 138, IN_PROGRESS: 235, RESOLVED: 185, CLOSED: 152, CANCELLED: 26, ON_HOLD: 44 },
          { date: '2025-06', OPEN: 145, IN_PROGRESS: 234, RESOLVED: 189, CLOSED: 156, CANCELLED: 28, ON_HOLD: 45 }
        ]

        setStatusData(mockStatusData)
        setTrendData(mockTrendData)
      } else {
        // Fetch real data from API
        const params = new URLSearchParams({
          period,
          department
        })
        
        const response = await fetch(`/api/reports/analytics/requests-by-status?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch report data')
        }
        
        const data = await response.json()
        setStatusData(data.statusData || [])
        setTrendData(data.trendData || [])
      }
    } catch (error) {
      console.error('Failed to fetch status data:', error)
      // Optionally show error to user
    } finally {
      setLoading(false)
    }
  }

  const totalRequests = statusData.reduce((sum, item) => sum + item.count, 0)

  const exportToCSV = () => {
    const headers = ['Status', 'Count', 'Percentage', 'Trend']
    const rows = statusData.map(d => [
      d.status,
      d.count.toString(),
      `${d.percentage.toFixed(1)}%`,
      `${d.trend > 0 ? '+' : ''}${d.trend.toFixed(1)}%`
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests-by-status-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Requests by Status</h1>
          <p className="text-muted-foreground mt-2">
            Analysis of ticket distribution across different status categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analysis Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Period</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statusData.find(s => s.status === 'OPEN')?.count || 0 + 
               statusData.find(s => s.status === 'IN_PROGRESS')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Open + In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {((statusData.find(s => s.status === 'RESOLVED')?.count || 0 + 
                statusData.find(s => s.status === 'CLOSED')?.count || 0) / totalRequests * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Resolved + Closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statusData.find(s => s.status === 'ON_HOLD')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending action</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution Cards */}
      <div className="grid grid-cols-6 gap-4">
        {statusData.map((status) => (
          <Card key={status.status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{status.status.replace('_', ' ')}</span>
                {status.trend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: status.color }}>
                {status.count}
              </div>
              <p className="text-xs text-muted-foreground">{status.percentage.toFixed(1)}%</p>
              <p className="text-xs mt-1">
                <span className={status.trend > 0 ? 'text-green-600' : 'text-red-600'}>
                  {status.trend > 0 ? '+' : ''}{status.trend.toFixed(1)}%
                </span>
                <span className="text-muted-foreground"> vs last period</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Current distribution of tickets by status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.status}: ${entry.percentage.toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="count"
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

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status Comparison</CardTitle>
            <CardDescription>Number of tickets in each status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Status Trends Over Time</CardTitle>
          <CardDescription>Monthly progression of ticket statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="OPEN" stroke="#eab308" strokeWidth={2} />
              <Line type="monotone" dataKey="IN_PROGRESS" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="RESOLVED" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="CLOSED" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="ON_HOLD" stroke="#f97316" strokeWidth={2} />
              <Line type="monotone" dataKey="CANCELLED" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}