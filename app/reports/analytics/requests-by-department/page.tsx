'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileDown, RefreshCw, Building2, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, Treemap } from 'recharts'
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
      // Fetch real data from API
      const response = await fetch('/api/reports/analytics/requests-by-department');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      
      // Transform API data to component format
      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#84cc16', '#ec4899'];
      
      const transformedDepartmentData: DepartmentData[] = data.departments.map((dept: any, index: number) => ({
        id: dept.department || `dept-${index}`,
        name: dept.department,
        totalTickets: dept.ticketsCreated + dept.ticketsAssigned,
        openTickets: dept.ticketsOpen || 0,
        resolvedTickets: dept.ticketsResolved,
        avgResolutionTime: dept.avgResolutionHours,
        slaCompliance: dept.slaComplianceRate,
        employees: dept.userCount,
        ticketsPerEmployee: dept.requestsPerUser,
        priority: {
          urgent: dept.priorityDistribution?.URGENT || 0,
          high: dept.priorityDistribution?.HIGH || 0,
          medium: dept.priorityDistribution?.MEDIUM || 0,
          low: dept.priorityDistribution?.LOW || 0
        },
        satisfaction: 85 + Math.random() * 15, // Simulated for now
        trend: dept.weeklyCreated > dept.recentCreated / 4 ? 
               ((dept.weeklyCreated - dept.recentCreated / 4) / (dept.recentCreated / 4)) * 100 : 0,
        color: colors[index % colors.length]
      }));

      // Transform service data - simplified for now
      const mockServiceData: ServiceByDepartment[] = [
        { service: 'IT Support', IT: 245, Operations: 67, CustomerService: 34, Banking: 89, Administration: 23, HR: 12 },
        { service: 'Equipment', IT: 89, Operations: 156, CustomerService: 45, Banking: 23, Administration: 67, HR: 34 },
        { service: 'Software', IT: 178, Operations: 34, CustomerService: 89, Banking: 12, Administration: 45, HR: 23 },
        { service: 'Network', IT: 134, Operations: 45, CustomerService: 23, Banking: 67, Administration: 12, HR: 34 },
        { service: 'Security', IT: 67, Operations: 23, CustomerService: 12, Banking: 156, Administration: 89, HR: 45 }
      ];

      setDepartmentData(transformedDepartmentData)
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
  const avgResolution = departmentData.reduce((sum, d) => sum + d.avgResolutionTime, 0) / departmentData.length || 0

  const pieData = departmentData.map(d => ({
    name: d.name,
    value: d.totalTickets,
    color: d.color
  }))

  const priorityData = departmentData.map(d => ({
    name: d.name,
    urgent: d.priority.urgent,
    high: d.priority.high,
    medium: d.priority.medium,
    low: d.priority.low,
    total: d.totalTickets
  }))

  const exportToCSV = () => {
    const headers = ['Department', 'Total Tickets', 'Open', 'Resolved', 'Avg Resolution (hrs)', 'SLA Compliance (%)', 'Employees', 'Tickets/Employee', 'Trend']
    const rows = departmentData.map(d => [
      d.name,
      d.totalTickets.toString(),
      d.openTickets.toString(),
      d.resolvedTickets.toString(),
      d.avgResolutionTime.toFixed(1),
      d.slaCompliance.toFixed(1),
      d.employees.toString(),
      d.ticketsPerEmployee.toFixed(1),
      d.trend.toFixed(1) + '%'
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `department-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
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
          <h1 className="text-3xl font-bold text-gray-900">Requests by Department</h1>
          <p className="text-gray-600 mt-2">Analyze ticket distribution and performance across organizational departments</p>
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
            <SelectItem value="volume">Ticket Volume</SelectItem>
            <SelectItem value="efficiency">Efficiency</SelectItem>
            <SelectItem value="satisfaction">Satisfaction</SelectItem>
            <SelectItem value="workload">Workload</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentData.length}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
            <p className="text-xs text-muted-foreground">Department average</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Volume by Department */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Volume by Department</CardTitle>
            <CardDescription>Total tickets handled by each department</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="openTickets" fill="#ef4444" name="Open" />
                <Bar dataKey="resolvedTickets" fill="#10b981" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Workload Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Department Workload Distribution</CardTitle>
            <CardDescription>Proportion of total tickets by department</CardDescription>
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

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Distribution by Department</CardTitle>
          <CardDescription>Breakdown of ticket priorities across departments</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="urgent" stackId="a" fill="#991b1b" name="Urgent" />
              <Bar dataKey="high" stackId="a" fill="#ef4444" name="High" />
              <Bar dataKey="medium" stackId="a" fill="#f59e0b" name="Medium" />
              <Bar dataKey="low" stackId="a" fill="#10b981" name="Low" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Department Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Department Performance Details
          </CardTitle>
          <CardDescription>
            Comprehensive performance metrics for each department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Department</th>
                  <th className="text-center p-4 font-medium">Total Tickets</th>
                  <th className="text-center p-4 font-medium">Open</th>
                  <th className="text-center p-4 font-medium">Resolved</th>
                  <th className="text-center p-4 font-medium">Avg Resolution</th>
                  <th className="text-center p-4 font-medium">SLA Compliance</th>
                  <th className="text-center p-4 font-medium">Employees</th>
                  <th className="text-center p-4 font-medium">Tickets/Employee</th>
                  <th className="text-center p-4 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {departmentData.map((dept, index) => (
                  <tr key={dept.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: dept.color }}
                        />
                        <div>
                          <div className="font-medium">{dept.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-4 font-medium">{dept.totalTickets}</td>
                    <td className="text-center p-4">{dept.openTickets}</td>
                    <td className="text-center p-4">{dept.resolvedTickets}</td>
                    <td className="text-center p-4">{dept.avgResolutionTime.toFixed(1)}h</td>
                    <td className="text-center p-4">{dept.slaCompliance.toFixed(1)}%</td>
                    <td className="text-center p-4">{dept.employees}</td>
                    <td className="text-center p-4">{dept.ticketsPerEmployee.toFixed(1)}</td>
                    <td className="text-center p-4">
                      <div className={`flex items-center justify-center gap-1 ${
                        dept.trend >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className={`w-4 h-4 ${dept.trend < 0 ? 'rotate-180' : ''}`} />
                        <span className="text-sm font-medium">
                          {dept.trend >= 0 ? '+' : ''}{dept.trend.toFixed(1)}%
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

      {/* Service Distribution Across Departments */}
      <Card>
        <CardHeader>
          <CardTitle>Service Distribution Across Departments</CardTitle>
          <CardDescription>How different service types are distributed across departments</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={serviceData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="service" type="category" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="IT" fill="#3b82f6" name="IT" />
              <Bar dataKey="Operations" fill="#10b981" name="Operations" />
              <Bar dataKey="CustomerService" fill="#f59e0b" name="Customer Service" />
              <Bar dataKey="Banking" fill="#ef4444" name="Banking" />
              <Bar dataKey="Administration" fill="#8b5cf6" name="Administration" />
              <Bar dataKey="HR" fill="#14b8a6" name="HR" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}