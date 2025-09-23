/**
 * Transformer for Omnichannel Data
 * Transforms omnichannel requests to internal ticket format
 */

import { OmnichannelTicketRequest, OmnichannelServiceType, OmnichannelSource } from './types';
import { mapServiceType, calculatePriority } from './service-mapper';
import { prisma } from '@/lib/prisma';

/**
 * Transform omnichannel request to internal ticket creation format
 */
export async function transformToInternalTicket(
  request: OmnichannelTicketRequest,
  userId: string,
  branchId: string
) {
  // Get service mapping
  const serviceMapping = await mapServiceType(request.serviceType);

  if (!serviceMapping) {
    throw new Error(`No service mapping found for type: ${request.serviceType}`);
  }

  // Calculate priority
  const priority = request.ticket.priority ||
    calculatePriority(request.serviceType, request.ticket.metadata);

  // Generate title if not provided
  const title = request.ticket.title || generateTitle(request.serviceType, request.customer.name);

  // Build description with metadata
  const description = buildDescription(request);

  // Prepare ticket data
  const ticketData = {
    title,
    description,
    serviceId: serviceMapping.internalServiceId,
    priority,
    category: request.ticket.category || serviceMapping.defaultCategory,
    issueClassification: serviceMapping.defaultIssueClassification,
    createdById: userId,
    branchId,

    // Omnichannel metadata
    sourceChannel: request.channel,
    channelReferenceId: request.channelReferenceId,

    // Customer information
    customerName: request.customer.name,
    customerEmail: request.customer.email,
    customerPhone: request.customer.phone,
    customerIdentifier: request.customer.identifier,

    // Additional metadata stored as JSON
    metadata: {
      omnichannelType: request.serviceType,
      omnichannelData: request.ticket.metadata,
      integration: request.integration,
      originalRequest: {
        channel: request.channel,
        serviceType: request.serviceType,
        receivedAt: new Date().toISOString()
      }
    },

    // Status and flags
    status: 'OPEN' as const,
    isConfidential: isConfidential(request.serviceType)
  };

  // Add support group if mapped
  if (serviceMapping.autoAssignToGroup) {
    Object.assign(ticketData, { supportGroupId: serviceMapping.autoAssignToGroup });
  }

  return {
    ticketData,
    attachments: request.attachments || [],
    fieldValues: await transformFieldValues(request, serviceMapping.internalServiceId)
  };
}

/**
 * Generate title based on service type
 */
function generateTitle(serviceType: OmnichannelServiceType, customerName: string): string {
  const titleTemplates: Record<OmnichannelServiceType, string> = {
    [OmnichannelServiceType.CLAIM]: 'Claim Request from {customer}',
    [OmnichannelServiceType.REIMBURSEMENT]: 'Reimbursement Request - {customer}',
    [OmnichannelServiceType.DISPUTE]: 'Transaction Dispute - {customer}',
    [OmnichannelServiceType.COMPLAINT]: 'Customer Complaint - {customer}',
    [OmnichannelServiceType.INQUIRY]: 'Customer Inquiry - {customer}',
    [OmnichannelServiceType.FEEDBACK]: 'Customer Feedback',
    [OmnichannelServiceType.TECHNICAL_SUPPORT]: 'Technical Support Request - {customer}',
    [OmnichannelServiceType.ACCOUNT_ISSUE]: 'Account Issue - {customer}',
    [OmnichannelServiceType.CARD_ISSUE]: 'Card Issue Reported - {customer}',
    [OmnichannelServiceType.ATM_ISSUE]: 'ATM Issue Report',
    [OmnichannelServiceType.MOBILE_BANKING]: 'Mobile Banking Issue - {customer}',
    [OmnichannelServiceType.INTERNET_BANKING]: 'Internet Banking Issue - {customer}',
    [OmnichannelServiceType.GENERAL_REQUEST]: 'Service Request - {customer}',
    [OmnichannelServiceType.OTHER]: 'Customer Request - {customer}'
  };

  const template = titleTemplates[serviceType] || 'Customer Request';
  return template.replace('{customer}', customerName);
}

/**
 * Build comprehensive description from request data
 */
