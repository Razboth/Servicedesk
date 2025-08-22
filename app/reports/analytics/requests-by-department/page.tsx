'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileDown, RefreshCw, Building2, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, TreemapChart, Treemap } from 'recharts'
import { format } from 'date-fns'

interface DepartmentData {
  id: string
  name: string
  totalTickets: number
  openTickets: number
  resolvedTickets: number
  avgResolutionTime: number
  slaCompliance: number
  employees: number
  ticketsPerEmployee: number
  priority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  satisfaction: number
  trend: number
  color: string
}

interface ServiceByDepartment {
  service: string
  IT: number
  Operations: number
  CustomerService: number
  Banking: number
  Administration: number
  HR: number
}

export default function RequestsByDepartmentReport() {
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([])
  const [serviceData, setServiceData] = useState<ServiceByDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('month')
  const [metric, setMetric] = useState('volume')

  useEffect(() => {
    fetchData()
  }, [timeRange, metric])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Simulated department data
      const mockDepartmentData: DepartmentData[] = [
        {
          id: '1',
          name: 'IT Operations',
          totalTickets: 456,
          openTickets: 67,
          resolvedTickets: 312,
          avgResolutionTime: 4.2,
          slaCompliance: 92,
          employees: 45,
          ticketsPerEmployee: 10.1,
          priority: { urgent: 23, high: 89, medium: 198, low: 146 },
          satisfaction: 4.3,
          trend: 15.3,
          color: '#3b82f6'
        },
        {
          id: '2',
          name: 'Customer Service',
          totalTickets: 789,
          openTickets: 123,
          resolvedTickets: 567,
          avgResolutionTime: 2.1,
          slaCompliance: 95,
          employees: 78,
          ticketsPerEmployee: 10.1,
          priority: { urgent: 45, high: 156, medium: 345, low: 243 },
          satisfaction: 4.6,
          trend: 8.7,
          color: '#10b981'
        },
        {
          id: '3',
          name: 'Banking Operations',
          totalTickets: 567,
          openTickets: 89,
          resolvedTickets: 423,
          avgResolutionTime: 3.5,
          slaCompliance: 88,
          employees: 62,
          ticketsPerEmployee: 9.1,
          priority: { urgent: 34, high: 112, medium: 256, low: 165 },
          satisfaction: 4.1,
          trend: -2.3,
          color: '#8b5cf6'
        },
        {
          id: '4',
          name: 'Administration',
          totalTickets: 234,
          openTickets: 34,
          resolvedTickets: 178,
          avgResolutionTime: 5.8,
          slaCompliance: 85,
          employees: 28,
          ticketsPerEmployee: 8.4,
          priority: { urgent: 8, high: 42, medium: 98, low: 86 },
          satisfaction: 3.9,
          trend: 12.1,
          color: '#f59e0b'
        },
        {
          id: '5',
          name: 'Human Resources',
          totalTickets: 156,
          openTickets: 23,
          resolvedTickets: 112,
          avgResolutionTime: 6.2,
          slaCompliance: 82,
          employees: 18,
          ticketsPerEmployee: 8.7,
          priority: { urgent: 5, high: 28, medium: 67, low: 56 },
          satisfaction: 4.0,
          trend: 5.6,
          color: '#ef4444'
        },
        {
          id: '6',
          name: 'Finance',
          totalTickets: 189,
          openTickets: 28,
          resolvedTickets: 145,
          avgResolutionTime: 4.8,
          slaCompliance: 90,
          employees: 22,
          ticketsPerEmployee: 8.6,
          priority: { urgent: 12, high: 38, medium: 78, low: 61 },
          satisfaction: 4.2,
          trend: -1.2,
          color: '#06b6d4'
        }
      ]

      // Simulated service distribution by department
      const mockServiceData: ServiceByDepartment[] = [
        { service: 'Hardware', IT: 145, Operations: 78, CustomerService: 45, Banking: 89, Administration: 34, HR: 12 },
        { service: 'Software', IT: 178, Operations: 56, CustomerService: 123, Banking: 98, Administration: 45, HR: 28 },
        { service: 'Network', IT: 89, Operations: 34, CustomerService: 28, Banking: 45, Administration: 23, HR: 8 },
        { service: 'Access', IT: 44, Operations: 89, CustomerService: 234, Banking: 178, Administration: 78, HR: 67 },
        { service: 'Email', IT: 56, Operations: 45, CustomerService: 189, Banking: 67, Administration: 34, HR: 28 },
        { service: 'Database', IT: 78, Operations: 23, CustomerService: 12, Banking: 34, Administration: 12, HR: 5 }
      ]

      setDepartmentData(mockDepartmentData)
      setServiceData(mockServiceData)
    } catch (error) {
      console.error('Failed to fetch department data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalTickets = departmentData.reduce((sum, d) => sum + d.totalTickets, 0)
  const totalEmployees = departmentData.reduce((sum, d) => sum + d.employees, 0)
  const avgSLA = departmentData.reduce((sum, d) => sum + d.slaCompliance, 0) / departmentData.length || 0
  const avgSatisfaction = departmentData.reduce((sum, d) => sum + d.satisfaction, 0) / departmentData.length || 0

  const pieData = departmentData.map(d => ({
    name: d.name,
    value: d.totalTickets,
    color: d.color
  }))

  const radialData = departmentData.map(d => ({
    name: d.name,
    sla: d.slaCompliance,
    fill: d.color
  }))

  const treemapData = departmentData.map(d => ({
    name: d.name,
    size: d.totalTickets,
    fill: d.color,
    children: [
      { name: 'Urgent', size: d.priority.urgent, fill: '#dc2626' },
      { name: 'High', size: d.priority.high, fill: '#ea580c' },
      { name: 'Medium', size: d.priority.medium, fill: '#f59e0b' },
      { name: 'Low', size: d.priority.low, fill: '#84cc16' }
    ]
  }))

  const exportToCSV = () => {
    const headers = ['Department', 'Total Tickets', 'Open', 'Resolved', 'Avg Resolution (hrs)', 'SLA (%)', 'Employees', 'Tickets/Employee', 'Satisfaction', 'Trend']
    const rows = departmentData.map(d => [
      d.name,
      d.totalTickets.toString(),
      d.openTickets.toString(),
      d.resolvedTickets.toString(),
      d.avgResolutionTime.toFixed(1),
      d.slaCompliance.toString(),
      d.employees.toString(),
      d.ticketsPerEmployee.toFixed(1),
      d.satisfaction.toFixed(1),
      `${d.trend > 0 ? '+' : ''}${d.trend.toFixed(1)}%`
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests-by-department-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const getPerformanceColor = (value: number) => {
    if (value >= 90) return 'text-green-600'
    if (value >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Requests by Department</h1>
          <p className="text-muted-foreground mt-2">
            Analysis of ticket distribution and performance across organizational departments
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
          <CardTitle className="text-lg">Analysis Parameters</CardTitle>
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
                  <SelectItem value="volume">Ticket Volume</SelectItem>
                  <SelectItem value="efficiency">Efficiency</SelectItem>
                  <SelectItem value="satisfaction">Satisfaction</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
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
              <Building2 className="h-4 w-4" />
              Total Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(avgSLA)}`}>
              {avgSLA.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Department average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {avgSatisfaction.toFixed(1)}/5.0
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-3 gap-4">
        {departmentData.map((dept) => (
          <Card key={dept.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg">{dept.name}</span>
                <div className="flex items-center gap-2">
                  {dept.trend > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                  )}
                  <span className={dept.trend > 0 ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                    {dept.trend > 0 ? '+' : ''}{dept.trend.toFixed(1)}%
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-3xl font-bold" style={{ color: dept.color }}>
                  {dept.totalTickets}
                </span>
                <Badge variant="outline">
                  {dept.employees} employees
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Open:</span>
                  <span className="ml-2 font-medium">{dept.openTickets}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resolved:</span>
                  <span className="ml-2 font-medium">{dept.resolvedTickets}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Resolution:</span>
                  <span className="ml-2 font-medium">{dept.avgResolutionTime}h</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Per Employee:</span>
                  <span className="ml-2 font-medium">{dept.ticketsPerEmployee.toFixed(1)}</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <span className="text-muted-foreground">SLA:</span>
                    <span className={`ml-2 font-medium ${getPerformanceColor(dept.slaCompliance)}`}>
                      {dept.slaCompliance}%
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Satisfaction:</span>
                    <span className="ml-2 font-medium">⭐ {dept.satisfaction.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 text-xs">
                <div className="text-center">
                  <div className="font-medium text-red-600">{dept.priority.urgent}</div>
                  <div className="text-muted-foreground">Urgent</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-orange-600">{dept.priority.high}</div>
                  <div className="text-muted-foreground">High</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-yellow-600">{dept.priority.medium}</div>
                  <div className="text-muted-foreground">Medium</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-green-600">{dept.priority.low}</div>
                  <div className="text-muted-foreground">Low</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bar Chart - Department Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Department Ticket Volume</CardTitle>
            <CardDescription>Comparison of ticket volumes and statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="openTickets" fill="#fbbf24" name="Open" />
                <Bar dataKey="resolvedTickets" fill="#10b981" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>Proportion of tickets by department</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${((entry.value / totalTickets) * 100).toFixed(1)}%`}
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

      {/* Service Distribution by Department */}
      <Card>
        <CardHeader>
          <CardTitle>Service Request Distribution</CardTitle>
          <CardDescription>Types of services requested by each department</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="service" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="IT" fill="#3b82f6" />
              <Bar dataKey="CustomerService" fill="#10b981" />
              <Bar dataKey="Banking" fill="#8b5cf6" />
              <Bar dataKey="Administration" fill="#f59e0b" />
              <Bar dataKey="HR" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SLA Compliance Radial Chart */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Compliance by Department</CardTitle>
          <CardDescription>Radial view of SLA performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="90%" data={radialData}>
              <RadialBar dataKey="sla" cornerRadius={10} fill="#8884d8">
                {radialData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </RadialBar>
              <Legend />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}