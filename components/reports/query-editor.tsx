'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Code,
  Play,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Maximize2,
  Database,
  Table,
  FileText
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface QueryEditorProps {
  initialQuery?: string
  module: string
  onQueryChange: (query: string) => void
}

const getModuleHints = (module: string) => {
  const baseHints = `-- Available tables and common joins
-- Users: users (id, name, email, role, branchId)
-- Branches: branches (id, name, code, city)
-- Services: services (id, name, description, categoryId)`

  switch (module) {
    case 'TICKETS':
      return `${baseHints}
-- Tickets: tickets (id, ticketNumber, title, status, priority, createdAt)
-- Join examples:
-- LEFT JOIN users AS creator ON tickets.createdById = creator.id
-- LEFT JOIN users AS assignee ON tickets.assignedToId = assignee.id
-- LEFT JOIN branches ON tickets.branchId = branches.id
-- LEFT JOIN services ON tickets.serviceId = services.id`
    case 'TIME_SPENT':
      return `${baseHints}
-- Time tracking tables
-- WorkLogs: work_logs (id, ticketId, userId, duration, activity, date)`
    case 'TASKS':
      return `${baseHints}
-- Tasks: tasks (id, title, status, assignedToId, dueDate, ticketId)`
    default:
      return baseHints
  }
}

const sampleQueries = {
  TICKETS: {
    'Tickets by Status': `SELECT
  status,
  COUNT(*) as ticket_count,
  AVG(EXTRACT(EPOCH FROM (resolvedAt - createdAt))/3600) as avg_resolution_hours
FROM tickets
WHERE createdAt >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status
ORDER BY ticket_count DESC`,
    'Top 10 Services': `SELECT
  s.name as service_name,
  COUNT(t.id) as ticket_count,
  AVG(t.priority) as avg_priority
FROM tickets t
JOIN services s ON t.serviceId = s.id
WHERE t.createdAt >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.id, s.name
ORDER BY ticket_count DESC
LIMIT 10`,
    'SLA Performance': `SELECT
  DATE(createdAt) as date,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN responseTime <= s.responseHours THEN 1 END) as within_response_sla,
  COUNT(CASE WHEN resolutionTime <= s.resolutionHours THEN 1 END) as within_resolution_sla
FROM tickets t
JOIN services s ON t.serviceId = s.id
WHERE t.createdAt >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(createdAt)
ORDER BY date DESC`
  },
  TIME_SPENT: {
    'Time by User': `SELECT
  u.name as user_name,
  COUNT(DISTINCT w.ticketId) as tickets_worked,
  SUM(w.duration) as total_minutes,
  AVG(w.duration) as avg_minutes_per_entry
FROM work_logs w
JOIN users u ON w.userId = u.id
WHERE w.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.name
ORDER BY total_minutes DESC`
  },
  TASKS: {
    'Task Completion Rate': `SELECT
  u.name as assignee,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_tasks,
  ROUND(COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) * 100.0 / COUNT(*), 2) as completion_rate
FROM tasks t
JOIN users u ON t.assignedToId = u.id
WHERE t.createdAt >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.name
HAVING COUNT(*) > 5
ORDER BY completion_rate DESC`
  }
}

const tabConfig = [
  { id: 'editor', label: 'Query Editor', icon: Code },
  { id: 'samples', label: 'Sample Queries', icon: FileText },
  { id: 'schema', label: 'Schema Reference', icon: Table },
]

