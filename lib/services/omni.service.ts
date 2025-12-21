/**
 * Omni/Sociomile API Service
 *
 * Handles integration with Sociomile platform for Transaction Claims tickets.
 * Sends ticket data to Omni API whenever a Transaction Claims ticket is created.
 */

// Transaction Claims Category IDs
const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';

// Configuration from environment
const OMNI_API_URL = process.env.OMNI_API_URL || 'https://api-sm.s45.in/bank-sulut/create';
const OMNI_API_TOKEN = process.env.OMNI_API_TOKEN || '';

/**
 * Payload structure for Omni Helpdesk ticket creation
 */
export interface OmniHelpdeskPayload {
  namaNasabah: string;           // Customer name (Required)
  ticketType: 'helpdesk';        // Fixed: helpdesk (Required)
  content: string;               // Ticket description (Required)
  email?: string;                // Customer email (Optional)
  connectID: string;             // Connection ID - customer identifier (Required)
  mediaTransaksi: string;        // ATM ID or 'BRANCH_PORTAL' (Required)
  jenisTransaksi?: string;       // Transaction type: PEMBELIAN, PEMBAYARAN, etc. (Optional)
  nominal: number;               // Transaction amount (Required)
  nomorRekening?: string;        // Account number (Optional)
  nomorKartu?: string;           // Card number (Optional)
  transactionId?: string;        // Transaction reference (Optional)
  claimReason?: string;          // Claim type/reason (Optional)
  claimDate?: string;            // Claim date: YYYY-MM-DD HH:mm:ss (Optional)
  branchCode: string;            // Branch code (Required)
  branchName: string;            // Branch name (Required)
  atmName: string;               // ATM name or 'N/A' (Required)
  atmId: string;                 // ATM ID or 'N/A' (Required)
  description?: string;          // Additional description (Optional)
  nomorTicketHelpdesk: string;   // Our ticket number (Required)
  noRegPengaduanCabang: string;  // Branch complaint number (Required)
}

/**
 * Response from Omni API ticket creation
 */
export interface OmniCreateResponse {
  success: boolean;
  message?: string;
  data?: {
    ticketId: string;
    ticket_number: number;
  };
  code: number;
}

/**
 * Error response from Omni API
 */
export interface OmniErrorResponse {
  type: 'error';
  trace_id: string;
  message: string;
  file?: string;
  line?: number;
  status: boolean;
}

/**
 * Ticket data structure for mapping to Omni payload
 */
export interface OmniTicketData {
  ticketNumber: string;
  title: string;
  description: string;
  createdAt: Date;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAccount?: string;
  cardLast4?: string;
  transactionAmount?: number;
  transactionRef?: string;
  claimType?: string;
  claimDescription?: string;
  atmCode?: string;
  atmLocation?: string;
  serviceName?: string;
  branch?: {
    code: string;
    name: string;
  };
  createdBy?: {
    name: string;
    email: string;
  };
  fieldValues?: Array<{
    field: { name: string };
    value: string;
  }>;
}

/**
 * Check if Omni integration is enabled
 */
export function isOmniEnabled(): boolean {
  return process.env.OMNI_ENABLED === 'true' && !!OMNI_API_TOKEN;
}

/**
 * Check if a service/category belongs to Transaction Claims
 */
export function isTransactionClaimService(
  categoryId?: string | null,
  tier1CategoryId?: string | null
): boolean {
  const categoryIds = [TRANSACTION_CLAIMS_CATEGORY_ID, ATM_SERVICES_CATEGORY_ID];
  return categoryIds.includes(categoryId || '') || categoryIds.includes(tier1CategoryId || '');
}

/**
 * Format date to Omni API format: YYYY-MM-DD HH:mm:ss
 */
function formatOmniDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Extract field value from ticket field values array
 */
function getFieldValue(fieldValues: OmniTicketData['fieldValues'], fieldName: string): string {
  if (!fieldValues) return '';
  const field = fieldValues.find(fv =>
    fv.field.name.toLowerCase() === fieldName.toLowerCase() ||
    fv.field.name.toLowerCase().replace(/_/g, '') === fieldName.toLowerCase().replace(/_/g, '')
  );
  return field?.value || '';
}

/**
 * Determine transaction type from service name or claim type
 */
function determineTransactionType(serviceName?: string, claimType?: string): string {
  const name = (serviceName || '').toLowerCase();
  const claim = (claimType || '').toLowerCase();

  if (name.includes('pembelian') || name.includes('purchase') || claim.includes('purchase')) {
    return 'PEMBELIAN';
  }
  if (name.includes('pembayaran') || name.includes('payment') || claim.includes('payment')) {
    return 'PEMBAYARAN';
  }
  if (name.includes('transfer')) {
    return 'TRANSFER';
  }
  if (name.includes('atm') || name.includes('penarikan') || name.includes('klaim')) {
    return 'PENARIKAN';
  }
  return 'KLAIM';
}

/**
 * Map ticket data to Omni API payload
 */
