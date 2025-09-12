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
    let ticketFilter: any = {
      status: {
        in: ['OPEN', 'ON_HOLD']
      }
    };

    if (isBranchRole && branchId) {
      ticketFilter.branchId = branchId;
    }

    // Get all open and on-hold tickets
    const tickets = await prisma.ticket.findMany({
      where: ticketFilter,
      include: {
        service: {
          select: {
            name: true,
            category: { 
              select: { name: true }
            }
          }
        },
        assignedTo: {
          select: { 
            name: true, 
            email: true 
          }
        },
        createdBy: {
          select: { 
            name: true, 
            email: true 
          }
        },
        branch: {
          select: { 
            name: true, 
            code: true 
          }
        },
        comments: {
          select: {
            id: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: [
        { priority: 'asc' }, // CRITICAL first
        { createdAt: 'asc' }  // Oldest first
      ]
    });

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Transform tickets with aging information
    const ticketsWithAging = tickets.map(ticket => {
      const createdDate = new Date(ticket.createdAt);
      const daysOpen = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const hoursOpen = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
      
      // Get last comment/update date
      const lastCommentDate = ticket.comments[0]?.createdAt;
      const lastUpdated = lastCommentDate ? new Date(Math.max(
        new Date(ticket.updatedAt).getTime(),
        new Date(lastCommentDate).getTime()
      )) : new Date(ticket.updatedAt);

      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

      // Determine aging severity
      let agingSeverity = 'normal';
      if (daysOpen > 30) agingSeverity = 'critical';
      else if (daysOpen > 14) agingSeverity = 'warning';
      else if (daysOpen > 7) agingSeverity = 'caution';

      // SLA breach calculation
      const slaTargets = {
        CRITICAL: 4,
        HIGH: 8,
        MEDIUM: 24,
        LOW: 72
      };

      const slaTarget = slaTargets[ticket.priority as keyof typeof slaTargets] || 24;
      const isOverdue = hoursOpen > slaTarget;
      const slaBreachHours = isOverdue ? hoursOpen - slaTarget : 0;

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        service: ticket.service?.name || 'Unknown',
        category: ticket.service?.category?.name || 'Unknown',
        assignedTo: ticket.assignedTo?.name || null,
        assignedToEmail: ticket.assignedTo?.email || null,
        createdBy: ticket.createdBy?.name || 'Unknown',
        createdByEmail: ticket.createdBy?.email || '',
        branch: ticket.branch?.name || 'Unknown',
        branchCode: ticket.branch?.code || '',
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        lastUpdated: lastUpdated.toISOString(),
        daysOpen,
        hoursOpen,
        daysSinceUpdate,
        agingSeverity,
        isOverdue,
        slaTarget,
        slaBreachHours,
        holdReason: ticket.status === 'ON_HOLD' ? ticket.description : null // Placeholder for hold reason
      };
    });

    // Statistics
    const stats = {
      totalOpen: ticketsWithAging.filter(t => t.status === 'OPEN').length,
      totalOnHold: ticketsWithAging.filter(t => t.status === 'ON_HOLD').length,
      totalTickets: ticketsWithAging.length,
      unassigned: ticketsWithAging.filter(t => !t.assignedTo).length,
      overdue: ticketsWithAging.filter(t => t.isOverdue).length,
      
      // Aging breakdown
      critical: ticketsWithAging.filter(t => t.agingSeverity === 'critical').length,
      warning: ticketsWithAging.filter(t => t.agingSeverity === 'warning').length,
      caution: ticketsWithAging.filter(t => t.agingSeverity === 'caution').length,
      normal: ticketsWithAging.filter(t => t.agingSeverity === 'normal').length,
      
      // Time-based stats
      avgDaysOpen: ticketsWithAging.length > 0 ? 
        Math.round(ticketsWithAging.reduce((sum, t) => sum + t.daysOpen, 0) / ticketsWithAging.length * 10) / 10 : 0,
      
      oldestTicket: ticketsWithAging.length > 0 ? 
        Math.max(...ticketsWithAging.map(t => t.daysOpen)) : 0,
      
      // Priority breakdown
      criticalPriority: ticketsWithAging.filter(t => t.priority === 'CRITICAL').length,
      highPriority: ticketsWithAging.filter(t => t.priority === 'HIGH').length,
      mediumPriority: ticketsWithAging.filter(t => t.priority === 'MEDIUM').length,
      lowPriority: ticketsWithAging.filter(t => t.priority === 'LOW').length
    };

    // Category distribution
    const categoryDistribution = ticketsWithAging.reduce((acc: any, ticket) => {
      const category = ticket.category;
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          open: 0,
          onHold: 0,
          overdue: 0,
          avgDaysOpen: 0,
          totalDaysOpen: 0
        };
      }
      acc[category].total++;
      acc[category].totalDaysOpen += ticket.daysOpen;
      
      if (ticket.status === 'OPEN') acc[category].open++;
      if (ticket.status === 'ON_HOLD') acc[category].onHold++;
      if (ticket.isOverdue) acc[category].overdue++;
      
      return acc;
    }, {});

    // Calculate averages for categories
    Object.keys(categoryDistribution).forEach(category => {
      const cat = categoryDistribution[category];
      cat.avgDaysOpen = cat.total > 0 ? Math.round((cat.totalDaysOpen / cat.total) * 10) / 10 : 0;
      delete cat.totalDaysOpen; // Remove intermediate calculation
    });

    // Branch distribution
    const branchDistribution = ticketsWithAging.reduce((acc: any, ticket) => {
      const branch = ticket.branch;
      if (!acc[branch]) {
        acc[branch] = {
          total: 0,
          open: 0,
          onHold: 0,
          overdue: 0,
          unassigned: 0,
          avgDaysOpen: 0,
          totalDaysOpen: 0,
          branchCode: ticket.branchCode
        };
      }
      acc[branch].total++;
      acc[branch].totalDaysOpen += ticket.daysOpen;
      
      if (ticket.status === 'OPEN') acc[branch].open++;
      if (ticket.status === 'ON_HOLD') acc[branch].onHold++;
      if (ticket.isOverdue) acc[branch].overdue++;
      if (!ticket.assignedTo) acc[branch].unassigned++;
      
      return acc;
    }, {});

    // Calculate averages for branches
    Object.keys(branchDistribution).forEach(branch => {
      const br = branchDistribution[branch];
      br.avgDaysOpen = br.total > 0 ? Math.round((br.totalDaysOpen / br.total) * 10) / 10 : 0;
      delete br.totalDaysOpen;
    });

    // Technician workload
    const technicianWorkload = ticketsWithAging.reduce((acc: any, ticket) => {
      if (!ticket.assignedTo) return acc;
      
      const tech = ticket.assignedTo;
      if (!acc[tech]) {
        acc[tech] = {
          name: tech,
          email: ticket.assignedToEmail,
          total: 0,
          open: 0,
          onHold: 0,
          overdue: 0,
          critical: 0,
          avgDaysOpen: 0,
          totalDaysOpen: 0,
          oldestTicket: 0
        };
      }
      
      acc[tech].total++;
      acc[tech].totalDaysOpen += ticket.daysOpen;
      acc[tech].oldestTicket = Math.max(acc[tech].oldestTicket, ticket.daysOpen);
      
      if (ticket.status === 'OPEN') acc[tech].open++;
      if (ticket.status === 'ON_HOLD') acc[tech].onHold++;
      if (ticket.isOverdue) acc[tech].overdue++;
      if (ticket.agingSeverity === 'critical') acc[tech].critical++;
      
      return acc;
    }, {});

    // Calculate averages for technicians
    Object.keys(technicianWorkload).forEach(tech => {
      const t = technicianWorkload[tech];
      t.avgDaysOpen = t.total > 0 ? Math.round((t.totalDaysOpen / t.total) * 10) / 10 : 0;
      delete t.totalDaysOpen;
    });

    // Convert to arrays and sort
    const categoryArray = Object.entries(categoryDistribution).map(([name, data]) => ({
      category: name,
      ...data
    })).sort((a: any, b: any) => b.total - a.total);

    const branchArray = Object.entries(branchDistribution).map(([name, data]) => ({
      branch: name,
      ...data
    })).sort((a: any, b: any) => b.total - a.total);

    const technicianArray = Object.values(technicianWorkload).sort((a: any, b: any) => b.total - a.total);

    // Aging trend (last 30 days)
    const agingTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Calculate how many tickets were "open" on that day (created before that day and still open now)
      const ticketsOpenOnDay = ticketsWithAging.filter(ticket => {
        const createdDate = new Date(ticket.createdAt);
        return createdDate <= dayStart;
      });

      return {
        date: dayStart.toISOString().split('T')[0],
        openTickets: ticketsOpenOnDay.length,
        criticalAging: ticketsOpenOnDay.filter(t => {
          const daysOpenOnThatDay = Math.floor((dayStart.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return daysOpenOnThatDay > 30;
        }).length
      };
    });

    // Recommendations based on data
    const recommendations = [];
    if (stats.critical > 0) {
      recommendations.push(`${stats.critical} tickets have been open for more than 30 days and require immediate attention.`);
    }
    if (stats.unassigned > 0) {
      recommendations.push(`${stats.unassigned} tickets are unassigned and should be distributed to available technicians.`);
    }
    if (stats.overdue > 0) {
      recommendations.push(`${stats.overdue} tickets have breached their SLA targets and need priority handling.`);
    }
    if (stats.totalOnHold > 0) {
      recommendations.push(`${stats.totalOnHold} tickets are on hold and may need status review or vendor follow-up.`);
    }

    return NextResponse.json({
      summary: {
        ...stats,
        recommendations
      },
      tickets: ticketsWithAging,
      categoryDistribution: categoryArray,
      branchDistribution: branchArray,
      technicianWorkload: technicianArray,
      agingTrend
    });

  } catch (error) {
    console.error('Error fetching open/on-hold tickets data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}