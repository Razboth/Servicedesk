'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileDown, RefreshCw, Users, TrendingUp, AlertCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { format } from 'date-fns'

interface GroupData {
  id: string
  name: string
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  closedTickets: number
  avgResolutionTime: number
  slaCompliance: number
  technicians: number
  workload: 'Low' | 'Medium' | 'High' | 'Critical'
  color: string
  trend: number
}

interface GroupPerformance {
  group: string
  efficiency: number
  quality: number
  speed: number
  communication: number
  technical: number
}

interface TrendData {
  month: string
  [key: string]: number | string
}

export default function RequestsByGroupReport() {
  const [groupData, setGroupData] = useState<GroupData[]>([])
  const [performanceData, setPerformanceData] = useState<GroupPerformance[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')
  const [metric, setMetric] = useState('tickets')

  useEffect(() => {
    fetchData()
  }, [timeRange, metric])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Simulated data for support groups
      const mockGroupData: GroupData[] = [
        {
          id: '1',
          name: 'Network Team',
          totalTickets: 342,
          openTickets: 45,
          inProgressTickets: 78,
          resolvedTickets: 156,
          closedTickets: 63,
          avgResolutionTime: 4.5,
          slaCompliance: 92,
          technicians: 8,
          workload: 'High',
          color: '#3b82f6',
          trend: 12.5
        },
        {
          id: '2',
          name: 'Hardware Support',
          totalTickets: 289,
          openTickets: 38,
          inProgressTickets: 65,
          resolvedTickets: 128,
          closedTickets: 58,
          avgResolutionTime: 6.2,
          slaCompliance: 88,
          technicians: 6,
          workload: 'High',
          color: '#10b981',
          trend: -3.2
        },
        {
          id: '3',
          name: 'Software Team',
          totalTickets: 456,
          openTickets: 67,
          inProgressTickets: 98,
          resolvedTickets: 189,
          closedTickets: 102,
          avgResolutionTime: 3.8,
          slaCompliance: 95,
          technicians: 10,
          workload: 'Critical',
          color: '#8b5cf6',
          trend: 18.7
        },
        {
          id: '4',
          name: 'Database Admin',
          totalTickets: 178,
          openTickets: 22,
          inProgressTickets: 34,
          resolvedTickets: 78,
          closedTickets: 44,
          avgResolutionTime: 5.1,
          slaCompliance: 91,
          technicians: 4,
          workload: 'Medium',
          color: '#f59e0b',
          trend: 5.4
        },
        {
          id: '5',
          name: 'Security Team',
          totalTickets: 134,
          openTickets: 18,
          inProgressTickets: 28,
          resolvedTickets: 56,
          closedTickets: 32,
          avgResolutionTime: 2.3,
          slaCompliance: 98,
          technicians: 5,
          workload: 'Low',
          color: '#ef4444',
          trend: 8.9
        },
        {
          id: '6',
          name: 'Help Desk L1',
          totalTickets: 567,
          openTickets: 89,
          inProgressTickets: 123,
          resolvedTickets: 234,
          closedTickets: 121,
          avgResolutionTime: 1.5,
          slaCompliance: 94,
          technicians: 12,
          workload: 'Critical',
          color: '#06b6d4',
          trend: 22.3
        },
        {
          id: '7',
          name: 'Infrastructure',
          totalTickets: 223,
          openTickets: 31,
          inProgressTickets: 45,
          resolvedTickets: 98,
          closedTickets: 49,
          avgResolutionTime: 7.8,
          slaCompliance: 85,
          technicians: 5,
          workload: 'Medium',
          color: '#84cc16',
          trend: -1.2
        },
        {
          id: '8',
          name: 'Application Support',
          totalTickets: 312,
          openTickets: 42,
          inProgressTickets: 67,
          resolvedTickets: 134,
          closedTickets: 69,
          avgResolutionTime: 4.2,
          slaCompliance: 90,
          technicians: 7,
          workload: 'High',
          color: '#ec4899',
          trend: 9.6
        }
      ]

      const mockPerformanceData: GroupPerformance[] = mockGroupData.map(group => ({
        group: group.name,
        efficiency: 75 + Math.random() * 20,
        quality: 70 + Math.random() * 25,
        speed: 65 + Math.random() * 30,
        communication: 80 + Math.random() * 15,
        technical: 75 + Math.random() * 20
      }))

      // Generate trend data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      const mockTrendData: TrendData[] = months.map(month => {
        const data: TrendData = { month }
        mockGroupData.forEach(group => {
          data[group.name] = Math.floor(group.totalTickets * (0.8 + Math.random() * 0.4))
        })
        return data
      })

      setGroupData(mockGroupData)
      setPerformanceData(mockPerformanceData)
      setTrendData(mockTrendData)
    } catch (error) {
      console.error('Failed to fetch group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalTickets = groupData.reduce((sum, g) => sum + g.totalTickets, 0)
  const totalTechnicians = groupData.reduce((sum, g) => sum + g.technicians, 0)
  const avgSLA = groupData.reduce((sum, g) => sum + g.slaCompliance, 0) / groupData.length || 0
  const avgResolution = groupData.reduce((sum, g) => sum + g.avgResolutionTime, 0) / groupData.length || 0

  const getWorkloadColor = (workload: string) => {
    switch (workload) {
      case 'Low': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'High': return 'bg-orange-100 text-orange-800'
      case 'Critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const pieData = groupData.map(g => ({
    name: g.name,
    value: g.totalTickets,
    color: g.color
  }))

  const exportToCSV = () => {
    const headers = ['Group', 'Total Tickets', 'Open', 'In Progress', 'Resolved', 'Closed', 'Avg Resolution (hrs)', 'SLA Compliance (%)', 'Technicians', 'Workload']
    const rows = groupData.map(g => [
      g.name,
      g.totalTickets.toString(),
      g.openTickets.toString(),
      g.inProgressTickets.toString(),
      g.resolvedTickets.toString(),
      g.closedTickets.toString(),
      g.avgResolutionTime.toFixed(1),
      g.slaCompliance.toString(),
      g.technicians.toString(),
      g.workload
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests-by-group-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Requests by Support Group</h1>
          <p className="text-muted-foreground mt-2">
            Analysis of ticket distribution and performance across support groups
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
              <label className="text-sm font-medium mb-2 block">Metric Focus</label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tickets">Ticket Volume</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="sla">SLA Compliance</SelectItem>
                  <SelectItem value="workload">Workload</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active support groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalTechnicians}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgResolution.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">Overall average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{avgSLA.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Group average</p>
          </CardContent>
        </Card>
      </div>

      {/* Group Cards */}
      <div className="grid grid-cols-4 gap-4">
        {groupData.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{group.name}</span>
                <Badge className={getWorkloadColor(group.workload)}>
                  {group.workload}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-3xl font-bold" style={{ color: group.color }}>
                  {group.totalTickets}
                </span>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {group.trend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                    )}
                    <span className={group.trend > 0 ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                      {group.trend > 0 ? '+' : ''}{group.trend.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open:</span>
                  <span className="font-medium">{group.openTickets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">In Progress:</span>
                  <span className="font-medium">{group.inProgressTickets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved:</span>
                  <span className="font-medium">{group.resolvedTickets}</span>
                </div>
              </div>

              <div className="pt-2 border-t space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Technicians:</span>
                  <span className="font-medium">{group.technicians}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Resolution:</span>
                  <span className="font-medium">{group.avgResolutionTime}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SLA:</span>
                  <span className="font-medium">{group.slaCompliance}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bar Chart - Ticket Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Distribution by Group</CardTitle>
            <CardDescription>Breakdown of ticket statuses across support groups</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={groupData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="openTickets" stackId="a" fill="#fbbf24" name="Open" />
                <Bar dataKey="inProgressTickets" stackId="a" fill="#60a5fa" name="In Progress" />
                <Bar dataKey="resolvedTickets" stackId="a" fill="#34d399" name="Resolved" />
                <Bar dataKey="closedTickets" stackId="a" fill="#10b981" name="Closed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Total Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Group Workload Distribution</CardTitle>
            <CardDescription>Proportion of total tickets handled by each group</CardDescription>
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

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Group Activity Trends</CardTitle>
          <CardDescription>Monthly ticket volume trends by support group</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              {groupData.map((group) => (
                <Area
                  key={group.id}
                  type="monotone"
                  dataKey={group.name}
                  stackId="1"
                  stroke={group.color}
                  fill={group.color}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Radar */}
      <Card>
        <CardHeader>
          <CardTitle>Group Performance Metrics</CardTitle>
          <CardDescription>Comparative analysis of key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={performanceData.slice(0, 5)}>
              <PolarGrid />
              <PolarAngleAxis dataKey="group" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Efficiency" dataKey="efficiency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Radar name="Quality" dataKey="quality" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Radar name="Speed" dataKey="speed" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}