export function mapTicketToOmniPayload(ticketData: OmniTicketData): OmniHelpdeskPayload {
  // Extract values from field values if available
  const atmCode = ticketData.atmCode || getFieldValue(ticketData.fieldValues, 'atm_code') || '';
  const customerAccount = ticketData.customerAccount || getFieldValue(ticketData.fieldValues, 'customer_account') || '';
  const customerPhone = ticketData.customerPhone || getFieldValue(ticketData.fieldValues, 'customer_phone') || '';
  const customerEmail = ticketData.customerEmail || getFieldValue(ticketData.fieldValues, 'customer_email') || '';
  const cardLast4 = ticketData.cardLast4 || getFieldValue(ticketData.fieldValues, 'card_last_4') || '';
  const transactionRef = ticketData.transactionRef || getFieldValue(ticketData.fieldValues, 'transaction_ref') || '';
  const claimType = ticketData.claimType || getFieldValue(ticketData.fieldValues, 'claim_type') || '';

  // Parse transaction amount
  let nominal = ticketData.transactionAmount || 0;
  if (!nominal) {
    const nominalStr = getFieldValue(ticketData.fieldValues, 'transaction_amount') ||
                       getFieldValue(ticketData.fieldValues, 'nominal') || '0';
    nominal = parseFloat(nominalStr.replace(/[^0-9.-]/g, '')) || 0;
  }

  // Determine customer name
  const customerName = ticketData.customerName ||
                       getFieldValue(ticketData.fieldValues, 'customer_name') ||
                       ticketData.createdBy?.name ||
                       'Customer';

  // Determine connection ID (use email or phone)
  const connectID = customerEmail || customerPhone || ticketData.createdBy?.email || 'helpdesk@banksulutgo.co.id';

  // Determine media transaksi (ATM ID or default)
  const mediaTransaksi = atmCode || 'BRANCH_PORTAL';

  // Determine ATM info
  const atmId = atmCode || 'N/A';
  const atmName = ticketData.atmLocation || getFieldValue(ticketData.fieldValues, 'atm_location') || 'N/A';

  // Determine branch info
  const branchCode = ticketData.branch?.code || '000';
  const branchName = ticketData.branch?.name || 'Unknown Branch';

  // Build content from description
  const content = ticketData.description || ticketData.title || 'Transaction Claim';

  return {
    namaNasabah: customerName,
    ticketType: 'helpdesk',
    content: content,
    email: customerEmail || undefined,
    connectID: connectID,
    mediaTransaksi: mediaTransaksi,
    jenisTransaksi: determineTransactionType(ticketData.serviceName, claimType),
    nominal: nominal,
    nomorRekening: customerAccount || undefined,
    nomorKartu: cardLast4 ? `****${cardLast4}` : undefined,
    transactionId: transactionRef || undefined,
    claimReason: claimType || ticketData.serviceName || undefined,
    claimDate: formatOmniDate(ticketData.createdAt),
    branchCode: branchCode,
    branchName: branchName,
    atmName: atmName,
    atmId: atmId,
    description: ticketData.claimDescription || ticketData.description || undefined,
    nomorTicketHelpdesk: ticketData.ticketNumber,
    noRegPengaduanCabang: ticketData.ticketNumber,
  };
}

/**
 * Create ticket in Omni/Sociomile platform
 *
 * @param payload - The ticket data to send to Omni
 * @returns Promise with Omni API response
 */
export async function createOmniTicket(payload: OmniHelpdeskPayload): Promise<OmniCreateResponse> {
  if (!OMNI_API_TOKEN) {
    console.error('[Omni] API token not configured');
    return {
      success: false,
      message: 'Omni API token not configured',
      code: 500
    };
  }

  const url = `${OMNI_API_URL}?client_secret_key=${OMNI_API_TOKEN}`;

  console.log('[Omni] Creating ticket:', {
    ticketNumber: payload.nomorTicketHelpdesk,
    customerName: payload.namaNasabah,
    branchCode: payload.branchCode,
    atmId: payload.atmId
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('[Omni] Ticket created successfully:', {
        ticketId: data.data?.ticketId,
        ticketNumber: data.data?.ticket_number
      });
      return {
        success: true,
        message: data.message || 'success',
        data: data.data,
        code: data.code || 200
      };
    } else {
      console.error('[Omni] Failed to create ticket:', data);
      return {
        success: false,
        message: data.message || 'Failed to create Omni ticket',
        code: data.code || response.status
      };
    }
  } catch (error) {
    console.error('[Omni] API request failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 500
    };
  }
}

/**
 * Send ticket to Omni if it's a Transaction Claims ticket
 * This is a convenience function that checks if the ticket qualifies and sends it
 *
 * @param ticketData - The ticket data
 * @param categoryId - The ticket's category ID
 * @param tier1CategoryId - The service's tier1 category ID
 * @returns Promise with Omni response or null if not applicable
 */
export async function sendToOmniIfTransactionClaim(
  ticketData: OmniTicketData,
  categoryId?: string | null,
  tier1CategoryId?: string | null
): Promise<OmniCreateResponse | null> {
  // Check if Omni is enabled
  if (!isOmniEnabled()) {
    console.log('[Omni] Integration disabled');
    return null;
  }

  // Check if this is a Transaction Claims ticket
  if (!isTransactionClaimService(categoryId, tier1CategoryId)) {
    console.log('[Omni] Not a Transaction Claims ticket, skipping');
    return null;
  }

  // Map and send to Omni
  const payload = mapTicketToOmniPayload(ticketData);
  return await createOmniTicket(payload);
}
