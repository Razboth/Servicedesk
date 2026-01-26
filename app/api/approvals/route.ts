import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendTicketNotification } from '@/lib/services/email.service';

// Validation schema for bulk approval actions
const bulkApprovalSchema = z.object({
  ticketIds: z.array(z.string()).min(1, 'At least one ticket must be selected'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional()
});

// GET /api/approvals - Get pending approvals for manager
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can access approval dashboard
    if (!['MANAGER', 'MANAGER_IT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied. Manager role required.' }, { status: 403 });
    }

    // Get user's branch information
    const userWithBranch = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true }
    });

    if (!userWithBranch?.branchId) {
      return NextResponse.json({ error: 'Manager must be assigned to a branch' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const priority = searchParams.get('priority');

    // Build where clause for pending approvals in manager's branch
    // Managers can approve tickets assigned to their branch
    const where: any = {
      status: 'PENDING_APPROVAL',
      // Ticket must be assigned to manager's branch
      branchId: userWithBranch.branchId
    };

    // Apply filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (priority) {
      where.priority = priority;
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          service: { select: { name: true, description: true } },
          createdBy: { select: { name: true, email: true, branchId: true } },
          fieldValues: {
            include: {
              field: { select: { name: true, label: true, type: true } }
            }
          },
          approvals: {
            where: { approverId: session.user.id },
            select: { status: true, reason: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' },
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
    console.error('Error fetching pending approvals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/approvals - Process bulk approval actions
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can approve tickets
    if (!['MANAGER', 'MANAGER_IT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied. Manager role required.' }, { status: 403 });
    }

    // Get user's branch information
    const userWithBranch = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true }
    });

    if (!userWithBranch?.branchId) {
      return NextResponse.json({ error: 'Manager must be assigned to a branch' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = bulkApprovalSchema.parse(body);

    // Verify all tickets belong to manager's branch and are pending approval
    // Managers can approve any ticket assigned to their branch
    const tickets = await prisma.ticket.findMany({
      where: {
        id: { in: validatedData.ticketIds },
        status: 'PENDING_APPROVAL',
        // Ticket must be assigned to manager's branch (regardless of who created it)
        branchId: userWithBranch.branchId
      },
      include: {
        createdBy: { select: { name: true, email: true, branchId: true } }
      }
    });

    if (tickets.length !== validatedData.ticketIds.length) {
      return NextResponse.json(
        { error: 'Some tickets are not found or not eligible for approval' },
        { status: 400 }
      );
    }

    // When approved, ticket moves to OPEN status so it can be worked on
    const newStatus = validatedData.action === 'approve' ? 'OPEN' : 'REJECTED';
    const approvalStatus = validatedData.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const now = new Date();

    // Process bulk approval in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update ticket statuses - set slaStartAt when approving (SLA starts from approval)
      const updatedTickets = await tx.ticket.updateMany({
        where: { id: { in: validatedData.ticketIds } },
        data: {
          status: newStatus,
          updatedAt: now,
          // SLA starts when ticket is approved (not when created)
          ...(validatedData.action === 'approve' && { slaStartAt: now })
        }
      });

      // Create approval records
      const approvalRecords = await Promise.all(
        validatedData.ticketIds.map(ticketId =>
          tx.ticketApproval.create({
            data: {
              ticketId,
              approverId: session.user.id!,
              status: approvalStatus,
              reason: validatedData.reason
            }
          })
        )
      );

      // Create audit logs
      const auditLogs = await Promise.all(
        validatedData.ticketIds.map(ticketId =>
          tx.auditLog.create({
            data: {
              userId: session.user.id,
              ticketId,
              action: `TICKET_${validatedData.action.toUpperCase()}`,
              entity: 'Ticket',
              entityId: ticketId,
              newValues: {
                status: newStatus,
                approver: session.user.name,
                reason: validatedData.reason
              }
            }
          })
        )
      );

      return { updatedTickets, approvalRecords, auditLogs };
    });

    // Send email notifications for approved tickets
    if (validatedData.action === 'approve') {
      // Get full ticket details for email notifications
      const approvedTickets = await prisma.ticket.findMany({
        where: { id: { in: validatedData.ticketIds } },
        include: {
          service: {
            include: {
              supportGroup: true
            }
          },
          createdBy: true,
          assignedTo: true,
          branch: true
        }
      });

      // Create SLATracking records for each approved ticket
      for (const ticket of approvedTickets) {
        try {
          const service = ticket.service;
          if (service) {
            let slaTemplate = await prisma.sLATemplate.findUnique({
              where: { serviceId: service.id }
            });

            if (!slaTemplate) {
              slaTemplate = await prisma.sLATemplate.create({
                data: {
                  serviceId: service.id,
                  responseHours: (service as any).responseHours || 4,
                  resolutionHours: (service as any).resolutionHours || 24,
                  escalationHours: (service as any).escalationHours || 48,
                  businessHoursOnly: (service as any).businessHoursOnly ?? true
                }
              });
            }

            await prisma.sLATracking.create({
              data: {
                ticketId: ticket.id,
                slaTemplateId: slaTemplate.id,
                responseDeadline: new Date(now.getTime() + (slaTemplate.responseHours * 60 * 60 * 1000)),
                resolutionDeadline: new Date(now.getTime() + (slaTemplate.resolutionHours * 60 * 60 * 1000)),
                escalationDeadline: new Date(now.getTime() + (slaTemplate.escalationHours * 60 * 60 * 1000)),
                isResponseBreached: false,
                isResolutionBreached: false
              }
            });
          }
        } catch (slaError) {
          console.error(`Failed to create SLATracking for ticket ${ticket.ticketNumber}:`, slaError);
        }
      }

      // Send email notifications for each approved ticket
      for (const ticket of approvedTickets) {
        await sendTicketNotification(ticket.id, 'ticket_approved', {
          approver: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email
          },
          approvalNotes: validatedData.reason
        }).catch(err =>
          console.error(`Failed to send approval email for ticket ${ticket.ticketNumber}:`, err)
        );
      }
    }

    return NextResponse.json({
      message: `Successfully ${validatedData.action}d ${validatedData.ticketIds.length} ticket(s)`,
      processedCount: validatedData.ticketIds.length,
      action: validatedData.action
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error processing bulk approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}