function buildDescription(request: OmnichannelTicketRequest): string {
  const parts: string[] = [];

  // Main description
  parts.push('=== Request Details ===');
  parts.push(request.ticket.description);
  parts.push('');

  // Channel information
  parts.push('=== Source Information ===');
  parts.push(`Channel: ${formatChannel(request.channel)}`);
  if (request.channelReferenceId) {
    parts.push(`Reference ID: ${request.channelReferenceId}`);
  }
  parts.push('');

  // Customer information
  parts.push('=== Customer Information ===');
  parts.push(`Name: ${request.customer.name}`);
  if (request.customer.email) parts.push(`Email: ${request.customer.email}`);
  if (request.customer.phone) parts.push(`Phone: ${request.customer.phone}`);
  if (request.customer.identifier) parts.push(`Customer ID: ${request.customer.identifier}`);
  if (request.customer.branchCode) parts.push(`Branch Code: ${request.customer.branchCode}`);
  if (request.customer.department) parts.push(`Department: ${request.customer.department}`);
  parts.push('');

  // Service-specific metadata
  if (request.ticket.metadata && Object.keys(request.ticket.metadata).length > 0) {
    parts.push('=== Additional Information ===');

    const metadata = request.ticket.metadata;

    // Financial information
    if (metadata.claimAmount) {
      parts.push(`Claim Amount: ${formatCurrency(metadata.claimAmount, metadata.claimCurrency)}`);
    }
    if (metadata.nominal) {
      parts.push(`Nominal: ${formatCurrency(metadata.nominal, 'IDR')}`);
    }
    if (metadata.claimType) parts.push(`Claim Type: ${metadata.claimType}`);
    if (metadata.claimDate) parts.push(`Claim Date: ${metadata.claimDate}`);
    if (metadata.claimReason) parts.push(`Claim Reason: ${metadata.claimReason}`);

    // Transaction information
    if (metadata.transactionId) parts.push(`Transaction ID: ${metadata.transactionId}`);
    if (metadata.referenceNumber) parts.push(`Reference Number: ${metadata.referenceNumber}`);

    // Technical information
    if (metadata.errorCode) parts.push(`Error Code: ${metadata.errorCode}`);
    if (metadata.deviceType) parts.push(`Device Type: ${metadata.deviceType}`);
    if (metadata.applicationVersion) parts.push(`App Version: ${metadata.applicationVersion}`);
    if (metadata.browser) parts.push(`Browser: ${metadata.browser}`);

    // Transaction claim specific fields
    if (metadata.namaNasabah) parts.push(`Nama Nasabah: ${metadata.namaNasabah}`);
    if (metadata.mediaTransaksi) parts.push(`Media Transaksi: ${metadata.mediaTransaksi}`);
    if (metadata.jenisTransaksi) parts.push(`Jenis Transaksi: ${metadata.jenisTransaksi}`);
    if (metadata.nomorRekening) parts.push(`Nomor Rekening: ${metadata.nomorRekening}`);
    if (metadata.nomorKartu) parts.push(`Nomor Kartu: ${metadata.nomorKartu}`);

    // ATM/Card information
    if (metadata.atmId) parts.push(`ATM ID: ${metadata.atmId}`);
    if (metadata.cardNumber && !metadata.nomorKartu) parts.push(`Card Number: ${metadata.cardNumber}`);

    // Custom fields
    if (metadata.customFields) {
      Object.entries(metadata.customFields).forEach(([key, value]) => {
        parts.push(`${formatFieldName(key)}: ${value}`);
      });
    }
  }

  return parts.join('\n');
}

/**
 * Transform metadata to field values for the service
 */
