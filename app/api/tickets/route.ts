import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { trackServiceUsage, updateFavoriteServiceUsage } from '@/lib/services/usage-tracker';
import { sanitizeSearchInput } from '@/lib/security';
import { sendTicketNotification } from '@/lib/services/email.service';
import { emitTicketCreated } from '@/lib/services/socket.service';
import { createNotification } from '@/lib/notifications';
import { getClientIp } from '@/lib/utils/ip-utils';
import { getDeviceInfo, formatDeviceInfo } from '@/lib/utils/device-utils';
import { PriorityValidator, type PriorityValidationContext } from '@/lib/priority-validation';
import { createAuditLog } from '@/lib/audit-logger';
import {
  isOmniEnabled,
  isTransactionClaimService,
  sendToOmniIfTransactionClaim,
  OmniTicketData
} from '@/lib/services/omni.service';
import { logger } from '@/lib/services/logging.service';
import { metrics } from '@/lib/services/metrics.service';

// Helper function to determine sort order
function getSortOrder(sortBy: string, sortOrder: string) {
  const order: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';
  
  switch (sortBy) {
    case 'ticketNumber':
      return { ticketNumber: order };
    case 'title':
      return { title: order };
    case 'priority':
      // Custom priority order: CRITICAL > HIGH > MEDIUM > LOW
      return [
        { priority: 'desc' as const },
        { createdAt: 'desc' as const }
      ];
    case 'status':
      return { status: order };
    case 'createdAt':
      return { createdAt: order };
    case 'updatedAt':
      return { updatedAt: order };
    default:
      return { createdAt: 'desc' as const };
  }
}

// Validation schema for creating tickets
const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  serviceId: z.string().min(1, 'Service is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY']).default('MEDIUM'),
  justification: z.string().optional(),
  category: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).default('INCIDENT'),
  issueClassification: z.enum([
    'HUMAN_ERROR', 'SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE',
    'SECURITY_INCIDENT', 'DATA_ISSUE', 'PROCESS_GAP', 'EXTERNAL_FACTOR'
  ]).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  branchId: z.string().optional(), // Accept branchId from client (for technicians/admins)
  fieldValues: z.array(z.object({
    fieldId: z.string(),
    value: z.string()
  })).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    content: z.string() // base64 encoded content
  })).optional(),
  // Security-related fields
  isConfidential: z.boolean().default(false),
  securityClassification: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  securityFindings: z.record(z.any()).optional() // JSON object for SOC findings
});

