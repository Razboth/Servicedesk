'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Database,
  FileText,
  ArrowRight,
  X
} from 'lucide-react'

type ReportType = 'TABULAR' | 'MATRIX' | 'METRICS' | 'QUERY'

interface ModuleOption {
  value: string
  label: string
  description: string
  icon: React.ReactNode
}

const moduleOptions: ModuleOption[] = [
  {
    value: 'TICKETS',
    label: 'All Requests',
    description: 'Generate reports based on ticket data',
    icon: <FileText className="h-5 w-5" />
  },
  {
    value: 'TIME_SPENT',
    label: 'TimeSpent',
    description: 'Analyze time tracking and effort data',
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    value: 'TASKS',
    label: 'Tasks',
    description: 'Report on task execution and completion',
    icon: <PieChart className="h-5 w-5" />
  },
  {
    value: 'SURVEY',
    label: 'Survey',
    description: 'Customer satisfaction and feedback reports',
    icon: <LineChart className="h-5 w-5" />
  },
  {
    value: 'NOTES',
    label: 'Notes',
    description: 'Communication and notes analysis',
    icon: <Database className="h-5 w-5" />
  },
  {
    value: 'CONVERSATIONS',
    label: 'Conversations',
    description: 'Chat and conversation analytics',
    icon: <Table className="h-5 w-5" />
  },
  {
    value: 'WORKLOG',
    label: 'Worklog',
    description: 'Work activity and productivity reports',
    icon: <FileText className="h-5 w-5" />
  },
  {
    value: 'ARCHIVED',
    label: 'Archived Requests',
    description: 'Historical and archived ticket analysis',
    icon: <Database className="h-5 w-5" />
  }
]

export default function ReportBuilderPage() {
  const router = useRouter()
  const [reportTitle, setReportTitle] = useState('')
  const [reportType, setReportType] = useState<ReportType>('TABULAR')
  const [selectedModule, setSelectedModule] = useState('')

  // Debug state changes
  console.log('Current state:', { reportTitle, reportType, selectedModule })

  const handleProceed = () => {
    console.log('Proceed clicked with:', { reportTitle, reportType, selectedModule })
    
    if (!reportTitle) {
      alert('Please enter a report title')
      return
    }
    
    if (!selectedModule) {
      alert('Please select a module')
      return
    }

    // Navigate to the report wizard with parameters
    const url = `/reports/builder/wizard?title=${encodeURIComponent(reportTitle)}&type=${reportType}&module=${selectedModule}`
    console.log('Navigating to:', url)
    router.push(url)
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Custom Reports</CardTitle>
              <CardDescription>Select a module and report type</CardDescription>
            </div>
            <Button variant="ghost" onClick={() => router.back()}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Debug Info - Remove in production */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
            <div>Title: {reportTitle || '(not set)'}</div>
            <div>Type: {reportType}</div>
            <div>Module: {selectedModule || '(not selected)'}</div>
            <div>Can proceed: {reportTitle && selectedModule ? 'Yes ✓' : 'No ✗'}</div>
          </div>
          {/* Report Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-red-500">
              * Report Title
            </Label>
            <Input
              id="title"
              placeholder="Enter report title"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
            />
          </div>

          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label className="text-red-500">* Choose Report Type</Label>
            <RadioGroup value={reportType} onValueChange={(value) => {
              console.log('Report type changed to:', value)
              setReportType(value as ReportType)
            }}>
              <div className="space-y-2">
                <div className="flex items-start space-x-2 p-4 border rounded-lg hover:bg-accent">
                  <RadioGroupItem value="TABULAR" id="tabular" className="mt-1" />
                  <Label htmlFor="tabular" className="flex-1 cursor-pointer">
                    <div className="font-medium">
                      Tabular Reports
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tabular reports are simple reports that allow you to list your data based on
                      certain criteria. You can select the columns to view and group the output
                      based on those columns.
                    </p>
                    <div className="mt-2 p-2 bg-muted rounded-md">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-1">ID</th>
                            <th className="text-left p-1">NAME</th>
                            <th className="text-left p-1">TITLE</th>
                            <th className="text-left p-1">STATUS</th>
                            <th className="text-left p-1">DATE</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-1">101</td>
                            <td className="p-1">JOHN</td>
                            <td className="p-1">mouse not working...</td>
                            <td className="p-1">HIGH</td>
                            <td className="p-1">01 NOV</td>
                          </tr>
                          <tr>
                            <td className="p-1">102</td>
                            <td className="p-1">JANE</td>
                            <td className="p-1">need internet</td>
                            <td className="p-1">LOW</td>
                            <td className="p-1">10 NOV</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-2 p-4 border rounded-lg hover:bg-accent">
                  <RadioGroupItem value="MATRIX" id="matrix" className="mt-1" />
                  <Label htmlFor="matrix" className="flex-1 cursor-pointer">
                    <div className="font-medium">
                      Matrix Reports
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Matrix reports provides the data in a grid manner (m x n format). It allows
                      you to study different scenarios based on the chosen criteria.
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-2 p-4 border rounded-lg hover:bg-accent">
                  <RadioGroupItem value="METRICS" id="metrics" className="mt-1" />
                  <Label htmlFor="metrics" className="flex-1 cursor-pointer">
                    <div className="font-medium">
                      Request Metrics Report
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Request Metrics reports aggregate data on closed requests based on
                      specific criteria. These reports can be grouped by specific request values.
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-2 p-4 border rounded-lg hover:bg-accent">
                  <RadioGroupItem value="QUERY" id="query" className="mt-1" />
                  <Label htmlFor="query" className="flex-1 cursor-pointer">
                    <div className="font-medium">
                      Query Report
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create advanced reports using custom SQL queries for maximum flexibility.
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Module Selection */}
          <div className="space-y-3">
            <Label className="text-red-500">* Select a module</Label>
            <RadioGroup value={selectedModule} onValueChange={(value) => {
              console.log('Module changed to:', value)
              setSelectedModule(value)
            }}>
              <div className="grid grid-cols-2 gap-3">
                {moduleOptions.map((module) => (
                  <div key={module.value} className="flex items-start space-x-2 p-3 border rounded-lg hover:bg-accent">
                    <RadioGroupItem value={module.value} id={module.value} className="mt-1" />
                    <Label htmlFor={module.value} className="flex-1 cursor-pointer">
                      <div className="font-medium flex items-center gap-2">
                        {module.icon}
                        {module.label}
                      </div>
                      {selectedModule === module.value && (
                        <div className="mt-2 space-y-2">
                          <Input 
                            placeholder="-----Filter by-----" 
                            className="text-sm" 
                            onClick={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="default"
              onClick={handleProceed}
              disabled={!reportTitle || !selectedModule}
            >
              Proceed to Report wizard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}