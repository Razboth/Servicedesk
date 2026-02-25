'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

interface VoiceRecord {
  datetime: number
  datetimeconnect: number
  datetimeend: number
  queue: number
  agent: string
  event: string
  uniqueid: number | string
  clid: number | string
  waittime: string
  talktime: string
  ringtime: string
  holdtime: string
  dst: number
  recordingfile: string
  rec_ai: string
}

interface ImportResult {
  row: number
  success: boolean
  error?: string
  ticketId?: string
}

function excelDateToDisplay(serial: number): string {
  if (!serial || isNaN(serial)) return '-'
  const date = new Date((serial - 25569) * 86400 * 1000)
  return format(date, 'dd MMM yyyy HH:mm:ss')
}

export default function ImportVoicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [defaultName, setDefaultName] = useState('')
  const [defaultEmail, setDefaultEmail] = useState('')
  const [defaultContent, setDefaultContent] = useState('Voice call interaction')

  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<VoiceRecord[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
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

      const jsonData = XLSX.utils.sheet_to_json<VoiceRecord>(worksheet, {
        raw: true,
        defval: ''
      })

      setPreviewData(jsonData.slice(0, 100)) // Preview first 100 records
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
    if (!file || !defaultName || !defaultEmail) {
      setError('Please fill in all required fields and select a file.')
      return
    }

    setIsImporting(true)
    setProgress(0)
    setError(null)
    setImportResults(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('defaultName', defaultName)
      formData.append('defaultEmail', defaultEmail)
      formData.append('defaultContent', defaultContent)

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    router.push('/auth/signin')
    return null
  }

  // Check support group
  const userSupportGroup = (session.user as any)?.supportGroupCode
  if (userSupportGroup !== 'CALL_CENTER') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only Call Center users can access this feature.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Import Voice Data</h1>

      {/* Default Fields Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Default Values</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          These values will be used for all imported records since the XLSX file does not contain customer name and email.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={defaultName}
              onChange={(e) => setDefaultName(e.target.value)}
              placeholder="Enter default customer name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isImporting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Customer Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={defaultEmail}
              onChange={(e) => setDefaultEmail(e.target.value)}
              placeholder="Enter default customer email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isImporting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Content
            </label>
            <input
              type="text"
              value={defaultContent}
              onChange={(e) => setDefaultContent(e.target.value)}
              placeholder="Voice call interaction"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isImporting}
            />
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload XLSX File</h2>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
          } ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {file ? (
            <div>
              <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {previewData.length} records found
              </p>
              <button
                onClick={handleReset}
                className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                disabled={isImporting}
              >
                Choose different file
              </button>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Drag and drop your XLSX file here, or
              </p>
              <label className="mt-2 inline-block cursor-pointer">
                <span className="text-blue-600 hover:text-blue-500 font-medium">browse to upload</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                  disabled={isImporting}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {previewData.length > 0 && !importResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Preview Data ({previewData.length} records)
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone (clid)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Talk Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Content (rec_ai)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {previewData.slice(0, 20).map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.clid}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.agent}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {excelDateToDisplay(record.datetime)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{record.talktime}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {record.rec_ai && record.rec_ai !== '-' ? record.rec_ai : <span className="italic">Default content will be used</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewData.length > 20 && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              Showing 20 of {previewData.length} records
            </p>
          )}
        </div>
      )}

      {/* Import Progress */}
      {isImporting && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Importing...</h2>
          <div className="flex items-center">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">{progress}%</span>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please wait while records are being sent to Sociomile...
          </p>
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import Results</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{importResults.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Records</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResults.success}</p>
              <p className="text-sm text-green-600 dark:text-green-400">Successfully Sent</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{importResults.failed}</p>
              <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
            </div>
          </div>

          {importResults.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Failed Records:</h3>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 max-h-48 overflow-y-auto">
                {importResults.errors.map((err, index) => (
                  <div key={index} className="text-sm text-red-700 dark:text-red-300 mb-1">
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Import Another File
          </button>
        </div>
      )}

      {/* Import Button */}
      {file && !importResults && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={isImporting || !defaultName || !defaultEmail}
            className={`px-6 py-3 rounded-md text-white font-medium ${
              isImporting || !defaultName || !defaultEmail
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isImporting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importing...
              </span>
            ) : (
              `Import ${previewData.length} Records to Sociomile`
            )}
          </button>
        </div>
      )}
    </div>
  )
}
