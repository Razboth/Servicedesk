import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const branchId = user?.branchId;

    // Build where clause for filtering based on role
    let ticketFilter: any = {};
    if (isBranchRole && branchId) {
      ticketFilter.branchId = branchId;
    }

    // Get all tickets with priority analysis
    const tickets = await prisma.ticket.findMany({
      where: ticketFilter,
      include: {
        service: {
          select: {
            name: true,
            category: { select: { name: true } }
          }
        },
        createdBy: {
          select: { name: true, role: true }
        },
        assignedTo: {
          select: { name: true, role: true }
        },
        branch: {
          select: { name: true, code: true }
        }
      }
    });

    // Date ranges for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // SLA targets by priority
    const slaTargets = {
      CRITICAL: { response: 1, resolution: 4 },
      HIGH: { response: 2, resolution: 8 },
      MEDIUM: { response: 4, resolution: 24 },
      LOW: { response: 8, resolution: 72 }
    };

    // Group tickets by priority
    const priorityAnalysis = tickets.reduce((acc: any, ticket) => {
      const priority = ticket.priority;
      if (!acc[priority]) {
        acc[priority] = {
          priority,
          totalTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          recentTickets: 0,
          weeklyTickets: 0,
          dailyTickets: 0,
          avgResolutionHours: 0,
          avgResponseHours: 0,
          slaCompliant: 0,
          breachedTickets: 0,
          overdueTickets: 0,
          unassignedTickets: 0,
          totalResolutionTime: 0,
          totalResponseTime: 0,
          resolvedCount: 0,
          responseCount: 0,
          serviceDistribution: {},
          branchDistribution: {},
          technicianDistribution: {},
          slaTarget: slaTargets[priority as keyof typeof slaTargets] || slaTargets.MEDIUM
        };
      }

      const priorityData = acc[priority];
      priorityData.totalTickets++;

      // Status distribution
      if (ticket.status === 'OPEN') priorityData.openTickets++;
      else if (ticket.status === 'IN_PROGRESS') priorityData.inProgressTickets++;
      else if (ticket.status === 'RESOLVED') priorityData.resolvedTickets++;
      else if (ticket.status === 'CLOSED') priorityData.closedTickets++;

      // Date-based filtering
      if (ticket.createdAt >= thirtyDaysAgo) priorityData.recentTickets++;
      if (ticket.createdAt >= sevenDaysAgo) priorityData.weeklyTickets++;
      if (ticket.createdAt >= twentyFourHoursAgo) priorityData.dailyTickets++;

      // Assignment status
      if (!ticket.assignedToId) priorityData.unassignedTickets++;

      // Overdue calculation (open tickets older than 24 hours)
      if (['OPEN', 'IN_PROGRESS'].includes(ticket.status) && ticket.createdAt < twentyFourHoursAgo) {
        priorityData.overdueTickets++;
      }

      // Resolution time calculation
      if (ticket.resolvedAt) {
        const resolutionHours = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
        priorityData.totalResolutionTime += resolutionHours;
        priorityData.resolvedCount++;

        // Check SLA compliance
        const target = priorityData.slaTarget.resolution;
        if (resolutionHours <= target) {
          priorityData.slaCompliant++;
        } else {
          priorityData.breachedTickets++;
        }
      }

      // Response time calculation
      if (ticket.firstResponseAt) {
        const responseHours = (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
        priorityData.totalResponseTime += responseHours;
        priorityData.responseCount++;
      }

      // Service distribution
      const serviceName = ticket.service?.name || 'Unknown';
      priorityData.serviceDistribution[serviceName] = (priorityData.serviceDistribution[serviceName] || 0) + 1;

      // Branch distribution
      const branchName = ticket.branch?.name || 'Unknown';
      priorityData.branchDistribution[branchName] = (priorityData.branchDistribution[branchName] || 0) + 1;

      // Technician distribution
      const technicianName = ticket.assignedTo?.name || 'Unassigned';
      priorityData.technicianDistribution[technicianName] = (priorityData.technicianDistribution[technicianName] || 0) + 1;

      return acc;
    }, {});

    // Calculate averages and percentages
    Object.keys(priorityAnalysis).forEach(priority => {
      const data = priorityAnalysis[priority];
      data.avgResolutionHours = data.resolvedCount > 0 ? 
        Math.round((data.totalResolutionTime / data.resolvedCount) * 10) / 10 : 0;
      data.avgResponseHours = data.responseCount > 0 ?
        Math.round((data.totalResponseTime / data.responseCount) * 10) / 10 : 0;
      data.resolutionRate = data.totalTickets > 0 ?
        Math.round((data.resolvedTickets / data.totalTickets) * 100 * 10) / 10 : 0;
      data.slaComplianceRate = data.resolvedCount > 0 ?
        Math.round((data.slaCompliant / data.resolvedCount) * 100 * 10) / 10 : 0;
      data.assignmentRate = data.totalTickets > 0 ?
        Math.round(((data.totalTickets - data.unassignedTickets) / data.totalTickets) * 100 * 10) / 10 : 0;

      // Convert distributions to arrays
      data.topServices = Object.entries(data.serviceDistribution)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      data.topBranches = Object.entries(data.branchDistribution)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      data.topTechnicians = Object.entries(data.technicianDistribution)
        .filter(([name]) => name !== 'Unassigned')
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    });

    // Convert to array and sort by priority importance
    const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const priorityData = priorityOrder
      .filter(p => priorityAnalysis[p])
      .map(p => priorityAnalysis[p]);

    // Add any additional priorities not in the standard order
    Object.keys(priorityAnalysis).forEach(priority => {
      if (!priorityOrder.includes(priority)) {
        priorityData.push(priorityAnalysis[priority]);
      }
    });

    // Overall statistics
    const totalTickets = tickets.length;
    const totalResolved = tickets.filter(t => t.status === 'RESOLVED').length;
    const totalOverdue = tickets.filter(t => 
      ['OPEN', 'IN_PROGRESS'].includes(t.status) && t.createdAt < twentyFourHoursAgo
    ).length;

    // Monthly trend data (last 6 months)
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const monthTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= monthStart && ticketDate <= monthEnd;
      });

      const priorityBreakdown = monthTickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      return {
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total: monthTickets.length,
        ...priorityBreakdown
      };
    });

    const summary = {
      totalTickets,
      totalResolved,
      totalOverdue,
      resolutionRate: totalTickets > 0 ? Math.round((totalResolved / totalTickets) * 100 * 10) / 10 : 0,
      overdueRate: totalTickets > 0 ? Math.round((totalOverdue / totalTickets) * 100 * 10) / 10 : 0,
      avgResolutionTime: priorityData.reduce((sum, p) => sum + (p.avgResolutionHours * p.resolvedCount), 0) / 
                        priorityData.reduce((sum, p) => sum + p.resolvedCount, 0) || 0
    };

    return NextResponse.json({
      summary,
      priorityData,
      monthlyTrend,
      slaTargets
    });

  } catch (error) {
    console.error('Error fetching requests by priority data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}