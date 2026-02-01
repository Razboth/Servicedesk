'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileDown, RefreshCw, User, Trophy, Clock, TrendingUp, Star } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts'
import { format } from 'date-fns'

interface TechnicianData {
  id: string
  name: string
  department: string
  avatar?: string
  totalTickets: number
  openTickets: number
  inProgressTickets: number
  resolvedTickets: number
  closedTickets: number
  avgResolutionTime: number
  slaCompliance: number
  customerSatisfaction: number
  specializations: string[]
  performance: {
    efficiency: number
    quality: number
    speed: number
    communication: number
    technical: number
  }
  trend: number
  rank: number
}

interface WorkloadData {
  technician: string
  URGENT: number
  HIGH: number
  MEDIUM: number
  LOW: number
}

interface ProductivityTrend {
  week: string
  [technician: string]: string | number
}

export default function RequestsByTechnicianReport() {
  const [technicianData, setTechnicianData] = useState<TechnicianData[]>([])
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([])
  const [productivityTrend, setProductivityTrend] = useState<ProductivityTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [department, setDepartment] = useState('all')
  const [sortBy, setSortBy] = useState('totalTickets')

  useEffect(() => {
    fetchData()
  }, [period, department, sortBy])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (department !== 'all') {
        params.append('department', department)
      }
      const response = await fetch(`/api/reports/analytics/requests-by-technician?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch technician data')
      }
      
      const result = await response.json()
      
      // Transform API data to match component interface
      const transformedTechnicianData: TechnicianData[] = result.technicians.map((tech: any, index: number) => {
        // Calculate in-progress from status distribution
        const statusDist = tech.statusDistribution || {}
        const inProgress = (statusDist['IN_PROGRESS'] || 0)
        const closed = (statusDist['CLOSED'] || 0)

        return {
          id: tech.id,
          name: tech.name,
          department: tech.supportGroup || 'General',
          avatar: tech.avatar,
          totalTickets: tech.totalTickets,
          openTickets: tech.openTickets,
          inProgressTickets: inProgress,
          resolvedTickets: tech.resolvedTickets,
          closedTickets: closed,
          avgResolutionTime: tech.avgResolutionHours,
          slaCompliance: tech.slaComplianceRate,
          customerSatisfaction: tech.resolutionRate >= 80 ? 4.5 : tech.resolutionRate >= 60 ? 4.0 : 3.5,
          specializations: tech.supportGroup ? [tech.supportGroup] : ['General'],
          performance: {
            efficiency: Math.min(100, tech.resolutionRate),
            quality: tech.slaComplianceRate,
            speed: Math.max(0, 100 - Math.min(100, tech.avgResolutionHours * 2)),
            communication: tech.resolutionRate,
            technical: tech.slaComplianceRate
          },
          trend: tech.recentPerformanceTrend - 50,
          rank: index + 1
        }
      })

      // Create workload data from actual priority distribution
      const transformedWorkloadData: WorkloadData[] = result.technicians.map((tech: any) => {
        const priorityDist = tech.priorityDistribution || {}
        return {
          technician: tech.name.split(' ')[0],
          URGENT: priorityDist['URGENT'] || priorityDist['CRITICAL'] || 0,
          HIGH: priorityDist['HIGH'] || 0,
          MEDIUM: priorityDist['MEDIUM'] || 0,
          LOW: priorityDist['LOW'] || 0
        }
      })

      // Create productivity trend from actual daily workload data
      const transformedProductivityTrend: ProductivityTrend[] = []

      // Group daily data into weeks
      if (result.technicians.length > 0 && result.technicians[0].dailyWorkload) {
        const dailyData = result.technicians[0].dailyWorkload
        const weeklyData: { [week: string]: { [tech: string]: number } } = {}

        dailyData.forEach((day: any, idx: number) => {
          const weekNum = Math.floor(idx / 7) + 1
          const weekKey = `Week ${weekNum}`
          if (!weeklyData[weekKey]) weeklyData[weekKey] = {}

          result.technicians.forEach((tech: any) => {
            const firstName = tech.name.split(' ')[0]
            const techDaily = tech.dailyWorkload?.[idx]
            if (!weeklyData[weekKey][firstName]) weeklyData[weekKey][firstName] = 0
            weeklyData[weekKey][firstName] += techDaily?.resolved || 0
          })
        })

        Object.entries(weeklyData).forEach(([week, data]) => {
          transformedProductivityTrend.push({ week, ...data } as ProductivityTrend)
        })
      }

      // Fallback if no daily data
      if (transformedProductivityTrend.length === 0) {
        transformedProductivityTrend.push({ week: 'Current' })
        transformedTechnicianData.forEach(tech => {
          const firstName = tech.name.split(' ')[0]
          transformedProductivityTrend[0][firstName] = tech.resolvedTickets
        })
      }
      
      // Sort technicians based on sortBy
      const sortedData = [...transformedTechnicianData].sort((a, b) => {
        switch (sortBy) {
          case 'performance':
            return b.slaCompliance - a.slaCompliance
          case 'satisfaction':
            return b.customerSatisfaction - a.customerSatisfaction
          case 'sla':
            return b.slaCompliance - a.slaCompliance
          case 'totalTickets':
          default:
            return b.totalTickets - a.totalTickets
        }
      })
      // Update ranks after sorting
      sortedData.forEach((tech, index) => {
        tech.rank = index + 1
      })

      setTechnicianData(sortedData)
      setWorkloadData(transformedWorkloadData)
      setProductivityTrend(transformedProductivityTrend)
    } catch (error) {
      console.error('Failed to fetch technician data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalTickets = technicianData.reduce((sum, tech) => sum + tech.totalTickets, 0)
  const avgSLA = technicianData.reduce((sum, tech) => sum + tech.slaCompliance, 0) / technicianData.length || 0
  const avgSatisfaction = technicianData.reduce((sum, tech) => sum + tech.customerSatisfaction, 0) / technicianData.length || 0

  const exportToCSV = () => {
    const headers = ['Name', 'Department', 'Total Tickets', 'Open', 'In Progress', 'Resolved', 'Closed', 'Avg Resolution (hrs)', 'SLA Compliance (%)', 'Customer Satisfaction', 'Trend (%)']
    const rows = technicianData.map(d => [
      d.name,
      d.department,
      d.totalTickets.toString(),
      d.openTickets.toString(),
      d.inProgressTickets.toString(),
      d.resolvedTickets.toString(),
      d.closedTickets.toString(),
      d.avgResolutionTime.toFixed(1),
      d.slaCompliance.toString(),
      d.customerSatisfaction.toFixed(1),
      `${d.trend > 0 ? '+' : ''}${d.trend.toFixed(1)}`
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests-by-technician-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const getPerformanceColor = (value: number) => {
    if (value >= 90) return 'text-green-600'
    if (value >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank.toString()
  }

  // Prepare radar chart data for top 3 performers
  const radarData = technicianData.slice(0, 3).map(tech => ({
    metric: 'Efficiency',
    [tech.name]: tech.performance.efficiency
  })).concat(
    technicianData.slice(0, 3).map(tech => ({
      metric: 'Quality',
      [tech.name]: tech.performance.quality
    })),
    technicianData.slice(0, 3).map(tech => ({
      metric: 'Speed',
      [tech.name]: tech.performance.speed
    })),
    technicianData.slice(0, 3).map(tech => ({
      metric: 'Communication',
      [tech.name]: tech.performance.communication
    })),
    technicianData.slice(0, 3).map(tech => ({
      metric: 'Technical',
      [tech.name]: tech.performance.technical
    }))
  ).reduce((acc, curr) => {
    const existing = acc.find(item => item.metric === curr.metric)
    if (existing) {
      Object.assign(existing, curr)
    } else {
      acc.push(curr)
    }
    return acc
  }, [] as any[])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Requests by Technician</h1>
          <p className="text-muted-foreground mt-2">
            Performance analysis and workload distribution across technical staff
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
          <div className="grid grid-cols-3 gap-4">
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
                  <SelectItem value="it">IT Operations</SelectItem>
                  <SelectItem value="support">Customer Support</SelectItem>
                  <SelectItem value="network">Network Team</SelectItem>
                  <SelectItem value="database">Database Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalTickets">Total Tickets</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="satisfaction">Customer Satisfaction</SelectItem>
                  <SelectItem value="sla">SLA Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Technicians</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Handling tickets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">This period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{avgSLA.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Compliance rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <Star className="inline h-5 w-5 text-yellow-500 mr-1" />
              {avgSatisfaction.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Out of 5.0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span className="font-bold">{technicianData[0]?.name.split(' ')[0]}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {technicianData[0]?.totalTickets} tickets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-3 gap-4">
        {technicianData.slice(0, 3).map((tech) => (
          <Card key={tech.id} className="relative">
            <div className="absolute top-2 right-2 text-2xl">{getRankBadge(tech.rank)}</div>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={tech.avatar} />
                  <AvatarFallback>{tech.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{tech.name}</CardTitle>
                  <CardDescription>{tech.department}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-2 font-bold">{tech.totalTickets}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolved:</span>
                    <span className="ml-2 font-bold text-green-600">{tech.resolvedTickets}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Time:</span>
                    <span className="ml-2 font-medium">{tech.avgResolutionTime}h</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SLA:</span>
                    <span className="ml-2 font-medium">{tech.slaCompliance}%</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Satisfaction</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.floor(tech.customerSatisfaction)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm ml-1">{tech.customerSatisfaction}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">Trend</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`h-3 w-3 ${tech.trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
                      <span className={`text-sm font-medium ${tech.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tech.trend > 0 ? '+' : ''}{tech.trend.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-1">Specializations:</p>
                  <div className="flex flex-wrap gap-1">
                    {tech.specializations.map((spec, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Workload Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Workload Distribution</CardTitle>
            <CardDescription>Ticket priority breakdown by technician</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={workloadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="technician" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="CRITICAL" stackId="a" fill="#dc2626" />
                <Bar dataKey="HIGH" stackId="a" fill="#ea580c" />
                <Bar dataKey="MEDIUM" stackId="a" fill="#f59e0b" />
                <Bar dataKey="LOW" stackId="a" fill="#84cc16" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Top 3 Performance Comparison</CardTitle>
            <CardDescription>Multi-dimensional performance analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                {technicianData.slice(0, 3).map((tech, index) => (
                  <Radar
                    key={tech.id}
                    name={tech.name}
                    dataKey={tech.name}
                    stroke={['#3b82f6', '#10b981', '#f59e0b'][index]}
                    fill={['#3b82f6', '#10b981', '#f59e0b'][index]}
                    fillOpacity={0.3}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Productivity Trend</CardTitle>
          <CardDescription>Tickets resolved per week by technician</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={productivityTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(productivityTrend[0] || {}).filter(key => key !== 'week').map((tech, index) => (
                <Line
                  key={tech}
                  type="monotone"
                  dataKey={tech}
                  stroke={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'][index]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Technician Performance Details</CardTitle>
          <CardDescription>Complete breakdown of technician metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Open</TableHead>
                <TableHead className="text-center">In Progress</TableHead>
                <TableHead className="text-center">Resolved</TableHead>
                <TableHead className="text-center">Avg Time</TableHead>
                <TableHead className="text-center">SLA %</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead className="text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicianData.map((tech) => (
                <TableRow key={tech.id}>
                  <TableCell className="font-medium text-center">{getRankBadge(tech.rank)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={tech.avatar} />
                        <AvatarFallback className="text-xs">
                          {tech.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {tech.name}
                    </div>
                  </TableCell>
                  <TableCell>{tech.department}</TableCell>
                  <TableCell className="text-center font-bold">{tech.totalTickets}</TableCell>
                  <TableCell className="text-center">{tech.openTickets}</TableCell>
                  <TableCell className="text-center">{tech.inProgressTickets}</TableCell>
                  <TableCell className="text-center text-green-600">{tech.resolvedTickets}</TableCell>
                  <TableCell className="text-center">{tech.avgResolutionTime}h</TableCell>
                  <TableCell className={`text-center font-medium ${getPerformanceColor(tech.slaCompliance)}`}>
                    {tech.slaCompliance}%
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {tech.customerSatisfaction}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${tech.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tech.trend > 0 ? '+' : ''}{tech.trend.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}