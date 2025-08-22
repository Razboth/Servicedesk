'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Play, 
  Edit, 
  Copy, 
  ArrowLeft,
  Database,
  Filter,
  Columns,
  Info,
  Loader2
} from 'lucide-react'

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  baseQuery: string
  defaultColumns: string[]
  defaultFilters: any[]
  service?: {
    id: string
    name: string
    description: string
  }
}

export default function ReportTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [template, setTemplate] = useState<ReportTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplate()
  }, [templateId])

  const loadTemplate = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/reports/templates/${templateId}`)
      if (!response.ok) throw new Error('Failed to load template')
      
      const data = await response.json()
      setTemplate(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setIsLoading(false)
    }
  }

  const createReportFromTemplate = async () => {
    if (!template) return

    try {
      setIsCreating(true)
      
      // Create a new report based on the template
      const reportData = {
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
        description: template.description,
        type: 'QUERY',
        module: 'CUSTOM',
        columns: template.defaultColumns,
        filters: template.defaultFilters,
        query: template.baseQuery,
        groupBy: [],
        orderBy: {},
        chartConfig: null,
        schedule: null
      }

      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })

      if (!response.ok) throw new Error('Failed to create report')

      const report = await response.json()
      
      // Navigate to the report wizard for customization
      router.push(`/reports/builder/wizard?reportId=${report.id}&fromTemplate=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report')
    } finally {
      setIsCreating(false)
    }
  }

  const executeTemplate = async () => {
    if (!template) return

    try {
      setIsCreating(true)
      
      // Create and immediately execute the report
      const reportData = {
        title: template.name,
        type: 'QUERY',
        module: 'CUSTOM',
        columns: template.defaultColumns,
        filters: template.defaultFilters,
        query: template.baseQuery,
        groupBy: [],
        orderBy: {},
        chartConfig: null,
        schedule: null
      }

      const createResponse = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      })

      if (!createResponse.ok) throw new Error('Failed to create report')

      const report = await createResponse.json()
      
      // Navigate to view the report
      router.push(`/reports/view/${report.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute template')
    } finally {
      setIsCreating(false)
    }
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

  if (error && !template) {
    return (
      <div className="container mx-auto py-6">
        <Alert className="border-red-500">
          <Info className="h-4 w-4 text-red-500" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!template) return null

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{template.name}</h1>
            <p className="text-muted-foreground mt-2">{template.description}</p>
            <div className="flex items-center gap-3 mt-4">
              <Badge variant="outline">{template.category}</Badge>
              {template.service && (
                <Badge variant="secondary">Service: {template.service.name}</Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={executeTemplate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={createReportFromTemplate}
              disabled={isCreating}
            >
              <Edit className="mr-2 h-4 w-4" />
              Customize
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-yellow-500">
          <Info className="h-4 w-4 text-yellow-500" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* SQL Query */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Query Definition
              </CardTitle>
              <CardDescription>
                The SQL query that powers this report template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                <code className="text-sm">{template.baseQuery}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Default Columns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Columns className="h-5 w-5" />
                Default Columns
              </CardTitle>
              <CardDescription>
                Columns that will be displayed in the report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {template.defaultColumns.map(column => (
                  <Badge key={column} variant="secondary">
                    {column}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Default Filters */}
          {template.defaultFilters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Default Filters
                </CardTitle>
                <CardDescription>
                  Pre-configured filters for this report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {template.defaultFilters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {index > 0 && (
                        <span className="font-medium text-primary">
                          {filter.logicalOperator || 'AND'}
                        </span>
                      )}
                      <span className="bg-muted px-2 py-1 rounded">
                        {filter.column} {filter.operator} {JSON.stringify(filter.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                variant="default"
                onClick={executeTemplate}
                disabled={isCreating}
              >
                <Play className="mr-2 h-4 w-4" />
                Execute Report
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={createReportFromTemplate}
                disabled={isCreating}
              >
                <Edit className="mr-2 h-4 w-4" />
                Customize Template
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(template.baseQuery)
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy SQL Query
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">Category</dt>
                  <dd>{template.category}</dd>
                </div>
                {template.service && (
                  <div>
                    <dt className="font-medium text-muted-foreground">Related Service</dt>
                    <dd>{template.service.name}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-muted-foreground">Report Type</dt>
                  <dd>SQL Query Report</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Columns</dt>
                  <dd>{template.defaultColumns.length} columns</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Filters</dt>
                  <dd>{template.defaultFilters.length} filters</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This template provides a starting point for your report. You can customize
              the columns, filters, and other settings after creating a report from this template.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}