// GET /api/tickets - List tickets with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // Support multi-select filters (comma-separated values)
    const statusParam = searchParams.get('status');
    const status = statusParam ? statusParam.split(',').filter(Boolean) : null;
    const priorityParam = searchParams.get('priority');
    const priority = priorityParam ? priorityParam.split(',').filter(Boolean) : null;
    const assignedTo = searchParams.get('assignedTo');
    const mineAndAvailable = searchParams.get('mineAndAvailable');
    const branchId = searchParams.get('branchId');

    // New filter parameters for Assignment and Technician filters
    const assignment = searchParams.get('assignment'); // "assigned" or "unassigned"
    const technicianIdParam = searchParams.get('technicianId'); // comma-separated technician IDs
    const technicianIds = technicianIdParam ? technicianIdParam.split(',').filter(Boolean) : null;
    const page = parseInt(searchParams.get('page') || '1');
    const rawLimit = parseInt(searchParams.get('limit') || '10');
    // Cap limit at 200 for performance, but allow proper pagination for any number of tickets
    const limit = Math.min(rawLimit, 200);
    const rawSearch = searchParams.get('search');
    const search = rawSearch ? sanitizeSearchInput(rawSearch) : null;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeConfidential = searchParams.get('includeConfidential') === 'true';
    const securityClassification = searchParams.get('securityClassification');
    const requestStats = searchParams.get('stats') === 'true';
    const filter = searchParams.get('filter'); // 'my-tickets' or 'available-tickets'
    const categoryId = searchParams.get('categoryId'); // Category filter

    // Date range filters
    const createdAfter = searchParams.get('createdAfter');
    const createdBefore = searchParams.get('createdBefore');
    const updatedAfter = searchParams.get('updatedAfter');
    const updatedBefore = searchParams.get('updatedBefore');

    // SLA status filter
    const slaStatus = searchParams.get('slaStatus'); // 'within', 'at_risk', 'breached'

    // Define category IDs for special access checks (used throughout the function)
    const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
    const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';

    // Get user's branch and support group for filtering
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        branchId: true,
        role: true,
        supportGroupId: true,
        supportGroup: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    // Build where clause based on user role and filters
    const where: any = {};

    // Apply confidential ticket filtering based on user role
    if (['SECURITY_ANALYST', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      // ADMIN, SUPER_ADMIN, and Security Analysts can always see confidential tickets
      // Skip confidential filtering for these roles
    } else if (!includeConfidential) {
      // Regular users cannot see confidential tickets
      where.isConfidential = false;
    } else {
      // User explicitly requested confidential tickets - check permissions
      if (!['MANAGER', 'MANAGER_IT'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access confidential tickets' },
          { status: 403 }
        );
      }
    }

    // Apply role-based filtering (Security Analyst filtering already applied above)
    if (session.user.role === 'SECURITY_ANALYST') {
      // Security Analysts can ONLY see tickets from their support group
      // They cannot see tickets from other support groups
      if (userWithDetails?.supportGroupId) {
        // Security Analyst can only see tickets in their support group
        where.OR = [
          // Tickets assigned to them directly
          { assignedToId: session.user.id },
          // Tickets they created
          { createdById: session.user.id },
          // Tickets in their support group (via service)
          {
            service: {
              supportGroupId: userWithDetails.supportGroupId
            }
          },
          // Tickets directly assigned to their support group
          { supportGroupId: userWithDetails.supportGroupId }
        ];
      } else {
        // If no support group, only see their own tickets
        where.OR = [
          { createdById: session.user.id },
          { assignedToId: session.user.id }
        ];
      }
    } else if (session.user.role === 'TECHNICIAN') {
      // Check if this is a Call Center technician
      const isCallCenterTech = userWithDetails?.supportGroup?.code === 'CALL_CENTER';
      
      // Check if this is a Transaction Claims Support technician
      const isTransactionClaimsSupport = userWithDetails?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
      
      // Check if this is an IT Helpdesk technician
      const isITHelpdeskTech = userWithDetails?.supportGroup?.code === 'IT_HELPDESK';
      
      if (isCallCenterTech) {
        // Call Center technicians can see:
        // 1. Their own created tickets (all types)
        // 2. ALL tickets in Transaction Claims category
        where.OR = [
          // Their own tickets
          { createdById: session.user.id },
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
        ];
      } else if (isTransactionClaimsSupport) {
        // Transaction Claims Support group can see ALL transaction-related claims and disputes
        // Including ATM Claims
        // They have read-only access with ability to add comments
        where.OR = [
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } },
          // Include ATM Services category
          { categoryId: ATM_SERVICES_CATEGORY_ID },
          { service: { tier1CategoryId: ATM_SERVICES_CATEGORY_ID } }
        ];
      } else if (isITHelpdeskTech) {
        // IT Helpdesk technicians follow the same support group rules as regular technicians
        // They can ONLY see tickets in their own support group
        const technicianConditions: any[] = [
          { createdById: session.user.id }, // Their own tickets
          { assignedToId: session.user.id }  // Tickets assigned to them
        ];

        // Add support group visibility - see all tickets in their support group ONLY
        if (userWithDetails?.supportGroupId) {
          technicianConditions.push({
            service: {
              supportGroupId: userWithDetails.supportGroupId
            }
          });
          // Also include tickets directly assigned to their support group
          technicianConditions.push({
            supportGroupId: userWithDetails.supportGroupId
          });
        }

        where.OR = technicianConditions;
      } else {
        // Regular technicians can see:
        // 1. Tickets they created or are assigned to
        // 2. ALL tickets assigned to their support group (if they have one)
        // 3. All unassigned tickets if they don't have a support group
        // 4. For workbench available-tickets: only approved or no-approval-required tickets
        const technicianConditions: any[] = [
          { createdById: session.user.id }, // Their own tickets
          { assignedToId: session.user.id }  // Tickets assigned to them
        ];

        // Add support group visibility - see all tickets in their support group
        if (userWithDetails?.supportGroupId) {
          // If technician has a support group, they can see all tickets for that group
          technicianConditions.push({
            service: {
              supportGroupId: userWithDetails.supportGroupId
            }
          });
          // Also include tickets directly assigned to their support group (for system-generated tickets)
          technicianConditions.push({
            supportGroupId: userWithDetails.supportGroupId
          });
        } else {
          // If technician has NO support group, they can see ALL unassigned tickets
          // This ensures they can still work on tickets even without group assignment
          technicianConditions.push({
            AND: [
              { assignedToId: null }, // Unassigned tickets
              { status: { in: ['OPEN', 'IN_PROGRESS'] } } // Only active tickets
            ]
          });
        }

      // Only apply approval filtering for workbench available-tickets filter
      // NOT for general /tickets page
      if (filter === 'available-tickets') {
        // This is specifically for the workbench - apply strict approval filtering
        // Get services that require approval
        const servicesRequiringApproval = await prisma.service.findMany({
          where: { requiresApproval: true },
          select: { id: true }
        });
        const approvalServiceIds = servicesRequiringApproval.map(s => s.id);

        // For workbench available tickets, only show approved or no-approval-required
        technicianConditions.push({
          OR: [
            // Tickets that don't require approval
            {
              serviceId: {
                notIn: approvalServiceIds
              }
            },
            // Tickets that require approval and are approved
            {
              AND: [
                {
                  serviceId: {
                    in: approvalServiceIds
                  }
                },
                {
                  approvals: {
                    some: {
                      status: 'APPROVED'
                    }
                  }
                }
              ]
            }
          ]
        });
      }

      // Note: For general /tickets page, DO NOT add all unassigned tickets
      // Technicians should only see:
      // 1. Their own tickets (already in technicianConditions)
      // 2. Tickets assigned to them (already in technicianConditions)
      // 3. Tickets in their support group (already in technicianConditions)
      // This ensures proper support group filtering

        where.OR = technicianConditions;
      }
    } else if (session.user.role === 'MANAGER') {
      // Regular Managers can ONLY see tickets created by users from their own branch, excluding security analyst tickets
      if (userWithDetails?.branchId) {
        where.AND = [
          // Ticket must be from the manager's branch
          { branchId: userWithDetails.branchId },
          // Ticket creator must be from the same branch as the manager
          {
            createdBy: {
              branchId: userWithDetails.branchId,
              role: { not: 'SECURITY_ANALYST' }
            }
          }
        ];
      }
    } else if (session.user.role === 'MANAGER_IT' || session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
      // MANAGER_IT, ADMIN and SUPER_ADMIN see all tickets (no additional filtering)
      // MANAGER_IT can see all tickets including those claimed by other technicians
      // The where clause remains empty or only contains user-specified filters
    } else if (session.user.role === 'USER') {
      // Check if this is a Call Center user
      const isCallCenterUser = userWithDetails?.supportGroup?.code === 'CALL_CENTER';

      // Debug logging for Call Center users
      if (userWithDetails?.supportGroup?.code) {
        console.log('[TICKETS API] User support group:', {
          userId: session.user.id,
          role: session.user.role,
          supportGroupCode: userWithDetails.supportGroup.code,
          supportGroupName: userWithDetails.supportGroup.name,
          isCallCenterUser
        });
      }

      if (isCallCenterUser) {
        // Call Center users can see:
        // 1. Their own created tickets (all types)
        // 2. ALL tickets in Transaction Claims category (cmekrqi45001qhluspcsta20x)
        where.OR = [
          // Their own tickets
          { createdById: session.user.id },
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
        ];
        console.log('[TICKETS API] Call Center user - applying Transaction Claims category filter');
      } else {
        // Regular branch users can see all tickets from their own branch
        // This includes tickets created by any user in the same branch
        if (userWithDetails?.branchId) {
          where.branchId = userWithDetails.branchId;
        } else {
          // If user has no branch, only show their own tickets
          where.createdById = session.user.id;
        }
      }
    }
    // If role is not handled above, default to no access (shouldn't happen with valid roles)

    // Apply filters - support multi-select
    if (status && status.length > 0) {
      // Check if 'all' or 'ALL' is in the array
      const hasAll = status.some(s => s === 'all' || s === 'ALL');
      if (!hasAll) {
        // Filter to specific statuses
        where.status = status.length === 1 ? status[0] : { in: status };
      }
    } else {
      // Exclude rejected tickets by default when no specific status is requested
      where.status = { not: 'REJECTED' };
    }

    // Priority filter - support multi-select
    if (priority && priority.length > 0) {
      where.priority = priority.length === 1 ? priority[0] : { in: priority };
    }

    // Assignment filter - binary filter for assigned/unassigned
    // This filter takes precedence over the old assignedTo filter
    if (assignment === 'unassigned') {
      where.assignedToId = null;
    } else if (assignment === 'assigned') {
      where.assignedToId = { not: null };
    }

    // Technician filter - multi-select by technician IDs
    // If both assignment and technicianId filters are set, technicianId takes precedence
    if (technicianIds && technicianIds.length > 0) {
      // Override assignment filter if technicianId is specified
      where.assignedToId = technicianIds.length === 1
        ? technicianIds[0]
        : { in: technicianIds };
    }

    // Legacy assignedTo filter for backward compatibility (single ID)
    // Only apply if neither assignment nor technicianId filters are set
    if (assignedTo && !assignment && !technicianIds) {
      where.assignedToId = assignedTo;
    }

    // Legacy mineAndAvailable filter for backward compatibility
    if (mineAndAvailable && !assignment && !technicianIds) {
      // Override role-based filtering for mineAndAvailable
      where.OR = [
        { assignedToId: mineAndAvailable }, // My tickets
        { assignedToId: null } // Available tickets
      ];
    }

    if (branchId) where.branchId = branchId;
    if (securityClassification) {
      // Only allow security classification filtering for authorized roles
      if (!['ADMIN', 'SUPER_ADMIN', 'SECURITY_ANALYST', 'MANAGER', 'MANAGER_IT'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to filter by security classification' },
          { status: 403 }
        );
      }
      where.securityClassification = securityClassification;
    }

    // Handle technician workbench filters
    if (filter && ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user.role)) {
      // Check if this is a Call Center technician
      const isCallCenterTech = session.user.role === 'TECHNICIAN' &&
                              userWithDetails?.supportGroup?.code === 'CALL_CENTER';
      
      const isTransactionClaimsSupport = session.user.role === 'TECHNICIAN' &&
                                        userWithDetails?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
      
      if (filter === 'my-tickets') {
        if (isCallCenterTech || isTransactionClaimsSupport) {
          // Call Center: Show tickets they created OR assigned to them
          where.OR = [
            { createdById: session.user.id },
            { assignedToId: session.user.id }
          ];
        } else {
          // Regular technicians: Show tickets assigned to or claimed by current user
          where.assignedToId = session.user.id;
          // Clear any OR conditions set earlier for technicians
          delete where.OR;
        }
      } else if (filter === 'available-tickets') {
        if (isCallCenterTech || isTransactionClaimsSupport) {
          // Call Center: Only show unassigned transaction claims (excluding ATM Claims)
          where.AND = [
            { assignedToId: null },
            { status: 'OPEN' },
            {
              OR: [
                { service: { name: { contains: 'Claim' } } },
                { service: { name: { contains: 'claim' } } },
                { service: { name: { contains: 'Dispute' } } },
                { service: { name: { contains: 'dispute' } } },
                // Only include "Transaction" if it also contains "Claim" or "Error"
                { 
                  AND: [
                    { service: { name: { contains: 'Transaction' } } },
                    {
                      OR: [
                        { service: { name: { contains: 'Claim' } } },
                        { service: { name: { contains: 'Error' } } }
                      ]
                    }
                  ]
                }
              ]
            }
          ];
        } else {
          // Regular technicians: For available tickets: must be unassigned AND (approved if requires approval OR doesn't require approval)
          where.assignedToId = null;
          where.status = 'OPEN'; // Only show open tickets as available
          
          // Get services that require approval
          const approvalServices = await prisma.service.findMany({
            where: { requiresApproval: true },
            select: { id: true }
          });
          const approvalServiceIds = approvalServices.map(s => s.id);
          
          // Override the OR conditions to ensure proper approval filtering
          where.OR = [
            // Tickets that don't require approval
            {
              serviceId: {
                notIn: approvalServiceIds
              }
            },
            // Tickets that require approval AND are approved
            {
              AND: [
                {
                  serviceId: {
                    in: approvalServiceIds
                  }
                },
                {
                  approvals: {
                    some: {
                      status: 'APPROVED'
                    }
                  }
                }
              ]
            }
          ];
        }
        
        // If technician has a support group, also filter by that
        // BUT skip this for Call Center and Transaction Claims Support technicians as they have their own filtering
        if (userWithDetails?.supportGroupId && !isCallCenterTech && !isTransactionClaimsSupport) {
          where.service = {
            supportGroupId: userWithDetails.supportGroupId
          };
        }
      }
    }

    // Category filter - check ALL possible locations:
    // 1. ticket.categoryId (ticket's direct category field)
    // 2. service.tier1CategoryId (service's NEW 3-tier system)
    // 3. service.categoryId (service's OLD ServiceCategory system)
    // IMPORTANT: The categoryId passed is from the NEW Category table, but we need to also
    // check for ServiceCategories with the same NAME (they have different IDs)
    if (categoryId) {
      // First, get the category name to find matching ServiceCategory
      const selectedCategory = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { name: true }
      });

      // Find ServiceCategory with the same name (if exists)
      const matchingServiceCategory = selectedCategory
        ? await prisma.serviceCategory.findFirst({
            where: {
              name: selectedCategory.name,
              isActive: true
            },
            select: { id: true }
          })
        : null;

      const categoryFilter = {
        OR: [
          { categoryId: categoryId },  // Direct ticket field (NEW Category ID)
          { service: { tier1CategoryId: categoryId } },  // Service 3-tier categorization (NEW Category ID)
          { service: { categoryId: categoryId } },  // Service old category (try NEW Category ID first)
          ...(matchingServiceCategory
            ? [{ service: { categoryId: matchingServiceCategory.id } }]  // Service old category (OLD ServiceCategory ID)
            : [])
        ]
      };

      // Special handling for Call Center users filtering by Transaction Claims
      // Since they already have access to ALL Transaction Claims tickets via role-based filtering,
      // we don't need to apply category filter - it's already covered
      const isCallCenterUser = session.user.role === 'USER' &&
                               userWithDetails?.supportGroup?.code === 'CALL_CENTER';
      const isFilteringTransactionClaims = categoryId === TRANSACTION_CLAIMS_CATEGORY_ID;

      const isCallCenterTech = session.user.role === 'TECHNICIAN' &&
                              userWithDetails?.supportGroup?.code === 'CALL_CENTER';

      // Skip category filter for Call Center users/techs filtering their own category
      // Their role-based OR already grants them full access to these tickets
      if ((isCallCenterUser || isCallCenterTech) && isFilteringTransactionClaims) {
        console.log('[TICKETS API] Call Center user filtering Transaction Claims - using existing role-based access');
        // Do nothing - role-based OR already handles this
      } else {
        // For all other cases, apply category filter normally
        // Combine with existing WHERE conditions using AND
        if (where.OR) {
          // Move existing OR to AND, then add category filter
          const existingOR = where.OR;
          where.AND = where.AND || [];
          if (!Array.isArray(where.AND)) {
            where.AND = [where.AND];
          }
          where.AND.push({ OR: existingOR }, categoryFilter);
          delete where.OR;
        } else if (where.AND) {
          // Already has AND conditions, just append
          if (Array.isArray(where.AND)) {
            where.AND.push(categoryFilter);
          } else {
            where.AND = [where.AND, categoryFilter];
          }
        } else {
          // No existing conditions, create AND with just the category filter
          where.AND = [categoryFilter];
        }
      }
    }

    // Date range filters
    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        // Include the entire day by setting to end of day
        const endDate = new Date(createdBefore);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    if (updatedAfter || updatedBefore) {
      where.updatedAt = {};
      if (updatedAfter) {
        where.updatedAt.gte = new Date(updatedAfter);
      }
      if (updatedBefore) {
        // Include the entire day by setting to end of day
        const endDate = new Date(updatedBefore);
        endDate.setHours(23, 59, 59, 999);
        where.updatedAt.lte = endDate;
      }
    }

    if (search) {
      // Combine search conditions with existing role-based filters
      // Search across multiple fields for better discoverability
      const searchConditions = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { service: { name: { contains: search, mode: 'insensitive' } } },
        { branch: { name: { contains: search, mode: 'insensitive' } } },
        { branch: { code: { contains: search, mode: 'insensitive' } } },
        { createdBy: { name: { contains: search, mode: 'insensitive' } } },
        { createdBy: { email: { contains: search, mode: 'insensitive' } } },
        { assignedTo: { name: { contains: search, mode: 'insensitive' } } },
      ];

      // If there are existing OR conditions (from role-based filtering),
      // we need to combine them with search using AND
      if (where.OR) {
        const existingConditions = where.OR;
        where.AND = [
          { OR: existingConditions }, // Role-based visibility
          { OR: searchConditions }    // Search filter
        ];
        delete where.OR; // Remove the OR since we're using AND now
      } else {
        // If no existing OR conditions, just add search conditions
        where.OR = searchConditions;
      }
    }

    // If stats are requested, return stats instead of tickets
    if (requestStats) {
      // For technician workbench stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Calculate stats specific to the user
      const [assignedCount, unassignedCount, inProgressCount, resolvedTodayCount] = await Promise.all([
        // Tickets assigned to current user
        prisma.ticket.count({
          where: {
            assignedToId: session.user.id,
            status: {
              notIn: ['CLOSED', 'RESOLVED', 'REJECTED', 'CANCELLED']
            }
          }
        }),
        // Available (unassigned) tickets
        prisma.ticket.count({
          where: {
            assignedToId: null,
            status: 'OPEN'
          }
        }),
        // In Progress tickets (assigned to user)
        prisma.ticket.count({
          where: {
            assignedToId: session.user.id,
            status: 'IN_PROGRESS'
          }
        }),
        // Tickets resolved today by this user
        prisma.ticket.count({
          where: {
            assignedToId: session.user.id,
            status: 'RESOLVED',
            updatedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        })
      ]);

      // Also calculate general stats
      const [openCount, pendingCount, approvedCount, generalInProgressCount, onHoldCount, resolvedCount, closedCount, rejectedCount, cancelledCount] = await Promise.all([
        // Open tickets count
        prisma.ticket.count({
          where: {
            status: 'OPEN'
          }
        }),
        // Pending tickets count (PENDING + PENDING_APPROVAL)
        prisma.ticket.count({
          where: {
            status: {
              in: ['PENDING', 'PENDING_APPROVAL']
            }
          }
        }),
        // Approved tickets count
        prisma.ticket.count({
          where: {
            status: 'APPROVED'
          }
        }),
        // In Progress tickets count
        prisma.ticket.count({
          where: {
            status: 'IN_PROGRESS'
          }
        }),
        // On Hold tickets count (PENDING_VENDOR only)
        prisma.ticket.count({
          where: {
            status: 'PENDING_VENDOR'
          }
        }),
        // Resolved tickets count
        prisma.ticket.count({
          where: {
            status: 'RESOLVED'
          }
        }),
        // Closed tickets count
        prisma.ticket.count({
          where: {
            status: 'CLOSED'
          }
        }),
        // Rejected tickets count
        prisma.ticket.count({
          where: {
            status: 'REJECTED'
          }
        }),
        // Cancelled tickets count
        prisma.ticket.count({
          where: {
            status: 'CANCELLED'
          }
        })
      ]);

      return NextResponse.json({
        stats: {
          // Technician-specific stats
          assigned: assignedCount,
          unassigned: unassignedCount,
          inProgress: inProgressCount,
          resolvedToday: resolvedTodayCount,
          // General stats
          open: openCount,
          pending: pendingCount,
          approved: approvedCount,
          onHold: onHoldCount,
          resolved: resolvedCount,
          closed: closedCount,
          rejected: rejectedCount,
          cancelled: cancelledCount,
          generalInProgress: generalInProgressCount
        }
      });
    }

    // IMPORTANT: Exclude ATM Claim tickets from /tickets and /workbench pages
    // ATM Claims should only be accessed through /branch/atm-claims
    // This prevents users from accessing ATM claims through the wrong detail page
    if (!where.AND) {
      where.AND = [];
    } else if (!Array.isArray(where.AND)) {
      where.AND = [where.AND];
    }

    // Only exclude ATM Claims for regular users and technicians
    // Transaction Claims Support and Call Center users can still see ATM Claims
    const isTransactionClaimsSupportUser = userWithDetails?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
    const isCallCenterUserForATM = userWithDetails?.supportGroup?.code === 'CALL_CENTER';

    console.log('[TICKETS API] ATM Claim exclusion check:', {
      role: session.user.role,
      supportGroupCode: userWithDetails?.supportGroup?.code,
      isTransactionClaimsSupportUser,
      isCallCenterUserForATM,
      willExcludeATMClaims: !isTransactionClaimsSupportUser && !isCallCenterUserForATM
    });

    // Exclude ATM Claims for everyone except Transaction Claims Support and Call Center
    if (!isTransactionClaimsSupportUser && !isCallCenterUserForATM) {
      where.AND.push({
        NOT: {
          service: {
            name: {
              contains: 'ATM Claim'
            }
          }
        }
      });
    }

    // Debug logging for WHERE clause structure
    console.log('[TICKETS API] Final WHERE clause:', JSON.stringify(where, null, 2));
    console.log('[TICKETS API] Category filter applied:', !!categoryId);
    console.log('[TICKETS API] Category ID:', categoryId);

    const [allTickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          service: {
            select: {
              name: true,
              slaHours: true,
              requiresApproval: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          createdBy: { select: { id: true, name: true, email: true, branchId: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
          approvals: {
            select: {
              id: true,
              status: true,
              createdAt: true,
              approver: {
                select: {
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: { select: { comments: true } }
        },
        orderBy: getSortOrder(sortBy, sortOrder),
        skip: (page - 1) * limit,
        take: limit // Use the requested limit for proper pagination
      }),
      prisma.ticket.count({ where })
    ]);

    // Apply SLA filter if requested (post-query filter since SLA is calculated)
    let tickets = allTickets;
    if (slaStatus) {
      const now = new Date();
      tickets = allTickets.filter(ticket => {
        // Skip if no SLA defined or ticket is closed/resolved
        if (!ticket.service?.slaHours || ['CLOSED', 'RESOLVED'].includes(ticket.status)) {
          return slaStatus === 'within'; // Consider completed tickets as "within SLA"
        }

        const createdAt = new Date(ticket.createdAt);
        const slaDeadline = new Date(createdAt.getTime() + (ticket.service.slaHours * 60 * 60 * 1000));
        const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        const percentRemaining = hoursRemaining / ticket.service.slaHours;

        if (slaStatus === 'breached') {
          return hoursRemaining <= 0; // Past deadline
        } else if (slaStatus === 'at_risk') {
          return hoursRemaining > 0 && percentRemaining <= 0.25; // Less than 25% time remaining
        } else if (slaStatus === 'within') {
          return percentRemaining > 0.25; // More than 25% time remaining
        }
        return true;
      });
    }

    return NextResponse.json({
      tickets,
      total, // Total tickets for pagination
      pages: Math.ceil(total / limit), // Total pages
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create new ticket
export async function POST(request: NextRequest) {
  // Declare session outside try block so it's accessible in catch block
  let session: Awaited<ReturnType<typeof auth>> | null = null;

  try {
    session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // MANAGER role cannot create tickets - they can only approve them
    if (session.user.role === 'MANAGER') {
      return NextResponse.json(
        { error: 'Managers are not allowed to create tickets. Managers can only approve tickets.' },
        { status: 403 }
      );
    }

    // Debug logging for session
    console.log('Session user ID:', session.user.id);
    console.log('Session user:', JSON.stringify(session.user, null, 2));
    
    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true }
    });
    console.log('User exists in DB:', userExists);
    
    if (!userExists) {
      console.error('User not found in database:', session.user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    const body = await request.json();
    
    // Extract device information for troubleshooting
    const deviceInfo = getDeviceInfo(request);
    const clientIp = getClientIp(request);
    const deviceDescription = formatDeviceInfo(deviceInfo);
    
    // Log device info for troubleshooting client issues
    console.log('Ticket creation attempt:', {
      userId: session.user.id,
      userEmail: session.user.email,
      clientIp,
      device: deviceDescription,
      browser: `${deviceInfo.browser.name} ${deviceInfo.browser.version}`,
      os: `${deviceInfo.os.name} ${deviceInfo.os.version}`,
      deviceType: deviceInfo.device.type,
      isSupported: deviceInfo.compatibility.isSupported,
      warnings: deviceInfo.compatibility.warnings
    });
    
    // Check if browser is compatible
    if (!deviceInfo.compatibility.isSupported) {
      console.error('Unsupported browser detected:', {
        user: session.user.email,
        device: deviceDescription,
        warnings: deviceInfo.compatibility.warnings
      });
      
      // Still allow ticket creation but log the issue
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'UNSUPPORTED_BROWSER_TICKET_ATTEMPT',
          entity: 'Ticket',
          entityId: 'pre-creation',
          newValues: {
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            device: deviceInfo.device,
            warnings: deviceInfo.compatibility.warnings,
            clientIp
          },
          ipAddress: clientIp,
          userAgent: deviceInfo.userAgent
        }
      });
    }
    
    // Debug logging for attachments
    console.log('Received ticket data:', {
      ...body,
      attachments: body.attachments?.map((a: any) => ({
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.size,
        contentLength: a.content?.length || 0
      }))
    });
    
    const validatedData = createTicketSchema.parse(body);

    // Log request details for debugging
    console.log('[TICKET CREATION] Request data:', {
      serviceId: validatedData.serviceId,
      priority: validatedData.priority,
      userId: session.user.id,
      userRole: session.user.role
    });

    // Initialize priority validator
    const priorityValidator = new PriorityValidator(prisma);
    
    // Get user's full information including role for priority validation
    const userForPriorityValidation = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    // Log the user's role for debugging
    console.log('[Priority Validation] User role from DB:', userForPriorityValidation?.role);
    console.log('[Priority Validation] Requested priority:', validatedData.priority);

    // Validate priority with context - use role from database, not session
    const priorityValidationContext: PriorityValidationContext = {
      userId: session.user.id,
      userRole: userForPriorityValidation?.role || 'USER', // Use role from DB
      serviceId: validatedData.serviceId,
      branchId: userForPriorityValidation?.branchId || undefined,
      description: validatedData.description,
      justification: validatedData.justification
    };

    const priorityValidation = await priorityValidator.validatePriority(
      validatedData.priority,
      priorityValidationContext
    );

    // Handle priority validation results
    let finalPriority = validatedData.priority;
    const priorityWarnings: string[] = [];

    if (!priorityValidation.isValid) {
      // Priority validation failed - use suggested priority or default
      if (priorityValidation.suggestedPriority) {
        finalPriority = priorityValidation.suggestedPriority;
        priorityWarnings.push(
          `Priority downgraded from ${validatedData.priority} to ${finalPriority}: ${priorityValidation.errors.join(', ')}`
        );
      } else {
        // No suggestion available, return error
        return NextResponse.json({
          error: 'Priority validation failed',
          details: priorityValidation.errors,
          requiresJustification: priorityValidation.requiresJustification
        }, { status: 400 });
      }
    }

    // Add any priority warnings to be logged
    if (priorityValidation.warnings.length > 0) {
      priorityWarnings.push(...priorityValidation.warnings);
    }

    // Validate that finalPriority is a valid TicketPriority enum value
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY'];
    if (!finalPriority || !validPriorities.includes(finalPriority)) {
      console.error('Invalid priority value detected:', finalPriority);
      // Fallback to HIGH if priority is invalid (as requested by user)
      finalPriority = 'HIGH';
      priorityWarnings.push('Priority was invalid or missing, defaulting to HIGH');
    }

    // Auto-mark tickets as confidential for Security Analysts
    let isConfidential = validatedData.isConfidential;
    let securityClassification = validatedData.securityClassification;
    let securityFindings = validatedData.securityFindings;

    if (session.user.role === 'SECURITY_ANALYST') {
      // All tickets created by Security Analysts are automatically confidential
      isConfidential = true;
      // If no security classification is set, default to HIGH for security analyst tickets
      if (!securityClassification) {
        securityClassification = 'HIGH';
      }
    }

    // Check permissions for confidential tickets and security fields
    if (isConfidential || securityClassification || securityFindings) {
      if (!['ADMIN', 'SECURITY_ANALYST', 'MANAGER', 'MANAGER_IT'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create confidential or security-classified tickets' },
          { status: 403 }
        );
      }
    }

    // Get service to check if it requires approval
    const serviceToCheck = await prisma.service.findUnique({
      where: { id: validatedData.serviceId },
      select: { requiresApproval: true }
    });
    
    // Determine initial status based on service approval requirement and user role
    let initialStatus: 'OPEN' | 'PENDING_APPROVAL' = 'OPEN';
    if (serviceToCheck?.requiresApproval) {
      // Manager, Manager IT, and Technician created tickets are auto-approved, so status is OPEN
      // Others need approval, so status starts as PENDING_APPROVAL
      initialStatus = (['MANAGER', 'MANAGER_IT', 'TECHNICIAN'].includes(session.user.role)) ? 'OPEN' : 'PENDING_APPROVAL';
    }

    // Handle file attachments
    const attachmentData: any[] = [];
    if (validatedData.attachments && validatedData.attachments.length > 0) {
      for (const attachment of validatedData.attachments) {
        attachmentData.push({
          filename: attachment.filename,
          originalName: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          path: attachment.content // Store base64 content directly as "path" for now
        });
      }
    }

    // Get service details to check if it uses field templates
    const service = await prisma.service.findUnique({
      where: { id: validatedData.serviceId },
      include: {
        fields: true,
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 400 });
    }

    // Process field values - need to handle both regular fields and field templates
    const processedFieldValues: any[] = [];
    const processedFieldIds = new Set<string>(); // Track processed fields to avoid duplicates
    console.log('Processing field values:', validatedData.fieldValues);
    console.log('Service has fields:', service.fields?.length || 0);
    console.log('Service has field templates:', service.fieldTemplates?.length || 0);
    
    if (validatedData.fieldValues && validatedData.fieldValues.length > 0) {
      for (const fieldValue of validatedData.fieldValues) {
        console.log('Processing field value:', fieldValue);
        
        // Skip if we've already processed this field
        if (processedFieldIds.has(fieldValue.fieldId)) {
          console.log(`Skipping duplicate field: ${fieldValue.fieldId}`);
          continue;
        }
        
        // Check if this is a regular service field
        const isServiceField = service.fields.some(f => f.id === fieldValue.fieldId);
        console.log(`Field ${fieldValue.fieldId} is service field:`, isServiceField);
        
        if (isServiceField) {
          // Regular service field - save as is
          processedFieldValues.push(fieldValue);
          processedFieldIds.add(fieldValue.fieldId);
        } else {
          // Check if this is a field template
          const fieldTemplate = service.fieldTemplates.find(
            ft => ft.fieldTemplate.id === fieldValue.fieldId
          );
          console.log(`Field ${fieldValue.fieldId} is field template:`, !!fieldTemplate);
          
          if (fieldTemplate) {
            // For field templates, we need to create a service field first
            // or find an existing one for this template
            let serviceField = await prisma.serviceField.findFirst({
              where: {
                serviceId: service.id,
                name: fieldTemplate.fieldTemplate.name
              }
            });

            if (!serviceField) {
              // Create a service field from the template
              console.log('Creating service field from template:', fieldTemplate.fieldTemplate.name);
              serviceField = await prisma.serviceField.create({
                data: {
                  serviceId: service.id,
                  name: fieldTemplate.fieldTemplate.name,
                  label: fieldTemplate.fieldTemplate.label,
                  type: fieldTemplate.fieldTemplate.type,
                  isRequired: fieldTemplate.isRequired ?? fieldTemplate.fieldTemplate.isRequired,
                  isUserVisible: fieldTemplate.isUserVisible,
                  placeholder: fieldTemplate.fieldTemplate.placeholder,
                  helpText: fieldTemplate.helpText || fieldTemplate.fieldTemplate.helpText,
                  defaultValue: fieldTemplate.defaultValue || fieldTemplate.fieldTemplate.defaultValue,
                  options: fieldTemplate.fieldTemplate.options || undefined,
                  validation: fieldTemplate.fieldTemplate.validation || undefined,
                  order: fieldTemplate.order,
                  isActive: true
                }
              });
              console.log('Created service field:', serviceField.id);
            } else {
              console.log('Found existing service field:', serviceField.id);
            }

            // Check for duplicate before adding
            if (!processedFieldIds.has(serviceField.id)) {
              // Use the service field ID instead of the template ID
              processedFieldValues.push({
                fieldId: serviceField.id,
                value: fieldValue.value
              });
              processedFieldIds.add(serviceField.id);
              console.log('Added processed field value with serviceFieldId:', serviceField.id);
            } else {
              console.log('Skipping duplicate serviceFieldId:', serviceField.id);
            }
          } else {
            console.warn('Field ID not found in service fields or templates:', fieldValue.fieldId);
          }
        }
      }
    }
    
    console.log('Final processed field values:', processedFieldValues);

    // Get user's branch for the ticket
    // IMPORTANT: Tickets are created with the user's CURRENT branch at the time of creation.
    // This branchId is stored permanently with the ticket and will NOT change if the user
    // later moves to a different branch. The ticket remains associated with the branch
    // where it was created.
    const userWithBranch = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true }
    });

    // Check for ATM claim auto-routing
    // Use branchId from request if provided (for technicians/admins), otherwise use user's branch
    let targetBranchId = validatedData.branchId || userWithBranch?.branchId;
    // Auto-assign ticket to the creator only if they are a technician
    let assignedToId: string | null = session.user.role === 'TECHNICIAN' ? session.user.id : null;
    let autoRoutingComment: string | null = null;

    // Check if this is an ATM claim service (Penarikan Tunai Internal)
    if (service.name.includes('Penarikan Tunai Internal') || service.name.includes('ATM Claim')) {
      console.log('ATM Claim detected - checking for auto-routing...');
      
      // Find ATM code field value
      const atmCodeFieldValue = processedFieldValues.find(fv => {
        const field = service.fields.find(f => f.id === fv.fieldId);
        return field && (field.name === 'atm_code' || field.label.toLowerCase().includes('kode atm'));
      });

      if (atmCodeFieldValue) {
        console.log('ATM code found:', atmCodeFieldValue.value);
        
        // Lookup ATM to get owner branch
        const atm = await prisma.aTM.findUnique({
          where: { code: atmCodeFieldValue.value },
          include: { branch: true }
        });

        if (atm) {
          console.log('ATM found, owner branch:', atm.branch.name);
          
          // Override branch assignment to ATM owner branch
          targetBranchId = atm.branchId;
          
          // Check if it's the same branch or different
          if (atm.branchId === userWithBranch?.branchId) {
            autoRoutingComment = `ATM ${atm.code} milik cabang sendiri (${atm.branch.name}) - dapat langsung diproses`;
          } else {
            autoRoutingComment = `Auto-routed ke ${atm.branch.name} sebagai pemilik ATM ${atm.code}`;
            
            // Find manager of owner branch for assignment
            const branchManager = await prisma.user.findFirst({
              where: {
                branchId: atm.branchId,
                role: 'MANAGER',
                isActive: true
              }
            });
            
            if (branchManager) {
              assignedToId = branchManager.id;
              console.log('Assigned to manager:', branchManager.name);
            }
          }
        }
      }
    }

    // Create ticket with processed field values and attachments within a transaction
    const ticket = await prisma.$transaction(async (tx) => {
      // Generate ticket number - get max ticket number and increment
      // Use raw query to get the maximum numeric ticket number
      const maxResult = await tx.$queryRaw<[{ maxNum: bigint | null }]>`
        SELECT MAX(CAST(NULLIF(REGEXP_REPLACE("ticketNumber", '[^0-9]', '', 'g'), '') AS BIGINT)) as "maxNum"
        FROM "tickets"
      `;

      const maxTicketNumber = maxResult[0]?.maxNum ? Number(maxResult[0].maxNum) : 0;
      const ticketNumber = String(maxTicketNumber + 1);

      const createdTicket = await tx.ticket.create({
      data: {
        ticketNumber,
        title: validatedData.title,
        description: validatedData.description,
        serviceId: validatedData.serviceId,
        category: validatedData.category,
        issueClassification: validatedData.issueClassification,
        categoryId: validatedData.categoryId,
        subcategoryId: validatedData.subcategoryId,
        itemId: validatedData.itemId,
        priority: finalPriority,
        status: initialStatus,
        createdById: session.user.id,
        branchId: targetBranchId, // Use target branch (either user's or ATM owner's)
        assignedToId: assignedToId, // Auto-assign to technician creator (or branch manager for ATM claims)
        // Security fields (using processed values for Security Analysts)
        isConfidential: isConfidential,
        securityClassification: securityClassification,
        securityFindings: securityFindings,
        fieldValues: processedFieldValues.length > 0 ? {
          create: processedFieldValues
        } : undefined,
        attachments: attachmentData.length > 0 ? {
          create: attachmentData
        } : undefined
      },
      include: {
        service: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true } }
          }
        },
        attachments: true
      }
      });

      // Add auto-routing comment if applicable
      if (autoRoutingComment) {
        await tx.ticketComment.create({
          data: {
            ticketId: createdTicket.id,
            userId: session.user.id,
            content: autoRoutingComment,
            isInternal: true
          }
        });
      }

      // Create audit log with device information
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          ticketId: createdTicket.id,
          action: 'CREATE_TICKET',
          entity: 'Ticket',
          entityId: createdTicket.id,
          newValues: {
            ticketNumber: createdTicket.ticketNumber,
            title: createdTicket.title,
            priority: createdTicket.priority,
            originalPriority: validatedData.priority,
            priorityValidation: {
              finalPriority: finalPriority,
              originalPriority: validatedData.priority,
              isValid: priorityValidation.isValid,
              warnings: priorityWarnings,
              requiresJustification: priorityValidation.requiresJustification
            },
            serviceId: createdTicket.serviceId,
            device: {
              browser: `${deviceInfo.browser.name} ${deviceInfo.browser.version}`,
              os: `${deviceInfo.os.name} ${deviceInfo.os.version}`,
              deviceType: deviceInfo.device.type,
              isSupported: deviceInfo.compatibility.isSupported,
              warnings: deviceInfo.compatibility.warnings
            },
            clientIp
          },
          ipAddress: clientIp,
          userAgent: deviceInfo.userAgent
        }
      });

      return createdTicket;
    });

    // Check if service requires approval and create approval entry
    const serviceDetails = await prisma.service.findUnique({
      where: { id: validatedData.serviceId },
      select: { requiresApproval: true }
    });

    if (serviceDetails?.requiresApproval) {
      // Check if creator is a manager, manager IT, or technician - auto-approve their tickets
      if (['MANAGER', 'MANAGER_IT', 'TECHNICIAN'].includes(session.user.role)) {
        const approvalReason = session.user.role === 'MANAGER'
          ? 'Auto-approved: Manager-created ticket'
          : session.user.role === 'MANAGER_IT'
          ? 'Auto-approved: Manager IT-created ticket'
          : 'Auto-approved: Technician-created ticket';
          
        await prisma.ticketApproval.create({
          data: {
            ticketId: ticket.id,
            approverId: session.user.id,
            status: 'APPROVED',
            reason: approvalReason
          }
        });
        
        // Update ticket status to reflect approval
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: 'OPEN' }
        });
      } else {
        // For non-managers, create pending approval
        // Find a manager from the same branch to approve
        const branchManager = await prisma.user.findFirst({
          where: {
            branchId: targetBranchId,
            role: 'MANAGER',
            isActive: true
          }
        });

        if (branchManager) {
          await prisma.ticketApproval.create({
            data: {
              ticketId: ticket.id,
              approverId: branchManager.id,
              status: 'PENDING',
              reason: null
            }
          });
        }
      }
    }

    // Check if service has task templates and create tasks automatically
    const taskTemplates = await prisma.taskTemplate.findMany({
      where: { serviceId: validatedData.serviceId },
      include: {
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    // Create tasks from all task templates for this service
    if (taskTemplates.length > 0) {
      const tasksToCreate: { ticketId: string; taskTemplateItemId: string; status: 'PENDING' }[] = [];
      
      for (const template of taskTemplates) {
        for (const item of template.items) {
          tasksToCreate.push({
            ticketId: ticket.id,
            taskTemplateItemId: item.id,
            status: 'PENDING'
          });
        }
      }

      if (tasksToCreate.length > 0) {
        await prisma.ticketTask.createMany({
          data: tasksToCreate
        });
      }
    }

    // Track service usage for analytics (run in background)
    // This will make the service appear in "Recently Used" section
    trackServiceUsage(
      validatedData.serviceId,
      session.user.id,
      ticket.id,
      userWithBranch?.branchId || undefined
    );

    // Update favorite service usage if it exists (run in background)
    // This only updates lastUsedAt for already-favorited services
    updateFavoriteServiceUsage(validatedData.serviceId, session.user.id);

    // Get full ticket details for notifications
    const fullTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        service: true,
        createdBy: true,
        assignedTo: true,
        branch: true
      }
    });

    // Create audit log for ticket creation
    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE_TICKET',
      entity: 'TICKET',
      entityId: ticket.id,
      ticketId: ticket.id,
      newValues: {
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        service: fullTicket?.service?.name,
        priority: ticket.priority,
        status: ticket.status,
        branch: fullTicket?.branch?.name,
        assignedTo: fullTicket?.assignedTo?.name || null
      },
      request
    });

    // Send email notification for ticket creation
    sendTicketNotification(ticket.id, 'ticket_created').catch(err =>
      console.error('Failed to send email notification:', err)
    );

    // Emit socket event for real-time updates
    emitTicketCreated(fullTicket).catch(err =>
      console.error('Failed to emit socket event:', err)
    );

    // Create notification for assigned technician if ticket is assigned
    if (ticket.assignedToId && ticket.assignedToId !== session.user.id) {
      await createNotification({
        userId: ticket.assignedToId,
        type: 'TICKET_ASSIGNED',
        title: `New Ticket #${ticket.ticketNumber} Assigned`,
        message: `You have been assigned to: ${ticket.title}`,
        data: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          ticketTitle: ticket.title
        }
      }).catch(err => console.error('Failed to create notification:', err));
    }

    // Send to Omni/Sociomile if this is a Transaction Claims ticket
    if (isOmniEnabled()) {
      try {
        // Get service with tier1CategoryId for checking if it's a Transaction Claims ticket
        const serviceWithCategory = await prisma.service.findUnique({
          where: { id: validatedData.serviceId },
          select: {
            name: true,
            tier1CategoryId: true,
            categoryId: true
          }
        });

        // Check if it's a Transaction Claims ticket
        if (isTransactionClaimService(
          serviceWithCategory?.categoryId || validatedData.categoryId,
          serviceWithCategory?.tier1CategoryId
        )) {
          // Get field values for the ticket
          const ticketWithFields = await prisma.ticket.findUnique({
            where: { id: ticket.id },
            include: {
              fieldValues: {
                include: {
                  field: { select: { name: true } }
                }
              },
              branch: { select: { code: true, name: true } },
              createdBy: { select: { name: true, email: true } }
            }
          });

          if (ticketWithFields) {
            // Extract customer info from field values
            const getFieldValue = (fieldName: string) => {
              const field = ticketWithFields.fieldValues?.find(
                fv => fv.field.name.toLowerCase() === fieldName.toLowerCase() ||
                      fv.field.name.toLowerCase().replace(/_/g, '') === fieldName.toLowerCase().replace(/_/g, '')
              );
              return field?.value || '';
            };

            const omniTicketData: OmniTicketData = {
              ticketNumber: ticketWithFields.ticketNumber,
              title: ticketWithFields.title,
              description: ticketWithFields.description,
              createdAt: ticketWithFields.createdAt,
              customerName: getFieldValue('customer_name') || ticketWithFields.createdBy?.name,
              customerEmail: getFieldValue('customer_email') || ticketWithFields.createdBy?.email,
              customerPhone: getFieldValue('customer_phone'),
              customerAccount: getFieldValue('customer_account'),
              cardLast4: getFieldValue('card_last_4'),
              transactionAmount: parseFloat(getFieldValue('transaction_amount') || getFieldValue('nominal') || '0'),
              transactionRef: getFieldValue('transaction_ref'),
              claimType: getFieldValue('claim_type'),
              claimDescription: getFieldValue('claim_description'),
              atmCode: getFieldValue('atm_code'),
              atmLocation: getFieldValue('atm_location'),
              serviceName: serviceWithCategory?.name,
              branch: ticketWithFields.branch ? {
                code: ticketWithFields.branch.code,
                name: ticketWithFields.branch.name
              } : undefined,
              createdBy: ticketWithFields.createdBy ? {
                name: ticketWithFields.createdBy.name || 'Unknown',
                email: ticketWithFields.createdBy.email
              } : undefined,
              fieldValues: ticketWithFields.fieldValues?.map(fv => ({
                field: { name: fv.field.name },
                value: fv.value
              }))
            };

            const omniResponse = await sendToOmniIfTransactionClaim(
              omniTicketData,
              serviceWithCategory?.categoryId || validatedData.categoryId,
              serviceWithCategory?.tier1CategoryId
            );

            if (omniResponse?.success && omniResponse.data) {
              // Update ticket with Sociomile IDs
              await prisma.ticket.update({
                where: { id: ticket.id },
                data: {
                  sociomileTicketId: omniResponse.data.ticketId,
                  sociomileTicketNumber: omniResponse.data.ticket_number
                }
              });

              console.log('[Tickets] Omni ticket created:', {
                bsgTicket: ticket.ticketNumber,
                omniTicketId: omniResponse.data.ticketId,
                omniTicketNumber: omniResponse.data.ticket_number
              });
            }
          }
        }
      } catch (omniError) {
        // Log error but don't fail ticket creation
        console.error('[Tickets] Omni integration error:', omniError);
      }
    }

    // Log ticket creation for Grafana/Loki
    logger.ticketCreated(ticket.id, ticket.ticketNumber, session.user.id, {
      priority: ticket.priority,
      serviceId: validatedData.serviceId,
      serviceName: fullTicket?.service?.name,
      branchCode: fullTicket?.branch?.code,
      status: ticket.status,
      isConfidential: isConfidential,
      hasAttachments: attachmentData.length > 0,
      fieldValuesCount: processedFieldValues.length
    });

    // Track metrics for Prometheus
    metrics.ticketCreated(ticket.priority, fullTicket?.service?.name);

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    // Log failed ticket creation with device info for troubleshooting
    const deviceInfo = getDeviceInfo(request);
    const clientIp = getClientIp(request);
    
    console.error('Ticket creation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      clientIp,
      device: formatDeviceInfo(deviceInfo),
      browser: `${deviceInfo.browser.name} ${deviceInfo.browser.version}`,
      os: `${deviceInfo.os.name} ${deviceInfo.os.version}`,
      deviceType: deviceInfo.device.type,
      isSupported: deviceInfo.compatibility.isSupported,
      warnings: deviceInfo.compatibility.warnings
    });
    
    // Log to audit for failure tracking
    if (session?.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE_TICKET_FAILED',
          entity: 'Ticket',
          entityId: 'creation-failed',
          newValues: {
            error: error instanceof Error ? error.message : 'Unknown error',
            device: {
              browser: `${deviceInfo.browser.name} ${deviceInfo.browser.version}`,
              os: `${deviceInfo.os.name} ${deviceInfo.os.version}`,
              deviceType: deviceInfo.device.type,
              isSupported: deviceInfo.compatibility.isSupported,
              warnings: deviceInfo.compatibility.warnings
            },
            clientIp,
            validationErrors: error instanceof z.ZodError ? error.errors : undefined
          },
          ipAddress: clientIp,
          userAgent: deviceInfo.userAgent
        }
      }).catch(err => console.error('Failed to log audit:', err));
    }
    
    if (error instanceof z.ZodError) {
      console.error('Validation error details:', error.errors);
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating ticket:', error);
    // Provide more detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}