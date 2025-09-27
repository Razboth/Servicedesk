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
    const dateRange = searchParams.get('dateRange') || 'today'; // today, week, month, all

    // Get user details for role-based filtering
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    if (!userWithDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Base where clause for API tickets
    const baseWhere: any = {
      createdAt: { gte: startDate },
      OR: [
        { sourceChannel: { not: null } },
        {
          metadata: {
            path: ['integration'],
            not: null
          }
        },
        {
          metadata: {
            path: ['originalRequest', 'channel'],
            equals: 'API'
          }
        }
      ]
    };

    // Apply role-based filtering
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userWithDetails.role)) {
      if (userWithDetails.role === 'MANAGER') {
        baseWhere.branchId = userWithDetails.branchId;
      } else {
        baseWhere.OR = [
          { createdById: session.user.id },
          { assignedToId: session.user.id }
        ];
      }
    }

    // Get all stats in parallel
    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      autoResolvedTickets,
      avgResolutionTime,
      channelBreakdown,
      hourlyTrends,
      priorityBreakdown,
      topServices
    ] = await Promise.all([
      // Total API tickets
      prisma.ticket.count({ where: baseWhere }),

      // Open tickets
      prisma.ticket.count({
        where: { ...baseWhere, status: { in: ['OPEN', 'IN_PROGRESS'] } }
      }),

      // Resolved tickets
      prisma.ticket.count({
        where: { ...baseWhere, status: { in: ['RESOLVED', 'CLOSED'] } }
      }),

      // Auto-resolved tickets (simplified detection)
      prisma.ticket.count({
        where: {
          ...baseWhere,
          status: { in: ['RESOLVED', 'CLOSED'] },
          assignedToId: null
        }
      }),

      // Average resolution time
      prisma.ticket.aggregate({
        where: {
          ...baseWhere,
          status: { in: ['RESOLVED', 'CLOSED'] }
        },
        _avg: {
          id: true // We'll calculate this differently below
        }
      }),

      // Channel breakdown
      getChannelBreakdown(baseWhere),

      // Hourly trends (last 24 hours)
      getHourlyTrends(baseWhere),

      // Priority breakdown
      prisma.ticket.groupBy({
        by: ['priority'],
        where: baseWhere,
        _count: { id: true }
      }),

      // Top services
      prisma.ticket.groupBy({
        by: ['serviceId'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })
    ]);

    // Calculate actual average resolution time
    const resolvedTicketsWithTimes = await prisma.ticket.findMany({
      where: {
        ...baseWhere,
        status: { in: ['RESOLVED', 'CLOSED'] }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    const avgResolutionMinutes = resolvedTicketsWithTimes.length > 0
      ? resolvedTicketsWithTimes.reduce((sum, ticket) => {
          const diffMs = new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime();
          return sum + (diffMs / (1000 * 60)); // Convert to minutes
        }, 0) / resolvedTicketsWithTimes.length
      : 0;

    // Get service names for top services
    const serviceIds = topServices.map(s => s.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true }
    });

    const topServicesWithNames = topServices.map(stat => ({
      ...stat,
      serviceName: services.find(s => s.id === stat.serviceId)?.name || 'Unknown'
    }));

    // Calculate resolution rate
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
    const autoResolutionRate = resolvedTickets > 0 ? Math.round((autoResolvedTickets / resolvedTickets) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalTickets,
        openTickets,
        resolvedTickets,
        autoResolvedTickets,
        resolutionRate,
        autoResolutionRate,
        avgResolutionTime: Math.round(avgResolutionMinutes)
      },
      breakdowns: {
        channels: channelBreakdown,
        priorities: priorityBreakdown,
        topServices: topServicesWithNames
      },
      trends: {
        hourly: hourlyTrends
      },
      period: {
        range: dateRange,
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching API ticket stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API ticket statistics' },
      { status: 500 }
    );
  }
}

// Helper function to get channel breakdown
async function getChannelBreakdown(baseWhere: any) {
  const tickets = await prisma.ticket.findMany({
    where: baseWhere,
    select: {
      sourceChannel: true,
      metadata: true,
      service: { select: { name: true } }
    }
  });

  const breakdown: Record<string, number> = {};

  tickets.forEach(ticket => {
    let channel = 'Unknown';

    if (ticket.sourceChannel) {
      channel = ticket.sourceChannel;
    } else if (ticket.metadata?.originalRequest?.channel === 'API') {
      if (ticket.service?.name?.includes('ATM')) {
        channel = 'ATM API';
      } else {
        channel = 'Direct API';
      }
    } else if (ticket.metadata?.integration) {
      channel = 'Integration API';
    }

    breakdown[channel] = (breakdown[channel] || 0) + 1;
  });

  return Object.entries(breakdown).map(([channel, count]) => ({
    channel,
    count
  }));
}

// Helper function to get hourly trends
async function getHourlyTrends(baseWhere: any) {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const hourlyTickets = await prisma.ticket.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: last24Hours }
    },
    select: { createdAt: true }
  });

  // Group by hour
  const hourlyBreakdown: Record<number, number> = {};

  // Initialize with 0 for all hours in last 24
  for (let i = 0; i < 24; i++) {
    const hour = new Date(Date.now() - (23 - i) * 60 * 60 * 1000).getHours();
    hourlyBreakdown[hour] = 0;
  }

  hourlyTickets.forEach(ticket => {
    const hour = new Date(ticket.createdAt).getHours();
    hourlyBreakdown[hour] = (hourlyBreakdown[hour] || 0) + 1;
  });

  return Object.entries(hourlyBreakdown).map(([hour, count]) => ({
    hour: parseInt(hour),
    count
  }));
}