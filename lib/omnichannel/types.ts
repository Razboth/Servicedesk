/**
 * Omnichannel Integration Types
 * Defines the data structures for omnichannel ticket integration
 */

// Channel sources
export enum OmnichannelSource {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  CHAT = 'CHAT',
  PHONE = 'PHONE',
  SMS = 'SMS',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  TWITTER = 'TWITTER',
  TELEGRAM = 'TELEGRAM',
  WEB_PORTAL = 'WEB_PORTAL'
}

// Service types that omnichannel can create
export enum OmnichannelServiceType {
  // Financial Services
  CLAIM = 'CLAIM',
  REIMBURSEMENT = 'REIMBURSEMENT',
  DISPUTE = 'DISPUTE',

  // Customer Service
  COMPLAINT = 'COMPLAINT',
  INQUIRY = 'INQUIRY',
  FEEDBACK = 'FEEDBACK',

  // Technical Support
  TECHNICAL_SUPPORT = 'TECHNICAL_SUPPORT',
  ACCOUNT_ISSUE = 'ACCOUNT_ISSUE',
  CARD_ISSUE = 'CARD_ISSUE',
  ATM_ISSUE = 'ATM_ISSUE',
  MOBILE_BANKING = 'MOBILE_BANKING',
  INTERNET_BANKING = 'INTERNET_BANKING',

  // General
  GENERAL_REQUEST = 'GENERAL_REQUEST',
  OTHER = 'OTHER'
}

// Customer information from omnichannel
export interface OmnichannelCustomer {
  name: string;
  email?: string;
  phone?: string;
  identifier?: string; // CIF, Account Number, or other ID
  branchCode?: string;
  department?: string;
  preferredLanguage?: string;
}

// Main ticket request structure
export interface OmnichannelTicketRequest {
  // Channel information
  channel: OmnichannelSource;
  channelReferenceId?: string; // External reference from channel

  // Service routing
  serviceType: OmnichannelServiceType;

  // Customer data
  customer: OmnichannelCustomer;

  // Ticket details
  ticket: {
    title?: string; // Optional, can be auto-generated
    description: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category?: 'INCIDENT' | 'SERVICE_REQUEST' | 'CHANGE_REQUEST' | 'EVENT_REQUEST';

    // Service-specific metadata
    metadata?: {
      // Claim-specific
      claimType?: string;
      claimAmount?: number;
      claimCurrency?: string;
      claimDate?: string;
      claimReason?: string;
      referenceNumber?: string;

      // Transaction claim fields for KLAIM-OMNI
      namaNasabah?: string;
      mediaTransaksi?: 'ATM' | 'QRIS' | 'DEBIT' | 'TOUCH' | 'SMS';
      jenisTransaksi?: 'PEMBELIAN' | 'PEMBAYARAN' | 'TRANSFER';
      nominal?: number;
      nomorRekening?: string;
      nomorKartu?: string;

      // Technical support
      errorCode?: string;
      deviceType?: string;
      applicationVersion?: string;

      // ATM/Card specific
      atmId?: string;
      cardNumber?: string; // Masked
      transactionId?: string;

      // General fields
      requestedAction?: string;
      urgencyReason?: string;

      // Custom fields (key-value pairs)
      customFields?: Record<string, any>;
    };
  };

  // Attachments
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    content: string; // base64
    description?: string;
  }>;

  // Integration metadata
  integration?: {
    webhookUrl?: string; // For status callbacks
    apiVersion?: string;
    partnerId?: string;
    requestId?: string; // For idempotency
  };
}

// Response structure for omnichannel
export interface OmnichannelTicketResponse {
  success: boolean;
  ticketNumber?: string;
  ticketId?: string;
  status?: string;
  estimatedResolution?: string;
  trackingUrl?: string;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  metadata?: {
    createdAt: string;
    assignedTo?: string;
    supportGroup?: string;
    slaHours?: number;
  };
}

// Status check response
export interface OmnichannelStatusResponse {
  ticketNumber: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  currentAssignee?: string;
  lastComment?: {
    content: string;
    author: string;
    timestamp: string;
  };
  sla?: {
    responseDeadline: string;
    resolutionDeadline: string;
    isBreached: boolean;
  };
}

// Webhook payload for status updates
export interface OmnichannelWebhookPayload {
  event: 'TICKET_CREATED' | 'STATUS_CHANGED' | 'COMMENT_ADDED' | 'TICKET_RESOLVED' | 'TICKET_CLOSED';
  ticketNumber: string;
  channelReferenceId?: string;
  timestamp: string;
  data: {
    oldStatus?: string;
    newStatus?: string;
    comment?: string;
    resolvedBy?: string;
    resolution?: string;
  };
}

// Service mapping configuration
export interface ServiceMapping {
  omnichannelType: OmnichannelServiceType;
  internalServiceId: string;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  defaultCategory: 'INCIDENT' | 'SERVICE_REQUEST' | 'CHANGE_REQUEST' | 'EVENT_REQUEST';
  defaultIssueClassification?: string;
  requiresApproval: boolean;
  autoAssignToGroup?: string;
  slaHours: number;
}

// Validation rules for different service types
export interface ValidationRule {
  serviceType: OmnichannelServiceType;
  requiredFields: string[];
  optionalFields: string[];
  customValidation?: (data: OmnichannelTicketRequest) => { valid: boolean; errors?: string[] };
}