export function QueryEditor({ initialQuery, module, onQueryChange }: QueryEditorProps) {
  const [query, setQuery] = useState(initialQuery || '')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    message: string
  } | null>(null)
  const [activeTab, setActiveTab] = useState('editor')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
    }
  }, [initialQuery])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    onQueryChange(value)
    setValidationResult(null)
  }

  const validateQuery = async () => {
    if (!query.trim()) {
      setValidationResult({
        valid: false,
        message: 'Query cannot be empty'
      })
      return
    }

    setIsValidating(true)
    try {
      // In a real implementation, this would call an API to validate the SQL
      // For now, we'll do basic client-side validation
      const lowerQuery = query.toLowerCase()

      // Check for dangerous operations
      if (lowerQuery.includes('drop') ||
          lowerQuery.includes('delete') ||
          lowerQuery.includes('truncate') ||
          lowerQuery.includes('update') ||
          lowerQuery.includes('insert')) {
        setValidationResult({
          valid: false,
          message: 'Query contains potentially dangerous operations. Only SELECT statements are allowed.'
        })
        return
      }

      // Check for required SELECT
      if (!lowerQuery.includes('select')) {
        setValidationResult({
          valid: false,
          message: 'Query must be a SELECT statement'
        })
        return
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500))

      setValidationResult({
        valid: true,
        message: 'Query syntax is valid'
      })
    } catch (error) {
      setValidationResult({
        valid: false,
        message: 'Query validation failed'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(query)
  }

  const formatQuery = () => {
    // Basic SQL formatting
    const formatted = query
      .replace(/\s+/g, ' ')
      .replace(/,/g, ',\n  ')
      .replace(/\sSELECT\s/gi, 'SELECT\n  ')
      .replace(/\sFROM\s/gi, '\nFROM ')
      .replace(/\sWHERE\s/gi, '\nWHERE ')
      .replace(/\sGROUP BY\s/gi, '\nGROUP BY ')
      .replace(/\sORDER BY\s/gi, '\nORDER BY ')
      .replace(/\sHAVING\s/gi, '\nHAVING ')
      .replace(/\sLIMIT\s/gi, '\nLIMIT ')
      .replace(/\sJOIN\s/gi, '\nJOIN ')
      .replace(/\sLEFT JOIN\s/gi, '\nLEFT JOIN ')
      .replace(/\sRIGHT JOIN\s/gi, '\nRIGHT JOIN ')
      .replace(/\sINNER JOIN\s/gi, '\nINNER JOIN ')
      .replace(/\sON\s/gi, ' ON ')

    handleQueryChange(formatted)
  }

  const loadSampleQuery = (queryName: string) => {
    const samples = sampleQueries[module as keyof typeof sampleQueries]
    if (samples && samples[queryName as keyof typeof samples]) {
      handleQueryChange(samples[queryName as keyof typeof samples])
    }
  }

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Database className="h-5 w-5" />
            SQL Query Editor
          </h3>
          <p className="text-sm text-muted-foreground">
            Write custom SQL queries for advanced reporting
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b mb-6">
        <nav className="flex gap-6 overflow-x-auto" aria-label="Tabs">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
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
            );
          })}
        </nav>
      </div>

      {activeTab === 'editor' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">SQL Query</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={formatQuery}
                  >
                    <Code className="mr-1 h-3 w-3" />
                    Format
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    onClick={validateQuery}
                    disabled={isValidating}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Validate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Textarea
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Enter your SQL query here..."
                  className="font-mono text-sm min-h-[300px]"
                  spellCheck={false}
                />
                <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                  {query.length} characters
                </div>
              </div>

              {validationResult && (
                <Alert className={`mt-4 ${validationResult.valid ? 'border-green-500' : 'border-red-500'}`}>
                  {validationResult.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription>{validationResult.message}</AlertDescription>
                </Alert>
              )}

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Query hints:</p>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {getModuleHints(module)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'samples' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sample Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(sampleQueries[module as keyof typeof sampleQueries] || {}).map(([name, sampleQuery]) => (
                  <div key={name} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{name}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadSampleQuery(name)}
                      >
                        Use This Query
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      <code>{sampleQuery}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'schema' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Database Schema Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SchemaTable
                  name="tickets"
                  columns={[
                    { name: 'id', type: 'string', key: 'PK' },
                    { name: 'ticketNumber', type: 'string', key: 'UNIQUE' },
                    { name: 'title', type: 'string' },
                    { name: 'status', type: 'enum' },
                    { name: 'priority', type: 'enum' },
                    { name: 'createdById', type: 'string', key: 'FK' },
                    { name: 'assignedToId', type: 'string', key: 'FK' },
                    { name: 'branchId', type: 'string', key: 'FK' },
                    { name: 'serviceId', type: 'string', key: 'FK' },
                    { name: 'createdAt', type: 'datetime' },
                    { name: 'resolvedAt', type: 'datetime' },
                    { name: 'closedAt', type: 'datetime' }
                  ]}
                />
                <SchemaTable
                  name="users"
                  columns={[
                    { name: 'id', type: 'string', key: 'PK' },
                    { name: 'name', type: 'string' },
                    { name: 'email', type: 'string', key: 'UNIQUE' },
                    { name: 'role', type: 'enum' },
                    { name: 'branchId', type: 'string', key: 'FK' },
                    { name: 'isActive', type: 'boolean' }
                  ]}
                />
                <SchemaTable
                  name="services"
                  columns={[
                    { name: 'id', type: 'string', key: 'PK' },
                    { name: 'name', type: 'string' },
                    { name: 'description', type: 'string' },
                    { name: 'categoryId', type: 'string', key: 'FK' },
                    { name: 'slaHours', type: 'integer' },
                    { name: 'priority', type: 'enum' }
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function SchemaTable({ name, columns }: {
  name: string
  columns: Array<{ name: string; type: string; key?: string }>
}) {
  return (
    <div className="border rounded-lg">
      <div className="bg-muted px-3 py-2 border-b">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Table className="h-4 w-4" />
          {name}
        </h4>
      </div>
      <div className="p-3">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">Column</th>
              <th className="text-left py-1">Type</th>
              <th className="text-left py-1">Key</th>
            </tr>
          </thead>
          <tbody>
            {columns.map(col => (
              <tr key={col.name} className="border-b last:border-0">
                <td className="py-1 font-mono">{col.name}</td>
                <td className="py-1 text-muted-foreground">{col.type}</td>
                <td className="py-1">
                  {col.key && (
                    <span className={`px-1 py-0.5 rounded text-xs ${
                      col.key === 'PK' ? 'bg-blue-100 text-blue-700' :
                      col.key === 'FK' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {col.key}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
