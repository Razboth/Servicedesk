'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/ui/page-header'
import { 
  Database, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Download,
  PlayCircle,
  StopCircle,
  FileText,
  Server,
  ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'

interface MigrationBatch {
  id: string
  source: string
  status: string
  totalCount: number
  importedCount: number
  errorCount: number
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export default function MigrationDashboard() {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://127.0.0.1:8081')
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)
  const [preview, setPreview] = useState<any>(null)
  const [batches, setBatches] = useState<MigrationBatch[]>([])
  const [activeBatch, setActiveBatch] = useState<MigrationBatch | null>(null)
  const [isMigrating, setIsMigrating] = useState(false)

  // Load existing batches on mount
  useEffect(() => {
    loadBatches()
  }, [])

  // Poll active batch status
  useEffect(() => {
    if (activeBatch && ['IN_PROGRESS', 'PENDING'].includes(activeBatch.status)) {
      const interval = setInterval(() => {
        loadBatchStatus(activeBatch.id)
      }, 2000) // Poll every 2 seconds
      
      return () => clearInterval(interval)
    }
  }, [activeBatch])

  const loadBatches = async () => {
    try {
      const response = await fetch('/api/migration/manageengine?action=status')
      const data = await response.json()
      
      if (data.success && data.batches) {
        setBatches(data.batches)
        
        // Set active batch if there's one in progress
        const inProgress = data.batches.find((b: MigrationBatch) => 
          b.status === 'IN_PROGRESS'
        )
        if (inProgress) {
          setActiveBatch(inProgress)
          setIsMigrating(true)
        }
      }
    } catch (error) {
      console.error('Failed to load batches:', error)
    }
  }

  const loadBatchStatus = async (batchId: string) => {
    try {
      const response = await fetch(`/api/migration/manageengine?action=status&batchId=${batchId}`)
      const data = await response.json()
      
      if (data.success && data.batch) {
        setActiveBatch(data.batch)
        
        if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(data.batch.status)) {
          setIsMigrating(false)
          loadBatches() // Reload all batches
          
          if (data.batch.status === 'COMPLETED') {
            toast.success(`Migration completed! Imported ${data.batch.importedCount} tickets.`)
          } else if (data.batch.status === 'FAILED') {
            toast.error('Migration failed. Check error logs for details.')
          }
        }
      }
    } catch (error) {
      console.error('Failed to load batch status:', error)
    }
  }

  const testConnection = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch(
        `/api/migration/manageengine?action=test-connection&apiKey=${encodeURIComponent(apiKey)}&baseUrl=${encodeURIComponent(baseUrl)}`
      )
      const data = await response.json()
      
      if (data.success) {
        setIsConnected(true)
        setStatistics(data.statistics)
        toast.success('Successfully connected to ManageEngine ServiceDesk Plus')
      } else {
        setIsConnected(false)
        toast.error(data.message || 'Connection failed')
      }
    } catch (error) {
      setIsConnected(false)
      toast.error('Failed to connect to ManageEngine')
    } finally {
      setIsConnecting(false)
    }
  }

  const loadPreview = async () => {
    try {
      const response = await fetch(
        `/api/migration/manageengine?action=preview&apiKey=${encodeURIComponent(apiKey)}&baseUrl=${encodeURIComponent(baseUrl)}`
      )
      const data = await response.json()
      
      if (data.success) {
        setPreview(data)
      } else {
        toast.error('Failed to load preview')
      }
    } catch (error) {
      toast.error('Failed to load preview')
    }
  }

  const startMigration = async () => {
    if (!isConnected) {
      toast.error('Please test connection first')
      return
    }

    setIsMigrating(true)
    try {
      const response = await fetch('/api/migration/manageengine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'start',
          apiKey,
          baseUrl,
          batchSize: 100,
          config: {
            downloadAttachments: false, // Start without attachments for speed
            createPlaceholderUsers: true,
            createPlaceholderBranches: true,
            skipExisting: true
          }
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Migration started successfully')
        loadBatchStatus(data.batchId)
        loadBatches()
      } else {
        toast.error(data.error || 'Failed to start migration')
        setIsMigrating(false)
      }
    } catch (error) {
      toast.error('Failed to start migration')
      setIsMigrating(false)
    }
  }

  const cancelMigration = async () => {
    if (!activeBatch) return

    try {
      const response = await fetch('/api/migration/manageengine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'cancel',
          batchId: activeBatch.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Migration cancelled')
        setIsMigrating(false)
        loadBatches()
      }
    } catch (error) {
      toast.error('Failed to cancel migration')
    }
  }

  const rollbackBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to rollback this migration? This will delete all imported tickets from this batch.')) {
      return
    }

    try {
      const response = await fetch('/api/migration/manageengine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'rollback',
          batchId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        loadBatches()
      } else {
        toast.error(data.error || 'Failed to rollback')
      }
    } catch (error) {
      toast.error('Failed to rollback migration')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500">In Progress</Badge>
      case 'FAILED':
        return <Badge className="bg-red-500">Failed</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-500">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="ManageEngine Migration"
        description="Import tickets from ManageEngine ServiceDesk Plus"
        icon={<Database className="h-6 w-6" />}
      />

      {/* Connection Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Connection Setup
          </CardTitle>
          <CardDescription>
            Configure connection to ManageEngine ServiceDesk Plus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">ManageEngine URL</Label>
              <Input
                id="baseUrl"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://127.0.0.1:8081"
                disabled={isMigrating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your ManageEngine API key"
                disabled={isMigrating}
              />
              <p className="text-xs text-gray-500">
                Get API key from: {baseUrl}/SetUpWizard.do?forwardTo=apidoc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={testConnection}
              disabled={!apiKey || isConnecting || isMigrating}
            >
              {isConnecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Server className="mr-2 h-4 w-4" />
              )}
              Test Connection
            </Button>

            {isConnected && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Connected
              </div>
            )}
          </div>

          {statistics && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Found <strong>{statistics.totalTickets}</strong> tickets in ManageEngine
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Migration Controls */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Migration Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={loadPreview}
                variant="outline"
                disabled={isMigrating}
              >
                <FileText className="mr-2 h-4 w-4" />
                Preview Sample
              </Button>
              
              <Button
                onClick={startMigration}
                className="bg-green-600 hover:bg-green-700"
                disabled={isMigrating}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Start Migration
              </Button>
              
              {isMigrating && (
                <Button
                  onClick={cancelMigration}
                  variant="destructive"
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Cancel Migration
                </Button>
              )}
            </div>

            {preview && preview.sample && (
              <div className="space-y-2">
                <h4 className="font-semibold">Sample Tickets (First 10)</h4>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  {preview.sample.map((ticket: any) => (
                    <div key={ticket.id} className="mb-2 pb-2 border-b last:border-0">
                      <div className="font-medium">#{ticket.id}: {ticket.subject}</div>
                      <div className="text-sm text-gray-600">
                        Status: {ticket.status?.name} | Priority: {ticket.priority?.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Migration Progress */}
      {activeBatch && activeBatch.status === 'IN_PROGRESS' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Migration in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {activeBatch.importedCount} / {activeBatch.totalCount} tickets
                </span>
              </div>
              <Progress 
                value={(activeBatch.importedCount / Math.max(activeBatch.totalCount, 1)) * 100} 
              />
            </div>
            
            {activeBatch.errorCount > 0 && (
              <Alert className="border-red-200">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  {activeBatch.errorCount} tickets failed to import
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Migration History */}
      <Card>
        <CardHeader>
          <CardTitle>Migration History</CardTitle>
          <CardDescription>
            Previous migration batches and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {batches.length === 0 ? (
              <p className="text-gray-500">No migration history</p>
            ) : (
              batches.map((batch) => (
                <div 
                  key={batch.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getStatusBadge(batch.status)}
                    <div>
                      <div className="font-medium">Batch {batch.id.slice(-6)}</div>
                      <div className="text-sm text-gray-600">
                        {batch.importedCount}/{batch.totalCount} imported
                        {batch.errorCount > 0 && ` (${batch.errorCount} errors)`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {new Date(batch.createdAt).toLocaleString()}
                    </span>
                    {batch.status === 'COMPLETED' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rollbackBatch(batch.id)}
                      >
                        Rollback
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}