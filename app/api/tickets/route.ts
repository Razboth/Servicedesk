import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { trackServiceUsage, updateFavoriteServiceUsage } from '@/lib/services/usage-tracker';
import { sanitizeSearchInput } from '@/lib/security';

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

    // Get user's branch and support group for filtering
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        branchId: true, 
        role: true, 
        supportGroupId: true,
        supportGroup: {
          select: { id: true, name: true }
        }
      }
    });

    // Build where clause based on user role and filters
    const where: any = {};

    // Apply confidential ticket filtering based on user role
    if (session.user.role === 'SECURITY_ANALYST') {
      // Security Analyst filtering will be handled in role-based filtering section below
      // Skip confidential filtering for security analysts as they have special access
    } else if (!includeConfidential) {
      // Regular users cannot see confidential tickets
      where.isConfidential = false;
    } else {
      // User explicitly requested confidential tickets - check permissions
      if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to access confidential tickets' },
          { status: 403 }
        );
      }
    }

    // Apply role-based filtering (Security Analyst filtering already applied above)
    if (session.user.role === 'USER') {
      // Users see only their own tickets, excluding security analyst tickets
      where.AND = [
        { createdById: session.user.id },
        {
          createdBy: {
            role: { not: 'SECURITY_ANALYST' }
          }
        }
      ];
    } else if (session.user.role === 'SECURITY_ANALYST') {
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
      // Technicians can see ALL tickets without any restrictions
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
    }
    // ADMIN sees all tickets (no additional filtering)

    // Apply filters
    if (status) {
      where.status = status;
    } else {
      // Exclude rejected tickets by default when no specific status is requested
      where.status = { not: 'REJECTED' };
    }
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
      if (!['ADMIN', 'SECURITY_ANALYST', 'MANAGER'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to filter by security classification' },
          { status: 403 }
        );
      }
      where.securityClassification = securityClassification;
    }

    // Handle technician workbench filters
    if (filter && ['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user.role)) {
      if (filter === 'my-tickets') {
        // Show tickets assigned to or claimed by current user
        where.assignedToId = session.user.id;
      } else if (filter === 'available-tickets') {
        // Show unassigned tickets that match technician's support group
        where.AND = (where.AND || []).concat([
          { assignedToId: null },
          userWithDetails?.supportGroupId ? {
            service: {
              supportGroupId: userWithDetails.supportGroupId
            }
          } : {}
        ]);
      }
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

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          service: { 
            select: { 
              name: true,
              slaHours: true,
              category: {
                select: { name: true }
              }
            } 
          },
          createdBy: { select: { id: true, name: true, email: true, branchId: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
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

    // Determine initial status based on user role and approval workflow
    // Regular users' tickets go to PENDING_APPROVAL, managers and technicians bypass approval
    const initialStatus = (session.user.role === 'USER') ? 'PENDING_APPROVAL' : 'OPEN';

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
    console.log('Processing field values:', validatedData.fieldValues);
    console.log('Service has fields:', service.fields?.length || 0);
    console.log('Service has field templates:', service.fieldTemplates?.length || 0);
    
    if (validatedData.fieldValues && validatedData.fieldValues.length > 0) {
      for (const fieldValue of validatedData.fieldValues) {
        console.log('Processing field value:', fieldValue);
        
        // Check if this is a regular service field
        const isServiceField = service.fields.some(f => f.id === fieldValue.fieldId);
        console.log(`Field ${fieldValue.fieldId} is service field:`, isServiceField);
        
        if (isServiceField) {
          // Regular service field - save as is
          processedFieldValues.push(fieldValue);
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

            // Use the service field ID instead of the template ID
            processedFieldValues.push({
              fieldId: serviceField.id,
              value: fieldValue.value
            });
            console.log('Added processed field value with serviceFieldId:', serviceField.id);
          } else {
            console.warn('Field ID not found in service fields or templates:', fieldValue.fieldId);
          }
        }
      }
    }
    
    console.log('Final processed field values:', processedFieldValues);

    // Get user's branch for the ticket
    const userWithBranch = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true }
    });

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

      return await tx.ticket.create({
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
        branchId: userWithBranch?.branchId, // Set the branch from the user
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
    });

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

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
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