import { TicketPriority } from '@prisma/client';

interface PriorityValidationRule {
  priority: TicketPriority;
  maxPercentage: number; // Maximum allowed percentage for this priority
  requiresJustification: boolean; // Whether this priority requires justification
  autoDowngrade: boolean; // Whether to auto-downgrade if over limit
  restrictedRoles?: string[]; // Roles that can set this priority (if restricted)
}

interface PriorityValidationContext {
  userId: string;
  userRole: string;
  serviceId?: string;
  branchId?: string;
  description?: string;
  justification?: string;
}

interface PriorityValidationResult {
  isValid: boolean;
  suggestedPriority?: TicketPriority;
  errors: string[];
  warnings: string[];
  requiresJustification: boolean;
}

// Priority validation rules (configurable)
const PRIORITY_RULES: Record<TicketPriority, PriorityValidationRule> = {
  LOW: {
    priority: 'LOW',
    maxPercentage: 50, // Up to 50% can be low priority
    requiresJustification: false,
    autoDowngrade: false
  },
  MEDIUM: {
    priority: 'MEDIUM', 
    maxPercentage: 35, // Up to 35% can be medium priority
    requiresJustification: false,
    autoDowngrade: false
  },
  HIGH: {
    priority: 'HIGH',
    maxPercentage: 25, // Maximum 25% high priority
    requiresJustification: true,
    autoDowngrade: true,
    restrictedRoles: ['ADMIN', 'MANAGER', 'TECHNICIAN'] // Regular users can't set HIGH
  },
  URGENT: {
    priority: 'URGENT',
    maxPercentage: 4, // Maximum 4% urgent
    requiresJustification: true,
    autoDowngrade: true,
    restrictedRoles: ['ADMIN', 'MANAGER'] // Only admin/managers can set URGENT
  },
  CRITICAL: {
    priority: 'CRITICAL',
    maxPercentage: 1, // Maximum 1% critical
    requiresJustification: true,
    autoDowngrade: true,
    restrictedRoles: ['ADMIN'] // Only admins can set CRITICAL
  }
};

// Priority hierarchy for auto-downgrading
const PRIORITY_HIERARCHY: TicketPriority[] = ['CRITICAL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'];

// Keywords that might indicate high priority legitimately
const HIGH_PRIORITY_KEYWORDS = [
  'system down', 'outage', 'critical error', 'data loss', 'security breach',
  'production issue', 'customer impact', 'financial impact', 'compliance',
  'regulatory', 'audit', 'emergency', 'urgent fix needed'
];

class PriorityValidator {
  private prisma: any;

  constructor(prismaClient: any) {
    this.prisma = prismaClient;
  }

  /**
   * Validate if a priority can be set for a new ticket
   */
  async validatePriority(
    requestedPriority: TicketPriority, 
    context: PriorityValidationContext
  ): Promise<PriorityValidationResult> {
    const result: PriorityValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      requiresJustification: false
    };

    const rule = PRIORITY_RULES[requestedPriority];
    result.requiresJustification = rule.requiresJustification;

    // Check role restrictions
    if (rule.restrictedRoles && !rule.restrictedRoles.includes(context.userRole)) {
      result.isValid = false;
      result.errors.push(
        `Role '${context.userRole}' is not authorized to set '${requestedPriority}' priority. ` +
        `Allowed roles: ${rule.restrictedRoles.join(', ')}.`
      );
      result.suggestedPriority = this.suggestAlternativePriority(requestedPriority, context.userRole);
    }

    // Check justification requirement
    // Technicians, Managers and Admins are exempt from justification requirements for HIGH priority
    const exemptRoles = ['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];
    const isExemptFromJustification = exemptRoles.includes(context.userRole) && requestedPriority === 'HIGH';

    // Log exemption status for debugging
    console.log('[Priority Validation] Checking justification requirement:');
    console.log('  - User role:', context.userRole);
    console.log('  - Requested priority:', requestedPriority);
    console.log('  - Is exempt role?', exemptRoles.includes(context.userRole));
    console.log('  - Is HIGH priority?', requestedPriority === 'HIGH');
    console.log('  - Is exempt from justification?', isExemptFromJustification);
    console.log('  - Has justification?', !!context.justification?.trim());

    if (rule.requiresJustification && !context.justification?.trim() && !isExemptFromJustification) {
      result.isValid = false;
      result.errors.push(`'${requestedPriority}' priority requires justification.`);
    }

    // Check current distribution and limits (only for HIGH and above)
    if (['HIGH', 'URGENT', 'CRITICAL'].includes(requestedPriority)) {
      const distributionCheck = await this.checkCurrentDistribution(
        requestedPriority,
        context.branchId
      );
      
      if (!distributionCheck.withinLimit) {
        if (rule.autoDowngrade) {
          result.warnings.push(
            `${requestedPriority} priority usage is at ${distributionCheck.currentPercent}% ` +
            `(limit: ${rule.maxPercentage}%). Consider using lower priority.`
          );
          result.suggestedPriority = this.getNextLowerPriority(requestedPriority);
        } else {
          result.isValid = false;
          result.errors.push(
            `${requestedPriority} priority limit exceeded (${distributionCheck.currentPercent}% > ${rule.maxPercentage}%).`
          );
        }
      }
    }

    // Analyze content for priority hints (if description provided)
    if (context.description) {
      const contentAnalysis = this.analyzeContentForPriority(context.description);
      if (contentAnalysis.suggestedPriority !== requestedPriority) {
        result.warnings.push(
          `Based on content analysis, suggested priority is '${contentAnalysis.suggestedPriority}'. ` +
          `Reason: ${contentAnalysis.reason}`
        );
      }
    }

    return result;
  }

