import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');

    // Find the service
    const service = await prisma.service.findFirst({
      where: {
        OR: [
          { name: { contains: 'Pembukaan Operasional Cabang di Hari Libur', mode: 'insensitive' } },
          { name: { contains: 'Holiday Branch Operation', mode: 'insensitive' } }
        ],
        isActive: true
      }
    });

    if (!service) {
      return NextResponse.json({
        error: 'Service not found',
        tickets: [],
        total: 0,
        service: null
      }, { status: 200 });
    }

    // Build where clause
    const where: any = {
      serviceId: service.id
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    if (status) {
      where.status = status;
    }

    if (branchId) {
      where.createdBy = {
        branchId: branchId
      };
    }

    // Fetch tickets with field values, comments (for claimedAt), and approvals
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true
          }
        },
        service: {
          select: {
            id: true,
            name: true
          }
        },
        fieldValues: {
          include: {
            field: {
              select: {
                id: true,
                name: true,
                label: true
              }
            }
          }
        },
        comments: {
          where: {
            OR: [
              { content: { contains: 'Ticket claimed by', mode: 'insensitive' } },
              { content: { contains: 'Ticket assigned to', mode: 'insensitive' } }
            ]
          },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' as const },
          take: 1
        },
        approvals: {
          select: {
            id: true,
            status: true,
            reason: true,
            createdAt: true,
            updatedAt: true,
            approver: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' as const },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the response
    const transformedTickets = tickets.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() || null,
      closedAt: ticket.closedAt?.toISOString() || null,
      claimedAt: ticket.comments[0]?.createdAt?.toISOString() || null,
      createdBy: {
        name: ticket.createdBy.name,
        email: ticket.createdBy.email
      },
      branch: ticket.createdBy.branch ? {
        id: ticket.createdBy.branch.id,
        name: ticket.createdBy.branch.name,
        code: ticket.createdBy.branch.code
      } : { id: '', name: 'Unknown', code: '-' },
      assignedTo: ticket.assignedTo ? {
        name: ticket.assignedTo.name
      } : null,
      service: {
        name: ticket.service.name
      },
      approvalStatus: ticket.approvals[0]?.status || null,
      approvedBy: ticket.approvals[0]?.approver?.name || null,
      approvalReason: ticket.approvals[0]?.reason || null,
      fieldValues: ticket.fieldValues.map(fv => ({
        field: {
          name: fv.field.name,
          label: fv.field.label
        },
        value: fv.value
      }))
    }));

    return NextResponse.json({
      success: true,
      tickets: transformedTickets,
      total: transformedTickets.length,
      service: {
        id: service.id,
        name: service.name
      }
    });

  } catch (error) {
    console.error('Holiday Branch Operation Report Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}
