import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {
      serviceId: params.id,
    };

    // Add filters
    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If user is not admin/manager, only show their tickets or tickets from their branch
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      where.OR = [
        { createdById: session.user.id },
        { assignedToId: session.user.id },
        { branchId: session.user.branchId }
      ];
    }

    // Get tickets with related data
    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              defaultTitle: true,
            },
          },
          slaTracking: {
            select: {
              responseDeadline: true,
              resolutionDeadline: true,
              isResponseBreached: true,
              isResolutionBreached: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      where: { serviceId: params.id },
      _count: true,
    });

    const priorityStats = await prisma.ticket.groupBy({
      by: ['priority'],
      where: { serviceId: params.id },
      _count: true,
    });

    // Calculate SLA performance
    const slaStats = await prisma.sLATracking.findMany({
      where: {
        ticket: {
          serviceId: params.id,
        },
      },
      select: {
        isResponseBreached: true,
        isResolutionBreached: true,
        responseDeadline: true,
        resolutionDeadline: true,
        responseTime: true,
        resolutionTime: true,
        ticket: {
          select: {
            status: true,
            resolvedAt: true,
            closedAt: true,
          },
        },
      },
    });

    const totalSLAs = slaStats.length;
    const responseBreached = slaStats.filter(s => s.isResponseBreached).length;
    const resolutionBreached = slaStats.filter(s => s.isResolutionBreached).length;

    // Calculate tickets meeting SLA
    const ticketsMetSLA = slaStats.filter(s => !s.isResponseBreached && !s.isResolutionBreached).length;

    // Calculate performance percentages
    const slaPerformance = {
      total: totalSLAs,
      met: ticketsMetSLA,
      breached: {
        response: responseBreached,
        resolution: resolutionBreached,
        total: slaStats.filter(s => s.isResponseBreached || s.isResolutionBreached).length,
      },
      performance: {
        overall: totalSLAs > 0 ? ((ticketsMetSLA / totalSLAs) * 100).toFixed(1) : '100.0',
        response: totalSLAs > 0 ? (((totalSLAs - responseBreached) / totalSLAs) * 100).toFixed(1) : '100.0',
        resolution: totalSLAs > 0 ? (((totalSLAs - resolutionBreached) / totalSLAs) * 100).toFixed(1) : '100.0',
      },
    };

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      stats: {
        byStatus: stats.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byPriority: priorityStats.reduce((acc, item) => {
          acc[item.priority] = item._count;
          return acc;
        }, {} as Record<string, number>),
        total: totalCount,
        sla: slaPerformance,
      },
    });
  } catch (error) {
    console.error('Error fetching service tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}