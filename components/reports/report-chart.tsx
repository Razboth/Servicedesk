'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Maximize2, RefreshCw } from 'lucide-react'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ChartConfig {
  enabled: boolean
  type: 'BAR' | 'PIE' | 'LINE' | 'AREA' | 'DONUT' | 'COLUMN'
  xAxis: string
  yAxis: string
  aggregation: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'
  groupBy?: string
  showLegend: boolean
  showDataLabels: boolean
  showGrid: boolean
  colorScheme: string
  title?: string
  height: number
}

interface ReportChartProps {
  data: any[]
  config: ChartConfig
  className?: string
  onExport?: () => void
}

const colorSchemes: Record<string, string[]> = {
  default: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
  pastel: ['#93c5fd', '#fca5a5', '#86efac', '#fcd34d', '#c4b5fd', '#fbcfe8', '#5eead4', '#fed7aa'],
  dark: ['#1e40af', '#991b1b', '#14532d', '#92400e', '#5b21b6', '#831843', '#134e4a', '#9a3412'],
  vibrant: ['#0ea5e9', '#f43f5e', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#eab308'],
  monochrome: ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7', '#f4f4f5']
}

export function ReportChart({ data, config, className, onExport }: ReportChartProps) {
  const chartRef = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [chartData, setChartData] = useState<any>(null)

  useEffect(() => {
    if (data && data.length > 0) {
      const processedData = processChartData(data, config)
      setChartData(processedData)
    }
  }, [data, config])

  const processChartData = (rawData: any[], chartConfig: ChartConfig) => {
    const colors = colorSchemes[chartConfig.colorScheme] || colorSchemes.default

    // Aggregate data based on configuration
    const aggregatedData = aggregateData(rawData, chartConfig)

    // Extract labels and values
    const labels = aggregatedData.map(item => item[chartConfig.xAxis] || 'Unknown')
    const values = aggregatedData.map(item => {
      if (chartConfig.yAxis === '_count') {
        return item._count || 0
      }
      return item[chartConfig.yAxis] || 0
    })

    // Handle grouped data
    if (chartConfig.groupBy) {
      const groups = [...new Set(rawData.map(item => item[chartConfig.groupBy!]))]
      const datasets = groups.map((group, index) => {
        const groupData = rawData.filter(item => item[chartConfig.groupBy!] === group)
        const groupValues = labels.map(label => {
          const item = groupData.find(d => d[chartConfig.xAxis] === label)
          return item ? (chartConfig.yAxis === '_count' ? 1 : item[chartConfig.yAxis] || 0) : 0
        })

        return {
          label: String(group),
          data: groupValues,
          backgroundColor: colors[index % colors.length] + '80',
          borderColor: colors[index % colors.length],
          borderWidth: 2
        }
      })

      return {
        labels,
        datasets
      }
    }

    // Single dataset
    return {
      labels,
      datasets: [{
        label: chartConfig.title || 'Data',
        data: values,
        backgroundColor: chartConfig.type === 'LINE' || chartConfig.type === 'AREA' 
          ? colors[0] + '20'
          : colors.map(c => c + '80'),
        borderColor: chartConfig.type === 'LINE' || chartConfig.type === 'AREA'
          ? colors[0]
          : colors,
        borderWidth: 2,
        fill: chartConfig.type === 'AREA'
      }]
    }
  }

  const aggregateData = (rawData: any[], chartConfig: ChartConfig) => {
    if (!chartConfig.xAxis) return rawData

    const grouped = new Map()

    rawData.forEach(item => {
      const key = item[chartConfig.xAxis]
      if (!grouped.has(key)) {
        grouped.set(key, {
          [chartConfig.xAxis]: key,
          _count: 0,
          _sum: 0,
          _values: []
        })
      }

      const group = grouped.get(key)
      group._count++
      
      if (chartConfig.yAxis && chartConfig.yAxis !== '_count') {
        const value = parseFloat(item[chartConfig.yAxis]) || 0
        group._sum += value
        group._values.push(value)
      }
    })

    return Array.from(grouped.values()).map(group => {
      const result: any = { [chartConfig.xAxis]: group[chartConfig.xAxis] }

      if (chartConfig.yAxis === '_count') {
        result._count = group._count
      } else if (chartConfig.yAxis) {
        switch (chartConfig.aggregation) {
          case 'COUNT':
            result[chartConfig.yAxis] = group._count
            break
          case 'SUM':
            result[chartConfig.yAxis] = group._sum
            break
          case 'AVG':
            result[chartConfig.yAxis] = group._sum / group._count
            break
          case 'MIN':
            result[chartConfig.yAxis] = Math.min(...group._values)
            break
          case 'MAX':
            result[chartConfig.yAxis] = Math.max(...group._values)
            break
          default:
            result[chartConfig.yAxis] = group._sum
        }
      }

      return result
    })
  }

  const getChartOptions = (chartConfig: ChartConfig) => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartConfig.showLegend,
          position: 'top' as const
        },
        title: {
          display: !!chartConfig.title,
          text: chartConfig.title
        },
        datalabels: {
          display: chartConfig.showDataLabels
        }
      },
      scales: chartConfig.type !== 'PIE' && chartConfig.type !== 'DONUT' ? {
        x: {
          grid: {
            display: chartConfig.showGrid
          }
        },
        y: {
          grid: {
            display: chartConfig.showGrid
          }
        }
      } : undefined
    }
  }

  const exportChart = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image()
      const link = document.createElement('a')
      link.download = `chart_${Date.now()}.png`
      link.href = url
      link.click()
    }
  }

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-muted-foreground">No data available for chart</p>
      </div>
    )
  }

  const ChartComponent = () => {
    const options = getChartOptions(config)

    switch (config.type) {
      case 'BAR':
      case 'COLUMN':
        return (
          <Bar 
            ref={chartRef}
            data={chartData} 
            options={{
              ...options,
              indexAxis: config.type === 'BAR' ? 'y' : 'x'
            }} 
          />
        )
      case 'LINE':
      case 'AREA':
        return (
          <Line 
            ref={chartRef}
            data={chartData} 
            options={options} 
          />
        )
      case 'PIE':
        return (
          <Pie 
            ref={chartRef}
            data={chartData} 
            options={options} 
          />
        )
      case 'DONUT':
        return (
          <Doughnut 
            ref={chartRef}
            data={chartData} 
            options={options} 
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6' : ''} ${className}`}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{config.title || 'Chart'}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportChart}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: config.height || 400 }}>
            <ChartComponent />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}