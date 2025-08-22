'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FileDown, RefreshCw, Calendar as CalendarIcon, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter, ZAxis } from 'recharts'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface DailyData {
  date: string
  created: number
  resolved: number
  closed: number
  pending: number
  avgResponseTime: number
  peakHour: string
}

interface HourlyData {
  hour: string
  monday: number
  tuesday: number
  wednesday: number
  thursday: number
  friday: number
  saturday: number
  sunday: number
}

interface WeeklyTrend {
  week: string
  total: number
  urgent: number
  high: number
  medium: number
  low: number
}

export default function RequestsByCreatedDateReport() {
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [viewMode, setViewMode] = useState('daily')
  const [department, setDepartment] = useState('all')

  useEffect(() => {
    fetchData()
  }, [dateRange, viewMode, department])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Generate daily data for the selected range
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
      const mockDailyData: DailyData[] = days.map(day => ({
        date: format(day, 'yyyy-MM-dd'),
        created: Math.floor(Math.random() * 50) + 20,
        resolved: Math.floor(Math.random() * 40) + 15,
        closed: Math.floor(Math.random() * 35) + 10,
        pending: Math.floor(Math.random() * 20) + 5,
        avgResponseTime: Math.random() * 4 + 1,
        peakHour: `${Math.floor(Math.random() * 8) + 9}:00`
      }))

      // Generate hourly distribution data
      const mockHourlyData: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        monday: Math.floor(Math.random() * 15) + 2,
        tuesday: Math.floor(Math.random() * 15) + 2,
        wednesday: Math.floor(Math.random() * 15) + 2,
        thursday: Math.floor(Math.random() * 15) + 2,
        friday: Math.floor(Math.random() * 15) + 2,
        saturday: Math.floor(Math.random() * 8) + 1,
        sunday: Math.floor(Math.random() * 5) + 1
      }))

      // Generate weekly trends
      const mockWeeklyTrends: WeeklyTrend[] = [
        { week: 'Week 1', total: 234, urgent: 12, high: 45, medium: 98, low: 79 },
        { week: 'Week 2', total: 256, urgent: 15, high: 52, medium: 105, low: 84 },
        { week: 'Week 3', total: 278, urgent: 18, high: 58, medium: 112, low: 90 },
        { week: 'Week 4', total: 245, urgent: 14, high: 48, medium: 102, low: 81 }
      ]

      setDailyData(mockDailyData)
      setHourlyData(mockHourlyData)
      setWeeklyTrends(mockWeeklyTrends)
    } catch (error) {
      console.error('Failed to fetch created date data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalCreated = dailyData.reduce((sum, d) => sum + d.created, 0)
  const totalResolved = dailyData.reduce((sum, d) => sum + d.resolved, 0)
  const totalPending = dailyData.reduce((sum, d) => sum + d.pending, 0)
  const avgDailyCreated = totalCreated / dailyData.length || 0
  const peakDay = dailyData.reduce((max, d) => d.created > max.created ? d : max, dailyData[0] || { created: 0 })

  // Calculate heat map data for calendar view
  const heatMapData = dailyData.map(d => ({
    date: new Date(d.date),
    value: d.created,
    color: d.created > 40 ? '#dc2626' : d.created > 30 ? '#f59e0b' : d.created > 20 ? '#3b82f6' : '#10b981'
  }))

  const exportToCSV = () => {
    const headers = ['Date', 'Created', 'Resolved', 'Closed', 'Pending', 'Avg Response Time (hrs)', 'Peak Hour']
    const rows = dailyData.map(d => [
      d.date,
      d.created.toString(),
      d.resolved.toString(),
      d.closed.toString(),
      d.pending.toString(),
      d.avgResponseTime.toFixed(1),
      d.peakHour
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests-by-created-date-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Requests by Created Date</h1>
          <p className="text-muted-foreground mt-2">
            Analysis of ticket creation patterns and temporal distribution
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
          <CardTitle className="text-lg">Date Range & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range: any) => setDateRange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">View Mode</label>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="hourly">Hourly Distribution</SelectItem>
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
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreated}</div>
            <p className="text-xs text-muted-foreground mt-1">In selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {avgDailyCreated.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tickets per day</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Peak Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {peakDay?.created || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {peakDay?.date ? format(new Date(peakDay.date), 'MMM dd') : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalCreated > 0 ? ((totalResolved / totalCreated) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Same period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalPending}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Daily Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Creation Trend</CardTitle>
            <CardDescription>Number of tickets created each day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value as string), 'MMM dd, yyyy')}
                />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                <Line type="monotone" dataKey="closed" stroke="#8b5cf6" strokeWidth={2} name="Closed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Area Chart - Cumulative */}
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Ticket Status</CardTitle>
            <CardDescription>Stacked view of ticket lifecycle</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => format(new Date(value as string), 'MMM dd, yyyy')}
                />
                <Legend />
                <Area type="monotone" dataKey="closed" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="resolved" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Distribution Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Distribution Pattern</CardTitle>
          <CardDescription>Ticket creation patterns by hour and day of week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="monday" fill="#3b82f6" />
              <Bar dataKey="tuesday" fill="#10b981" />
              <Bar dataKey="wednesday" fill="#f59e0b" />
              <Bar dataKey="thursday" fill="#8b5cf6" />
              <Bar dataKey="friday" fill="#ef4444" />
              <Bar dataKey="saturday" fill="#06b6d4" />
              <Bar dataKey="sunday" fill="#ec4899" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Priority Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Priority Distribution</CardTitle>
          <CardDescription>Breakdown of ticket priorities by week</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="urgent" stackId="a" fill="#dc2626" />
              <Bar dataKey="high" stackId="a" fill="#ea580c" />
              <Bar dataKey="medium" stackId="a" fill="#f59e0b" />
              <Bar dataKey="low" stackId="a" fill="#84cc16" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Response Time Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Analysis</CardTitle>
          <CardDescription>Correlation between creation volume and response time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="created" name="Tickets Created" />
              <YAxis dataKey="avgResponseTime" name="Avg Response Time (hrs)" />
              <ZAxis dataKey="pending" name="Pending" range={[50, 400]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Daily Data" data={dailyData} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}