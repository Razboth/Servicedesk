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

    // Get all tickets with support group analysis
    const tickets = await prisma.ticket.findMany({
      where: ticketFilter,
      include: {
        service: {
          select: {
            name: true,
            supportGroupId: true,
            supportGroup: {
              select: { id: true, name: true, description: true }
            }
          }
        },
        assignedTo: {
          select: { 
            name: true,
            supportGroupId: true,
            supportGroup: {
              select: { id: true, name: true }
            }
          }
        },
        createdBy: {
          select: { name: true, role: true }
        },
        branch: {
          select: { name: true, code: true }
        }
      }
    });

    // Get all support groups
    const supportGroups = await prisma.supportGroup.findMany({
      include: {
        services: {
          select: { name: true }
        },
        users: {
          select: { 
            name: true, 
            email: true, 
            isActive: true,
            role: true
          }
        },
        _count: {
          select: { 
            services: true, 
            users: true 
          }
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

    // Analyze tickets by support group
    const groupAnalysis = supportGroups.map(group => {
      // Get tickets handled by this group (either through service assignment or technician assignment)
      const groupTickets = tickets.filter(ticket => {
        // Check if ticket's service belongs to this group
        const serviceGroup = ticket.service?.supportGroup?.id === group.id;
        
        // Check if assigned technician belongs to this group
        const technicianGroup = ticket.assignedTo?.supportGroup?.id === group.id;
        
        return serviceGroup || technicianGroup;
      });

      // Status distribution
      const statusDistribution = groupTickets.reduce((acc: any, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      // Priority distribution
      const priorityDistribution = groupTickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      // Branch distribution
      const branchDistribution = groupTickets.reduce((acc: any, ticket) => {
        const branchName = ticket.branch?.name || 'Unknown';
        acc[branchName] = (acc[branchName] || 0) + 1;
        return acc;
      }, {});

      // Time-based metrics
      const recentTickets = groupTickets.filter(t => t.createdAt >= thirtyDaysAgo);
      const weeklyTickets = groupTickets.filter(t => t.createdAt >= sevenDaysAgo);
      const dailyTickets = groupTickets.filter(t => t.createdAt >= twentyFourHoursAgo);

      // Resolution metrics
      const resolvedTickets = groupTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const openTickets = groupTickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status));
      const overdueTickets = groupTickets.filter(t => 
        ['OPEN', 'IN_PROGRESS'].includes(t.status) && t.createdAt < twentyFourHoursAgo
      );

      // Calculate resolution and response times
      let totalResolutionTime = 0;
      let totalResponseTime = 0;
      let resolvedCount = 0;
      let responseCount = 0;
      let slaCompliantCount = 0;

      groupTickets.forEach(ticket => {
        if (ticket.resolvedAt) {
          const resolutionHours = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          totalResolutionTime += resolutionHours;
          resolvedCount++;

          // Check SLA compliance
          const target = slaTargets[ticket.priority as keyof typeof slaTargets]?.resolution || 24;
          if (resolutionHours <= target) {
            slaCompliantCount++;
          }
        }

        if (ticket.firstResponseAt) {
          const responseHours = (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          totalResponseTime += responseHours;
          responseCount++;
        }
      });

      const avgResolutionHours = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
      const avgResponseHours = responseCount > 0 ? totalResponseTime / responseCount : 0;
      const slaComplianceRate = resolvedCount > 0 ? (slaCompliantCount / resolvedCount) * 100 : 0;
      const resolutionRate = groupTickets.length > 0 ? (resolvedTickets.length / groupTickets.length) * 100 : 0;

      // Workload distribution among team members
      const memberWorkload = group.users.map(member => {
        const memberTickets = groupTickets.filter(ticket => ticket.assignedTo?.name === member.name);
        const memberResolved = memberTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
        
        return {
          name: member.name,
          email: member.email,
          isActive: member.isActive,
          role: member.role,
          totalTickets: memberTickets.length,
          resolvedTickets: memberResolved.length,
          efficiency: memberTickets.length > 0 ? (memberResolved.length / memberTickets.length) * 100 : 0,
          recentTickets: memberTickets.filter(t => t.createdAt >= thirtyDaysAgo).length
        };
      });

      // Performance trend (last 7 days)
      const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayTickets = groupTickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate >= dayStart && ticketDate < dayEnd;
        });

        const dayResolved = dayTickets.filter(t => 
          t.resolvedAt && new Date(t.resolvedAt) >= dayStart && new Date(t.resolvedAt) < dayEnd
        );

        return {
          date: dayStart.toISOString().split('T')[0],
          assigned: dayTickets.length,
          resolved: dayResolved.length
        };
      });

      return {
        id: group.id,
        name: group.name,
        description: group.description || '',
        memberCount: group._count.users,
        serviceCount: group._count.services,
        activeMembers: group.users.filter(m => m.isActive).length,
        totalTickets: groupTickets.length,
        recentTickets: recentTickets.length,
        weeklyTickets: weeklyTickets.length,
        dailyTickets: dailyTickets.length,
        resolvedTickets: resolvedTickets.length,
        openTickets: openTickets.length,
        overdueTickets: overdueTickets.length,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        avgResponseHours: Math.round(avgResponseHours * 10) / 10,
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        slaComplianceRate: Math.round(slaComplianceRate * 10) / 10,
        statusDistribution,
        priorityDistribution,
        branchDistribution: Object.entries(branchDistribution)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .reduce((acc: any, [key, value]) => ({ ...acc, [key]: value }), {}),
        memberWorkload: memberWorkload.sort((a, b) => b.totalTickets - a.totalTickets),
        weeklyTrend,
        services: group.services.map(service => service.name),
        performanceRating: resolutionRate >= 80 ? 'Excellent' : 
                          resolutionRate >= 60 ? 'Good' : 
                          resolutionRate >= 40 ? 'Average' : 'Needs Improvement'
      };
    });

    // Sort by performance metrics
    const sortedGroups = groupAnalysis.sort((a, b) => b.resolutionRate - a.resolutionRate);

    // Overall statistics
    const totalTickets = groupAnalysis.reduce((sum, group) => sum + group.totalTickets, 0);
    const totalResolved = groupAnalysis.reduce((sum, group) => sum + group.resolvedTickets, 0);
    const avgResolutionRate = groupAnalysis.length > 0 ?
      groupAnalysis.reduce((sum, group) => sum + group.resolutionRate, 0) / groupAnalysis.length : 0;
    const avgSlaCompliance = groupAnalysis.length > 0 ?
      groupAnalysis.reduce((sum, group) => sum + group.slaComplianceRate, 0) / groupAnalysis.length : 0;

    // Top performing groups
    const topPerformers = sortedGroups.slice(0, 5);
    const bottomPerformers = sortedGroups.slice(-3).reverse();

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

      const groupBreakdown = groupAnalysis.reduce((acc: any, group) => {
        const groupMonthTickets = monthTickets.filter(ticket => {
          const serviceGroup = ticket.service?.supportGroup?.id === group.id;
          const technicianGroup = ticket.assignedTo?.supportGroup?.id === group.id;
          return serviceGroup || technicianGroup;
        });
        acc[group.name] = groupMonthTickets.length;
        return acc;
      }, {});

      return {
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total: monthTickets.length,
        ...groupBreakdown
      };
    });

    const summary = {
      totalGroups: supportGroups.length,
      totalTicketsAssigned: totalTickets,
      totalTicketsResolved: totalResolved,
      avgResolutionRate: Math.round(avgResolutionRate * 10) / 10,
      avgSlaCompliance: Math.round(avgSlaCompliance * 10) / 10,
      topPerformerName: topPerformers[0]?.name || 'N/A',
      topPerformerRate: topPerformers[0]?.resolutionRate || 0,
      totalActiveMembers: groupAnalysis.reduce((sum, group) => sum + group.activeMembers, 0)
    };

    return NextResponse.json({
      summary,
      groups: sortedGroups,
      topPerformers,
      bottomPerformers,
      monthlyTrend
    });

  } catch (error) {
    console.error('Error fetching requests by support group data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}