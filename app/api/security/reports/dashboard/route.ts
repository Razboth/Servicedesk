import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SECURITY_ANALYST and ADMIN roles can access this
    if (!['SECURITY_ANALYST', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Access denied. This report is only available to Security Analysts.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const periodDays = parseInt(period);

    // Get user's support group for filtering
    const userWithGroup = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { supportGroup: true }
    });

    // Date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);

    // Build where clause for Security Analyst's support group
    const whereClause: any = {
      createdAt: { gte: startDate }
    };

    if (session.user.role === 'SECURITY_ANALYST' && userWithGroup?.supportGroupId) {
      whereClause.AND = [
        {
          OR: [
            { createdById: session.user.id },
            { assignedToId: session.user.id },
            { service: { supportGroupId: userWithGroup.supportGroupId } },
            { supportGroupId: userWithGroup.supportGroupId }
          ]
        }
      ];
    }

    // Get total ticket counts by status
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      pendingTickets
    ] = await Promise.all([
      prisma.ticket.count({ where: whereClause }),
      prisma.ticket.count({ where: { ...whereClause, status: 'OPEN' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { ...whereClause, status: 'CLOSED' } }),
      prisma.ticket.count({
        where: {
          ...whereClause,
          status: { in: ['PENDING', 'PENDING_APPROVAL', 'PENDING_VENDOR'] }
        }
      })
    ]);

    // Get ticket counts by priority (using valid TicketPriority enum values)
    const [criticalTickets, highTickets, mediumTickets, lowTickets] = await Promise.all([
      prisma.ticket.count({ where: { ...whereClause, priority: 'CRITICAL' } }),
      prisma.ticket.count({ where: { ...whereClause, priority: 'HIGH' } }),
      prisma.ticket.count({ where: { ...whereClause, priority: 'MEDIUM' } }),
      prisma.ticket.count({ where: { ...whereClause, priority: 'LOW' } })
    ]);

    // Get SOC tickets (tickets with SOC-related services or created by SOC parser)
    const socWhereClause = {
      ...whereClause,
      AND: [
        ...(whereClause.AND || []),
        {
          OR: [
            { service: { name: { contains: 'SOC', mode: 'insensitive' } } },
            { service: { name: { contains: 'Security Incident', mode: 'insensitive' } } },
            { title: { contains: 'SOC', mode: 'insensitive' } },
            { isConfidential: true }
          ]
        }
      ]
    };
    const socTickets = await prisma.ticket.count({ where: socWhereClause });

    // Get Antivirus tickets
    const antivirusWhereClause = {
      ...whereClause,
      AND: [
        ...(whereClause.AND || []),
        {
          OR: [
            { service: { name: { contains: 'Antivirus', mode: 'insensitive' } } },
            { title: { contains: 'Antivirus', mode: 'insensitive' } },
            { title: { contains: 'Virus', mode: 'insensitive' } },
            { title: { contains: 'Malware', mode: 'insensitive' } }
          ]
        }
      ]
    };
    const antivirusTickets = await prisma.ticket.count({ where: antivirusWhereClause });

    // Get tickets by day for trend chart - use Prisma groupBy instead of raw SQL
    const ticketsByDayRaw = await prisma.ticket.groupBy({
      by: ['createdAt'],
      where: whereClause,
      _count: { id: true }
    });

    // Aggregate by date
    const dateCountMap = new Map<string, number>();
    ticketsByDayRaw.forEach(row => {
      const dateStr = new Date(row.createdAt).toISOString().split('T')[0];
      const current = dateCountMap.get(dateStr) || 0;
      dateCountMap.set(dateStr, current + row._count.id);
    });

    // Convert to sorted array
    const trendData = Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get tickets by service for pie chart
    const ticketsByService = await prisma.ticket.groupBy({
      by: ['serviceId'],
      where: whereClause,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    // Get service names
    const serviceIds = ticketsByService.map(t => t.serviceId).filter(Boolean) as string[];
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true }
    });
    const serviceMap = new Map(services.map(s => [s.id, s.name]));

    const serviceData = ticketsByService.map(t => ({
      name: serviceMap.get(t.serviceId || '') || 'Unknown',
      value: t._count.id
    }));

    // Get severity distribution for SOC tickets
    const socSeverityData = await prisma.ticket.groupBy({
      by: ['priority'],
      where: socWhereClause,
      _count: { id: true }
    });

    // Get antivirus action distribution
    const antivirusTicketsWithDetails = await prisma.ticket.findMany({
      where: antivirusWhereClause,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        status: true,
        priority: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Get recent security tickets
    const recentSecurityTickets = await prisma.ticket.findMany({
      where: whereClause,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        service: { select: { name: true } },
        assignedTo: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate average resolution time
    const resolvedTicketsWithTime = await prisma.ticket.findMany({
      where: {
        ...whereClause,
        resolvedAt: { not: null }
      },
      select: {
        createdAt: true,
        resolvedAt: true
      }
    });

    let avgResolutionHours = 0;
    if (resolvedTicketsWithTime.length > 0) {
      const totalHours = resolvedTicketsWithTime.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        const resolved = new Date(ticket.resolvedAt!).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedTicketsWithTime.length);
    }

    return NextResponse.json({
      summary: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        pendingTickets,
        socTickets,
        antivirusTickets,
        avgResolutionHours
      },
      priorityDistribution: {
        critical: criticalTickets,
        high: highTickets,
        medium: mediumTickets,
        low: lowTickets
      },
      statusDistribution: {
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        closed: closedTickets,
        pending: pendingTickets
      },
      trendData,
      serviceData,
      socSeverityData: socSeverityData.map(s => ({
        priority: s.priority,
        count: s._count.id
      })),
      recentTickets: recentSecurityTickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        status: t.status,
        priority: t.priority,
        service: t.service?.name || 'N/A',
        assignedTo: t.assignedTo?.name || 'Unassigned',
        createdAt: t.createdAt
      })),
      antivirusTickets: antivirusTicketsWithDetails.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt
      })),
      period: periodDays,
      supportGroup: userWithGroup?.supportGroup?.name || 'All'
    });

  } catch (error) {
    console.error('Error fetching security dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security dashboard data' },
      { status: 500 }
    );
  }
}
