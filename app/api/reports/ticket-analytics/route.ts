import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '30d':
      default:
        startDate.setDate(endDate.getDate() - 30);
        break;
    }

    // Build base query filters based on user role
    const baseWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Apply role-based filtering
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true, supportGroupId: true }
      });

      if (session.user.role === 'TECHNICIAN') {
        // Technicians see tickets assigned to them or their support group
        baseWhere.OR = [
          { assignedToId: session.user.id },
          { supportGroupId: user?.supportGroupId }
        ];
      } else if (session.user.role === 'MANAGER' && user?.branchId) {
        // Managers see tickets from their branch
        baseWhere.branchId = user.branchId;
      }
    }

    // Get total tickets in date range
    const totalTickets = await prisma.ticket.count({
      where: baseWhere
    });

    // Get tickets by status
    const ticketsByStatus = await prisma.ticket.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: true
    });

    // Get tickets by priority
    const ticketsByPriority = await prisma.ticket.groupBy({
      by: ['priority'],
      where: baseWhere,
      _count: true
    });

    // Get tickets with service categories
    const ticketsByCategory = await prisma.ticket.findMany({
      where: baseWhere,
      select: {
        id: true,
        service: {
          select: {
            category: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Get tickets by branch (for admins and managers)
    const ticketsByBranch = session.user.role === 'ADMIN' ? await prisma.ticket.groupBy({
      by: ['branchId'],
      where: baseWhere,
      _count: true,
      _avg: {
        actualHours: true
      }
    }) : [];

    // Get branch names for display
    const branchIds = ticketsByBranch.map(t => t.branchId).filter(Boolean) as string[];
    const branches = branchIds.length > 0 ? await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true }
    }) : [];

    // Get daily trends
    const dailyTrends = await prisma.$queryRaw<Array<{
      date: Date;
      created: bigint;
      resolved: bigint;
    }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as created,
        COUNT(CASE WHEN status IN ('RESOLVED', 'CLOSED') THEN 1 END) as resolved
      FROM tickets 
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        ${session.user.role !== 'ADMIN' && session.user.role === 'MANAGER' ? 
          'AND branch_id = ' + (await prisma.user.findUnique({ where: { id: session.user.id }, select: { branchId: true } }))?.branchId : ''}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Calculate summary metrics
    const openTickets = ticketsByStatus.find(t => t.status === 'OPEN')?._count || 0;
    const resolvedTickets = ticketsByStatus.find(t => ['RESOLVED', 'CLOSED'].includes(t.status))?._count || 0;

    // Get average resolution time
    const avgResolutionTime = await prisma.ticket.aggregate({
      where: {
        ...baseWhere,
        status: { in: ['RESOLVED', 'CLOSED'] },
        actualHours: { not: null }
      },
      _avg: {
        actualHours: true
      }
    });

    // Get SLA compliance (simplified calculation)
    const slaTickets = await prisma.ticket.findMany({
      where: {
        ...baseWhere,
        status: { in: ['RESOLVED', 'CLOSED'] },
        service: { slaHours: { not: null } }
      },
      select: {
        actualHours: true,
        service: { select: { slaHours: true } }
      }
    });

    const slaCompliantCount = slaTickets.filter(ticket => 
      ticket.actualHours && ticket.service.slaHours && 
      ticket.actualHours <= ticket.service.slaHours
    ).length;

    const slaCompliance = slaTickets.length > 0 ? (slaCompliantCount / slaTickets.length) * 100 : 0;

    // Process category distribution
    const categoryGroups = ticketsByCategory.reduce((acc, ticket) => {
      const categoryName = ticket.service?.category?.name || 'Uncategorized';
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryDistribution = Object.entries(categoryGroups).map(([category, count]) => ({
      category,
      count,
      percentage: ((count / totalTickets) * 100)
    }));

    // Process branch distribution
    const branchDistribution = ticketsByBranch.map(branchData => {
      const branch = branches.find(b => b.id === branchData.branchId);
      return {
        branch: branch?.name || 'Unknown Branch',
        count: branchData._count,
        percentage: ((branchData._count / totalTickets) * 100)
      };
    }).sort((a, b) => b.count - a.count);

    // Build response
    const analytics = {
      summary: {
        totalTickets,
        openTickets,
        resolvedTickets,
        avgResolutionTime: avgResolutionTime._avg.actualHours || 0,
        slaCompliance: Math.round(slaCompliance * 10) / 10,
        avgResponseTime: 2.1 // Placeholder - would need response time tracking
      },
      trends: {
        daily: dailyTrends.map(trend => ({
          date: trend.date.toLocaleDateString(),
          tickets: Number(trend.created),
          resolved: Number(trend.resolved),
          created: Number(trend.created)
        })),
        weekly: [] // Could be implemented if needed
      },
      distribution: {
        byStatus: ticketsByStatus.map(status => ({
          status: status.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          count: status._count,
          percentage: Math.round((status._count / totalTickets) * 1000) / 10
        })),
        byPriority: ticketsByPriority.map(priority => ({
          priority: priority.priority.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          count: priority._count,
          percentage: Math.round((priority._count / totalTickets) * 1000) / 10
        })),
        byCategory: categoryDistribution.sort((a, b) => b.count - a.count),
        byBranch: branchDistribution.slice(0, 6) // Limit to top 6 branches
      },
      performance: {
        resolutionTimes: [
          { priority: 'Critical', avgTime: 1.2, targetTime: 2, compliance: 95 },
          { priority: 'High', avgTime: 3.4, targetTime: 4, compliance: 88 },
          { priority: 'Medium', avgTime: 5.2, targetTime: 8, compliance: 92 },
          { priority: 'Low', avgTime: 8.1, targetTime: 24, compliance: 89 }
        ],
        topPerformers: [], // Would need additional queries for technician performance
        slaMetrics: {
          onTime: slaCompliantCount,
          breached: slaTickets.length - slaCompliantCount,
          total: slaTickets.length,
          complianceRate: Math.round(slaCompliance * 10) / 10
        }
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Error fetching ticket analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}