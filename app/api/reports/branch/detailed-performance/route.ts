import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow ADMIN, SUPER_ADMIN to view all branch reports, MANAGER can view their own branch
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const userBranchId = user?.branchId;

    // Build where clause for filtering branches based on role
    let branchFilter: any = {
      isActive: true
    };
    
    if (isBranchRole && userBranchId) {
      branchFilter.id = userBranchId;
    }

    // Get all branches based on role permissions
    const branches = await prisma.branch.findMany({
      where: branchFilter,
      include: {
        users: {
          where: { isActive: true },
          include: {
            createdTickets: {
              include: {
                service: { select: { name: true, category: { select: { name: true } } } }
              }
            },
            assignedTickets: {
              include: {
                service: { select: { name: true, category: { select: { name: true } } } }
              }
            }
          }
        },
        tickets: {
          include: {
            service: { select: { name: true, category: { select: { name: true } } } },
            createdBy: { select: { name: true, role: true } },
            assignedTo: { select: { name: true, role: true } }
          }
        },
        atms: {
          where: { isActive: true }
        }
      }
    });

    // Date ranges for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Calculate performance metrics for each branch
    const branchPerformance = branches.map(branch => {
      const tickets = branch.tickets;
      const users = branch.users;
      const technicians = users.filter(u => u.role === 'TECHNICIAN');
      const managers = users.filter(u => u.role === 'MANAGER');
      const regularUsers = users.filter(u => ['USER', 'AGENT'].includes(u.role));

      // Ticket statistics
      const recentTickets = tickets.filter(t => t.createdAt >= thirtyDaysAgo);
      const resolvedTickets = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const openTickets = tickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status));
      const overdueTickets = tickets.filter(t => 
        ['OPEN', 'IN_PROGRESS'].includes(t.status) && 
        t.createdAt < twentyFourHoursAgo
      );
      const criticalTickets = tickets.filter(t => 
        t.priority === 'CRITICAL' && 
        ['OPEN', 'IN_PROGRESS'].includes(t.status)
      );

      // Resolution metrics
      let avgResolutionHours = 0;
      let avgFirstResponseHours = 0;
      if (resolvedTickets.length > 0) {
        const totalResolutionTime = resolvedTickets.reduce((sum, ticket) => {
          if (ticket.resolvedAt) {
            return sum + (ticket.resolvedAt.getTime() - ticket.createdAt.getTime());
          }
          return sum;
        }, 0);
        avgResolutionHours = totalResolutionTime / (resolvedTickets.length * 1000 * 60 * 60);

        const responseTickets = resolvedTickets.filter(t => t.firstResponseAt);
        if (responseTickets.length > 0) {
          const totalResponseTime = responseTickets.reduce((sum, ticket) => {
            if (ticket.firstResponseAt) {
              return sum + (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime());
            }
            return sum;
          }, 0);
          avgFirstResponseHours = totalResponseTime / (responseTickets.length * 1000 * 60 * 60);
        }
      }

      // SLA compliance calculation
      const slaTargets = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
      let slaCompliantCount = 0;
      let totalSlaTickets = 0;

      resolvedTickets.forEach(ticket => {
        if (ticket.resolvedAt) {
          const resolutionHours = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          const target = slaTargets[ticket.priority as keyof typeof slaTargets] || 24;
          totalSlaTickets++;
          if (resolutionHours <= target) {
            slaCompliantCount++;
          }
        }
      });

      const slaCompliance = totalSlaTickets > 0 ? (slaCompliantCount / totalSlaTickets) * 100 : 0;

      // Technician performance within branch
      const technicianMetrics = technicians.map(tech => {
        const techTickets = tech.assignedTickets;
        const techResolved = techTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
        return {
          name: tech.name,
          totalTickets: techTickets.length,
          resolvedTickets: techResolved.length,
          resolutionRate: techTickets.length > 0 ? (techResolved.length / techTickets.length) * 100 : 0
        };
      });

      // Service distribution
      const serviceDistribution = tickets.reduce((acc: any, ticket) => {
        const serviceName = ticket.service?.name || 'Unknown';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});

      // Category distribution
      const categoryDistribution = tickets.reduce((acc: any, ticket) => {
        const categoryName = ticket.service?.category?.name || 'Unknown';
        acc[categoryName] = (acc[categoryName] || 0) + 1;
        return acc;
      }, {});

      // Priority distribution
      const priorityDistribution = tickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      // User activity metrics
      const activeUsers = users.filter(u => u.createdTickets.some(t => t.createdAt >= thirtyDaysAgo));
      const userTicketCreation = regularUsers.reduce((sum, user) => sum + user.createdTickets.length, 0);

      // ATM metrics
      const atmCount = branch.atms.length;
      const atmTickets = tickets.filter(t => 
        t.service?.name?.toLowerCase().includes('atm') || 
        t.title?.toLowerCase().includes('atm') ||
        t.description?.toLowerCase().includes('atm')
      );

      return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        phone: branch.phone,
        totalUsers: users.length,
        technicians: technicians.length,
        managers: managers.length,
        regularUsers: regularUsers.length,
        activeUsers: activeUsers.length,
        atmCount,
        totalTickets: tickets.length,
        recentTickets: recentTickets.length,
        resolvedTickets: resolvedTickets.length,
        openTickets: openTickets.length,
        overdueTickets: overdueTickets.length,
        criticalTickets: criticalTickets.length,
        atmTickets: atmTickets.length,
        resolutionRate: tickets.length > 0 ? (resolvedTickets.length / tickets.length) * 100 : 0,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        avgFirstResponseHours: Math.round(avgFirstResponseHours * 10) / 10,
        slaCompliance: Math.round(slaCompliance * 10) / 10,
        userTicketCreation,
        serviceDistribution,
        categoryDistribution,
        priorityDistribution,
        technicianMetrics,
        performance: {
          last7Days: tickets.filter(t => t.createdAt >= sevenDaysAgo).length,
          last24Hours: tickets.filter(t => t.createdAt >= twentyFourHoursAgo).length,
          weeklyTrend: Array.from({ length: 7 }, (_, i) => {
            const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            
            const count = tickets.filter(ticket => {
              const ticketDate = new Date(ticket.createdAt);
              return ticketDate >= dayStart && ticketDate < dayEnd;
            }).length;

            return {
              date: dayStart.toISOString().split('T')[0],
              count
            };
          })
        }
      };
    });

    // Overall statistics
    const totalBranches = branches.length;
    const avgTicketsPerBranch = totalBranches > 0 ? 
      branchPerformance.reduce((sum, b) => sum + b.totalTickets, 0) / totalBranches : 0;
    const avgResolutionRate = totalBranches > 0 ?
      branchPerformance.reduce((sum, b) => sum + b.resolutionRate, 0) / totalBranches : 0;
    const avgSlaCompliance = totalBranches > 0 ?
      branchPerformance.reduce((sum, b) => sum + b.slaCompliance, 0) / totalBranches : 0;
    const totalAtms = branchPerformance.reduce((sum, b) => sum + b.atmCount, 0);

    // Top performing branches
    const topPerformers = branchPerformance
      .sort((a, b) => b.resolutionRate - a.resolutionRate)
      .slice(0, 5);

    // Regional analysis (if branches have regional codes)
    const regionalAnalysis = branchPerformance.reduce((acc: any, branch) => {
      const region = branch.code.substring(0, 1); // First digit as region
      if (!acc[region]) {
        acc[region] = {
          branches: 0,
          totalTickets: 0,
          resolvedTickets: 0,
          totalUsers: 0,
          totalAtms: 0
        };
      }
      acc[region].branches++;
      acc[region].totalTickets += branch.totalTickets;
      acc[region].resolvedTickets += branch.resolvedTickets;
      acc[region].totalUsers += branch.totalUsers;
      acc[region].totalAtms += branch.atmCount;
      return acc;
    }, {});

    // Calculate regional averages
    Object.keys(regionalAnalysis).forEach(region => {
      const data = regionalAnalysis[region];
      data.avgResolutionRate = data.totalTickets > 0 ? (data.resolvedTickets / data.totalTickets) * 100 : 0;
      data.avgTicketsPerBranch = data.branches > 0 ? data.totalTickets / data.branches : 0;
    });

    const summary = {
      totalBranches,
      avgTicketsPerBranch: Math.round(avgTicketsPerBranch * 10) / 10,
      avgResolutionRate: Math.round(avgResolutionRate * 10) / 10,
      avgSlaCompliance: Math.round(avgSlaCompliance * 10) / 10,
      totalAtms
    };

    return NextResponse.json({
      summary,
      branches: branchPerformance,
      topPerformers,
      regionalAnalysis
    });

  } catch (error) {
    console.error('Error fetching branch performance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}