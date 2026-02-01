'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Play,
  Download,
  Edit,
  Calendar,
  Star,
  Share2,
  RefreshCw,
  Table,
  BarChart3,
  FileText,
  AlertCircle,
  Loader2,
  Filter,
  Columns,
  Clock
} from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ReportChart } from '@/components/reports/report-chart'
import { format } from 'date-fns'

interface Report {
  id: string
  title: string
  description?: string
  type: string
  module: string
  configuration: any
  lastExecutedAt?: string
  executionCount: number
  createdAt: string
  creator: {
    name: string
    email: string
  }
  isFavorite: boolean
  schedules: any[]
}

interface ExecutionResult {
  execution: {
    id: string
    status: string
    rowCount: number
  }
  data: any[]
  metadata: {
    columns: string[]
    module: string
    executedAt: string
  }
}

export default function ReportViewPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const [report, setReport] = useState<Report | null>(null)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('data')
  const [isFavorite, setIsFavorite] = useState(false)

  useEffect(() => {
    loadReport()
  }, [reportId])

  const loadReport = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/reports/custom/${reportId}`)
      if (!response.ok) throw new Error('Failed to load report')

      const data = await response.json()
      setReport(data)
      setIsFavorite(data.isFavorite)

      // Auto-execute if never executed
      if (!data.lastExecutedAt) {
        await executeReport()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setIsLoading(false)
    }
  }

  const executeReport = async () => {
    try {
      setIsExecuting(true)
      setError(null)

      const response = await fetch(`/api/reports/custom/${reportId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page: 1,
          pageSize: 1000,
          exportMode: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || 'Failed to execute report')
      }

      const result = await response.json()
      setExecutionResult(result)

      // Update report's last executed time
      if (report) {
        setReport({
          ...report,
          lastExecutedAt: result.metadata.executedAt,
          executionCount: report.executionCount + 1
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute report')
    } finally {
      setIsExecuting(false)
    }
  }

  const toggleFavorite = async () => {
    try {
      const response = await fetch(`/api/reports/custom/${reportId}/favorite`, {
        method: isFavorite ? 'DELETE' : 'POST'
      })

      if (response.ok) {
        setIsFavorite(!isFavorite)
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  const exportReport = async (format: 'CSV' | 'EXCEL' | 'PDF') => {
    if (!executionResult) return

    try {
      const response = await fetch(`/api/reports/custom/${reportId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, data: executionResult.data })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report?.title.replace(/\s+/g, '_')}_${format.toLowerCase()}.${format.toLowerCase()}`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to export report')
    }
  }

  // Build tab config dynamically based on report configuration
  const getTabConfig = () => {
    const tabs = [
      { id: 'data', label: 'Data Table', icon: Table },
    ]
    if (report?.configuration.chartConfig) {
      tabs.push({ id: 'chart', label: 'Chart', icon: BarChart3 })
    }
    tabs.push({ id: 'config', label: 'Configuration', icon: Filter })
    return tabs
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="border-red-500">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!report) return null

  const tabConfig = getTabConfig()

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          {report.description && (
            <p className="text-muted-foreground mt-1">{report.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <Badge variant="outline">{report.module}</Badge>
            <Badge variant="secondary">{report.type}</Badge>
            <span className="text-sm text-muted-foreground">
              Created by {report.creator.name} on {format(new Date(report.createdAt), 'PPP')}
            </span>
          </div>
          {report.lastExecutedAt && (
            <p className="text-sm text-muted-foreground mt-2">
              Last executed: {format(new Date(report.lastExecutedAt), 'PPpp')} •
              Run {report.executionCount} times
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFavorite}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/reports/builder/wizard?reportId=${reportId}`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/reports/schedule/${reportId}`)}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Bar */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex gap-2">
            <Button
              onClick={executeReport}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Report
                </>
              )}
            </Button>
            <Button variant="outline" onClick={executeReport} disabled={isExecuting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {executionResult && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {executionResult.execution.rowCount} rows
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('CSV')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('EXCEL')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('PDF')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-500">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {executionResult && (
        <>
          {/* Tab Navigation */}
          <div className="border-b mb-6">
            <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
              {tabConfig.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                      ${isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'data' && (
            <Card>
              <CardContent className="p-0">
                <ReportDataTable
                  data={executionResult.data}
                  columns={executionResult.metadata.columns}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'chart' && report.configuration.chartConfig && (
            <Card>
              <CardContent className="p-6">
                <ReportChart
                  data={executionResult.data}
                  config={report.configuration.chartConfig}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'config' && (
            <Card>
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Columns className="h-4 w-4" />
                    Selected Columns
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {report.configuration.columns.map((col: string) => (
                      <Badge key={col} variant="secondary">{col}</Badge>
                    ))}
                  </div>
                </div>

                {report.configuration.filters.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </h4>
                    <div className="space-y-2">
                      {report.configuration.filters.map((filter: any, index: number) => (
                        <div key={index} className="text-sm">
                          {index > 0 && (
                            <span className="font-medium text-primary mr-2">
                              {filter.logicalOperator}
                            </span>
                          )}
                          <span>{filter.column} {filter.operator} {filter.value || '(empty)'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.schedules && report.schedules.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Schedule
                    </h4>
                    {report.schedules.map((schedule: any) => (
                      <div key={schedule.id} className="text-sm">
                        <p>{schedule.frequency} - {schedule.cronExpression}</p>
                        <p className="text-muted-foreground">
                          Recipients: {schedule.recipients.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function ReportDataTable({ data, columns }: { data: any[], columns: string[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No data available
      </div>
    )
  }

  // Generate table columns from the first data row
  const tableColumns = Object.keys(data[0]).map(key => ({
    accessorKey: key,
    header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
  }))

  return (
    <div className="overflow-auto">
      <table className="w-full">
        <thead className="border-b bg-muted/50">
          <tr>
            {tableColumns.map(col => (
              <th key={col.accessorKey} className="text-left p-3 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className="border-b hover:bg-muted/30">
              {tableColumns.map(col => (
                <td key={col.accessorKey} className="p-3">
                  {formatCellValue(row[col.accessorKey])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return format(value, 'PPp')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
