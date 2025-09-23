/**
 * Service Mapper for Omnichannel Integration
 * Maps external service types to internal service IDs and configurations
 */

import { OmnichannelServiceType, ServiceMapping } from './types';
import { prisma } from '@/lib/prisma';

// Default service mappings (these should be configured in database)
const DEFAULT_MAPPINGS: Partial<Record<OmnichannelServiceType, Partial<ServiceMapping>>> = {
  [OmnichannelServiceType.CLAIM]: {
    defaultPriority: 'HIGH',
    defaultCategory: 'SERVICE_REQUEST',
    defaultIssueClassification: 'DATA_ISSUE',
    requiresApproval: true,
    slaHours: 24
  },
  [OmnichannelServiceType.REIMBURSEMENT]: {
    defaultPriority: 'MEDIUM',
    defaultCategory: 'SERVICE_REQUEST',
    defaultIssueClassification: 'PROCESS_GAP',
    requiresApproval: true,
    slaHours: 48
  },
  [OmnichannelServiceType.DISPUTE]: {
    defaultPriority: 'HIGH',
    defaultCategory: 'INCIDENT',
    defaultIssueClassification: 'DATA_ISSUE',
    requiresApproval: false,
    slaHours: 12
  },
  [OmnichannelServiceType.COMPLAINT]: {
    defaultPriority: 'HIGH',
    defaultCategory: 'INCIDENT',
    defaultIssueClassification: 'PROCESS_GAP',
    requiresApproval: false,
    slaHours: 8
  },
  [OmnichannelServiceType.INQUIRY]: {
    defaultPriority: 'LOW',
    defaultCategory: 'SERVICE_REQUEST',
    defaultIssueClassification: 'EXTERNAL_FACTOR',
    requiresApproval: false,
    slaHours: 72
  },
  [OmnichannelServiceType.TECHNICAL_SUPPORT]: {
    defaultPriority: 'MEDIUM',
    defaultCategory: 'INCIDENT',
    defaultIssueClassification: 'SYSTEM_ERROR',
    requiresApproval: false,
    slaHours: 4
  },
  [OmnichannelServiceType.ACCOUNT_ISSUE]: {
    defaultPriority: 'HIGH',
    defaultCategory: 'INCIDENT',
    defaultIssueClassification: 'DATA_ISSUE',
    requiresApproval: false,
    slaHours: 6
  },
  [OmnichannelServiceType.CARD_ISSUE]: {
    defaultPriority: 'HIGH',
    defaultCategory: 'INCIDENT',
    defaultIssueClassification: 'HARDWARE_FAILURE',
    requiresApproval: false,
    slaHours: 4
  },
  [OmnichannelServiceType.ATM_ISSUE]: {
    defaultPriority: 'CRITICAL',
    defaultCategory: 'INCIDENT',
    defaultIssueClassification: 'HARDWARE_FAILURE',
    requiresApproval: false,
    slaHours: 2
  },
  [OmnichannelServiceType.MOBILE_BANKING]: {
    defaultPriority: 'MEDIUM',
    defaultCategory: 'INCIDENT',
    defaultIssueClassification: 'SYSTEM_ERROR',
    requiresApproval: false,
    slaHours: 6
  },
  [OmnichannelServiceType.INTERNET_BANKING]: {
    defaultPriority: 'MEDIUM',
    defaultCategory: 'INCIDENT',
    defaultIssueClassification: 'SYSTEM_ERROR',
    requiresApproval: false,
    slaHours: 6
  },
  [OmnichannelServiceType.GENERAL_REQUEST]: {
    defaultPriority: 'LOW',
    defaultCategory: 'SERVICE_REQUEST',
    defaultIssueClassification: 'EXTERNAL_FACTOR',
    requiresApproval: false,
    slaHours: 96
  }
};

/**
 * Maps omnichannel service type to internal service configuration
 */
export async function mapServiceType(
  serviceType: OmnichannelServiceType
): Promise<ServiceMapping | null> {
  try {
    // First, try to find a specific service for this type
    const serviceName = getServiceNameFromType(serviceType);

    const service = await prisma.service.findFirst({
      where: {
        OR: [
          { name: { contains: serviceName, mode: 'insensitive' } },
          { defaultTitle: { contains: serviceName, mode: 'insensitive' } }
        ],
        isActive: true
      },
      include: {
        supportGroup: true
      }
    });

    if (service) {
      const defaults = DEFAULT_MAPPINGS[serviceType] || {};

      return {
        omnichannelType: serviceType,
        internalServiceId: service.id,
        defaultPriority: (service.priority as any) || defaults.defaultPriority || 'MEDIUM',
        defaultCategory: (service.defaultItilCategory as any) || defaults.defaultCategory || 'SERVICE_REQUEST',
        defaultIssueClassification: service.defaultIssueClassification || defaults.defaultIssueClassification,
        requiresApproval: service.requiresApproval,
        autoAssignToGroup: service.supportGroupId || undefined,
        slaHours: service.slaHours
      };
    }

    // Fallback: Find a general service based on category
    const fallbackService = await findFallbackService(serviceType);

    if (fallbackService) {
      const defaults = DEFAULT_MAPPINGS[serviceType] || {};

      return {
        omnichannelType: serviceType,
        internalServiceId: fallbackService.id,
        defaultPriority: defaults.defaultPriority || 'MEDIUM',
        defaultCategory: defaults.defaultCategory || 'SERVICE_REQUEST',
        defaultIssueClassification: defaults.defaultIssueClassification,
        requiresApproval: fallbackService.requiresApproval,
        autoAssignToGroup: fallbackService.supportGroupId || undefined,
        slaHours: fallbackService.slaHours
      };
    }

    return null;
  } catch (error) {
    console.error('Error mapping service type:', error);
    return null;
  }
}

