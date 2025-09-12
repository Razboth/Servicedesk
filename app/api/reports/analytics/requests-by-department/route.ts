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

    // Get all tickets with department/role analysis
    const tickets = await prisma.ticket.findMany({
      where: ticketFilter,
      include: {
        service: {
          select: {
            name: true,
            category: { 
              select: { name: true, id: true }
            }
          }
        },
        createdBy: {
          select: { 
            name: true, 
            role: true, 
            email: true,
            branch: {
              select: { name: true, code: true }
            },
            supportGroup: {
              select: { name: true, code: true }
            }
          }
        },
        assignedTo: {
          select: { 
            name: true, 
            role: true,
            branch: {
              select: { name: true, code: true }
            }
          }
        },
        branch: {
          select: { name: true, code: true }
        }
      }
    });

    // Get all users to understand branch/department structure
    const users = await prisma.user.findMany({
      select: {
        role: true,
        branch: {
          select: { name: true, code: true }
        }
      },
      where: {
        isActive: true
      }
    });

    // Date ranges for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // SLA targets
    const slaTargets = {
      CRITICAL: { response: 1, resolution: 4 },
      HIGH: { response: 2, resolution: 8 },
      MEDIUM: { response: 4, resolution: 24 },
      LOW: { response: 8, resolution: 72 }
    };

    // Get unique departments from tickets and users
    const allDepartments = new Set<string>();
    
    tickets.forEach(ticket => {
      if (ticket.createdBy?.branch?.name) allDepartments.add(ticket.createdBy.branch.name);
      if (ticket.assignedTo?.branch?.name) allDepartments.add(ticket.assignedTo.branch.name);
    });
    
    users.forEach(user => {
      if (user.branch?.name) allDepartments.add(user.branch.name);
    });

    // If no departments found in data, create default departments based on roles
    if (allDepartments.size === 0) {
      ['IT Support', 'Operations', 'Customer Service', 'Management', 'Finance', 'Human Resources'].forEach(dept => {
        allDepartments.add(dept);
      });
    }

    // Analyze requests by department
    const departmentAnalysis = Array.from(allDepartments).map(department => {
      // Tickets created by this department (branch)
      const createdTickets = tickets.filter(ticket => ticket.createdBy?.branch?.name === department);
      
      // Tickets assigned to this department (branch)
      const assignedTickets = tickets.filter(ticket => ticket.assignedTo?.branch?.name === department);
      
      // All tickets related to this department (created by or assigned to)
      const allDepartmentTickets = tickets.filter(ticket => 
        ticket.createdBy?.branch?.name === department || 
        ticket.assignedTo?.branch?.name === department
      );

      // Department users count
      const departmentUsers = users.filter(user => user.branch?.name === department);
      const usersByRole = departmentUsers.reduce((acc: any, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      // Status analysis for created tickets
      const createdStatusDistribution = createdTickets.reduce((acc: any, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      // Status analysis for assigned tickets
      const assignedStatusDistribution = assignedTickets.reduce((acc: any, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      // Priority analysis
      const priorityDistribution = createdTickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      // Service category requests
      const categoryDistribution = createdTickets.reduce((acc: any, ticket) => {
        const category = ticket.service?.category?.name || 'Unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      // Branch distribution for requests
      const branchDistribution = createdTickets.reduce((acc: any, ticket) => {
        const branch = ticket.branch?.name || ticket.createdBy?.branch?.name || 'Unknown';
        acc[branch] = (acc[branch] || 0) + 1;
        return acc;
      }, {});

      // Time-based metrics
      const recentCreated = createdTickets.filter(t => t.createdAt >= thirtyDaysAgo);
      const weeklyCreated = createdTickets.filter(t => t.createdAt >= sevenDaysAgo);
      const dailyCreated = createdTickets.filter(t => t.createdAt >= twentyFourHoursAgo);

      const recentAssigned = assignedTickets.filter(t => t.createdAt >= thirtyDaysAgo);
      const weeklyAssigned = assignedTickets.filter(t => t.createdAt >= sevenDaysAgo);
      const dailyAssigned = assignedTickets.filter(t => t.createdAt >= twentyFourHoursAgo);

      // Resolution metrics for assigned tickets
      const resolvedAssigned = assignedTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const openAssigned = assignedTickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status));

      // Calculate performance metrics for assigned tickets
      let totalResolutionTime = 0;
      let totalResponseTime = 0;
      let resolvedCount = 0;
      let responseCount = 0;
      let slaCompliantCount = 0;

      assignedTickets.forEach(ticket => {
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
      const resolutionRate = assignedTickets.length > 0 ? (resolvedAssigned.length / assignedTickets.length) * 100 : 0;

      // Monthly trend for department (last 6 months)
      const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        
        const monthCreated = createdTickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate >= monthStart && ticketDate <= monthEnd;
        });

        const monthAssigned = assignedTickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate >= monthStart && ticketDate <= monthEnd;
        });

        const monthResolved = monthAssigned.filter(t => 
          t.resolvedAt && new Date(t.resolvedAt) >= monthStart && new Date(t.resolvedAt) <= monthEnd
        );

        return {
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          created: monthCreated.length,
          assigned: monthAssigned.length,
          resolved: monthResolved.length
        };
      });

      return {
        department,
        userCount: departmentUsers.length,
        usersByRole,
        
        // Tickets created by department
        ticketsCreated: createdTickets.length,
        recentCreated: recentCreated.length,
        weeklyCreated: weeklyCreated.length,
        dailyCreated: dailyCreated.length,
        
        // Tickets assigned to department
        ticketsAssigned: assignedTickets.length,
        recentAssigned: recentAssigned.length,
        weeklyAssigned: weeklyAssigned.length,
        dailyAssigned: dailyAssigned.length,
        
        // Performance metrics
        ticketsResolved: resolvedAssigned.length,
        ticketsOpen: openAssigned.length,
        resolutionRate: Math.round(resolutionRate * 10) / 10,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        avgResponseHours: Math.round(avgResponseHours * 10) / 10,
        slaComplianceRate: Math.round(slaComplianceRate * 10) / 10,
        
        // Distributions
        createdStatusDistribution,
        assignedStatusDistribution,
        priorityDistribution,
        categoryDistribution: Object.entries(categoryDistribution)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .reduce((acc: any, [key, value]) => ({ ...acc, [key]: value }), {}),
        branchDistribution: Object.entries(branchDistribution)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 3)
          .reduce((acc: any, [key, value]) => ({ ...acc, [key]: value }), {}),
        
        monthlyTrend,
        
        // Department efficiency metrics
        requestsPerUser: departmentUsers.length > 0 ? Math.round((createdTickets.length / departmentUsers.length) * 10) / 10 : 0,
        workloadPerUser: departmentUsers.length > 0 ? Math.round((assignedTickets.length / departmentUsers.length) * 10) / 10 : 0,
        
        performanceRating: resolutionRate >= 80 ? 'Excellent' : 
                          resolutionRate >= 60 ? 'Good' : 
                          resolutionRate >= 40 ? 'Average' : 'Needs Improvement'
      };
    }).filter(dept => dept.ticketsCreated > 0 || dept.ticketsAssigned > 0 || dept.userCount > 0);

    // Sort departments by ticket volume
    const sortedDepartments = departmentAnalysis.sort((a, b) => 
      (b.ticketsCreated + b.ticketsAssigned) - (a.ticketsCreated + a.ticketsAssigned)
    );

    // Cross-department analysis
    const crossDepartmentTickets = tickets.filter(ticket => 
      ticket.createdBy?.branch?.name && 
      ticket.assignedTo?.branch?.name && 
      ticket.createdBy.department !== ticket.assignedTo.department
    );

    // Overall statistics
    const totalTicketsCreated = departmentAnalysis.reduce((sum, dept) => sum + dept.ticketsCreated, 0);
    const totalTicketsAssigned = departmentAnalysis.reduce((sum, dept) => sum + dept.ticketsAssigned, 0);
    const avgResolutionRate = departmentAnalysis.length > 0 ? 
      departmentAnalysis.reduce((sum, dept) => sum + dept.resolutionRate, 0) / departmentAnalysis.length : 0;
    const avgSlaCompliance = departmentAnalysis.length > 0 ? 
      departmentAnalysis.reduce((sum, dept) => sum + dept.slaComplianceRate, 0) / departmentAnalysis.length : 0;

    // Department interaction matrix
    const departmentInteractions = {};
    crossDepartmentTickets.forEach(ticket => {
      const fromDept = ticket.createdBy?.branch?.name || 'Unknown';
      const toDept = ticket.assignedTo?.branch?.name || 'Unknown';
      const key = `${fromDept} → ${toDept}`;
      
      if (!departmentInteractions[key]) {
        departmentInteractions[key] = 0;
      }
      departmentInteractions[key]++;
    });

    const topInteractions = Object.entries(departmentInteractions)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([interaction, count]) => ({ interaction, count }));

    const summary = {
      totalDepartments: sortedDepartments.length,
      totalTicketsCreated,
      totalTicketsAssigned,
      crossDepartmentTickets: crossDepartmentTickets.length,
      avgResolutionRate: Math.round(avgResolutionRate * 10) / 10,
      avgSlaCompliance: Math.round(avgSlaCompliance * 10) / 10,
      mostActiveCreator: sortedDepartments[0]?.department || 'N/A',
      mostActiveAssignee: sortedDepartments.sort((a, b) => b.ticketsAssigned - a.ticketsAssigned)[0]?.department || 'N/A',
      crossDepartmentRate: totalTicketsCreated > 0 ? 
        Math.round((crossDepartmentTickets.length / totalTicketsCreated) * 100 * 10) / 10 : 0
    };

    return NextResponse.json({
      summary,
      departments: sortedDepartments,
      topInteractions,
      crossDepartmentAnalysis: {
        totalCrossDepartment: crossDepartmentTickets.length,
        rate: summary.crossDepartmentRate,
        topInteractions
      }
    });

  } catch (error) {
    console.error('Error fetching requests by department data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}