  /**
   * Get current priority distribution for validation
   */
  private async checkCurrentDistribution(
    priority: TicketPriority,
    branchId?: string
  ): Promise<{ withinLimit: boolean; currentPercent: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let whereClause: any = {
      createdAt: { gte: thirtyDaysAgo }
    };

    if (branchId) {
      whereClause.branchId = branchId;
    }

    // Get total tickets and priority-specific count
    const [totalCount, priorityCount] = await Promise.all([
      this.prisma.ticket.count({ where: whereClause }),
      this.prisma.ticket.count({ 
        where: { ...whereClause, priority } 
      })
    ]);

    const currentPercent = totalCount > 0 ? Math.round((priorityCount / totalCount) * 100) : 0;
    const rule = PRIORITY_RULES[priority];
    
    return {
      withinLimit: currentPercent <= rule.maxPercentage,
      currentPercent
    };
  }

  /**
   * Suggest alternative priority based on role restrictions
   */
  private suggestAlternativePriority(
    requestedPriority: TicketPriority,
    userRole: string
  ): TicketPriority {
    const currentIndex = PRIORITY_HIERARCHY.indexOf(requestedPriority);
    
    // Find the highest priority this role can set
    for (let i = currentIndex + 1; i < PRIORITY_HIERARCHY.length; i++) {
      const priority = PRIORITY_HIERARCHY[i];
      const rule = PRIORITY_RULES[priority];
      
      if (!rule.restrictedRoles || rule.restrictedRoles.includes(userRole)) {
        return priority;
      }
    }
    
    return 'LOW'; // Default fallback
  }

  /**
   * Get next lower priority in hierarchy
   */
  private getNextLowerPriority(priority: TicketPriority): TicketPriority {
    const currentIndex = PRIORITY_HIERARCHY.indexOf(priority);
    return PRIORITY_HIERARCHY[currentIndex + 1] || 'LOW';
  }

  /**
   * Analyze ticket content to suggest appropriate priority
   */
  private analyzeContentForPriority(
    description: string
  ): { suggestedPriority: TicketPriority; reason: string } {
    const lowerDescription = description.toLowerCase();
    
    // Check for high priority indicators
    for (const keyword of HIGH_PRIORITY_KEYWORDS) {
      if (lowerDescription.includes(keyword.toLowerCase())) {
        return {
          suggestedPriority: 'HIGH',
          reason: `Contains high-priority keyword: "${keyword}"`
        };
      }
    }

    // Check for routine/maintenance words
    const routineKeywords = [
      'routine', 'maintenance', 'update', 'upgrade', 'training', 
      'documentation', 'report', 'scheduled', 'planned'
    ];
    
    for (const keyword of routineKeywords) {
      if (lowerDescription.includes(keyword)) {
        return {
          suggestedPriority: 'LOW',
          reason: `Appears to be routine/maintenance work: "${keyword}"`
        };
      }
    }

    // Default to medium for unclear cases
    return {
      suggestedPriority: 'MEDIUM',
      reason: 'Content analysis suggests medium priority'
    };
  }

  /**
   * Get priority validation rules for frontend display
   */
  static getPriorityRules(): Record<TicketPriority, PriorityValidationRule> {
    return PRIORITY_RULES;
  }

  /**
   * Get priority guidelines text for users
   */
  static getPriorityGuidelines(): Record<TicketPriority, string> {
    return {
      LOW: 'Routine requests, documentation updates, scheduled maintenance. No immediate impact.',
      MEDIUM: 'Standard requests affecting individual users. Workarounds available.',
      HIGH: 'Issues affecting multiple users or critical systems. Limited workarounds. Requires justification.',
      URGENT: 'System outages or significant business impact. Multiple users affected. Manager approval required.',
      CRITICAL: 'Production systems down, data loss, security breaches. Executive approval required.'
    };
  }
}

export { PriorityValidator, type PriorityValidationContext, type PriorityValidationResult };
export default PriorityValidator;