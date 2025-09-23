/**
 * Validator for Omnichannel Ticket Requests
 * Validates incoming requests based on service type requirements
 */

import { z } from 'zod';
import {
  OmnichannelTicketRequest,
  OmnichannelServiceType,
  OmnichannelSource,
  ValidationRule
} from './types';

// Base validation schema
const baseTicketSchema = z.object({
  channel: z.nativeEnum(OmnichannelSource),
  channelReferenceId: z.string().optional(),
  serviceType: z.nativeEnum(OmnichannelServiceType),
  customer: z.object({
    name: z.string().min(1, 'Customer name is required'),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    identifier: z.string().optional(),
    branchCode: z.string().optional(),
    department: z.string().optional(),
    preferredLanguage: z.string().optional()
  }),
  ticket: z.object({
    title: z.string().optional(),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    category: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).optional(),
    metadata: z.record(z.any()).optional()
  }),
  attachments: z.array(z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number().max(10485760, 'File size cannot exceed 10MB'),
    content: z.string(),
    description: z.string().optional()
  })).optional(),
  integration: z.object({
    webhookUrl: z.string().url().optional(),
    apiVersion: z.string().optional(),
    partnerId: z.string().optional(),
    requestId: z.string().optional()
  }).optional()
});

// Service-specific validation rules
const validationRules: Record<OmnichannelServiceType, ValidationRule> = {
  [OmnichannelServiceType.CLAIM]: {
    serviceType: OmnichannelServiceType.CLAIM,
    requiredFields: ['customer.name', 'customer.email', 'ticket.metadata.claimType', 'ticket.metadata.claimAmount'],
    optionalFields: ['customer.phone', 'ticket.metadata.claimDate', 'ticket.metadata.claimReason', 'ticket.metadata.referenceNumber'],
    customValidation: (data) => {
      const errors: string[] = [];
      if (!data.ticket.metadata?.claimType) {
        errors.push('Claim type is required');
      }
      if (!data.ticket.metadata?.claimAmount || data.ticket.metadata.claimAmount <= 0) {
        errors.push('Valid claim amount is required');
      }
      if (data.ticket.metadata?.claimAmount && data.ticket.metadata.claimAmount > 1000000000) {
        errors.push('Claim amount exceeds maximum limit');
      }
      return { valid: errors.length === 0, errors };
    }
  },

  [OmnichannelServiceType.REIMBURSEMENT]: {
    serviceType: OmnichannelServiceType.REIMBURSEMENT,
    requiredFields: ['customer.name', 'customer.email', 'ticket.metadata.claimAmount'],
    optionalFields: ['ticket.metadata.referenceNumber', 'ticket.metadata.claimDate'],
    customValidation: (data) => {
      const errors: string[] = [];
      if (!data.ticket.metadata?.claimAmount || data.ticket.metadata.claimAmount <= 0) {
        errors.push('Valid reimbursement amount is required');
      }
      return { valid: errors.length === 0, errors };
    }
  },

  [OmnichannelServiceType.DISPUTE]: {
    serviceType: OmnichannelServiceType.DISPUTE,
    requiredFields: ['customer.name', 'customer.identifier', 'ticket.metadata.transactionId'],
    optionalFields: ['ticket.metadata.disputeAmount', 'ticket.metadata.disputeReason'],
    customValidation: (data) => {
      const errors: string[] = [];
      if (!data.ticket.metadata?.transactionId) {
        errors.push('Transaction ID is required for disputes');
      }
      return { valid: errors.length === 0, errors };
    }
  },

  [OmnichannelServiceType.COMPLAINT]: {
    serviceType: OmnichannelServiceType.COMPLAINT,
    requiredFields: ['customer.name'],
    optionalFields: ['customer.email', 'customer.phone', 'customer.branchCode'],
    customValidation: (data) => {
      const errors: string[] = [];
      // Must have at least one contact method
      if (!data.customer.email && !data.customer.phone) {
        errors.push('At least one contact method (email or phone) is required');
      }
      return { valid: errors.length === 0, errors };
    }
  },

  [OmnichannelServiceType.INQUIRY]: {
    serviceType: OmnichannelServiceType.INQUIRY,
    requiredFields: ['customer.name'],
    optionalFields: ['customer.email', 'customer.phone'],
    customValidation: () => ({ valid: true })
  },

  [OmnichannelServiceType.FEEDBACK]: {
    serviceType: OmnichannelServiceType.FEEDBACK,
    requiredFields: [],
    optionalFields: ['customer.name', 'customer.email'],
    customValidation: () => ({ valid: true })
  },

  [OmnichannelServiceType.TECHNICAL_SUPPORT]: {
    serviceType: OmnichannelServiceType.TECHNICAL_SUPPORT,
    requiredFields: ['customer.name'],
    optionalFields: ['ticket.metadata.errorCode', 'ticket.metadata.deviceType', 'ticket.metadata.applicationVersion'],
    customValidation: () => ({ valid: true })
  },

  [OmnichannelServiceType.ACCOUNT_ISSUE]: {
    serviceType: OmnichannelServiceType.ACCOUNT_ISSUE,
    requiredFields: ['customer.name', 'customer.identifier'],
    optionalFields: ['ticket.metadata.accountLocked', 'ticket.metadata.cannotAccess'],
    customValidation: (data) => {
      const errors: string[] = [];
      if (!data.customer.identifier) {
        errors.push('Account identifier (CIF/Account Number) is required');
      }
      return { valid: errors.length === 0, errors };
    }
  },

  [OmnichannelServiceType.CARD_ISSUE]: {
    serviceType: OmnichannelServiceType.CARD_ISSUE,
    requiredFields: ['customer.name', 'customer.identifier'],
    optionalFields: ['ticket.metadata.cardNumber', 'ticket.metadata.issueType'],
    customValidation: (data) => {
      const errors: string[] = [];
      if (data.ticket.metadata?.cardNumber && !isValidMaskedCard(data.ticket.metadata.cardNumber)) {
        errors.push('Invalid card number format (should be masked: ****1234)');
      }
      return { valid: errors.length === 0, errors };
    }
  },

  [OmnichannelServiceType.ATM_ISSUE]: {
    serviceType: OmnichannelServiceType.ATM_ISSUE,
    requiredFields: ['customer.name', 'ticket.metadata.atmId'],
    optionalFields: ['ticket.metadata.transactionId', 'ticket.metadata.errorCode'],
    customValidation: (data) => {
      const errors: string[] = [];
      if (!data.ticket.metadata?.atmId) {
        errors.push('ATM ID is required for ATM issues');
      }
      return { valid: errors.length === 0, errors };
    }
  },

  [OmnichannelServiceType.MOBILE_BANKING]: {
    serviceType: OmnichannelServiceType.MOBILE_BANKING,
    requiredFields: ['customer.name', 'customer.identifier'],
    optionalFields: ['ticket.metadata.applicationVersion', 'ticket.metadata.deviceType', 'ticket.metadata.errorCode'],
    customValidation: () => ({ valid: true })
  },

  [OmnichannelServiceType.INTERNET_BANKING]: {
    serviceType: OmnichannelServiceType.INTERNET_BANKING,
    requiredFields: ['customer.name', 'customer.identifier'],
    optionalFields: ['ticket.metadata.browser', 'ticket.metadata.errorCode'],
    customValidation: () => ({ valid: true })
  },

  [OmnichannelServiceType.GENERAL_REQUEST]: {
    serviceType: OmnichannelServiceType.GENERAL_REQUEST,
    requiredFields: ['customer.name'],
    optionalFields: ['customer.email', 'customer.phone'],
    customValidation: () => ({ valid: true })
  },

  [OmnichannelServiceType.OTHER]: {
    serviceType: OmnichannelServiceType.OTHER,
    requiredFields: ['customer.name'],
    optionalFields: [],
    customValidation: () => ({ valid: true })
  }
};

