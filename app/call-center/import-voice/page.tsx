'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Phone, User, Calendar, Tag } from 'lucide-react'

interface TicketRecord {
  ticket_id: number | string
  remark: string
  subject: string
  ticket_status_name: string
  customer_name: string
  customer_hp: string
  customer_email: string
  informant_name: string
  informant_hp: string
  informant_email: string
  session_id: string
  category_name: string
  mainCategory: string
  subCategory: string
  handlingTime: string
  created_by_name: string
  date_created_at: number
  date_close: number
  channel_name: string
  source_name: string
  ticketId_masking: string
}

interface ImportResult {
  row: number
  ticketId: string
  success: boolean
  error?: string
  omniTicketId?: string
  omniTicketNumber?: number
}

// Clean string values that come with quotes from Excel
function cleanString(value: any): string {
  if (value === null || value === undefined || value === '-') return '-'
  const str = String(value).trim()
  if (str.startsWith("'") && str.endsWith("'")) {
    return str.slice(1, -1).trim()
  }
  if (str.startsWith("'")) {
    return str.slice(1).trim()
  }
  return str
}

function cleanPhone(value: any): string {
  if (!value || value === '-') return '-'
  let phone = cleanString(value)
  if (phone.startsWith('+')) phone = phone.slice(1)
  return phone
}

function excelDateToDisplay(serial: number | string): string {
  if (!serial || serial === '-' || isNaN(Number(serial))) return '-'
  const date = new Date((Number(serial) - 25569) * 86400 * 1000)
  return format(date, 'dd MMM yyyy HH:mm')
}

export default function ImportVoicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<TicketRecord[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    skipped: number
    total: number
    errors: ImportResult[]
  } | null>(null)

  const [error, setError] = useState<string | null>(null)

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null)
    setImportResults(null)

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Invalid file type. Only .xlsx or .xls files are allowed.')
      return
    }

    setFile(selectedFile)

    try {
      const buffer = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      const jsonData = XLSX.utils.sheet_to_json<TicketRecord>(worksheet, {
        raw: true,
        defval: ''
      })

      // Validate format
      if (jsonData.length > 0) {
        const columns = Object.keys(jsonData[0])
        const hasTicketFormat = columns.includes('ticket_id') &&
                               (columns.includes('customer_hp') || columns.includes('informant_hp'))

        if (!hasTicketFormat) {
          setError('Invalid file format. Please use the report_ticket export file from Sociomile.')
          setFile(null)
          return
        }
      }

      // Filter voice records if channel_name exists
      const voiceRecords = jsonData.filter(r =>
        r.channel_name === 'Voice' || r.source_name === 'Voice' || !r.channel_name
      )

      setPreviewData(voiceRecords.slice(0, 100)) // Preview first 100 records
    } catch (err) {
      setError('Failed to parse XLSX file. Please check the file format.')
      setFile(null)
      setPreviewData([])
    }
  }, [])

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  // Handle import
  const handleImport = async () => {
    if (!file) {
      setError('Please select a file.')
      return
    }

    setIsImporting(true)
    setProgress(0)
    setError(null)
    setImportResults(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/call-center/import-voice', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import data')
      }

      setImportResults({
        success: result.success,
        failed: result.failed,
        skipped: result.skipped || 0,
        total: result.total,
        errors: result.results || []
      })
      setProgress(100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data')
    } finally {
      setIsImporting(false)
    }
  }

  // Reset form
  const handleReset = () => {
    setFile(null)
    setPreviewData([])
    setImportResults(null)
    setError(null)
    setProgress(0)
  }

  // Check authentication
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  // Check support group
  const userSupportGroup = (session.user as any)?.supportGroupCode
  const userRole = (session.user as any)?.role
  if (userSupportGroup !== 'CALL_CENTER' && userRole !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h1 className="text-xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground">Only Call Center users can access this feature.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Import Voice Tickets to Omni</h1>
        <p className="text-muted-foreground mt-1">
          Upload report_ticket export file from Sociomile to sync voice tickets with Omni
        </p>
      </div>

      {/* Instructions Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Expected File Format
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Use the <strong>report_ticket</strong> export from Sociomile (e.g., <code>report_ticket_22.02.2026-27.02.2026.xlsx</code>)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>ticket_id</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>customer_hp</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>customer_name</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>session_id</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>remark / subject</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>category_name</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>handlingTime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>created_by_name</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            {file ? (
              <div>
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewData.length} voice records found
                </p>
                <Button
                  variant="link"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReset()
                  }}
                  disabled={isImporting}
                  className="mt-2"
                >
                  Choose different file
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Drag and drop your XLSX file here, or <span className="text-primary font-medium">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports .xlsx and .xls files
                </p>
              </div>
            )}
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
              disabled={isImporting}
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {previewData.length > 0 && !importResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              Preview Data ({previewData.length} records)
            </CardTitle>
            <CardDescription>
              Showing first {Math.min(20, previewData.length)} of {previewData.length} records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Ticket ID</th>
                    <th className="px-3 py-2 text-left font-medium">Customer</th>
                    <th className="px-3 py-2 text-left font-medium">Phone</th>
                    <th className="px-3 py-2 text-left font-medium">Subject</th>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-left font-medium">Agent</th>
                    <th className="px-3 py-2 text-left font-medium">Duration</th>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {previewData.slice(0, 20).map((record, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="px-3 py-2">
                        <Badge variant="outline">{record.ticketId_masking || record.ticket_id}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {cleanString(record.customer_name) || cleanString(record.informant_name)}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {cleanPhone(record.customer_hp) || cleanPhone(record.informant_hp)}
                        </div>
                      </td>
                      <td className="px-3 py-2 max-w-[200px] truncate">
                        {cleanString(record.subject)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">
                            {record.mainCategory || cleanString(record.category_name) || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{record.created_by_name || '-'}</td>
                      <td className="px-3 py-2">{record.handlingTime || '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {excelDateToDisplay(record.date_created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Progress */}
      {isImporting && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground w-12">{progress}%</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground text-center">
              Sending tickets to Omni API... Please wait.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{importResults.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                <p className="text-sm text-green-600">Success</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{importResults.skipped}</p>
                <p className="text-sm text-yellow-600">Skipped</p>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Failed Records:</h3>
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {importResults.errors.map((err, index) => (
                    <div key={index} className="text-sm text-red-700 dark:text-red-300 mb-1">
                      <span className="font-medium">Ticket {err.ticketId}</span> (Row {err.row}): {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleReset} className="mt-4">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {file && !importResults && (
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={isImporting}
            size="lg"
          >
            {isImporting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Importing...
              </span>
            ) : (
              `Import ${previewData.length} Records to Omni`
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
