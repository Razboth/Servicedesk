'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileDown, RefreshCw, AlertTriangle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { format } from 'date-fns'

interface PriorityData {
  priority: string
  open: number
  inProgress: number
  resolved: number
  closed: number
  total: number
  avgResolutionHours: number
  slaCompliance: number
  color: string
}

interface DepartmentPriority {
  department: string
  URGENT: number
  HIGH: number
  MEDIUM: number
  LOW: number
}

export default function RequestsByPriorityReport() {
  const [priorityData, setPriorityData] = useState<PriorityData[]>([])
  const [departmentData, setDepartmentData] = useState<DepartmentPriority[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')
  const [department, setDepartment] = useState('all')

  useEffect(() => {
    fetchData()
  }, [timeRange, department])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Simulated data
      const mockPriorityData: PriorityData[] = [
        {
          priority: 'URGENT',
          open: 12,
          inProgress: 18,
          resolved: 45,
          closed: 38,
          total: 113,
          avgResolutionHours: 2.5,
          slaCompliance: 92,
          color: '#dc2626'
        },
        {
          priority: 'HIGH',
          open: 25,
          inProgress: 42,
          resolved: 78,
          closed: 65,
          total: 210,
          avgResolutionHours: 8.3,
          slaCompliance: 85,
          color: '#ea580c'
        },
        {
          priority: 'MEDIUM',
          open: 48,
          inProgress: 65,
          resolved: 120,
          closed: 98,
          total: 331,
          avgResolutionHours: 24.5,
          slaCompliance: 78,
          color: '#f59e0b'
        },
        {
          priority: 'LOW',
          open: 35,
          inProgress: 28,
          resolved: 85,
          closed: 92,
          total: 240,
          avgResolutionHours: 72.0,
          slaCompliance: 95,
          color: '#84cc16'
        }
      ]

      const mockDepartmentData: DepartmentPriority[] = [
        { department: 'IT Operations', URGENT: 45, HIGH: 78, MEDIUM: 120, LOW: 65 },
        { department: 'Customer Service', URGENT: 32, HIGH: 65, MEDIUM: 98, LOW: 85 },
        { department: 'Banking Operations', URGENT: 28, HIGH: 52, MEDIUM: 78, LOW: 62 },
        { department: 'Administration', URGENT: 8, HIGH: 15, MEDIUM: 35, LOW: 28 }
      ]

      setPriorityData(mockPriorityData)
      setDepartmentData(mockDepartmentData)
    } catch (error) {
      console.error('Failed to fetch priority data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalTickets = priorityData.reduce((sum, item) => sum + item.total, 0)
  const avgSLACompliance = priorityData.reduce((sum, item) => sum + item.slaCompliance, 0) / priorityData.length || 0

  const pieData = priorityData.map(item => ({
    name: item.priority,
    value: item.total,
    color: item.color
  }))

  const radarData = priorityData.map(item => ({
    priority: item.priority,
    'Response Time': 100 - (item.avgResolutionHours / 72 * 100),
    'SLA Compliance': item.slaCompliance,
    'Resolution Rate': ((item.resolved + item.closed) / item.total * 100)
  }))

  const exportToCSV = () => {
    const headers = ['Priority', 'Open', 'In Progress', 'Resolved', 'Closed', 'Total', 'Avg Resolution (hrs)', 'SLA Compliance (%)']
    const rows = priorityData.map(d => [
      d.priority,
      d.open.toString(),
      d.inProgress.toString(),
      d.resolved.toString(),
      d.closed.toString(),
      d.total.toString(),
      d.avgResolutionHours.toFixed(1),
      d.slaCompliance.toString()
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests-by-priority-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Requests by Priority</h1>
          <p className="text-muted-foreground mt-2">
            Analysis of ticket distribution and performance by priority levels
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
          <CardTitle className="text-lg">Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
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
                  <SelectItem value="it">IT Operations</SelectItem>
                  <SelectItem value="customer">Customer Service</SelectItem>
                  <SelectItem value="banking">Banking Operations</SelectItem>
                  <SelectItem value="admin">Administration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Urgent Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {priorityData.find(p => p.priority === 'URGENT')?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg resolution: {priorityData.find(p => p.priority === 'URGENT')?.avgResolutionHours || 0} hrs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all priorities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {avgSLACompliance.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall compliance rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical Backlog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {priorityData.filter(p => p.priority === 'URGENT' || p.priority === 'HIGH')
                .reduce((sum, p) => sum + p.open, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Urgent + High open tickets</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority Cards */}
      <div className="grid grid-cols-4 gap-4">
        {priorityData.map((priority) => (
          <Card key={priority.priority}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <Badge className={getPriorityBadgeClass(priority.priority)}>
                  {priority.priority}
                </Badge>
                <span className="text-2xl font-bold">{priority.total}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Open:</span>
                  <span className="ml-2 font-medium">{priority.open}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">In Progress:</span>
                  <span className="ml-2 font-medium">{priority.inProgress}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolved:</span>
                  <span className="ml-2 font-medium">{priority.resolved}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Closed:</span>
                  <span className="ml-2 font-medium">{priority.closed}</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg Resolution:</span>
                  <span className="font-medium">{priority.avgResolutionHours} hrs</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">SLA Compliance:</span>
                  <span className="font-medium">{priority.slaCompliance}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Status by Priority</CardTitle>
            <CardDescription>Distribution of ticket statuses across priority levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="open" stackId="a" fill="#fbbf24" name="Open" />
                <Bar dataKey="inProgress" stackId="a" fill="#60a5fa" name="In Progress" />
                <Bar dataKey="resolved" stackId="a" fill="#34d399" name="Resolved" />
                <Bar dataKey="closed" stackId="a" fill="#10b981" name="Closed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Overall distribution of tickets by priority</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Department Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Distribution by Department</CardTitle>
          <CardDescription>How different departments utilize priority levels</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={departmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="URGENT" fill="#dc2626" />
              <Bar dataKey="HIGH" fill="#ea580c" />
              <Bar dataKey="MEDIUM" fill="#f59e0b" />
              <Bar dataKey="LOW" fill="#84cc16" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Radar */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Performance Metrics</CardTitle>
          <CardDescription>Comparative analysis of key performance indicators by priority</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="priority" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Response Time" dataKey="Response Time" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Radar name="SLA Compliance" dataKey="SLA Compliance" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
              <Radar name="Resolution Rate" dataKey="Resolution Rate" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}