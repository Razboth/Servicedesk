import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const SOCIOMILE_API_URL = 'https://api-sm.s45.in/bank-sulut/create'
const SOCIOMILE_TOKEN = 'B24d5b9c371171869a17a1c178bbf9e6'

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

// Convert Excel serial date to ISO format string
function excelDateToISO(serial: number): string {
  if (!serial || isNaN(serial)) {
    return format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  }
  // Excel serial date starts from 1900-01-01, but has a bug with 1900 leap year
  // JavaScript Date epoch is 1970-01-01
  const date = new Date((serial - 25569) * 86400 * 1000)
  return format(date, 'yyyy-MM-dd HH:mm:ss')
}

// Parse XLSX file and return records
function parseXLSX(buffer: ArrayBuffer): VoiceRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  const jsonData = XLSX.utils.sheet_to_json<VoiceRecord>(worksheet, {
    raw: true,
    defval: ''
  })

  return jsonData
}

// Send single record to Sociomile API
async function sendToSociomile(record: VoiceRecord, defaultName: string, defaultEmail: string, defaultContent: string): Promise<{ success: boolean; error?: string; ticketId?: string }> {
  try {
    const payload = {
      customer_hp: String(record.clid),
      ticketType: 'voice',
      content: record.rec_ai && record.rec_ai !== '-' ? record.rec_ai : defaultContent,
      customer_email: defaultEmail,
      connectID: String(record.uniqueid),
      customer_name: defaultName,
      date_created_at: excelDateToISO(record.datetime),
      date_close: excelDateToISO(record.datetimeend),
      handlingTime: record.talktime || '00:00:00',
      created_by_name: record.agent || 'Unknown Agent',
      ticket_id: String(record.uniqueid)
    }

    const response = await fetch(`${SOCIOMILE_API_URL}?client_secret_key=${SOCIOMILE_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (response.ok && (result.status === 'success' || result.success)) {
      return { success: true, ticketId: result.ticket_id || result.ticketId }
    } else {
      return { success: false, error: result.message || result.error || 'Unknown error from Sociomile API' }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send to Sociomile' }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is from Call Center support group
    const user = session.user as any
    if (user.supportGroupCode !== 'CALL_CENTER') {
      return NextResponse.json({ error: 'Access denied. Only Call Center users can access this feature.' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const defaultName = formData.get('defaultName') as string
    const defaultEmail = formData.get('defaultEmail') as string
    const defaultContent = formData.get('defaultContent') as string || 'Voice call interaction'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!defaultName || !defaultEmail) {
      return NextResponse.json({ error: 'Default customer name and email are required' }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Invalid file type. Only .xlsx or .xls files are allowed.' }, { status: 400 })
    }

    // Parse XLSX file
    const buffer = await file.arrayBuffer()
    const records = parseXLSX(buffer)

    if (records.length === 0) {
      return NextResponse.json({ error: 'No records found in the file' }, { status: 400 })
    }

    // Validate required columns
    const requiredColumns = ['datetime', 'uniqueid', 'clid', 'agent', 'talktime']
    const firstRecord = records[0]
    const missingColumns = requiredColumns.filter(col => !(col in firstRecord))

    if (missingColumns.length > 0) {
      return NextResponse.json({
        error: `Missing required columns: ${missingColumns.join(', ')}`
      }, { status: 400 })
    }

    // Process records and send to Sociomile
    const results: ImportResult[] = []
    let successCount = 0
    let failedCount = 0

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const result = await sendToSociomile(record, defaultName, defaultEmail, defaultContent)

      results.push({
        row: i + 2, // +2 because row 1 is header and array is 0-indexed
        success: result.success,
        error: result.error,
        ticketId: result.ticketId
      })

      if (result.success) {
        successCount++
      } else {
        failedCount++
      }

      // Add small delay to avoid rate limiting
      if (i < records.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: records.length,
      results: results.filter(r => !r.success) // Only return failed results for debugging
    })

  } catch (error) {
    console.error('Error importing voice data:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to import voice data'
    }, { status: 500 })
  }
}

// GET endpoint to preview XLSX file
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Use POST method to upload XLSX file for import'
  })
}
