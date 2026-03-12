import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'

const SOCIOMILE_API_URL = 'https://api-ng.sociomile.net/bank-sulut/create'
const SOCIOMILE_TOKEN = process.env.SOCIOMILE_TOKEN || 'dd5c25815ea64c1c15cf6eef3ee527ea'

// Interface matching report_ticket.xlsx structure
interface TicketRecord {
  ticket_id: number | string
  remark: string
  subject: string
  priority_id: string
  priority_name: string
  ticket_status_id: number
  ticket_status_name: string
  unit_id: number
  unit_name: string
  informant_id: string
  informant_name: string
  informant_hp: string
  informant_email: string
  customer_id: string
  customer_name: string
  customer_hp: string
  customer_email: string
  date_origin_interaction: number
  date_start_interaction: number
  date_open: string
  date_close: number
  date_last_update: number
  is_escalated: string
  created_by_id: number | string
  created_by_name: string
  updated_by_id: string
  updated_by_name: string
  channel_id: number
  session_id: string
  category_id: number | string
  category_name: string
  date_created_at: number
  sla: string
  channel_name: string
  mainCategory: string
  category: string
  subCategory: string
  detailSubCategory: string
  detailSubCategory2: string
  date_pickup_interaction: number
  date_end_interaction: number
  date_first_pickup_interaction: number
  date_first_response_interaction: number
  account: string
  account_name: string
  informant_member_id: string
  customer_member_id: string
  sentiment_incoming: string
  sentiment_outgoing: string
  sentiment_all: string
  feedback: string
  sentiment_service: string
  source_id: number
  source_name: string
  parent_id: string
  count_merged: number
  contact: string
  customer_phone: string
  interaction_additional_info: string
  survey_name: string
  survey_id: number
  respondent_id: number
  ticket_id_old: string
  waitingTime: string
  serviceTime: string
  responseTime: string
  handlingTime: string
  duration: string
  acw: string
  sla_second: string
  date_on_progress: string
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
  if (value === null || value === undefined || value === '-') return ''
  const str = String(value).trim()
  // Remove surrounding quotes
  if (str.startsWith("'") && str.endsWith("'")) {
    return str.slice(1, -1).trim()
  }
  if (str.startsWith("'")) {
    return str.slice(1).trim()
  }
  return str
}

// Clean phone number - remove quotes and normalize
function cleanPhone(value: any): string {
  if (!value || value === '-') return ''
  let phone = cleanString(value)
  // Remove + prefix if present
  if (phone.startsWith('+')) {
    phone = phone.slice(1)
  }
  // Remove any non-digit characters except the leading digits
  phone = phone.replace(/[^\d]/g, '')
  return phone
}

// Convert Excel serial date to ISO format string
function excelDateToISO(serial: number | string): string {
  if (!serial || serial === '-' || isNaN(Number(serial))) {
    return ''
  }
  const numSerial = Number(serial)
  // Excel serial date starts from 1900-01-01
  const date = new Date((numSerial - 25569) * 86400 * 1000)
  return format(date, 'yyyy-MM-dd HH:mm:ss')
}

// Parse XLSX file and return records
function parseXLSX(buffer: ArrayBuffer): TicketRecord[] {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  const jsonData = XLSX.utils.sheet_to_json<TicketRecord>(worksheet, {
    raw: true,
    defval: ''
  })

  return jsonData
}

// Build payload for Omni API (Create Ticket omnyx/voice)
function buildOmniPayload(record: TicketRecord): Record<string, any> {
  const customerPhone = cleanPhone(record.customer_hp) || cleanPhone(record.informant_hp) || cleanPhone(record.customer_phone)
  const customerName = cleanString(record.customer_name) || cleanString(record.informant_name) || 'Unknown Customer'
  const customerEmail = cleanString(record.customer_email) || cleanString(record.informant_email)

  // Build payload according to API documentation
  const payload: Record<string, any> = {
    // Mandatory fields
    customer_hp: customerPhone,
    ticketType: 'voice',
    content: cleanString(record.remark) || cleanString(record.subject) || 'Voice call interaction',
    customer_email: customerEmail || 'noemail@banksulutgo.co.id',
    connectID: record.session_id || String(record.ticket_id),
    customer_name: customerName,
  }

  // Optional fields - only add if they have values
  if (record.ticketId_masking) {
    payload.ticketId_masking = cleanString(record.ticketId_masking)
  }

  if (record.ticket_id) {
    payload.ticket_id = String(record.ticket_id)
  }

  const subject = cleanString(record.subject)
  if (subject) {
    payload.subject = subject
  }

  const dateCreated = excelDateToISO(record.date_created_at)
  if (dateCreated) {
    payload.date_created_at = dateCreated
  }

  const dateClose = excelDateToISO(record.date_close)
  if (dateClose) {
    payload.date_close = dateClose
  }

  if (record.handlingTime && record.handlingTime !== '-') {
    payload.handlingTime = record.handlingTime
  }

  if (record.mainCategory && record.mainCategory !== '-') {
    payload.mainCategory = record.mainCategory
  }

  const categoryName = cleanString(record.category_name) || cleanString(record.category)
  if (categoryName) {
    payload.category_name = categoryName
  }

  if (record.category_id && record.category_id !== '-') {
    payload.category_id = String(record.category_id)
  }

  const subCategory = cleanString(record.subCategory)
  if (subCategory) {
    payload.subCategory = subCategory
  }

  const detailSub1 = cleanString(record.detailSubCategory)
  if (detailSub1) {
    payload.detailSubCategory = detailSub1
  }

  const detailSub2 = cleanString(record.detailSubCategory2)
  if (detailSub2) {
    payload.detailSubCategory2 = detailSub2
  }

  if (record.created_by_name) {
    payload.created_by_name = record.created_by_name
  }

  if (record.created_by_id && record.created_by_id !== '-') {
    payload.created_by_id = String(record.created_by_id)
  }

  return payload
}

