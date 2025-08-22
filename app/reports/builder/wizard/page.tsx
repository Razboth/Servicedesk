'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Play,
  Download,
  Calendar,
  Filter,
  Columns,
  ChartBar,
  Code,
  Settings,
  GripVertical,
  X,
  Plus,
  ChevronDown,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { ColumnSelector } from '@/components/reports/column-selector'
import { FilterBuilder } from '@/components/reports/filter-builder'
import { QueryEditor } from '@/components/reports/query-editor'
import { ReportScheduler } from '@/components/reports/report-scheduler'
import { ChartConfiguration } from '@/components/reports/chart-configuration'

export default function ReportWizardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeStep, setActiveStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [reportConfig, setReportConfig] = useState({
    title: searchParams.get('title') || '',
    type: searchParams.get('type') || 'TABULAR',
    module: searchParams.get('module') || 'TICKETS',
    columns: [] as string[],
    filters: [] as any[],
    groupBy: [] as string[],
    orderBy: {} as any,
    chartConfig: null as any,
    query: '',
    schedule: null as any
  })

  const steps = [
    { id: 1, name: 'Select Columns', icon: Columns, required: true },
    { id: 2, name: 'Filter Options', icon: Filter, required: false },
    { id: 3, name: 'Advanced Filtering', icon: Settings, required: false },
    { id: 4, name: 'Charts', icon: ChartBar, required: false },
    { id: 5, name: 'Schedule', icon: Calendar, required: false }
  ]

  // Validation function
  const validateReport = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Check required fields
    if (!reportConfig.title) {
      errors.push('Report title is required')
    }
    
    if (reportConfig.columns.length === 0) {
      errors.push('At least one column must be selected')
    }
    
    // If schedule is enabled, validate schedule fields
    if (reportConfig.schedule?.enabled) {
      if (!reportConfig.schedule.recipients || reportConfig.schedule.recipients.length === 0) {
        errors.push('At least one recipient is required for scheduled reports')
      }
      if (!reportConfig.schedule.subject) {
        errors.push('Email subject is required for scheduled reports')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const handleNext = () => {
    if (activeStep < steps.length) {
      setActiveStep(activeStep + 1)
    }
  }

  const handlePrevious = () => {
    if (activeStep > 1) {
      setActiveStep(activeStep - 1)
    }
  }

  const handleSave = async (runAfterSave = false) => {
    const validation = validateReport()
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }
    
    setValidationErrors([])
    setIsSaving(true)
    
    try {
      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportConfig)
      })

      if (response.ok) {
        const report = await response.json()
        if (runAfterSave) {
          // Execute the report immediately
          await fetch(`/api/reports/custom/${report.id}/execute`, {
            method: 'POST'
          })
        }
        router.push(`/reports/view/${report.id}`)
      } else {
        const error = await response.json()
        setValidationErrors([error.error || 'Failed to save report'])
      }
    } catch (error) {
      console.error('Failed to save report:', error)
      setValidationErrors(['Failed to save report. Please try again.'])
    } finally {
      setIsSaving(false)
    }
  }

  const handleRun = async () => {
    setIsRunning(true)
    await handleSave(true)
    setIsRunning(false)
  }
  
  const handleFinish = () => {
    handleSave(false)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{reportConfig.title}</h1>
            <p className="text-muted-foreground">
              Module: {reportConfig.module} | Type: {reportConfig.type}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleSave(false)}
              disabled={isSaving || isRunning}
            >
              {isSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
            <Button 
              onClick={handleRun}
              disabled={isSaving || isRunning}
            >
              {isRunning ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Report
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-4 border border-red-200 bg-red-50 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following issues:
              </h3>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-colors ${
                  activeStep === step.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : activeStep > step.id
                    ? 'bg-primary/20 text-primary border-primary'
                    : 'bg-background text-muted-foreground border-muted'
                }`}
                onClick={() => setActiveStep(step.id)}
              >
                <step.icon className="h-5 w-5" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-full h-1 mx-2 transition-colors ${
                    activeStep > step.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`text-xs text-center cursor-pointer ${
                activeStep === step.id ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
              onClick={() => setActiveStep(step.id)}
            >
              {step.name}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {activeStep === 1 && (
            <ColumnSelector
              module={reportConfig.module}
              selectedColumns={reportConfig.columns}
              onColumnsChange={(columns) =>
                setReportConfig({ ...reportConfig, columns })
              }
            />
          )}

          {activeStep === 2 && (
            <FilterBuilder
              module={reportConfig.module}
              filters={reportConfig.filters}
              onFiltersChange={(filters) =>
                setReportConfig({ ...reportConfig, filters })
              }
            />
          )}

          {activeStep === 3 && (
            <div className="space-y-4">
              <Tabs defaultValue="query" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="query">Query Editor</TabsTrigger>
                  <TabsTrigger value="grouping">Group By</TabsTrigger>
                  <TabsTrigger value="sorting">Sort By</TabsTrigger>
                </TabsList>
                <TabsContent value="query" className="space-y-4">
                  <QueryEditor
                    initialQuery={reportConfig.query}
                    module={reportConfig.module}
                    onQueryChange={(query) =>
                      setReportConfig({ ...reportConfig, query })
                    }
                  />
                </TabsContent>
                <TabsContent value="grouping" className="space-y-4">
                  <GroupBySelector
                    columns={reportConfig.columns}
                    groupBy={reportConfig.groupBy}
                    onGroupByChange={(groupBy) =>
                      setReportConfig({ ...reportConfig, groupBy })
                    }
                  />
                </TabsContent>
                <TabsContent value="sorting" className="space-y-4">
                  <SortBySelector
                    columns={reportConfig.columns}
                    orderBy={reportConfig.orderBy}
                    onOrderByChange={(orderBy) =>
                      setReportConfig({ ...reportConfig, orderBy })
                    }
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeStep === 4 && (
            <ChartConfiguration
              columns={reportConfig.columns}
              chartConfig={reportConfig.chartConfig}
              onChartConfigChange={(chartConfig) =>
                setReportConfig({ ...reportConfig, chartConfig })
              }
            />
          )}

          {activeStep === 5 && (
            <ReportScheduler
              schedule={reportConfig.schedule}
              onScheduleChange={(schedule) =>
                setReportConfig({ ...reportConfig, schedule })
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={activeStep === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        {activeStep === steps.length ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving || isRunning}
            >
              {isSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save & Continue Editing
                </>
              )}
            </Button>
            <Button
              onClick={handleFinish}
              disabled={isSaving || isRunning}
            >
              {isSaving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Finishing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finish & View Report
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleNext}
            disabled={activeStep === steps.length}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function GroupBySelector({ columns, groupBy, onGroupByChange }: {
  columns: string[]
  groupBy: string[]
  onGroupByChange: (groupBy: string[]) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Group By Columns</h3>
      <p className="text-sm text-muted-foreground">
        Select columns to group your report data
      </p>
      <div className="space-y-2">
        {columns.map((column) => (
          <label key={column} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={groupBy.includes(column)}
              onChange={(e) => {
                if (e.target.checked) {
                  onGroupByChange([...groupBy, column])
                } else {
                  onGroupByChange(groupBy.filter((c) => c !== column))
                }
              }}
              className="rounded border-gray-300"
            />
            <span>{column}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function SortBySelector({ columns, orderBy, onOrderByChange }: {
  columns: string[]
  orderBy: any
  onOrderByChange: (orderBy: any) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Sort By</h3>
      <p className="text-sm text-muted-foreground">
        Define the sort order for your report
      </p>
      <div className="space-y-3">
        {columns.map((column) => (
          <div key={column} className="flex items-center space-x-3">
            <span className="flex-1">{column}</span>
            <select
              value={orderBy[column] || 'none'}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'none') {
                  const newOrderBy = { ...orderBy }
                  delete newOrderBy[column]
                  onOrderByChange(newOrderBy)
                } else {
                  onOrderByChange({ ...orderBy, [column]: value })
                }
              }}
              className="px-3 py-1 border rounded-md"
            >
              <option value="none">No sorting</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}