/**
 * Get service name from omnichannel type
 */
function getServiceNameFromType(type: OmnichannelServiceType): string {
  const nameMap: Record<OmnichannelServiceType, string> = {
    [OmnichannelServiceType.CLAIM]: 'Claim',
    [OmnichannelServiceType.REIMBURSEMENT]: 'Reimbursement',
    [OmnichannelServiceType.DISPUTE]: 'Dispute',
    [OmnichannelServiceType.COMPLAINT]: 'Complaint',
    [OmnichannelServiceType.INQUIRY]: 'Inquiry',
    [OmnichannelServiceType.FEEDBACK]: 'Feedback',
    [OmnichannelServiceType.TECHNICAL_SUPPORT]: 'Technical Support',
    [OmnichannelServiceType.ACCOUNT_ISSUE]: 'Account',
    [OmnichannelServiceType.CARD_ISSUE]: 'Card',
    [OmnichannelServiceType.ATM_ISSUE]: 'ATM',
    [OmnichannelServiceType.MOBILE_BANKING]: 'Mobile Banking',
    [OmnichannelServiceType.INTERNET_BANKING]: 'Internet Banking',
    [OmnichannelServiceType.GENERAL_REQUEST]: 'General Request',
    [OmnichannelServiceType.OTHER]: 'Other'
  };

  return nameMap[type] || 'General';
}

/**
 * Find fallback service based on service type category
 */
async function findFallbackService(type: OmnichannelServiceType) {
  // Determine category based on type
  const isFinancial = [
    OmnichannelServiceType.CLAIM,
    OmnichannelServiceType.REIMBURSEMENT,
    OmnichannelServiceType.DISPUTE
  ].includes(type);

  const isTechnical = [
    OmnichannelServiceType.TECHNICAL_SUPPORT,
    OmnichannelServiceType.ACCOUNT_ISSUE,
    OmnichannelServiceType.CARD_ISSUE,
    OmnichannelServiceType.ATM_ISSUE,
    OmnichannelServiceType.MOBILE_BANKING,
    OmnichannelServiceType.INTERNET_BANKING
  ].includes(type);

  const isCustomerService = [
    OmnichannelServiceType.COMPLAINT,
    OmnichannelServiceType.INQUIRY,
    OmnichannelServiceType.FEEDBACK
  ].includes(type);

  // Try to find appropriate fallback service
  let searchTerms: string[] = [];

  if (isFinancial) {
    searchTerms = ['Transaction', 'Financial', 'Claim'];
  } else if (isTechnical) {
    searchTerms = ['Technical', 'IT Support', 'System'];
  } else if (isCustomerService) {
    searchTerms = ['Customer Service', 'General', 'Support'];
  } else {
    searchTerms = ['General', 'Other', 'Request'];
  }

  for (const term of searchTerms) {
    const service = await prisma.service.findFirst({
      where: {
        name: { contains: term, mode: 'insensitive' },
        isActive: true
      }
    });

    if (service) {
      return service;
    }
  }

  // Ultimate fallback: just get any active service
  return await prisma.service.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Get all available service mappings (for documentation/testing)
 */
export async function getAllServiceMappings(): Promise<ServiceMapping[]> {
  const mappings: ServiceMapping[] = [];

  for (const serviceType of Object.values(OmnichannelServiceType)) {
    const mapping = await mapServiceType(serviceType as OmnichannelServiceType);
    if (mapping) {
      mappings.push(mapping);
    }
  }

  return mappings;
}

/**
 * Calculate priority based on service type and metadata
 */
export function calculatePriority(
  serviceType: OmnichannelServiceType,
  metadata?: Record<string, any>
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const defaults = DEFAULT_MAPPINGS[serviceType];
  let priority = defaults?.defaultPriority || 'MEDIUM';

  // Upgrade priority based on specific conditions
  if (metadata) {
    // Financial amount-based priority
    if (metadata.claimAmount || metadata.disputeAmount) {
      const amount = metadata.claimAmount || metadata.disputeAmount;
      if (amount >= 100000000) return 'CRITICAL'; // >= 100M IDR
      if (amount >= 50000000) return 'HIGH';      // >= 50M IDR
      if (amount >= 10000000) return 'MEDIUM';    // >= 10M IDR
    }

    // ATM issues are always high priority minimum
    if (serviceType === OmnichannelServiceType.ATM_ISSUE) {
      if (metadata.multipleAtmsAffected) return 'CRITICAL';
      return priority === 'LOW' ? 'HIGH' : priority;
    }

    // Account access issues
    if (serviceType === OmnichannelServiceType.ACCOUNT_ISSUE) {
      if (metadata.accountLocked || metadata.cannotAccess) {
        return 'HIGH';
      }
    }

    // Urgency flag from omnichannel
    if (metadata.urgent === true || metadata.escalated === true) {
      // Upgrade priority by one level
      if (priority === 'LOW') return 'MEDIUM';
      if (priority === 'MEDIUM') return 'HIGH';
      if (priority === 'HIGH') return 'CRITICAL';
    }
  }

  return priority;
}