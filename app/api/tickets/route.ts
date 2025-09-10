import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { trackServiceUsage, updateFavoriteServiceUsage } from '@/lib/services/usage-tracker';
import { sanitizeSearchInput } from '@/lib/security';
import { emitTicketCreated } from '@/lib/socket-manager';
import { createNotification } from '@/lib/notifications';
import { getClientIp } from '@/lib/utils/ip-utils';
import { getDeviceInfo, formatDeviceInfo } from '@/lib/utils/device-utils';

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
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  category: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).default('INCIDENT'),
  issueClassification: z.enum([
    'HUMAN_ERROR', 'SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE',
    'SECURITY_INCIDENT', 'DATA_ISSUE', 'PROCESS_GAP', 'EXTERNAL_FACTOR'
  ]).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
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
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const mineAndAvailable = searchParams.get('mineAndAvailable');
    const branchId = searchParams.get('branchId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const rawSearch = searchParams.get('search');
    const search = rawSearch ? sanitizeSearchInput(rawSearch) : null;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeConfidential = searchParams.get('includeConfidential') === 'true';
    const securityClassification = searchParams.get('securityClassification');
    const requestStats = searchParams.get('stats') === 'true';
    const filter = searchParams.get('filter'); // 'my-tickets' or 'available-tickets'
    const categoryId = searchParams.get('categoryId'); // Category filter

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
      if (!['MANAGER'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access confidential tickets' },
          { status: 403 }
        );
      }
    }

    // Apply role-based filtering (Security Analyst filtering already applied above)
    if (session.user.role === 'SECURITY_ANALYST') {
      // Security Analysts function like technicians but with additional security access
      // They can see tickets from their support group like technicians do
      const baseConditions: any[] = [
        { createdById: session.user.id }, // Their own tickets
        { assignedToId: session.user.id }  // Tickets assigned to them
      ];
      
      // Add support group filtering like technicians
      if (userWithDetails?.supportGroupId) {
        baseConditions.push({
          AND: [
            { assignedToId: null }, // Unassigned tickets
            { 
              service: {
                supportGroupId: userWithDetails.supportGroupId
              }
            },
            {
              createdBy: {
                role: { not: 'SECURITY_ANALYST' }
              }
            }
          ]
        });
      }
      
      // Combine with existing security analyst ticket access
      where.OR = [
        ...baseConditions,
        // All tickets created by other Security Analysts
        { 
          createdBy: {
            role: 'SECURITY_ANALYST'
          }
        }
      ]
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
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        
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
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';
        
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
        // IT Helpdesk technicians can see ALL tickets EXCEPT SOC/Security tickets
        // They have broad access to provide general IT support
        // This includes system-generated tickets from ATM monitoring
        where.OR = [
          // All non-security tickets
          {
            createdBy: {
              role: { not: 'SECURITY_ANALYST' }
            }
          },
          // Include system-generated tickets (from monitoring system)
          {
            createdBy: {
              email: 'system@banksulutgo.co.id'
            }
          },
          // Include tickets assigned to IT Helpdesk support group
          {
            supportGroupId: userWithDetails?.supportGroupId
          }
        ];
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
      } else {
        // For general /tickets page, show all tickets (including pending approval)
        // Add all unassigned tickets as viewable
        technicianConditions.push({
          assignedToId: null
        });
      }

        where.OR = technicianConditions;
      }
    } else if (session.user.role === 'MANAGER') {
      // Managers can ONLY see tickets created by users from their own branch, excluding security analyst tickets
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
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        
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
    } else if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
      // ADMIN and SUPER_ADMIN see all tickets (no additional filtering)
      // The where clause remains empty or only contains user-specified filters
    }
    // If role is not handled above, default to no access (shouldn't happen with valid roles)

    // Apply filters
    if (status && status !== 'all' && status !== 'ALL') {
      where.status = status;
    } else if (!status) {
      // Exclude rejected tickets by default when no specific status is requested
      where.status = { not: 'REJECTED' };
    }
    // If status is 'all' or 'ALL', don't add any status filter
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedToId = assignedTo;
    if (mineAndAvailable) {
      // Override role-based filtering for mineAndAvailable
      where.OR = [
        { assignedToId: mineAndAvailable }, // My tickets
        { assignedToId: null } // Available tickets
      ];
    }
    if (branchId) where.branchId = branchId;
    if (securityClassification) {
      // Only allow security classification filtering for authorized roles
      if (!['ADMIN', 'SUPER_ADMIN', 'SECURITY_ANALYST', 'MANAGER'].includes(session.user.role)) {
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

    // Category filter
    if (categoryId) {
      where.service = {
        ...where.service,
        categoryId: categoryId
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    // If stats are requested, return stats instead of tickets
    if (requestStats) {
      // Create base where clause for stats (without status/priority filters)
      const statsWhere = { ...where };
      // Remove any status/priority specific filters for stats
      delete statsWhere.status;
      delete statsWhere.priority;
      
      const [openCount, pendingCount, approvedCount, inProgressCount, onHoldCount, resolvedCount, closedCount, rejectedCount, cancelledCount] = await Promise.all([
        // Open tickets count
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: 'OPEN'
          }
        }),
        // Pending tickets count (PENDING + PENDING_APPROVAL)
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: {
              in: ['PENDING', 'PENDING_APPROVAL']
            }
          }
        }),
        // Approved tickets count
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: 'APPROVED'
          }
        }),
        // In Progress tickets count
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: 'IN_PROGRESS'
          }
        }),
        // On Hold tickets count (PENDING_VENDOR only)
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: 'PENDING_VENDOR'
          }
        }),
        // Resolved tickets count
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: 'RESOLVED'
          }
        }),
        // Closed tickets count
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: 'CLOSED'
          }
        }),
        // Rejected tickets count
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: 'REJECTED'
          }
        }),
        // Cancelled tickets count
        prisma.ticket.count({
          where: {
            ...statsWhere,
            status: 'CANCELLED'
          }
        })
      ]);

      return NextResponse.json({
        stats: {
          open: openCount,
          pending: pendingCount,
          approved: approvedCount,
          inProgress: inProgressCount,
          onHold: onHoldCount,
          resolved: resolvedCount,
          closed: closedCount,
          rejected: rejectedCount,
          cancelled: cancelledCount
        }
      });
    }

    // IMPORTANT: Exclude ATM Claim tickets from /tickets page
    // ATM Claims should only be accessed through /branch/atm-claims
    // This prevents users from accessing ATM claims through the wrong detail page
    if (!where.AND) {
      where.AND = [];
    } else if (!Array.isArray(where.AND)) {
      where.AND = [where.AND];
    }
    
    // Only exclude ATM Claims for regular users, not for Transaction Claims Support or Call Center
    const isTransactionClaimsSupportUser = userWithDetails?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
    const isCallCenterUserForATM = userWithDetails?.supportGroup?.code === 'CALL_CENTER';
    
    console.log('[TICKETS API] ATM Claim exclusion check:', {
      isTransactionClaimsSupportUser,
      isCallCenterUserForATM,
      willExcludeATMClaims: !isTransactionClaimsSupportUser && !isCallCenterUserForATM
    });
    
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

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          service: { 
            select: { 
              name: true,
              slaHours: true,
              requiresApproval: true,
              category: {
                select: { name: true }
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
        take: limit
      }),
      prisma.ticket.count({ where })
    ]);

    return NextResponse.json({
      tickets,
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
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      if (!['ADMIN', 'SECURITY_ANALYST', 'MANAGER'].includes(session.user.role)) {
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
      // Manager and Technician created tickets are auto-approved, so status is OPEN
      // Others need approval, so status starts as PENDING_APPROVAL
      initialStatus = (['MANAGER', 'TECHNICIAN'].includes(session.user.role)) ? 'OPEN' : 'PENDING_APPROVAL';
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
    let targetBranchId = userWithBranch?.branchId;
    let assignedToId: string | null = null;
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
      // Generate ticket number - count tickets for current year only (within transaction)
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1); // January 1st of current year
      const yearEnd = new Date(currentYear + 1, 0, 1); // January 1st of next year
      
      const yearTicketCount = await tx.ticket.count({
        where: {
          createdAt: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      });
      
      const ticketNumber = `TKT-${currentYear}-${String(yearTicketCount + 1).padStart(6, '0')}`;

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
        priority: validatedData.priority,
        status: initialStatus,
        createdById: session.user.id,
        branchId: targetBranchId, // Use target branch (either user's or ATM owner's)
        assignedToId: assignedToId, // Auto-assign to branch manager if different branch
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
      // Check if creator is a manager or technician - auto-approve their tickets
      if (['MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
        const approvalReason = session.user.role === 'MANAGER' 
          ? 'Auto-approved: Manager-created ticket'
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

    // Emit socket event for real-time updates
    emitTicketCreated({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      status: ticket.status,
      priority: validatedData.priority,
      branchId: targetBranchId || undefined,
      createdBy: session.user.id
    });

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