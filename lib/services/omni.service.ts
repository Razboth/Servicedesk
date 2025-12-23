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
  nomorRekening?: number;        // Account number (Optional) - API expects Number
  nomorKartu?: number;           // Card number (Optional) - API expects Number
  transactionId?: string;        // Transaction reference (Optional)
  claimReason?: string;          // Claim type/reason (Optional)
  claimDate?: string;            // Claim date: YYYY-MM-DD HH:mm:ss (Optional)
  branchCode: string;            // Branch code (Required)
  branchName: string;            // Branch name (Required)
  atmName: string;               // ATM name or 'N/A' (Required)
  atmId: string;                 // ATM ID or 'N/A' (Required)
  description?: string;          // Additional description (Optional)
  nomorTicketHelpdesk: number;   // Our ticket number (Required) - API expects Number
  noRegPengaduanCabang: number;  // Branch complaint number (Required) - API expects Number
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

  // Parse ticket number to integer (remove non-numeric characters)
  const ticketNumberInt = parseInt(ticketData.ticketNumber.replace(/\D/g, ''), 10) || 0;

  // Parse account number to number if available
  const accountNumber = customerAccount ? parseInt(customerAccount.replace(/\D/g, ''), 10) || undefined : undefined;

  // Parse card number to number if available (use full card number, not masked)
  const cardNumber = cardLast4 ? parseInt(cardLast4.replace(/\D/g, ''), 10) || undefined : undefined;

  return {
    namaNasabah: customerName,
    ticketType: 'helpdesk',
    content: content,
    email: customerEmail || undefined,
    connectID: connectID,
    mediaTransaksi: mediaTransaksi,
    jenisTransaksi: determineTransactionType(ticketData.serviceName, claimType),
    nominal: nominal,
    nomorRekening: accountNumber,
    nomorKartu: cardNumber,
    transactionId: transactionRef || undefined,
    claimReason: claimType || ticketData.serviceName || undefined,
    claimDate: formatOmniDate(ticketData.createdAt),
    branchCode: branchCode,
    branchName: branchName,
    atmName: atmName,
    atmId: atmId,
    description: ticketData.claimDescription || ticketData.description || undefined,
    nomorTicketHelpdesk: ticketNumberInt,
    noRegPengaduanCabang: ticketNumberInt,
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

  // Debug: Log the full payload (development only)
  if (process.env.NODE_ENV === 'development' || process.env.OMNI_DEBUG === 'true') {
    console.log('[Omni] Full payload:', JSON.stringify(payload, null, 2));
  }

  // Validate required fields before sending
  const requiredFields: (keyof OmniHelpdeskPayload)[] = [
    'namaNasabah', 'ticketType', 'content', 'connectID',
    'mediaTransaksi', 'branchCode', 'branchName', 'atmName', 'atmId'
  ];

  for (const field of requiredFields) {
    if (!payload[field]) {
      console.error(`[Omni] Missing required field: ${field}`);
      return {
        success: false,
        message: `Missing required field: ${field}`,
        code: 400
      };
    }
  }

  if (typeof payload.nominal !== 'number' || payload.nominal < 0) {
    console.error('[Omni] Invalid nominal value:', payload.nominal);
    return {
      success: false,
      message: 'Invalid nominal value - must be a non-negative number',
      code: 400
    };
  }

  if (typeof payload.nomorTicketHelpdesk !== 'number' || payload.nomorTicketHelpdesk <= 0) {
    console.error('[Omni] Invalid ticket number:', payload.nomorTicketHelpdesk);
    return {
      success: false,
      message: 'Invalid ticket number',
      code: 400
    };
  }

  // Add timeout for API request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    // Debug: Log full response (development only)
    if (process.env.NODE_ENV === 'development' || process.env.OMNI_DEBUG === 'true') {
      console.log('[Omni] API response:', JSON.stringify(data, null, 2));
    }

    // Handle both 'success' and 'status' response formats
    const isSuccess = data.success === true || data.status === true;

    if (response.ok && isSuccess) {
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
      // Log detailed error info
      console.error('[Omni] Failed to create ticket:', {
        status: response.status,
        responseData: data,
        errors: data.errors,
        message: data.message
      });
      return {
        success: false,
        message: data.message || data.errors?.message || 'Failed to create Omni ticket',
        code: data.code || response.status
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Omni] Request timeout after 30 seconds');
      return {
        success: false,
        message: 'Request timeout - Omni API did not respond within 30 seconds',
        code: 504
      };
    }

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

/**
 * Status mapping from BSG ServiceDesk to Omni/Sociomile
 */
const BSG_TO_OMNI_STATUS_MAP: Record<string, string> = {
  'OPEN': 'Open',
  'IN_PROGRESS': 'InProgress',
  'PENDING': 'Pending',
  'PENDING_APPROVAL': 'Pending Approval',
  'PENDING_VENDOR': 'On Hold',
  'ON_HOLD': 'On Hold',
  'RESOLVED': 'Close',
  'CLOSED': 'Close',
  'REJECTED': 'Close',
  'CANCELLED': 'Close',
  'APPROVED': 'InProgress'
};

/**
 * Payload structure for Omni status update
 */
export interface OmniStatusUpdatePayload {
  sociomile_ticket_id: string;
  bsg_ticket_id: string;
  status: string;
}

/**
 * Response from Omni status update API
 */
export interface OmniStatusUpdateResponse {
  success: boolean;
  message?: string;
  code: number;
}

/**
 * Map BSG status to Omni status
 * @param bsgStatus - The BSG ServiceDesk status
 * @returns The corresponding Omni status or null if no mapping exists
 */
export function mapBsgStatusToOmni(bsgStatus: string): string | null {
  return BSG_TO_OMNI_STATUS_MAP[bsgStatus] || null;
}

/**
 * Update ticket status in Omni/Sociomile platform
 *
 * @param sociomileTicketId - The Sociomile ticket ID
 * @param bsgTicketId - The BSG ServiceDesk ticket ID
 * @param bsgStatus - The new BSG status
 * @returns Promise with Omni API response
 */
export async function updateOmniTicketStatus(
  sociomileTicketId: string,
  bsgTicketId: string,
  bsgStatus: string
): Promise<OmniStatusUpdateResponse> {
  if (!OMNI_API_TOKEN) {
    console.error('[Omni] API token not configured');
    return {
      success: false,
      message: 'Omni API token not configured',
      code: 500
    };
  }

  // Map BSG status to Omni status
  const omniStatus = mapBsgStatusToOmni(bsgStatus);
  if (!omniStatus) {
    console.warn(`[Omni] No status mapping found for BSG status: ${bsgStatus}`);
    return {
      success: false,
      message: `No status mapping found for: ${bsgStatus}`,
      code: 400
    };
  }

  // Build the update status URL
  const OMNI_UPDATE_STATUS_URL = process.env.OMNI_UPDATE_STATUS_URL || 'https://api-sm.s45.in/bank-sulut/updatestatus';
  const url = `${OMNI_UPDATE_STATUS_URL}?client_secret_key=${OMNI_API_TOKEN}`;

  const payload: OmniStatusUpdatePayload = {
    sociomile_ticket_id: sociomileTicketId,
    bsg_ticket_id: bsgTicketId,
    status: omniStatus
  };

  console.log('[Omni] Updating ticket status:', {
    sociomileTicketId,
    bsgTicketId,
    bsgStatus,
    omniStatus
  });

  // Debug: Log the full payload (development only)
  if (process.env.NODE_ENV === 'development' || process.env.OMNI_DEBUG === 'true') {
    console.log('[Omni] Status update payload:', JSON.stringify(payload, null, 2));
  }

  // Add timeout for API request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    // Debug: Log full response (development only)
    if (process.env.NODE_ENV === 'development' || process.env.OMNI_DEBUG === 'true') {
      console.log('[Omni] Status update response:', JSON.stringify(data, null, 2));
    }

    // Handle both 'success' and 'status' response formats
    const isSuccess = data.success === true || data.status === true;

    if (response.ok && isSuccess) {
      console.log('[Omni] Ticket status updated successfully:', {
        sociomileTicketId,
        newStatus: omniStatus
      });
      return {
        success: true,
        message: data.message || 'Status updated successfully',
        code: data.code || 200
      };
    } else {
      console.error('[Omni] Failed to update ticket status:', {
        status: response.status,
        responseData: data
      });
      return {
        success: false,
        message: data.message || 'Failed to update Omni ticket status',
        code: data.code || response.status
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Omni] Status update request timeout after 30 seconds');
      return {
        success: false,
        message: 'Request timeout - Omni API did not respond within 30 seconds',
        code: 504
      };
    }

    console.error('[Omni] Status update API request failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      code: 500
    };
  }
}

/**
 * Sync ticket status to Omni if the ticket was previously sent to Omni
 * This is a convenience function that checks if the ticket has a Sociomile ID and syncs status
 *
 * @param ticketId - The BSG ticket ID
 * @param sociomileTicketId - The Sociomile ticket ID (if exists)
 * @param newStatus - The new BSG status
 * @returns Promise with Omni response or null if not applicable
 */
export async function syncStatusToOmniIfApplicable(
  ticketId: string,
  sociomileTicketId: string | null | undefined,
  newStatus: string
): Promise<OmniStatusUpdateResponse | null> {
  // Check if Omni is enabled
  if (!isOmniEnabled()) {
    console.log('[Omni] Integration disabled, skipping status sync');
    return null;
  }

  // Check if ticket was sent to Omni
  if (!sociomileTicketId) {
    console.log('[Omni] Ticket not linked to Omni, skipping status sync');
    return null;
  }

  // Sync the status
  return await updateOmniTicketStatus(sociomileTicketId, ticketId, newStatus);
}