async function transformFieldValues(
  request: OmnichannelTicketRequest,
  serviceId: string
): Promise<Array<{ fieldId: string; value: string }>> {
  const fieldValues: Array<{ fieldId: string; value: string }> = [];

  try {
    // Get field templates for the service
    const serviceFields = await prisma.serviceField.findMany({
      where: { serviceId },
      include: { fieldTemplate: true }
    });

    if (!request.ticket.metadata) {
      return fieldValues;
    }

    const metadata = request.ticket.metadata;

    // Map metadata to field templates
    for (const field of serviceFields) {
      const template = field.fieldTemplate;
      let value: string | undefined;

      // Try to match field by name
      const fieldName = template.name.toLowerCase().replace(/\s+/g, '');

      // Common field mappings
      const mappings: Record<string, string> = {
        'claimamount': metadata.claimAmount?.toString(),
        'claimtype': metadata.claimType,
        'claimdate': metadata.claimDate,
        'claimreason': metadata.claimReason,
        'transactionid': metadata.transactionId,
        'referencenumber': metadata.referenceNumber,
        'errorcode': metadata.errorCode,
        'devicetype': metadata.deviceType,
        'applicationversion': metadata.applicationVersion,
        'atmid': metadata.atmId,
        'cardnumber': metadata.cardNumber,
        'browser': metadata.browser
      };

      value = mappings[fieldName];

      // Check custom fields if no mapping found
      if (!value && metadata.customFields) {
        value = metadata.customFields[template.name] ||
                metadata.customFields[fieldName];
      }

      // Add field value if found and not empty
      if (value && value.trim() !== '') {
        fieldValues.push({
          fieldId: template.id,
          value: value.trim()
        });
      }
    }
  } catch (error) {
    console.error('Error transforming field values:', error);
  }

  return fieldValues;
}

/**
 * Format channel name for display
 */
function formatChannel(channel: OmnichannelSource): string {
  const channelNames: Record<OmnichannelSource, string> = {
    [OmnichannelSource.WHATSAPP]: 'WhatsApp',
    [OmnichannelSource.EMAIL]: 'Email',
    [OmnichannelSource.CHAT]: 'Live Chat',
    [OmnichannelSource.PHONE]: 'Phone Call',
    [OmnichannelSource.SMS]: 'SMS',
    [OmnichannelSource.FACEBOOK]: 'Facebook',
    [OmnichannelSource.INSTAGRAM]: 'Instagram',
    [OmnichannelSource.TWITTER]: 'Twitter',
    [OmnichannelSource.TELEGRAM]: 'Telegram',
    [OmnichannelSource.WEB_PORTAL]: 'Web Portal'
  };

  return channelNames[channel] || channel;
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number, currency: string = 'IDR'): string {
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return formatter.format(amount);
}

/**
 * Format field name for display
 */
function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Determine if ticket should be confidential
 */
function isConfidential(serviceType: OmnichannelServiceType): boolean {
  const confidentialTypes = [
    OmnichannelServiceType.DISPUTE,
    OmnichannelServiceType.COMPLAINT,
    OmnichannelServiceType.ACCOUNT_ISSUE
  ];

  return confidentialTypes.includes(serviceType);
}

/**
 * Transform internal ticket to omnichannel response format
 */
export function transformToOmnichannelResponse(ticket: any, baseUrl: string = '') {
  return {
    success: true,
    ticketNumber: ticket.ticketNumber,
    ticketId: ticket.id,
    status: ticket.status,
    estimatedResolution: ticket.slaTracking?.resolutionDeadline ||
      new Date(Date.now() + (ticket.service?.slaHours || 24) * 60 * 60 * 1000).toISOString(),
    trackingUrl: `${baseUrl}/tickets/${ticket.ticketNumber}`,
    message: 'Ticket created successfully',
    metadata: {
      createdAt: ticket.createdAt,
      assignedTo: ticket.assignedTo?.name,
      supportGroup: ticket.service?.supportGroup?.name,
      slaHours: ticket.service?.slaHours
    }
  };
}

/**
 * Transform internal status to omnichannel status response
 */
export function transformStatusResponse(ticket: any) {
  return {
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    resolvedAt: ticket.resolvedAt,
    closedAt: ticket.closedAt,
    currentAssignee: ticket.assignedTo?.name,
    lastComment: ticket.comments?.[0] ? {
      content: ticket.comments[0].content,
      author: ticket.comments[0].user?.name || 'System',
      timestamp: ticket.comments[0].createdAt
    } : undefined,
    sla: ticket.slaTracking ? {
      responseDeadline: ticket.slaTracking.responseDeadline,
      resolutionDeadline: ticket.slaTracking.resolutionDeadline,
      isBreached: ticket.slaTracking.isResponseBreached || ticket.slaTracking.isResolutionBreached
    } : undefined
  };
}