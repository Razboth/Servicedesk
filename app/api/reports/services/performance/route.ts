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
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const itemId = searchParams.get('itemId');

    // Build where clause
    const whereClause: any = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    };

    // Apply role-based filtering
    if (session.user.role === 'USER') {
      whereClause.createdById = session.user.id;
    } else if (session.user.role === 'TECHNICIAN') {
      const userWithGroup = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { supportGroup: true }
      });
      
      if (userWithGroup?.supportGroupId) {
        whereClause.service = {
          supportGroupId: userWithGroup.supportGroupId
        };
      }
    } else if (session.user.role === 'MANAGER') {
      const manager = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (manager?.branchId) {
        whereClause.createdBy = {
          branchId: manager.branchId
        };
      }
    }

    // Apply category filters if provided
    if (categoryId) whereClause.categoryId = categoryId;
    if (subcategoryId) whereClause.subcategoryId = subcategoryId;
    if (itemId) whereClause.itemId = itemId;

    // Get all services with their ticket statistics
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { tier1CategoryId: categoryId } : {}),
        ...(subcategoryId ? { tier2SubcategoryId: subcategoryId } : {}),
        ...(itemId ? { tier3ItemId: itemId } : {})
      },
      include: {
        tier1Category: { select: { name: true } },
        tier2Subcategory: { select: { name: true } },
        tier3Item: { select: { name: true } },
        supportGroup: { select: { name: true } },
        tickets: {
          where: whereClause,
          select: {
            id: true,
            status: true,
            priority: true,
            createdAt: true,
            resolvedAt: true,
            closedAt: true,
            firstResponseAt: true
          }
        },
        _count: {
          select: {
            tickets: {
              where: whereClause
            }
          }
        }
      },
      orderBy: {
        tickets: {
          _count: 'desc'
        }
      }
    });

    // Calculate performance metrics for each service
    const servicePerformance = services.map(service => {
      const tickets = service.tickets;
      const totalTickets = tickets.length;
      
      // Status breakdown
      const statusCounts = {
        open: tickets.filter(t => t.status === 'OPEN').length,
        inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolved: tickets.filter(t => t.status === 'RESOLVED').length,
        closed: tickets.filter(t => t.status === 'CLOSED').length,
        pending: tickets.filter(t => ['PENDING', 'PENDING_APPROVAL', 'PENDING_VENDOR'].includes(t.status)).length
      };

      // Priority breakdown
      const priorityCounts = {
        low: tickets.filter(t => t.priority === 'LOW').length,
        medium: tickets.filter(t => t.priority === 'MEDIUM').length,
        high: tickets.filter(t => t.priority === 'HIGH').length,
        urgent: tickets.filter(t => t.priority === 'URGENT').length,
        critical: tickets.filter(t => t.priority === 'CRITICAL').length
      };

      // Calculate resolution metrics
      const resolvedTickets = tickets.filter(t => t.resolvedAt);
      const avgResolutionTime = resolvedTickets.length > 0 ?
        resolvedTickets.reduce((sum, t) => {
          const resTime = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
          return sum + resTime;
        }, 0) / resolvedTickets.length / (1000 * 60 * 60) : 0; // in hours

      // Calculate response time
      const respondedTickets = tickets.filter(t => t.firstResponseAt);
      const avgResponseTime = respondedTickets.length > 0 ?
        respondedTickets.reduce((sum, t) => {
          const respTime = new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime();
          return sum + respTime;
        }, 0) / respondedTickets.length / (1000 * 60) : 0; // in minutes

      // Resolution rate
      const resolutionRate = totalTickets > 0 ?
        (statusCounts.resolved + statusCounts.closed) / totalTickets * 100 : 0;

      return {
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.tier1Category?.name || 'Uncategorized',
        subcategory: service.tier2Subcategory?.name || '-',
        item: service.tier3Item?.name || '-',
        supportGroup: service.supportGroup?.name || 'Unassigned',
        slaResponseTime: service.slaResponseTime,
        slaResolutionTime: service.slaResolutionTime,
        totalTickets,
        statusCounts,
        priorityCounts,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        performance: {
          efficiency: resolutionRate > 80 ? 'Excellent' : resolutionRate > 60 ? 'Good' : resolutionRate > 40 ? 'Fair' : 'Needs Improvement',
          responseSpeed: avgResponseTime < 30 ? 'Fast' : avgResponseTime < 60 ? 'Normal' : 'Slow',
          resolutionSpeed: avgResolutionTime < 24 ? 'Fast' : avgResolutionTime < 72 ? 'Normal' : 'Slow'
        }
      };
    });

    // Get top performers and underperformers
    const topPerformers = servicePerformance
      .filter(s => s.totalTickets > 0)
      .sort((a, b) => b.resolutionRate - a.resolutionRate)
      .slice(0, 5);

    const needsAttention = servicePerformance
      .filter(s => s.totalTickets > 0)
      .sort((a, b) => a.resolutionRate - b.resolutionRate)
      .slice(0, 5);

    const mostUsed = servicePerformance
      .sort((a, b) => b.totalTickets - a.totalTickets)
      .slice(0, 10);

    // Category distribution
    const categoryDistribution = servicePerformance.reduce((acc, service) => {
      const category = service.category;
      if (!acc[category]) {
        acc[category] = {
          name: category,
          services: 0,
          tickets: 0,
          avgResolutionTime: 0,
          resolutionRates: []
        };
      }
      acc[category].services++;
      acc[category].tickets += service.totalTickets;
      acc[category].resolutionRates.push(service.resolutionRate);
      return acc;
    }, {} as Record<string, any>);

    // Calculate category averages
    Object.values(categoryDistribution).forEach((cat: any) => {
      cat.avgResolutionRate = cat.resolutionRates.length > 0 ?
        Math.round(cat.resolutionRates.reduce((a: number, b: number) => a + b, 0) / cat.resolutionRates.length * 10) / 10 : 0;
      delete cat.resolutionRates;
    });

    // Overall statistics
    const totalTickets = servicePerformance.reduce((sum, s) => sum + s.totalTickets, 0);
    const totalResolved = servicePerformance.reduce((sum, s) => sum + s.statusCounts.resolved + s.statusCounts.closed, 0);
    const overallResolutionRate = totalTickets > 0 ? (totalResolved / totalTickets) * 100 : 0;

    return NextResponse.json({
      services: servicePerformance,
      topPerformers,
      needsAttention,
      mostUsed,
      categoryDistribution: Object.values(categoryDistribution),
      summary: {
        totalServices: services.length,
        totalTickets,
        totalResolved,
        overallResolutionRate: Math.round(overallResolutionRate * 10) / 10,
        avgTicketsPerService: Math.round((totalTickets / services.length) * 10) / 10,
        activeServices: servicePerformance.filter(s => s.totalTickets > 0).length
      },
      period: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching service performance report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service performance report' },
      { status: 500 }
    );
  }
}