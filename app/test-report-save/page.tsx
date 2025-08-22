'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestReportSave() {
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const testSave = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    const testData = {
      title: 'Test Report ' + new Date().toISOString(),
      type: 'TABULAR',
      module: 'TICKETS',
      columns: ['id', 'title', 'status'],
      filters: [],
      groupBy: [],
      orderBy: {},
      chartConfig: null,
      query: '',
      schedule: null
    }

    try {
      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save report')
      }
    } catch (err) {
      setError('Network error: ' + err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Test Report Save</h1>
      
      <Button onClick={testSave} disabled={loading}>
        {loading ? 'Saving...' : 'Test Save Report'}
      </Button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="font-bold text-red-800">Error:</h3>
          <pre className="text-sm text-red-700">{error}</pre>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-bold text-green-800">Success!</h3>
          <pre className="text-sm text-green-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}