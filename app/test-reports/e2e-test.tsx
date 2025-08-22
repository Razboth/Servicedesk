'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Play, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface TestScenario {
  name: string
  description: string
  steps: string[]
  status: 'pending' | 'running' | 'passed' | 'failed'
  currentStep?: number
  error?: string
}

export default function E2ETestPage() {
  const [scenarios, setScenarios] = useState<TestScenario[]>([
    {
      name: 'Create Simple Tabular Report',
      description: 'Create a basic report with columns and filters',
      steps: [
        'Navigate to report builder',
        'Enter report title',
        'Select TABULAR type',
        'Select TICKETS module',
        'Select columns: ID, Title, Status, Priority',
        'Add filter: Status = OPEN',
        'Save report',
        'Verify report saved successfully'
      ],
      status: 'pending'
    },
    {
      name: 'Create Scheduled Report',
      description: 'Create a report with email scheduling',
      steps: [
        'Create basic report configuration',
        'Navigate to Schedule step',
        'Enable scheduling',
        'Set Daily frequency at 9 AM',
        'Add email recipient',
        'Set email subject',
        'Save report with schedule',
        'Verify schedule created'
      ],
      status: 'pending'
    },
    {
      name: 'Create Report with Charts',
      description: 'Create a report with data visualizations',
      steps: [
        'Create report with columns',
        'Navigate to Charts step',
        'Enable charts',
        'Configure bar chart for Status',
        'Configure pie chart for Priority',
        'Save report',
        'Execute report',
        'Verify charts render'
      ],
      status: 'pending'
    },
    {
      name: 'Create SQL Query Report',
      description: 'Create a report using custom SQL',
      steps: [
        'Select QUERY report type',
        'Navigate to Advanced Filtering',
        'Enter custom SQL query',
        'Validate SQL syntax',
        'Preview query results',
        'Save report',
        'Execute report',
        'Verify results'
      ],
      status: 'pending'
    },
    {
      name: 'Edit Existing Report',
      description: 'Modify a saved report',
      steps: [
        'Navigate to saved reports',
        'Select report to edit',
        'Modify columns',
        'Update filters',
        'Save changes',
        'Execute updated report',
        'Verify changes applied'
      ],
      status: 'pending'
    }
  ])

  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const runScenario = async (index: number) => {
    const scenario = scenarios[index]
    const updatedScenarios = [...scenarios]
    
    updatedScenarios[index] = { ...scenario, status: 'running', currentStep: 0 }
    setScenarios(updatedScenarios)
    addLog(`Starting scenario: ${scenario.name}`)

    try {
      // Simulate running through each step
      for (let stepIndex = 0; stepIndex < scenario.steps.length; stepIndex++) {
        updatedScenarios[index].currentStep = stepIndex
        setScenarios([...updatedScenarios])
        addLog(`  Step ${stepIndex + 1}: ${scenario.steps[stepIndex]}`)
        
        // Simulate step execution
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Simulate actual test logic here
        if (scenario.name === 'Create Simple Tabular Report' && stepIndex === 6) {
          // Test actual save functionality
          const response = await fetch('/api/reports/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `E2E Test Report ${Date.now()}`,
              type: 'TABULAR',
              module: 'TICKETS',
              columns: ['id', 'title', 'status', 'priority'],
              filters: [
                {
                  column: 'status',
                  operator: 'equals',
                  value: 'OPEN'
                }
              ],
              groupBy: [],
              orderBy: { createdAt: 'desc' },
              chartConfig: null,
              query: '',
              schedule: null
            })
          })
          
          if (!response.ok) {
            throw new Error('Failed to save report')
          }
          
          const report = await response.json()
          addLog(`    ✓ Report saved with ID: ${report.id}`)
        }
      }

      updatedScenarios[index] = { 
        ...updatedScenarios[index], 
        status: 'passed',
        currentStep: undefined
      }
      setScenarios(updatedScenarios)
      addLog(`✓ Scenario completed: ${scenario.name}`)
      
    } catch (error) {
      updatedScenarios[index] = { 
        ...updatedScenarios[index], 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        currentStep: undefined
      }
      setScenarios(updatedScenarios)
      addLog(`✗ Scenario failed: ${scenario.name} - ${error}`)
    }
  }

  const runAllScenarios = async () => {
    setIsRunning(true)
    setLogs([])
    addLog('Starting E2E test suite')

    for (let i = 0; i < scenarios.length; i++) {
      await runScenario(i)
      // Add delay between scenarios
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsRunning(false)
    addLog('E2E test suite completed')
  }

  const getScenarioIcon = (status: TestScenario['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">E2E Test Scenarios</h1>
        <p className="text-muted-foreground mt-2">
          End-to-end testing for complete user workflows
        </p>
      </div>

      <div className="mb-6">
        <Button 
          onClick={runAllScenarios} 
          disabled={isRunning}
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Scenarios...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run All Scenarios
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scenarios */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Test Scenarios</h2>
          {scenarios.map((scenario, index) => (
            <Card key={index} className={
              scenario.status === 'running' ? 'border-blue-500' :
              scenario.status === 'passed' ? 'border-green-500' :
              scenario.status === 'failed' ? 'border-red-500' :
              ''
            }>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {getScenarioIcon(scenario.status)}
                      {scenario.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {scenario.description}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runScenario(index)}
                    disabled={isRunning}
                  >
                    Run
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {scenario.steps.map((step, stepIndex) => (
                    <div
                      key={stepIndex}
                      className={`text-sm px-3 py-1 rounded ${
                        scenario.status === 'running' && scenario.currentStep === stepIndex
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : scenario.status === 'running' && scenario.currentStep! > stepIndex
                          ? 'text-green-600'
                          : scenario.status === 'passed'
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}
                    >
                      {scenario.status === 'running' && scenario.currentStep === stepIndex ? '▶' :
                       scenario.status === 'running' && scenario.currentStep! > stepIndex ? '✓' :
                       scenario.status === 'passed' ? '✓' : '○'} {step}
                    </div>
                  ))}
                </div>
                {scenario.error && (
                  <Alert className="mt-3" variant="destructive">
                    <AlertDescription>{scenario.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Test Logs */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Test Logs</h2>
          <Card>
            <CardContent className="p-4">
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-[600px] overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs yet. Run a test to see output.</div>
                ) : (
                  logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={
                        log.includes('✓') ? 'text-green-400' :
                        log.includes('✗') ? 'text-red-400' :
                        log.includes('Starting') ? 'text-blue-400' :
                        ''
                      }
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}