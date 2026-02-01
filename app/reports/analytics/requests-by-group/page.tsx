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
      // Fetch real data from API with timeRange parameter
      const response = await fetch(`/api/reports/analytics/requests-by-group?timeRange=${timeRange}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      
      // Transform API data to component format
      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#84cc16', '#ec4899'];
      
      const transformedGroupData: GroupData[] = data.groups.map((group: any, index: number) => ({
        id: group.id,
        name: group.name,
        totalTickets: group.totalTickets,
        openTickets: group.openTickets,
        inProgressTickets: group.statusDistribution?.IN_PROGRESS || 0,
        resolvedTickets: group.resolvedTickets,
        closedTickets: group.statusDistribution?.CLOSED || 0,
        avgResolutionTime: group.avgResolutionHours,
        slaCompliance: group.slaComplianceRate,
        technicians: group.activeMembers,
        workload: group.totalTickets > 200 ? 'Critical' : 
                  group.totalTickets > 100 ? 'High' : 
                  group.totalTickets > 50 ? 'Medium' : 'Low' as 'Low' | 'Medium' | 'High' | 'Critical',
        color: colors[index % colors.length],
        trend: group.weeklyTickets > group.recentTickets / 4 ? 
               ((group.weeklyTickets - group.recentTickets / 4) / (group.recentTickets / 4)) * 100 : 0
      }));

      // Transform performance data from member workload
      const performanceData: GroupPerformance[] = data.groups.map((group: any) => ({
        group: group.name,
        efficiency: Math.min(100, group.resolutionRate),
        quality: Math.min(100, group.slaComplianceRate),
        speed: Math.max(0, 100 - (group.avgResolutionHours * 2)), // Inverse of resolution time
        communication: Math.min(100, (group.slaComplianceRate + group.resolutionRate) / 2), // Based on actual metrics
        technical: Math.min(100, group.resolutionRate)
      }));

      // Use monthly trend from API
      const trendData: TrendData[] = data.monthlyTrend || [];

      setGroupData(transformedGroupData)
      setPerformanceData(performanceData)
      setTrendData(trendData)
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

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `support-group-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Requests by Support Group</h1>
          <p className="text-gray-600 mt-2">Analyze ticket distribution and performance across support teams</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <FileDown className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="quarter">Last Quarter</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tickets">Total Tickets</SelectItem>
            <SelectItem value="resolution">Resolution Time</SelectItem>
            <SelectItem value="sla">SLA Compliance</SelectItem>
            <SelectItem value="workload">Team Workload</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groupData.length}</div>
            <p className="text-xs text-muted-foreground">Active support groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Technicians</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTechnicians}</div>
            <p className="text-xs text-muted-foreground">Across all groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResolution.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Overall average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg SLA Compliance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSLA.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Group average</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Distribution - changes based on metric */}
        <Card>
          <CardHeader>
            <CardTitle>
              {metric === 'tickets' && 'Ticket Distribution by Group'}
              {metric === 'resolution' && 'Resolution Time by Group'}
              {metric === 'sla' && 'SLA Compliance by Group'}
              {metric === 'workload' && 'Team Workload Distribution'}
            </CardTitle>
            <CardDescription>
              {metric === 'tickets' && 'Breakdown of ticket statuses across support groups'}
              {metric === 'resolution' && 'Average resolution time in hours'}
              {metric === 'sla' && 'SLA compliance percentage by group'}
              {metric === 'workload' && 'Tickets per technician ratio'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              {metric === 'tickets' ? (
                <BarChart data={groupData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="openTickets" stackId="a" fill="#ef4444" name="Open" />
                  <Bar dataKey="inProgressTickets" stackId="a" fill="#f59e0b" name="In Progress" />
                  <Bar dataKey="resolvedTickets" stackId="a" fill="#10b981" name="Resolved" />
                  <Bar dataKey="closedTickets" stackId="a" fill="#6b7280" name="Closed" />
                </BarChart>
              ) : metric === 'resolution' ? (
                <BarChart data={groupData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}h`} />
                  <Bar dataKey="avgResolutionTime" fill="#3b82f6" name="Avg Resolution Time (hours)" />
                </BarChart>
              ) : metric === 'sla' ? (
                <BarChart data={groupData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Bar dataKey="slaCompliance" fill="#10b981" name="SLA Compliance %" />
                </BarChart>
              ) : (
                <BarChart data={groupData.map(g => ({ ...g, ticketsPerTech: g.technicians > 0 ? Math.round(g.totalTickets / g.technicians) : 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ticketsPerTech" fill="#8b5cf6" name="Tickets per Technician" />
                  <Bar dataKey="technicians" fill="#06b6d4" name="Team Size" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Group Workload Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Group Workload Distribution</CardTitle>
            <CardDescription>Proportion of total tickets handled by each group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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

      {/* Group Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Support Group Performance
          </CardTitle>
          <CardDescription>
            Detailed performance metrics for each support group
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Group</th>
                  <th className="text-center p-4 font-medium">Total Tickets</th>
                  <th className="text-center p-4 font-medium">Open</th>
                  <th className="text-center p-4 font-medium">In Progress</th>
                  <th className="text-center p-4 font-medium">Resolved</th>
                  <th className="text-center p-4 font-medium">Avg Resolution</th>
                  <th className="text-center p-4 font-medium">SLA</th>
                  <th className="text-center p-4 font-medium">Technicians</th>
                  <th className="text-center p-4 font-medium">Workload</th>
                  <th className="text-center p-4 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {groupData.map((group, index) => (
                  <tr key={group.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <div className="font-medium">{group.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-4 font-medium">{group.totalTickets}</td>
                    <td className="text-center p-4">{group.openTickets}</td>
                    <td className="text-center p-4">{group.inProgressTickets}</td>
                    <td className="text-center p-4">{group.resolvedTickets}</td>
                    <td className="text-center p-4">{group.avgResolutionTime.toFixed(1)}h</td>
                    <td className="text-center p-4">{group.slaCompliance.toFixed(1)}%</td>
                    <td className="text-center p-4">{group.technicians}</td>
                    <td className="text-center p-4">
                      <Badge className={getWorkloadColor(group.workload)}>
                        {group.workload}
                      </Badge>
                    </td>
                    <td className="text-center p-4">
                      <div className={`flex items-center justify-center gap-1 ${
                        group.trend >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className={`w-4 h-4 ${group.trend < 0 ? 'rotate-180' : ''}`} />
                        <span className="text-sm font-medium">
                          {group.trend >= 0 ? '+' : ''}{group.trend.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Performance Radar Chart */}
      {performanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Group Performance Radar</CardTitle>
            <CardDescription>Multi-dimensional performance analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={performanceData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="group" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar name="Efficiency" dataKey="efficiency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                <Radar name="Quality" dataKey="quality" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                <Radar name="Speed" dataKey="speed" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Ticket Trends</CardTitle>
            <CardDescription>Ticket volume trends over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {groupData.map((group, index) => (
                  <Area
                    key={group.name}
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
      )}
    </div>
  )
}