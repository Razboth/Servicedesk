'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ColumnSelector } from '@/components/reports/column-selector'
import { FilterBuilder } from '@/components/reports/filter-builder'
import { QueryEditor } from '@/components/reports/query-editor'
import { ReportScheduler } from '@/components/reports/report-scheduler'
import { ChartConfiguration } from '@/components/reports/chart-configuration'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Code } from 'lucide-react'

export default function ComponentTestPage() {
  // Column Selector State
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['id', 'title'])
  const [availableColumns] = useState([
    'id', 'title', 'description', 'status', 'priority', 
    'createdAt', 'updatedAt', 'assignedTo', 'branch', 'category'
  ])

  // Filter Builder State
  const [filters, setFilters] = useState<any[]>([])

  // Query Editor State
  const [query, setQuery] = useState('')

  // Schedule State
  const [schedule, setSchedule] = useState<any>(null)

  // Chart Configuration State
  const [chartConfig, setChartConfig] = useState<any>(null)

  // Test Results
  const [testResults, setTestResults] = useState<any>({})

  const testColumnSelector = () => {
    const results: any = {
      canSelectColumns: selectedColumns.length > 0,
      canDeselectColumns: true,
      minimumColumnsValidation: selectedColumns.length >= 1,
      columnOrder: selectedColumns
    }
    
    setTestResults(prev => ({ ...prev, columnSelector: results }))
  }

  const testFilterBuilder = () => {
    const results: any = {
      canAddFilters: true,
      filterCount: filters.length,
      filterTypes: filters.map(f => f.type),
      filterValidation: filters.every(f => f.column && f.operator)
    }
    
    setTestResults(prev => ({ ...prev, filterBuilder: results }))
  }

  const testQueryEditor = () => {
    const results: any = {
      hasQuery: query.length > 0,
      queryLength: query.length,
      isSQLQuery: query.toLowerCase().includes('select'),
      syntaxHighlighting: true
    }
    
    setTestResults(prev => ({ ...prev, queryEditor: results }))
  }

  const testScheduler = () => {
    const results: any = {
      isEnabled: schedule?.enabled || false,
      frequency: schedule?.frequency,
      hasRecipients: schedule?.recipients?.length > 0,
      hasSubject: schedule?.subject?.length > 0,
      cronExpression: schedule?.enabled ? generateCronExpression(schedule) : null
    }
    
    setTestResults(prev => ({ ...prev, scheduler: results }))
  }

  const generateCronExpression = (schedule: any): string => {
    const { frequency, time, daysOfWeek, dayOfMonth } = schedule
    const minutes = time?.minutes || 0
    const hours = time?.hours || 9

    switch (frequency) {
      case 'DAILY':
        return `${minutes} ${hours} * * *`
      case 'WEEKLY':
        const days = (daysOfWeek || []).sort().join(',') || '1'
        return `${minutes} ${hours} * * ${days}`
      case 'MONTHLY':
        return `${minutes} ${hours} ${dayOfMonth || 1} * *`
      default:
        return `${minutes} ${hours} * * *`
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Component Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test individual report builder components
        </p>
      </div>

      <Tabs defaultValue="columns" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="columns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Column Selector Component</CardTitle>
              <CardDescription>
                Test column selection, ordering, and validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColumnSelector
                availableColumns={availableColumns}
                selectedColumns={selectedColumns}
                onColumnsChange={setSelectedColumns}
                module="TICKETS"
              />
              
              <div className="pt-4 border-t">
                <Button onClick={testColumnSelector}>Run Tests</Button>
                
                {testResults.columnSelector && (
                  <Alert className="mt-4">
                    <Code className="h-4 w-4" />
                    <AlertTitle>Test Results</AlertTitle>
                    <AlertDescription>
                      <pre className="mt-2 text-xs">
                        {JSON.stringify(testResults.columnSelector, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter Builder Component</CardTitle>
              <CardDescription>
                Test filter creation, operators, and validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterBuilder
                filters={filters}
                onFiltersChange={setFilters}
                availableColumns={availableColumns}
              />
              
              <div className="pt-4 border-t">
                <Button onClick={testFilterBuilder}>Run Tests</Button>
                
                {testResults.filterBuilder && (
                  <Alert className="mt-4">
                    <Code className="h-4 w-4" />
                    <AlertTitle>Test Results</AlertTitle>
                    <AlertDescription>
                      <pre className="mt-2 text-xs">
                        {JSON.stringify(testResults.filterBuilder, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Query Editor Component</CardTitle>
              <CardDescription>
                Test SQL query editing and validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <QueryEditor
                initialQuery={query}
                module="TICKETS"
                onQueryChange={setQuery}
              />
              
              <div className="pt-4 border-t">
                <Button onClick={testQueryEditor}>Run Tests</Button>
                
                {testResults.queryEditor && (
                  <Alert className="mt-4">
                    <Code className="h-4 w-4" />
                    <AlertTitle>Test Results</AlertTitle>
                    <AlertDescription>
                      <pre className="mt-2 text-xs">
                        {JSON.stringify(testResults.queryEditor, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chart Configuration Component</CardTitle>
              <CardDescription>
                Test chart setup and data mapping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChartConfiguration
                columns={selectedColumns}
                chartConfig={chartConfig}
                onChartConfigChange={setChartConfig}
              />
              
              <div className="pt-4 border-t">
                <Alert>
                  <AlertTitle>Chart Configuration</AlertTitle>
                  <AlertDescription>
                    <pre className="mt-2 text-xs">
                      {JSON.stringify(chartConfig, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Scheduler Component</CardTitle>
              <CardDescription>
                Test scheduling configuration and cron generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ReportScheduler
                schedule={schedule}
                onScheduleChange={setSchedule}
              />
              
              <div className="pt-4 border-t">
                <Button onClick={testScheduler}>Run Tests</Button>
                
                {testResults.scheduler && (
                  <Alert className="mt-4">
                    <Code className="h-4 w-4" />
                    <AlertTitle>Test Results</AlertTitle>
                    <AlertDescription>
                      <pre className="mt-2 text-xs">
                        {JSON.stringify(testResults.scheduler, null, 2)}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Overall State Display */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Component State</CardTitle>
          <CardDescription>
            Current state of all components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Selected Columns</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded">
                {JSON.stringify(selectedColumns, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Filters</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded">
                {JSON.stringify(filters, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Query</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded">
                {query || 'No query'}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Schedule</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded">
                {JSON.stringify(schedule, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}