/**
 * Validate masked card number format
 */
function isValidMaskedCard(cardNumber: string): boolean {
  // Accept formats like: ****1234, XXXX-XXXX-XXXX-1234, etc.
  const maskedPattern = /^[\*X]{4,12}[\s\-]?\d{4}$/;
  return maskedPattern.test(cardNumber.replace(/[\s\-]/g, ''));
}

/**
 * Validate omnichannel ticket request
 */
export async function validateOmnichannelRequest(
  data: any
): Promise<{ valid: boolean; errors?: Record<string, string>; validatedData?: OmnichannelTicketRequest }> {
  try {
    // First, validate against base schema
    const baseValidation = baseTicketSchema.safeParse(data);

    if (!baseValidation.success) {
      const errors: Record<string, string> = {};
      baseValidation.error.errors.forEach(err => {
        errors[err.path.join('.')] = err.message;
      });
      return { valid: false, errors };
    }

    const validatedData = baseValidation.data as OmnichannelTicketRequest;

    // Get service-specific validation rules
    const rules = validationRules[validatedData.serviceType];

    if (!rules) {
      return {
        valid: false,
        errors: { serviceType: `Unknown service type: ${validatedData.serviceType}` }
      };
    }

    // Check required fields
    const errors: Record<string, string> = {};

    for (const field of rules.requiredFields) {
      const value = getNestedValue(validatedData, field);
      if (value === undefined || value === null || value === '') {
        errors[field] = `${field} is required for ${validatedData.serviceType}`;
      }
    }

    // Run custom validation if defined
    if (rules.customValidation) {
      const customResult = rules.customValidation(validatedData);
      if (!customResult.valid && customResult.errors) {
        customResult.errors.forEach((error, index) => {
          errors[`custom_${index}`] = error;
        });
      }
    }

    // Validate email if provided
    if (validatedData.customer.email && !z.string().email().safeParse(validatedData.customer.email).success) {
      errors['customer.email'] = 'Invalid email format';
    }

    // Validate phone if provided
    if (validatedData.customer.phone) {
      const phonePattern = /^\+?[\d\s\-\(\)]+$/;
      if (!phonePattern.test(validatedData.customer.phone)) {
        errors['customer.phone'] = 'Invalid phone number format';
      }
    }

    // Validate attachments size
    if (validatedData.attachments) {
      const totalSize = validatedData.attachments.reduce((sum, att) => sum + att.size, 0);
      if (totalSize > 52428800) { // 50MB total
        errors['attachments'] = 'Total attachment size cannot exceed 50MB';
      }
    }

    // Check for webhook URL validity if provided
    if (validatedData.integration?.webhookUrl) {
      try {
        new URL(validatedData.integration.webhookUrl);
      } catch {
        errors['integration.webhookUrl'] = 'Invalid webhook URL';
      }
    }

    if (Object.keys(errors).length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, validatedData };

  } catch (error) {
    console.error('Validation error:', error);
    return {
      valid: false,
      errors: { general: 'Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error') }
    };
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[key];
  }

  return value;
}

/**
 * Sanitize customer data for security
 */
export function sanitizeCustomerData(customer: any): any {
  return {
    name: customer.name?.trim(),
    email: customer.email?.toLowerCase().trim(),
    phone: customer.phone?.replace(/[^\d\+\-\s]/g, ''),
    identifier: customer.identifier?.trim(),
    branchCode: customer.branchCode?.trim(),
    department: customer.department?.trim(),
    preferredLanguage: customer.preferredLanguage?.trim()
  };
}

/**
 * Validate channel source
 */
export function isValidChannel(channel: string): channel is OmnichannelSource {
  return Object.values(OmnichannelSource).includes(channel as OmnichannelSource);
}

/**
 * Validate service type
 */
export function isValidServiceType(type: string): type is OmnichannelServiceType {
  return Object.values(OmnichannelServiceType).includes(type as OmnichannelServiceType);
}