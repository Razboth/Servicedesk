import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendTicketNotification } from '@/lib/services/email.service';
import { emitTicketUpdated, emitTicketAssigned } from '@/lib/services/socket.service';
import { createTicketNotifications, createNotification } from '@/lib/notifications';
import { PriorityValidator, type PriorityValidationContext } from '@/lib/priority-validation';
import { syncStatusToOmniIfApplicable } from '@/lib/services/omni.service';
import { logger } from '@/lib/services/logging.service';
import { metrics } from '@/lib/services/metrics.service';

// Validation schema for updating tickets
const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY']).optional(),
  justification: z.string().optional(),
  status: z.enum(['OPEN', 'PENDING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'PENDING_VENDOR', 'RESOLVED', 'CLOSED', 'CANCELLED']).optional(),
  assignedToId: z.string().nullable().optional(),
  category: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).optional(),
  issueClassification: z.enum(['HUMAN_ERROR', 'SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE', 'SECURITY_INCIDENT', 'DATA_ISSUE', 'PROCESS_GAP', 'EXTERNAL_FACTOR']).optional(),
  rootCause: z.string().optional(),
  resolutionNotes: z.string().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional()
});

// GET /api/tickets/[id] - Get specific ticket (by ID or ticket number)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check for API key first
    const apiKeyHeader = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
    let userId: string | undefined;
    let userRole: string | undefined;

    if (apiKeyHeader) {
      // Import API auth functions
      const { authenticateApiKey, checkApiPermission, createApiErrorResponse } = await import('@/lib/auth-api');

      // API key authentication
      const authResult = await authenticateApiKey(request);
      if (!authResult.authenticated) {
        return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
      }

      if (!checkApiPermission(authResult.apiKey!, 'tickets:read')) {
        return createApiErrorResponse('Insufficient permissions to read tickets', 403);
      }

      userId = authResult.apiKey?.linkedUserId || authResult.apiKey?.createdById;
      userRole = 'ADMIN'; // API keys get admin-level read access
    } else {
      // Session authentication
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
      userRole = session.user.role;
    }

    // Check if the id is a ticket number (e.g., TKT-2025-001402, or just 1402) or a regular ID
    const isFullTicketNumber = /^[A-Z]+-\d{4}-\d+$/.test(id);
    const isNumericOnly = /^\d+$/.test(id);

    let whereClause: any;
    if (isFullTicketNumber) {
      // Full format like TKT-2025-001402
      whereClause = { ticketNumber: id };
    } else if (isNumericOnly) {
      // Just the numeric part like 1402
      whereClause = { ticketNumber: id };
    } else {
      // Assume it's a CUID
      whereClause = { id };
    }

    const ticket = await prisma.ticket.findUnique({
      where: whereClause,
      include: {
        service: {
          select: {
            name: true,
            supportGroupId: true,
            requiresApproval: true,
            tier1Category: { select: { name: true } },
            tier2Subcategory: { select: { name: true } },
            tier3Item: { select: { name: true } },
            // Include 3-tier category IDs from service
            categoryId: true,
            subcategoryId: true,
            itemId: true
          }
        },
        createdBy: { 
          select: { 
            name: true, 
            email: true, 
            role: true, 
            avatar: true,
            branchId: true,
            branch: {
              select: { 
                id: true, 
                name: true, 
                code: true 
              }
            }
          } 
        },
        assignedTo: { select: { name: true, email: true, role: true, avatar: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true, label: true } }
          }
        },
        comments: {
          include: {
            user: { select: { name: true, email: true, role: true, avatar: true } },
            attachments: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                size: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        slaTracking: {
          include: {
            slaTemplate: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        atmClaimVerification: true,
        branchAssignments: {
          include: {
            assignedTo: { select: { name: true } },
            assignedBy: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get user's details for access control (skip for API keys)
    const userWithDetails = userId && !apiKeyHeader ? await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        branchId: true, 
        role: true, 
        supportGroupId: true,
        supportGroup: {
          select: { code: true }
        }
      }
    }) : null;

    // Check access permissions (API keys get full access)
    let canAccess = !!apiKeyHeader;

    if (apiKeyHeader) {
      // API keys have full read access
      canAccess = true;
    } else if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER_IT') {
      // Admin, Super Admin, and Manager IT can see all tickets
      canAccess = true;
    } else if (userRole === 'SECURITY_ANALYST') {
      // Security Analysts can see:
      // 1. Their own tickets
      // 2. Tickets assigned to them
      // 3. Tickets in their support group
      // 4. All tickets created by other Security Analysts
      canAccess = ticket.createdById === userId ||
                  ticket.assignedToId === userId ||
                  (userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId) ||
                  ticket.createdBy?.role === 'SECURITY_ANALYST';
    } else if (userRole === 'MANAGER') {
      // Managers can see tickets from their branch
      canAccess = userWithDetails?.branchId === ticket.branchId;
    } else if (userRole === 'TECHNICIAN') {
      const isCallCenterTech = userWithDetails?.supportGroup?.code === 'CALL_CENTER';
      const isTransactionClaimsSupport = userWithDetails?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
      const isITHelpdeskTech = userWithDetails?.supportGroup?.code === 'IT_HELPDESK';

      if (isCallCenterTech || isTransactionClaimsSupport) {
        // These technicians can see transaction-related tickets
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';

        canAccess = ticket.createdById === userId ||
                    ticket.assignedToId === userId ||
                    ticket.categoryId === TRANSACTION_CLAIMS_CATEGORY_ID ||
                    ticket.service?.categoryId === TRANSACTION_CLAIMS_CATEGORY_ID ||
                    ticket.categoryId === ATM_SERVICES_CATEGORY_ID ||
                    ticket.service?.categoryId === ATM_SERVICES_CATEGORY_ID;
      } else if (isITHelpdeskTech) {
        // IT Helpdesk can see all tickets except those created by Security Analysts
        canAccess = ticket.createdBy?.role !== 'SECURITY_ANALYST';
      } else {
        // Regular technicians can ONLY see:
        // 1. Tickets they created
        // 2. Tickets assigned to them
        // 3. Tickets where the service's support group matches their support group
        const isCreatorOrAssignee = ticket.createdById === userId || ticket.assignedToId === userId;
        const isSupportGroupMatch = !!(
          userWithDetails?.supportGroupId &&
          ticket.service?.supportGroupId &&
          ticket.service.supportGroupId === userWithDetails.supportGroupId
        );

        canAccess = isCreatorOrAssignee || isSupportGroupMatch;
      }
    } else if (userRole === 'USER' || userRole === 'AGENT') {
      const isCallCenterUser = userWithDetails?.supportGroup?.code === 'CALL_CENTER';

      if (isCallCenterUser) {
        // Call Center users can see transaction claims
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';

        canAccess = ticket.createdById === userId ||
                    ticket.categoryId === TRANSACTION_CLAIMS_CATEGORY_ID ||
                    ticket.service?.categoryId === TRANSACTION_CLAIMS_CATEGORY_ID;
      } else if (userWithDetails?.branchId) {
        // Regular users can see:
        // 1. Tickets they created (regardless of which branch owns the ticket)
        // 2. All tickets assigned to their branch
        canAccess = ticket.createdById === userId ||
                    ticket.branchId === userWithDetails.branchId;
      } else {
        // Users without branch can only see their own tickets
        canAccess = ticket.createdById === userId;
      }
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] - Partial update ticket (for status changes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTicketSchema.parse(body);

    // Check if the id is a ticket number or a regular ID
    const isTicketNumber = /^[A-Z]+-\d{4}-\d+$/.test(id);

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: isTicketNumber ? { ticketNumber: id } : { id },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        status: true,
        category: true,
        sociomileTicketId: true,
        slaStartAt: true,
        slaPausedAt: true,
        slaPausedTotal: true,
        service: {
          select: {
            name: true
          }
        }
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions for updates based on role
    let canUpdate = false;
    let allowedFields: string[] = [];

    if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN') {
      // Admin and Super Admin can update everything
      canUpdate = true;
      allowedFields = Object.keys(validatedData);
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // Assigned technician can update all fields
      if (existingTicket.assignedToId === session.user.id) {
        canUpdate = true;
        allowedFields = Object.keys(validatedData);
      } else {
        // Any technician can reclassify category and issueClassification
        const reclassifyFields = ['category', 'issueClassification'];
        const updateFields = Object.keys(validatedData);
        const isOnlyReclassify = updateFields.every(f => reclassifyFields.includes(f));
        if (isOnlyReclassify && updateFields.length > 0) {
          canUpdate = true;
          allowedFields = reclassifyFields;
        } else {
          return NextResponse.json(
            { error: 'Only the assigned technician can update this ticket' },
            { status: 403 }
          );
        }
      }
    } else if (session.user.role === 'MANAGER' || session.user.role === 'MANAGER_IT') {
      // Managers can reclassify any ticket, and update basic fields of tickets they created
      canUpdate = true;
      if (existingTicket.createdById === session.user.id) {
        allowedFields = ['title', 'description', 'priority', 'category', 'issueClassification'];
      } else {
        allowedFields = ['category', 'issueClassification'];
      }
    } else if (session.user.role === 'USER' && existingTicket.createdById === session.user.id) {
      // Users can only update title and description of their own tickets
      canUpdate = true;
      allowedFields = ['title', 'description'];
    }

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user is trying to update fields they're not allowed to
    if (session.user.role !== 'ADMIN' && allowedFields.length > 0) {
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        const disallowedFields = updateFields.filter(f => !allowedFields.includes(f));
        const role = session.user.role?.toLowerCase() || 'user';
        return NextResponse.json(
          { error: `${role}s cannot update these fields: ${disallowedFields.join(', ')}` },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };

    // Auto-assign ticket to current user if moving to terminal state and no one is assigned
    if (validatedData.status && ['RESOLVED', 'CLOSED', 'CANCELLED'].includes(validatedData.status) && !existingTicket.assignedToId) {
      updateData.assignedToId = session.user.id;
    }

    // Set resolution timestamp when status changes to RESOLVED
    if (validatedData.status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    // Clear closedAt timestamp when reopening a closed ticket
    if (existingTicket.status === 'CLOSED' && validatedData.status && validatedData.status !== 'CLOSED') {
      updateData.closedAt = null;
    }

    // SLA pause: entering PENDING_VENDOR
    if (validatedData.status === 'PENDING_VENDOR' && existingTicket.status !== 'PENDING_VENDOR') {
      updateData.slaPausedAt = new Date();
    }

    // SLA resume: leaving PENDING_VENDOR
    if (existingTicket.status === 'PENDING_VENDOR' && validatedData.status && validatedData.status !== 'PENDING_VENDOR') {
      if (existingTicket.slaPausedAt) {
        const pausedMs = Date.now() - new Date(existingTicket.slaPausedAt).getTime();
        updateData.slaPausedTotal = (existingTicket.slaPausedTotal || 0) + pausedMs;
      }
      updateData.slaPausedAt = null;
    }

    // Track what's changing for audit log
    const changes: any = {};
    if (validatedData.status && validatedData.status !== existingTicket.status) {
      changes.status = { old: existingTicket.status, new: validatedData.status };
    }
    if (validatedData.category && validatedData.category !== existingTicket.category) {
      changes.category = { old: existingTicket.category, new: validatedData.category };
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        service: {
          select: {
            name: true,
            tier1Category: { select: { name: true } },
            tier2Subcategory: { select: { name: true } },
            tier3Item: { select: { name: true } }
          }
        },
        createdBy: { 
          select: { 
            name: true, 
            email: true, 
            role: true, 
            avatar: true,
            branchId: true,
            branch: {
              select: { 
                id: true, 
                name: true, 
                code: true 
              }
            }
          } 
        },
        assignedTo: { select: { name: true, email: true, role: true, avatar: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true, label: true } }
          }
        },
        comments: {
          include: {
            user: { select: { name: true, email: true, role: true, avatar: true } },
            attachments: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                size: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    // Create audit log if there were changes
    if (Object.keys(changes).length > 0) {
      const oldValues: any = {};
      const newValues: any = { updatedBy: session.user.name || session.user.email };
      if (changes.status) {
        oldValues.status = changes.status.old;
        newValues.status = changes.status.new;
      }
      if (changes.category) {
        oldValues.category = changes.category.old;
        newValues.category = changes.category.new;
      }

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: changes.category ? 'CATEGORY_RECLASSIFICATION' : 'STATUS_UPDATE',
          entity: 'TICKET',
          entityId: id,
          oldValues,
          newValues
        },
      });

      // Create reclassification comment when category changes
      if (changes.category) {
        const categoryLabels: Record<string, string> = {
          INCIDENT: 'Insiden',
          SERVICE_REQUEST: 'Permintaan Layanan',
          CHANGE_REQUEST: 'Permintaan Perubahan',
          EVENT_REQUEST: 'Permintaan Event',
        };
        const oldLabel = categoryLabels[changes.category.old] || changes.category.old;
        const newLabel = categoryLabels[changes.category.new] || changes.category.new;

        await prisma.ticketComment.create({
          data: {
            ticketId: id,
            userId: session.user.id,
            content: `Tipe tiket direklasifikasi dari "${oldLabel}" menjadi "${newLabel}"`,
            isInternal: true
          }
        });
      }

      // Log status change for Grafana/Loki
      if (changes.status) {
        logger.ticketStatusChanged(
          id,
          updatedTicket.ticketNumber,
          session.user.id,
          changes.status.old,
          changes.status.new
        );

        // Track resolution metrics
        if (changes.status.new === 'RESOLVED') {
          const createdAt = new Date(updatedTicket.createdAt);
          const resolutionTimeHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
          metrics.ticketResolved(updatedTicket.priority, resolutionTimeHours);
          logger.ticketResolved(id, updatedTicket.ticketNumber, session.user.id, resolutionTimeHours);
        } else if (changes.status.new === 'CLOSED') {
          metrics.ticketClosed(updatedTicket.priority);
          logger.ticketClosed(id, updatedTicket.ticketNumber, session.user.id);
        }
      }
    }

    // Update vendor ticket status based on main ticket status changes
    if (validatedData.status) {
      // If closing or resolving main ticket, also resolve vendor ticket
      if (['CLOSED', 'RESOLVED'].includes(validatedData.status)) {
        const activeVendorTicket = await prisma.vendorTicket.findFirst({
          where: {
            ticketId: id,
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          },
          include: {
            vendor: true
          }
        });

        if (activeVendorTicket) {
          await prisma.vendorTicket.update({
            where: { id: activeVendorTicket.id },
            data: {
              status: 'RESOLVED',
              resolvedAt: new Date()
            }
          });

          // Add a comment about vendor ticket resolution
          await prisma.comment.create({
            data: {
              content: `Vendor ticket ${activeVendorTicket.vendorTicketNumber} with ${activeVendorTicket.vendor.name} has been marked as resolved due to main ticket ${validatedData.status === 'CLOSED' ? 'closure' : 'resolution'}.`,
              ticketId: id,
              userId: session.user.id,
              isInternal: false
            }
          });
        }
      }
      
      // If reopening from PENDING_VENDOR to IN_PROGRESS, cancel vendor ticket
      if (existingTicket.status === 'PENDING_VENDOR' && validatedData.status === 'IN_PROGRESS') {
        const activeVendorTicket = await prisma.vendorTicket.findFirst({
          where: {
            ticketId: id,
            status: { in: ['PENDING', 'IN_PROGRESS'] }
          },
          include: {
            vendor: true
          }
        });

        if (activeVendorTicket) {
          await prisma.vendorTicket.update({
            where: { id: activeVendorTicket.id },
            data: {
              status: 'CANCELLED',
              resolvedAt: new Date()
            }
          });

          // Add a comment about vendor ticket cancellation
          await prisma.comment.create({
            data: {
              content: `Vendor ticket ${activeVendorTicket.vendorTicketNumber} with ${activeVendorTicket.vendor.name} has been cancelled as work resumed internally.`,
              ticketId: id,
              userId: session.user.id,
              isInternal: false
            }
          });
        }
      }
    }

    // Auto-update SLA breach flags on status change
    if (validatedData.status && validatedData.status !== existingTicket.status) {
      try {
        const slaTracking = await prisma.sLATracking.findFirst({
          where: { ticketId: existingTicket.id }
        });

        if (slaTracking) {
          const nowSla = new Date();
          const updateSla: any = {};

          // Record first response time when moving to IN_PROGRESS
          if (validatedData.status === 'IN_PROGRESS' && !slaTracking.responseTime) {
            updateSla.responseTime = nowSla;
            updateSla.isResponseBreached = nowSla > slaTracking.responseDeadline;
          }

          // Record resolution time when resolving
          if (validatedData.status === 'RESOLVED') {
            updateSla.resolutionTime = nowSla;
            updateSla.isResolutionBreached = nowSla > slaTracking.resolutionDeadline;
          }

          // Check escalation
          if (!slaTracking.isEscalated && nowSla > slaTracking.escalationDeadline) {
            updateSla.isEscalated = true;
          }

          if (Object.keys(updateSla).length > 0) {
            await prisma.sLATracking.update({
              where: { id: slaTracking.id },
              data: updateSla
            });
          }
        }
      } catch (slaError) {
        console.error('Error updating SLA breach flags:', slaError);
      }
    }

    // Send email notification for ticket updates
    if (validatedData.status && validatedData.status !== existingTicket.status) {
      // Determine email notification type based on status change
      let emailType: 'TICKET_UPDATED' | 'TICKET_RESOLVED' | 'TICKET_CLOSED' = 'TICKET_UPDATED';
      if (validatedData.status === 'RESOLVED') {
        emailType = 'TICKET_RESOLVED';
      } else if (validatedData.status === 'CLOSED') {
        emailType = 'TICKET_CLOSED';
      }

      // Send email notification
      sendTicketNotification(id, emailType).catch(err =>
        console.error('Failed to send email notification:', err)
      );

      // Create in-app notifications
      await createTicketNotifications(id, emailType, session.user.id)
        .catch(err => console.error('Failed to create status change notifications:', err));

      // Sync status to Omni if ticket was sent to Omni (non-blocking)
      if (existingTicket.sociomileTicketId) {
        syncStatusToOmniIfApplicable(
          updatedTicket.ticketNumber,
          existingTicket.sociomileTicketId,
          validatedData.status
        ).then(result => {
          if (result) {
            console.log('[Omni] PATCH status sync result:', {
              ticketNumber: updatedTicket.ticketNumber,
              success: result.success,
              message: result.message
            });
          }
        }).catch(err => {
          console.error('[Omni] Failed to sync status (PATCH):', err);
        });
      }
    }

    // Emit socket events for real-time updates
    emitTicketUpdated(updatedTicket, existingTicket.status).catch(err =>
      console.error('Failed to emit socket event:', err)
    );

    if (validatedData.assignedToId && validatedData.assignedToId !== existingTicket.assignedToId) {
      // Send assignment email notification
      sendTicketNotification(id, 'ticket_assigned').catch(err =>
        console.error('Failed to send assignment email:', err)
      );

      // Get assigned user details for socket event
      const assignedUser = await prisma.user.findUnique({
        where: { id: validatedData.assignedToId },
        select: { id: true, name: true, email: true }
      });

      if (assignedUser) {
        emitTicketAssigned(updatedTicket, assignedUser).catch(err =>
          console.error('Failed to emit assignment event:', err)
        );
      }
      
      // Create notification for newly assigned technician
      if (validatedData.assignedToId) {
        await createNotification({
          userId: validatedData.assignedToId,
          type: 'TICKET_ASSIGNED',
          title: `Ticket #${updatedTicket.ticketNumber} Assigned to You`,
          message: `You have been assigned to: ${updatedTicket.title}`,
          data: {
            ticketId: id,
            ticketNumber: updatedTicket.ticketNumber,
            ticketTitle: updatedTicket.title
          }
        }).catch(err => console.error('Failed to create assignment notification:', err));

        // Log assignment for Grafana/Loki
        logger.ticketAssigned(
          id,
          updatedTicket.ticketNumber,
          session.user.id,
          validatedData.assignedToId
        );
      }
    }
    
    // Emit general update event
    emitTicketUpdated(id, validatedData, session.user.id);

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTicketSchema.parse(body);

    // Check if the id is a ticket number or a regular ID
    const isTicketNumber = /^[A-Z]+-\d{4}-\d+$/.test(id);

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: isTicketNumber ? { ticketNumber: id } : { id },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        status: true,
        category: true,
        sociomileTicketId: true,
        slaStartAt: true,
        slaPausedAt: true,
        slaPausedTotal: true,
        service: {
          select: {
            name: true
          }
        }
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get user details for additional permission checks
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        branchId: true, 
        role: true, 
        supportGroupId: true,
        supportGroup: {
          select: { code: true }
        }
      }
    });

    // Check permissions for updates
    let canUpdate = false;
    if (session.user.role === 'ADMIN' || session.user.role === 'SECURITY_ANALYST') {
      canUpdate = true;
    } else if (session.user.role === 'TECHNICIAN') {
      // Check if Call Center technician
      const isCallCenterTech = userWithDetails?.supportGroup?.code === 'CALL_CENTER';
      if (isCallCenterTech) {
        // Call Center can only update transaction claims - strict filtering
        const serviceName = existingTicket.service?.name || '';
        const isTransactionClaim = 
          serviceName.includes('Claim') ||
          serviceName.includes('claim') ||
          serviceName.includes('Dispute') ||
          serviceName.includes('dispute') ||
          // Only allow "Transaction" if it also contains "Claim" or "Error"
          (serviceName.includes('Transaction') && 
           (serviceName.includes('Claim') || serviceName.includes('Error'))) ||
          // Only allow ATM if it's specifically ATM Claim
          (serviceName.includes('ATM') && serviceName.includes('Claim'));
        canUpdate = isTransactionClaim;
      } else {
        // Regular technicians can update
        canUpdate = true;
      }
    } else if (session.user.role === 'USER' && existingTicket.createdById === session.user.id) {
      canUpdate = true;
    } else if (session.user.role === 'MANAGER' && existingTicket.createdById === session.user.id) {
      canUpdate = true;
    }

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Users can only update certain fields
    if (session.user.role === 'USER') {
      const allowedFields = ['title', 'description'];
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: 'Users can only update title and description' },
          { status: 403 }
        );
      }
    }

    // Managers can only update certain fields (cannot change status, assign tickets, etc.)
    if (session.user.role === 'MANAGER') {
      const allowedFields = ['title', 'description', 'priority'];
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: 'Managers cannot update ticket status, assignments, or technical fields' },
          { status: 403 }
        );
      }
    }

    // Priority validation if priority is being updated
    let finalUpdateData = { ...validatedData };
    const priorityWarnings: string[] = [];

    if (validatedData.priority && validatedData.priority !== existingTicket.priority) {
      // Initialize priority validator
      const priorityValidator = new PriorityValidator(prisma);

      // Get additional ticket context for validation
      const fullTicketContext = await prisma.ticket.findUnique({
        where: { id },
        include: {
          service: true,
          createdBy: { include: { branch: true } }
        }
      });

      if (fullTicketContext) {
        // Validate priority with context
        const priorityValidationContext: PriorityValidationContext = {
          userId: session.user.id,
          userRole: session.user.role || 'USER',
          serviceId: fullTicketContext.serviceId,
          branchId: fullTicketContext.createdBy?.branchId || userWithDetails?.branchId || undefined,
          description: fullTicketContext.description,
          justification: validatedData.justification
        };

        const priorityValidation = await priorityValidator.validatePriority(
          validatedData.priority,
          priorityValidationContext
        );

        // Handle priority validation results
        if (!priorityValidation.isValid) {
          // Priority validation failed - use suggested priority or return error
          if (priorityValidation.suggestedPriority) {
            finalUpdateData.priority = priorityValidation.suggestedPriority;
            priorityWarnings.push(
              `Priority downgraded from ${validatedData.priority} to ${priorityValidation.suggestedPriority}: ${priorityValidation.errors.join(', ')}`
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

        // Add any priority warnings
        if (priorityValidation.warnings.length > 0) {
          priorityWarnings.push(...priorityValidation.warnings);
        }
      }
    }

    // Prepare update data
    const updateData: any = finalUpdateData;

    // Auto-assign ticket to current user if moving to terminal state and no one is assigned
    if (validatedData.status && ['RESOLVED', 'CLOSED', 'CANCELLED'].includes(validatedData.status) && !existingTicket.assignedToId) {
      updateData.assignedToId = session.user.id;
    }

    // Set resolution timestamp when status changes to RESOLVED
    if (validatedData.status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    // Set closed timestamp when status changes to CLOSED
    if (validatedData.status === 'CLOSED' && existingTicket.status !== 'CLOSED') {
      updateData.closedAt = new Date();
    }

    // SLA pause: entering PENDING_VENDOR
    if (validatedData.status === 'PENDING_VENDOR' && existingTicket.status !== 'PENDING_VENDOR') {
      updateData.slaPausedAt = new Date();
    }

    // SLA resume: leaving PENDING_VENDOR
    if (existingTicket.status === 'PENDING_VENDOR' && validatedData.status && validatedData.status !== 'PENDING_VENDOR') {
      if (existingTicket.slaPausedAt) {
        const pausedMs = Date.now() - new Date(existingTicket.slaPausedAt).getTime();
        updateData.slaPausedTotal = (existingTicket.slaPausedTotal || 0) + pausedMs;
      }
      updateData.slaPausedAt = null;
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        service: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true } }
          }
        }
      }
    });

    // Auto-update SLA breach flags on status change
    if (validatedData.status && validatedData.status !== existingTicket.status) {
      try {
        const slaTracking = await prisma.sLATracking.findFirst({
          where: { ticketId: existingTicket.id }
        });

        if (slaTracking) {
          const nowSla = new Date();
          const updateSla: any = {};

          if (validatedData.status === 'IN_PROGRESS' && !slaTracking.responseTime) {
            updateSla.responseTime = nowSla;
            updateSla.isResponseBreached = nowSla > slaTracking.responseDeadline;
          }

          if (validatedData.status === 'RESOLVED') {
            updateSla.resolutionTime = nowSla;
            updateSla.isResolutionBreached = nowSla > slaTracking.resolutionDeadline;
          }

          if (!slaTracking.isEscalated && nowSla > slaTracking.escalationDeadline) {
            updateSla.isEscalated = true;
          }

          if (Object.keys(updateSla).length > 0) {
            await prisma.sLATracking.update({
              where: { id: slaTracking.id },
              data: updateSla
            });
          }
        }
      } catch (slaError) {
        console.error('Error updating SLA breach flags (PUT):', slaError);
      }
    }

    // Emit socket events for real-time updates
    if (validatedData.status && validatedData.status !== existingTicket.status) {
      emitTicketStatusChanged(
        id,
        existingTicket.status,
        validatedData.status,
        session.user.id
      );

      // Sync status to Omni if ticket was sent to Omni (non-blocking)
      if (existingTicket.sociomileTicketId) {
        syncStatusToOmniIfApplicable(
          updatedTicket.ticketNumber,
          existingTicket.sociomileTicketId,
          validatedData.status
        ).then(result => {
          if (result) {
            console.log('[Omni] PUT status sync result:', {
              ticketNumber: updatedTicket.ticketNumber,
              success: result.success,
              message: result.message
            });
          }
        }).catch(err => {
          console.error('[Omni] Failed to sync status (PUT):', err);
        });
      }
    }

    if (validatedData.assignedToId && validatedData.assignedToId !== existingTicket.assignedToId) {
      emitTicketAssigned(
        id,
        validatedData.assignedToId,
        session.user.id
      );
    }

    // Create audit log for update with priority validation info
    if (Object.keys(updateData).length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: validatedData.category && validatedData.category !== existingTicket.category
            ? 'CATEGORY_RECLASSIFICATION'
            : 'UPDATE_TICKET',
          entity: 'Ticket',
          entityId: id,
          oldValues: {
            priority: existingTicket.priority,
            ...(validatedData.category ? { category: existingTicket.category } : {}),
          },
          newValues: {
            ...updateData,
            priorityValidation: validatedData.priority ? {
              originalPriority: validatedData.priority,
              finalPriority: updateData.priority,
              warnings: priorityWarnings,
              validationApplied: validatedData.priority !== updateData.priority
            } : undefined
          }
        }
      });

      // Create reclassification comment when category changes
      if (validatedData.category && validatedData.category !== existingTicket.category) {
        const categoryLabels: Record<string, string> = {
          INCIDENT: 'Insiden',
          SERVICE_REQUEST: 'Permintaan Layanan',
          CHANGE_REQUEST: 'Permintaan Perubahan',
          EVENT_REQUEST: 'Permintaan Event',
        };
        const oldLabel = categoryLabels[existingTicket.category] || existingTicket.category;
        const newLabel = categoryLabels[validatedData.category] || validatedData.category;

        await prisma.ticketComment.create({
          data: {
            ticketId: id,
            userId: session.user.id,
            content: `Tipe tiket direklasifikasi dari "${oldLabel}" menjadi "${newLabel}"`,
            isInternal: true
          }
        });
      }
    }

    // Emit general update event
    emitTicketUpdated(id, validatedData, session.user.id);

    return NextResponse.json(updatedTicket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete ticket (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete tickets
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if the id is a ticket number or a regular ID
    const isTicketNumber = /^[A-Z]+-\d{4}-\d+$/.test(id);

    const ticket = await prisma.ticket.findUnique({
      where: isTicketNumber ? { ticketNumber: id } : { id },
      select: { id: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await prisma.ticket.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}