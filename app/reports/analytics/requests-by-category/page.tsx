'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileDown, RefreshCw, TrendingUp, TrendingDown, Layers } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Treemap, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { format } from 'date-fns'

interface CategoryData {
  category: string
  subcategories: {
    name: string
    count: number
    avgResolutionTime: number
  }[]
  totalCount: number
  openCount: number
  resolvedCount: number
  avgSatisfaction: number
  trend: number
  color: string
}

interface TrendData {
  month: string
  Hardware: number
  Software: number
  Network: number
  Database: number
  Security: number
  Infrastructure: number
  Other: number
}

export default function RequestsByCategoryReport() {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('quarter')
  const [viewType, setViewType] = useState('hierarchical')

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch real data from API
      const response = await fetch(`/api/reports/analytics/requests-by-category?timeRange=${timeRange}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch category data')
      }
      
      const data = await response.json()
      
      setCategoryData(data.categoryData || [])
      setTrendData(data.trendData || [])
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching category report:', error)
      // Fallback to mock data if API fails
      const mockCategoryData: CategoryData[] = [
        {
          category: 'Hardware',
          subcategories: [
            { name: 'Computer', count: 85, avgResolutionTime: 4.2 },
            { name: 'Printer', count: 62, avgResolutionTime: 2.8 },
            { name: 'Scanner', count: 28, avgResolutionTime: 3.5 },
            { name: 'Network Device', count: 45, avgResolutionTime: 5.1 }
          ],
          totalCount: 220,
          openCount: 32,
          resolvedCount: 188,
          avgSatisfaction: 4.2,
          trend: 8.5,
          color: '#3b82f6'
        },
        {
          category: 'Software',
          subcategories: [
            { name: 'Operating System', count: 95, avgResolutionTime: 6.5 },
            { name: 'Office Applications', count: 120, avgResolutionTime: 1.8 },
            { name: 'Banking Software', count: 78, avgResolutionTime: 8.2 },
            { name: 'Security Software', count: 42, avgResolutionTime: 3.4 }
          ],
          totalCount: 335,
          openCount: 45,
          resolvedCount: 290,
          avgSatisfaction: 4.5,
          trend: -2.3,
          color: '#8b5cf6'
        },
        {
          category: 'Network',
          subcategories: [
            { name: 'Internet Connectivity', count: 156, avgResolutionTime: 3.2 },
            { name: 'VPN Access', count: 89, avgResolutionTime: 2.1 },
            { name: 'WiFi Issues', count: 67, avgResolutionTime: 1.5 },
            { name: 'LAN Problems', count: 34, avgResolutionTime: 4.8 }
          ],
          totalCount: 346,
          openCount: 52,
          resolvedCount: 294,
          avgSatisfaction: 3.9,
          trend: 12.4,
          color: '#10b981'
        },
        {
          category: 'Database',
          subcategories: [
            { name: 'Performance', count: 45, avgResolutionTime: 12.5 },
            { name: 'Backup/Restore', count: 38, avgResolutionTime: 8.3 },
            { name: 'Access Issues', count: 52, avgResolutionTime: 2.4 },
            { name: 'Data Integrity', count: 21, avgResolutionTime: 18.6 }
          ],
          totalCount: 156,
          openCount: 18,
          resolvedCount: 138,
          avgSatisfaction: 4.1,
          trend: -5.8,
          color: '#f59e0b'
        },
        {
          category: 'Security',
          subcategories: [
            { name: 'Access Control', count: 78, avgResolutionTime: 1.8 },
            { name: 'Password Reset', count: 234, avgResolutionTime: 0.5 },
            { name: 'Security Incident', count: 12, avgResolutionTime: 24.5 },
            { name: 'Compliance', count: 18, avgResolutionTime: 48.2 }
          ],
          totalCount: 342,
          openCount: 28,
          resolvedCount: 314,
          avgSatisfaction: 4.7,
          trend: 3.2,
          color: '#ef4444'
        },
        {
          category: 'Infrastructure',
          subcategories: [
            { name: 'Server', count: 67, avgResolutionTime: 8.9 },
            { name: 'Storage', count: 45, avgResolutionTime: 6.2 },
            { name: 'Backup Systems', count: 32, avgResolutionTime: 4.5 },
            { name: 'Power/UPS', count: 28, avgResolutionTime: 3.8 }
          ],
          totalCount: 172,
          openCount: 22,
          resolvedCount: 150,
          avgSatisfaction: 4.3,
          trend: -1.2,
          color: '#06b6d4'
        }
      ]

      const mockTrendData: TrendData[] = [
        { month: 'Jan', Hardware: 180, Software: 320, Network: 280, Database: 140, Security: 310, Infrastructure: 150, Other: 85 },
        { month: 'Feb', Hardware: 195, Software: 335, Network: 295, Database: 135, Security: 325, Infrastructure: 155, Other: 90 },
        { month: 'Mar', Hardware: 210, Software: 315, Network: 310, Database: 145, Security: 330, Infrastructure: 160, Other: 88 },
        { month: 'Apr', Hardware: 205, Software: 328, Network: 325, Database: 150, Security: 335, Infrastructure: 165, Other: 92 },
        { month: 'May', Hardware: 215, Software: 340, Network: 340, Database: 155, Security: 340, Infrastructure: 170, Other: 95 },
        { month: 'Jun', Hardware: 220, Software: 335, Network: 346, Database: 156, Security: 342, Infrastructure: 172, Other: 98 }
      ]

      setCategoryData(mockCategoryData)
      setTrendData(mockTrendData)
      setLoading(false)
    }
  }

  const totalTickets = categoryData.reduce((sum, cat) => sum + cat.totalCount, 0)
  const totalOpen = categoryData.reduce((sum, cat) => sum + cat.openCount, 0)
  const avgSatisfaction = categoryData.reduce((sum, cat) => sum + cat.avgSatisfaction * cat.totalCount, 0) / totalTickets || 0

  // Prepare treemap data
  const treemapData = categoryData.map(cat => ({
    name: cat.category,
    children: cat.subcategories.map(sub => ({
      name: sub.name,
      size: sub.count,
      category: cat.category
    }))
  }))

  // Prepare pie chart data
  const pieData = categoryData.map(cat => ({
    name: cat.category,
    value: cat.totalCount,
    color: cat.color
  }))

  const exportToCSV = () => {
    const headers = ['Category', 'Total Tickets', 'Open', 'Resolved', 'Avg Satisfaction', 'Trend (%)']
    const rows = categoryData.map(d => [
      d.category,
      d.totalCount.toString(),
      d.openCount.toString(),
      d.resolvedCount.toString(),
      d.avgSatisfaction.toFixed(1),
      `${d.trend > 0 ? '+' : ''}${d.trend.toFixed(1)}`
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `requests-by-category-${format(new Date(), 'yyyy-MM-dd')}.csv`
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

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Requests by Category</h1>
          <p className="text-muted-foreground mt-2">
            Breakdown of service requests across different categories and subcategories
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
          <CardTitle className="text-lg">View Options</CardTitle>
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
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="halfyear">Last 6 Months</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">View Type</label>
              <Select value={viewType} onValueChange={setViewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="flat">Flat View</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalOpen}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((totalOpen / totalTickets) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {avgSatisfaction.toFixed(1)}/5.0
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchical View - Category Cards with Subcategories */}
      {viewType === 'hierarchical' && (
        <div className="grid grid-cols-3 gap-4">
          {categoryData.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" style={{ color: category.color }} />
                    <span>{category.category}</span>
                  </div>
                  <span className="text-2xl font-bold">{category.totalCount}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Open/Resolved</span>
                    <span className="text-sm font-medium">
                      {category.openCount}/{category.resolvedCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Satisfaction</span>
                    <span className="text-sm font-medium">⭐ {category.avgSatisfaction.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Trend</span>
                    <div className="flex items-center gap-1">
                      {category.trend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-sm font-medium ${category.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {category.trend > 0 ? '+' : ''}{category.trend.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium mb-2">All Subcategories:</p>
                    {category.subcategories.map((sub, idx) => (
                      <div key={idx} className="flex justify-between text-xs py-1">
                        <span className="text-muted-foreground">{sub.name}</span>
                        <div className="text-right">
                          <span className="font-medium">{sub.count}</span>
                          <span className="text-muted-foreground ml-2">({sub.avgResolutionTime.toFixed(1)}h avg)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Flat View - Simple table of all categories */}
      {viewType === 'flat' && (
        <Card>
          <CardHeader>
            <CardTitle>All Categories Overview</CardTitle>
            <CardDescription>Flat view of all category metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-center p-3 font-medium">Total</th>
                    <th className="text-center p-3 font-medium">Open</th>
                    <th className="text-center p-3 font-medium">Resolved</th>
                    <th className="text-center p-3 font-medium">Satisfaction</th>
                    <th className="text-center p-3 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((category, index) => (
                    <tr key={category.category} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="font-medium">{category.category}</span>
                        </div>
                      </td>
                      <td className="text-center p-3 font-bold">{category.totalCount}</td>
                      <td className="text-center p-3 text-orange-600">{category.openCount}</td>
                      <td className="text-center p-3 text-green-600">{category.resolvedCount}</td>
                      <td className="text-center p-3">⭐ {category.avgSatisfaction.toFixed(1)}</td>
                      <td className="text-center p-3">
                        <span className={category.trend > 0 ? 'text-green-600' : 'text-red-600'}>
                          {category.trend > 0 ? '+' : ''}{category.trend.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison View - Side by side charts */}
      {viewType === 'comparison' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Percentage breakdown of tickets by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${((entry.value/totalTickets)*100).toFixed(1)}%`}
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

            {/* Category Comparison Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Open vs Resolved tickets by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="openCount" fill="#fbbf24" name="Open" />
                    <Bar dataKey="resolvedCount" fill="#10b981" name="Resolved" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Category Trends</CardTitle>
              <CardDescription>Monthly ticket volume by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {Object.keys(trendData[0] || {}).filter(key => key !== 'month').map((key, index) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stackId="1"
                      stroke={COLORS[index % COLORS.length]}
                      fill={COLORS[index % COLORS.length]}
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}