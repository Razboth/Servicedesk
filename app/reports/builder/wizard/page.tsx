'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  CheckCircle,
  Database,
  Users,
  CreditCard,
  BookOpen,
  FileCode
} from 'lucide-react'
import { ColumnSelector } from '@/components/reports/column-selector'
import { FilterBuilder } from '@/components/reports/filter-builder'
import { QueryEditor } from '@/components/reports/query-editor'
import { ReportScheduler } from '@/components/reports/report-scheduler'
import { ChartConfiguration } from '@/components/reports/chart-configuration'

const moduleTabConfig = [
  { id: 'TICKETS', label: 'Tickets', icon: Database },
  { id: 'USERS', label: 'Users', icon: Users },
  { id: 'ATMS', label: 'ATMs', icon: CreditCard },
  { id: 'KNOWLEDGE', label: 'Knowledge Base', icon: BookOpen },
  { id: 'CUSTOM', label: 'Custom Query', icon: FileCode },
]

function ReportWizardContent() {
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
    selectedServices: [] as string[], // For service-based filtering
    columns: [] as string[],
    filters: [] as any[],
    groupBy: [] as string[],
    orderBy: {} as any,
    chartConfig: null as any,
    query: '',
    schedule: null as any
  })

  const [services, setServices] = useState<any[]>([])
  const [loadingServices, setLoadingServices] = useState(false)

  // Load services when module is TICKETS
  useEffect(() => {
    if (reportConfig.module === 'TICKETS') {
      loadServices()
    }
  }, [reportConfig.module])

  const loadServices = async () => {
    try {
      setLoadingServices(true)
      const response = await fetch('/api/services')

      if (!response.ok) {
        throw new Error('Failed to load services')
      }

      const data = await response.json()
      setServices(data.services || data || [])
    } catch (error) {
      console.error('Error loading services:', error)
      setServices([])
    } finally {
      setLoadingServices(false)
    }
  }

  const steps = [
    { id: 1, title: 'Data Source', icon: <Code className="w-4 h-4" /> },
    { id: 2, title: 'Columns', icon: <Columns className="w-4 h-4" /> },
    { id: 3, title: 'Filters', icon: <Filter className="w-4 h-4" /> },
    { id: 4, title: 'Grouping & Sorting', icon: <Settings className="w-4 h-4" /> },
    { id: 5, title: 'Visualization', icon: <ChartBar className="w-4 h-4" /> },
    { id: 6, title: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
  ]

  const handleStepChange = (step: number) => {
    if (step >= 1 && step <= steps.length) {
      setActiveStep(step)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    // Basic validation
    const errors: string[] = []
    if (!reportConfig.title) errors.push('Report title is required')
    if (reportConfig.columns.length === 0) errors.push('At least one column must be selected')

    if (errors.length > 0) {
      setValidationErrors(errors)
      setIsSaving(false)
      return
    }

    try {
      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportConfig)
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/reports/view/${data.id}`)
      } else {
        setValidationErrors(['Failed to save report'])
      }
    } catch (error) {
      setValidationErrors(['Error saving report'])
    } finally {
      setIsSaving(false)
    }
  }

  const handleRun = async () => {
    setIsRunning(true)
    // Implement run logic
    setTimeout(() => {
      setIsRunning(false)
      router.push('/reports/custom/preview')
    }, 2000)
  }

  useEffect(() => {
    console.log('Current state:', {
      reportTitle: reportConfig.title,
      reportType: reportConfig.type,
      selectedModule: reportConfig.module
    })
  }, [reportConfig])

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
              <p className="text-gray-500 mt-1">Create custom reports with advanced filtering and visualization</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.back()}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleRun} disabled={isRunning}>
                <Play className="w-4 h-4 mr-1" />
                {isRunning ? 'Running...' : 'Run Report'}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save & Exit'}
              </Button>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="font-medium text-red-900">Please fix the following errors:</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-red-700">
              {validationErrors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Step Navigation */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuration Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {steps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => handleStepChange(step.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeStep === step.id
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full ${
                        activeStep === step.id ? 'bg-blue-600 text-white' : 'bg-gray-200'
                      }`}>
                        {step.icon}
                      </div>
                      <span>{step.title}</span>
                      {activeStep > step.id && (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Report Info */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Report Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Report Title</label>
                    <input
                      type="text"
                      value={reportConfig.title}
                      onChange={(e) => setReportConfig({...reportConfig, title: e.target.value})}
                      className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="Enter report title..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Report Type</label>
                    <select
                      value={reportConfig.type}
                      onChange={(e) => setReportConfig({...reportConfig, type: e.target.value})}
                      className="mt-1 w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="TABULAR">Tabular</option>
                      <option value="CHART">Chart</option>
                      <option value="DASHBOARD">Dashboard</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step Content */}
          <div className="col-span-9">
            <Card className="min-h-[600px]">
              <CardContent className="p-6">
                {/* Step 1: Data Source */}
                {activeStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Select Data Source</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        Choose the module you want to report on
                      </p>

                      {/* Module Tab Navigation */}
                      <div className="border-b mb-6">
                        <nav className="flex gap-6 overflow-x-auto" aria-label="Module Tabs">
                          {moduleTabConfig.map((tab) => {
                            const Icon = tab.icon
                            const isActive = reportConfig.module === tab.id
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setReportConfig({...reportConfig, module: tab.id})}
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

                      {/* Module Content */}
                      {reportConfig.module === 'CUSTOM' && (
                        <div className="mt-4">
                          <QueryEditor
                            initialQuery={reportConfig.query}
                            module={reportConfig.module}
                            onQueryChange={(query) => setReportConfig({...reportConfig, query})}
                          />
                        </div>
                      )}
                    </div>

                    {/* Service Selection for TICKETS module */}
                    {reportConfig.module === 'TICKETS' && (
                      <div className="mt-6">
                        <h3 className="text-base font-medium mb-2">Filter by Services (Optional)</h3>
                        <p className="text-sm text-gray-500 mb-3">
                          Select specific services to enable service-specific custom fields and filters.
                          Leave empty to include all services.
                        </p>

                        <div className="border rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
                          {loadingServices ? (
                            <div className="text-sm text-gray-500 text-center py-4">Loading services...</div>
                          ) : services.length > 0 ? (
                            <div className="space-y-2">
                              {services.map((service: any) => (
                                <label key={service.id} className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={reportConfig.selectedServices.includes(service.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setReportConfig({
                                          ...reportConfig,
                                          selectedServices: [...reportConfig.selectedServices, service.id]
                                        })
                                      } else {
                                        setReportConfig({
                                          ...reportConfig,
                                          selectedServices: reportConfig.selectedServices.filter(id => id !== service.id)
                                        })
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <span className="text-sm">{service.name}</span>
                                  {service.tier1Category && (
                                    <span className="text-xs text-gray-500">({service.tier1Category.name})</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 text-center py-4">No services available</div>
                          )}
                        </div>

                        {reportConfig.selectedServices.length > 0 && (
                          <div className="mt-2 text-sm text-blue-600">
                            {reportConfig.selectedServices.length} service(s) selected
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end mt-6">
                      <Button onClick={() => handleStepChange(2)}>
                        Next: Select Columns
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Columns */}
                {activeStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Select Columns</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        Choose which columns to include in your report
                      </p>

                      <ColumnSelector
                        module={reportConfig.module}
                        selectedColumns={reportConfig.columns}
                        onColumnsChange={(columns) => setReportConfig({...reportConfig, columns})}
                        selectedServices={reportConfig.selectedServices}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => handleStepChange(1)}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button onClick={() => handleStepChange(3)}>
                        Next: Add Filters
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Filters */}
                {activeStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Add Filters</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        Filter the data to focus on specific criteria
                      </p>

                      <FilterBuilder
                        module={reportConfig.module}
                        filters={reportConfig.filters}
                        onFiltersChange={(filters) => setReportConfig({...reportConfig, filters})}
                        selectedServices={reportConfig.selectedServices}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => handleStepChange(2)}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button onClick={() => handleStepChange(4)}>
                        Next: Grouping & Sorting
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Grouping & Sorting */}
                {activeStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Grouping & Sorting</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        Organize and sort your report data
                      </p>

                      <GroupingSortingConfig
                        columns={reportConfig.columns}
                        groupBy={reportConfig.groupBy}
                        orderBy={reportConfig.orderBy}
                        onGroupByChange={(groupBy: any) => setReportConfig({...reportConfig, groupBy})}
                        onOrderByChange={(orderBy: any) => setReportConfig({...reportConfig, orderBy})}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => handleStepChange(3)}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button onClick={() => handleStepChange(5)}>
                        Next: Visualization
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 5: Visualization */}
                {activeStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Visualization</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        Configure charts and visual representations
                      </p>

                      {reportConfig.type === 'CHART' || reportConfig.type === 'DASHBOARD' ? (
                        <ChartConfiguration
                          chartConfig={reportConfig.chartConfig}
                          columns={reportConfig.columns}
                          onChartConfigChange={(config: any) => setReportConfig({...reportConfig, chartConfig: config})}
                        />
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                          <ChartBar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">
                            Change report type to "Chart" or "Dashboard" to configure visualizations
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => handleStepChange(4)}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button onClick={() => handleStepChange(6)}>
                        Next: Schedule
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 6: Schedule */}
                {activeStep === 6 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Schedule Report</h2>
                      <p className="text-sm text-gray-500 mb-4">
                        Set up automatic report generation and delivery
                      </p>

                      <ReportScheduler
                        schedule={reportConfig.schedule}
                        onScheduleChange={(schedule: any) => setReportConfig({...reportConfig, schedule})}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => handleStepChange(5)}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button onClick={handleSave} variant="default">
                        <Save className="w-4 h-4 mr-1" />
                        Complete & Save
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Grouping and Sorting Configuration Component
function GroupingSortingConfig({
  columns,
  groupBy,
  orderBy,
  onGroupByChange,
  onOrderByChange
}: any) {
  return (
    <div className="space-y-6">
      {/* Group By */}
      <div>
        <h3 className="font-medium mb-3">Group By</h3>
        <div className="space-y-2">
          {columns.map((column: string) => (
            <div key={column} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={groupBy.includes(column)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onGroupByChange([...groupBy, column])
                  } else {
                    onGroupByChange(groupBy.filter((g: string) => g !== column))
                  }
                }}
                className="rounded"
              />
              <label className="text-sm">{column}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Order By */}
      <div>
        <h3 className="font-medium mb-3">Sort By</h3>
        {columns.map((column: string) => (
          <div key={column} className="flex items-center justify-between mb-2">
            <label className="text-sm">{column}</label>
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

export default function ReportWizardPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <ReportWizardContent />
    </Suspense>
  )
}
