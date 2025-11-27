import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  count: number;
  percentage: number;
}

interface CommonIssue {
  categoryId: string;
  categoryName: string;
  mostCommonStatus: string;
  statusCount: number;
  totalInCategory: number;
}

interface DurationByCategory {
  categoryId: string;
  categoryName: string;
  avgDuration: number; // in hours
  ticketCount: number;
}

interface CommonServiceByCategory {
  categoryId: string;
  categoryName: string;
  serviceId: string;
  serviceName: string;
  ticketCount: number;
  totalInCategory: number;
  percentage: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Validate month and year
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
    }

    const targetDate = new Date(year, month - 1, 1);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // 1. Get total tickets, claimed, and unclaimed
    const totalTickets = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const claimedTickets = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        },
        assignedToId: { not: null }
      }
    });

    const unclaimedTickets = totalTickets - claimedTickets;

    // 2. Get category breakdown
    const ticketsByService = await prisma.ticket.groupBy({
      by: ['serviceId'],
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _count: { id: true }
    });

    // Get services with their tier1 categories
    const serviceIds = ticketsByService.map(t => t.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      include: {
        tier1Category: {
          select: { id: true, name: true }
        }
      }
    });

    // Aggregate by tier-1 category
    const categoryMap = new Map<string, { name: string; count: number }>();
    for (const ticket of ticketsByService) {
      const service = services.find(s => s.id === ticket.serviceId);
      if (service?.tier1Category) {
        const categoryId = service.tier1Category.id;
        const categoryName = service.tier1Category.name;
        const existing = categoryMap.get(categoryId);
        if (existing) {
          existing.count += ticket._count.id;
        } else {
          categoryMap.set(categoryId, { name: categoryName, count: ticket._count.id });
        }
      } else {
        // Handle tickets without tier1 category
        const existing = categoryMap.get('uncategorized');
        if (existing) {
          existing.count += ticket._count.id;
        } else {
          categoryMap.set('uncategorized', { name: 'Uncategorized', count: ticket._count.id });
        }
      }
    }

    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        count: data.count,
        percentage: totalTickets > 0 ? Math.round((data.count / totalTickets) * 100 * 10) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 3. Get most common service by category
    const categoryServiceMap = new Map<string, Map<string, { serviceName: string; count: number }>>();

    for (const ticket of ticketsByService) {
      const service = services.find(s => s.id === ticket.serviceId);
      const categoryId = service?.tier1Category?.id || 'uncategorized';

      if (!categoryServiceMap.has(categoryId)) {
        categoryServiceMap.set(categoryId, new Map());
      }

      const serviceMap = categoryServiceMap.get(categoryId)!;
      const existing = serviceMap.get(ticket.serviceId);
      if (existing) {
        existing.count += ticket._count.id;
      } else {
        serviceMap.set(ticket.serviceId, {
          serviceName: service?.name || 'Unknown Service',
          count: ticket._count.id
        });
      }
    }

    const commonServicesByCategory: CommonServiceByCategory[] = Array.from(categoryServiceMap.entries())
      .map(([categoryId, serviceMap]) => {
        let mostCommonServiceId = '';
        let mostCommonServiceName = '';
        let maxCount = 0;
        let totalInCat = 0;

        for (const [serviceId, data] of serviceMap.entries()) {
          totalInCat += data.count;
          if (data.count > maxCount) {
            maxCount = data.count;
            mostCommonServiceId = serviceId;
            mostCommonServiceName = data.serviceName;
          }
        }

        const categoryData = categoryMap.get(categoryId);
        return {
          categoryId,
          categoryName: categoryData?.name || 'Uncategorized',
          serviceId: mostCommonServiceId,
          serviceName: mostCommonServiceName,
          ticketCount: maxCount,
          totalInCategory: totalInCat,
          percentage: totalInCat > 0 ? Math.round((maxCount / totalInCat) * 100 * 10) / 10 : 0
        };
      })
      .sort((a, b) => b.totalInCategory - a.totalInCategory);

    // 4. Get most common status by category
    const ticketsByServiceAndStatus = await prisma.ticket.groupBy({
      by: ['serviceId', 'status'],
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _count: { id: true }
    });

    // Aggregate by category and find most common status
    const categoryStatusMap = new Map<string, Map<string, number>>();
    const categoryTotalMap = new Map<string, number>();

    for (const ticket of ticketsByServiceAndStatus) {
      const service = services.find(s => s.id === ticket.serviceId);
      const categoryId = service?.tier1Category?.id || 'uncategorized';

      if (!categoryStatusMap.has(categoryId)) {
        categoryStatusMap.set(categoryId, new Map());
      }

      const statusMap = categoryStatusMap.get(categoryId)!;
      const currentCount = statusMap.get(ticket.status) || 0;
      statusMap.set(ticket.status, currentCount + ticket._count.id);

      const currentTotal = categoryTotalMap.get(categoryId) || 0;
      categoryTotalMap.set(categoryId, currentTotal + ticket._count.id);
    }

    const commonIssues: CommonIssue[] = Array.from(categoryStatusMap.entries())
      .map(([categoryId, statusMap]) => {
        let mostCommonStatus = '';
        let maxCount = 0;

        for (const [status, count] of statusMap.entries()) {
          if (count > maxCount) {
            maxCount = count;
            mostCommonStatus = status;
          }
        }

        const categoryData = categoryMap.get(categoryId);
        return {
          categoryId,
          categoryName: categoryData?.name || 'Uncategorized',
          mostCommonStatus,
          statusCount: maxCount,
          totalInCategory: categoryTotalMap.get(categoryId) || 0
        };
      })
      .sort((a, b) => b.totalInCategory - a.totalInCategory);

    // 4. Calculate duration metrics (approval to close)
    const closedTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        },
        closedAt: { not: null }
      },
      include: {
        approvals: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'asc' },
          take: 1
        },
        service: {
          include: {
            tier1Category: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Calculate average duration overall and by category
    let totalDuration = 0;
    let ticketsWithDuration = 0;
    const categoryDurationMap = new Map<string, { totalDuration: number; count: number; name: string }>();

    for (const ticket of closedTickets) {
      if (ticket.closedAt && ticket.approvals.length > 0) {
        const approval = ticket.approvals[0];
        const duration = (ticket.closedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60); // hours

        if (duration >= 0) {
          totalDuration += duration;
          ticketsWithDuration++;

          const categoryId = ticket.service?.tier1Category?.id || 'uncategorized';
          const categoryName = ticket.service?.tier1Category?.name || 'Uncategorized';

          const existing = categoryDurationMap.get(categoryId);
          if (existing) {
            existing.totalDuration += duration;
            existing.count++;
          } else {
            categoryDurationMap.set(categoryId, {
              totalDuration: duration,
              count: 1,
              name: categoryName
            });
          }
        }
      }
    }

    const averageApprovalToClose = ticketsWithDuration > 0
      ? Math.round((totalDuration / ticketsWithDuration) * 10) / 10
      : 0;

    const durationByCategory: DurationByCategory[] = Array.from(categoryDurationMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        avgDuration: Math.round((data.totalDuration / data.count) * 10) / 10,
        ticketCount: data.count
      }))
      .sort((a, b) => b.ticketCount - a.ticketCount);

    // 5. Get status distribution for all tickets in the period
    const statusDistribution = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      _count: { id: true }
    });

    return NextResponse.json({
      summary: {
        totalTickets,
        claimedTickets,
        unclaimedTickets,
        claimedPercentage: totalTickets > 0 ? Math.round((claimedTickets / totalTickets) * 100 * 10) / 10 : 0,
        unclaimedPercentage: totalTickets > 0 ? Math.round((unclaimedTickets / totalTickets) * 100 * 10) / 10 : 0
      },
      categoryBreakdown,
      commonServicesByCategory,
      commonIssues,
      durationMetrics: {
        averageApprovalToClose,
        byCategory: durationByCategory
      },
      statusDistribution: statusDistribution.map(s => ({
        status: s.status,
        count: s._count.id
      })),
      period: {
        month,
        year,
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching monthly report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly report' },
      { status: 500 }
    );
  }
}