// Send single record to Sociomile API
async function sendToSociomile(record: TicketRecord): Promise<{ success: boolean; error?: string; ticketId?: string; ticketNumber?: number }> {
  try {
    const payload = buildOmniPayload(record)

    // Validate mandatory fields
    if (!payload.customer_hp) {
      return { success: false, error: 'Missing customer phone number' }
    }
    if (!payload.customer_name) {
      return { success: false, error: 'Missing customer name' }
    }

    console.log(`Sending ticket ${record.ticket_id} to Omni:`, JSON.stringify(payload, null, 2))

    const apiUrl = `${SOCIOMILE_API_URL}?client_secret_key=${SOCIOMILE_TOKEN}`
    console.log(`API URL: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    // Get response text first to handle non-JSON responses
    const responseText = await response.text()
    console.log(`Response status: ${response.status}, body: ${responseText}`)

    let result: any
    try {
      result = JSON.parse(responseText)
    } catch {
      // Response is not JSON
      return {
        success: false,
        error: `API returned non-JSON response (${response.status}): ${responseText.substring(0, 200)}`
      }
    }

    if (response.ok && result.success) {
      return {
        success: true,
        ticketId: result.data?.ticketId,
        ticketNumber: result.data?.ticket_number
      }
    } else {
      const errorMsg = result.message || result.error || result.msg || JSON.stringify(result)
      return {
        success: false,
        error: `API Error (${response.status}): ${errorMsg}`
      }
    }
  } catch (error) {
    console.error(`Error sending ticket ${record.ticket_id}:`, error)
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Failed to connect to Sociomile'}` }
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
    if (user.supportGroupCode !== 'CALL_CENTER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied. Only Call Center users can access this feature.' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
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

    // Validate required columns for report_ticket format
    const requiredColumns = ['ticket_id', 'customer_hp', 'session_id']
    const firstRecord = records[0]
    const availableColumns = Object.keys(firstRecord)

    // Check if this looks like report_ticket format
    const hasTicketFormat = availableColumns.includes('ticket_id') &&
                           (availableColumns.includes('customer_hp') || availableColumns.includes('informant_hp'))

    if (!hasTicketFormat) {
      return NextResponse.json({
        error: 'Invalid file format. Please use the report_ticket export file from Sociomile.',
        hint: 'Expected columns: ticket_id, customer_hp, customer_name, session_id, remark, etc.'
      }, { status: 400 })
    }

    // Filter only Voice channel tickets
    const voiceRecords = records.filter(r =>
      r.channel_name === 'Voice' || r.source_name === 'Voice'
    )

    if (voiceRecords.length === 0) {
      // If no voice filter, use all records (might be pre-filtered)
      console.log('No Voice channel filter applied, using all records')
    }

    const recordsToProcess = voiceRecords.length > 0 ? voiceRecords : records

    // Process records and send to Sociomile
    const results: ImportResult[] = []
    let successCount = 0
    let failedCount = 0
    let skippedCount = 0

    for (let i = 0; i < recordsToProcess.length; i++) {
      const record = recordsToProcess[i]

      // Skip records without phone number
      const phone = cleanPhone(record.customer_hp) || cleanPhone(record.informant_hp)
      if (!phone) {
        results.push({
          row: i + 2,
          ticketId: String(record.ticket_id),
          success: false,
          error: 'No phone number available'
        })
        skippedCount++
        continue
      }

      const result = await sendToSociomile(record)

      results.push({
        row: i + 2, // +2 because row 1 is header and array is 0-indexed
        ticketId: String(record.ticket_id),
        success: result.success,
        error: result.error,
        omniTicketId: result.ticketId,
        omniTicketNumber: result.ticketNumber
      })

      if (result.success) {
        successCount++
      } else {
        failedCount++
      }

      // Add small delay to avoid rate limiting
      if (i < recordsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      total: recordsToProcess.length,
      results: results.filter(r => !r.success) // Only return failed results for debugging
    })

  } catch (error) {
    console.error('Error importing voice data:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to import voice data'
    }, { status: 500 })
  }
}

// GET endpoint to show expected format
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Voice Data Import API',
    expectedFormat: 'report_ticket export from Sociomile',
    requiredColumns: [
      'ticket_id',
      'customer_hp or informant_hp',
      'customer_name or informant_name',
      'session_id',
      'remark or subject'
    ],
    optionalColumns: [
      'customer_email',
      'ticketId_masking',
      'date_created_at',
      'date_close',
      'handlingTime',
      'mainCategory',
      'category_name',
      'category_id',
      'subCategory',
      'detailSubCategory',
      'detailSubCategory2',
      'created_by_name',
      'created_by_id'
    ],
    apiMapping: {
      'customer_hp': 'customer_hp (mandatory)',
      'ticketType': 'voice (fixed)',
      'content': 'remark or subject',
      'customer_email': 'customer_email or default',
      'connectID': 'session_id',
      'customer_name': 'customer_name (mandatory)'
    }
  })
}
