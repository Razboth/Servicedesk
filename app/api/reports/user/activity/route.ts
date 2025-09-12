import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow ADMIN, SUPER_ADMIN, MANAGER to view user activity reports
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const branchId = user?.branchId;

    // Build where clause for filtering users based on role
    let userFilter: any = {
      isActive: true,
      role: {
        in: ['USER', 'AGENT', 'TECHNICIAN', 'MANAGER']
      }
    };
    
    if (isBranchRole && branchId) {
      userFilter.branchId = branchId;
    }

    // Get all users based on role permissions
    const users = await prisma.user.findMany({
      where: userFilter,
      include: {
        branch: {
          select: { name: true, code: true }
        },
        createdTickets: {
          include: {
            service: { 
              select: { 
                name: true, 
                category: { select: { name: true } } 
              } 
            }
          }
        },
        assignedTickets: {
          where: {
            assignedToId: { not: null }
          }
        },
        comments: {
          include: {
            ticket: {
              select: { id: true, title: true }
            }
          }
        },
        loginAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    // Date ranges for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Calculate activity metrics for each user
    const userActivity = users.map(user => {
      const tickets = user.createdTickets;
      const comments = user.comments;
      const loginAttempts = user.loginAttempts;

      // Ticket creation activity
      const recentTickets = tickets.filter(t => t.createdAt >= thirtyDaysAgo);
      const weeklyTickets = tickets.filter(t => t.createdAt >= sevenDaysAgo);
      const dailyTickets = tickets.filter(t => t.createdAt >= twentyFourHoursAgo);

      // Comment activity
      const recentComments = comments.filter(c => c.createdAt >= thirtyDaysAgo);
      const weeklyComments = comments.filter(c => c.createdAt >= sevenDaysAgo);

      // Login activity
      const recentLogins = loginAttempts.filter(l => 
        l.createdAt >= thirtyDaysAgo && l.success === true
      );
      const weeklyLogins = loginAttempts.filter(l => 
        l.createdAt >= sevenDaysAgo && l.success === true
      );
      const lastLogin = loginAttempts.find(l => l.success === true);

      // Service usage patterns
      const serviceUsage = tickets.reduce((acc: any, ticket) => {
        const serviceName = ticket.service?.name || 'Unknown';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});

      // Category usage patterns
      const categoryUsage = tickets.reduce((acc: any, ticket) => {
        const categoryName = ticket.service?.category?.name || 'Unknown';
        acc[categoryName] = (acc[categoryName] || 0) + 1;
        return acc;
      }, {});

      // Priority patterns
      const priorityUsage = tickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      // Activity scoring (0-100 scale)
      let activityScore = 0;
      activityScore += Math.min(recentTickets.length * 2, 40); // Up to 40 points for tickets
      activityScore += Math.min(recentComments.length * 1, 20); // Up to 20 points for comments  
      activityScore += Math.min(recentLogins.length * 1, 20); // Up to 20 points for logins
      
      // Engagement patterns
      const avgTicketsPerWeek = tickets.length > 0 ? 
        (tickets.length / Math.max(1, (now.getTime() - user.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;
      
      const avgCommentsPerTicket = tickets.length > 0 ? comments.length / tickets.length : 0;

      // Days since last activity
      const lastActivityDates = [
        lastLogin?.createdAt,
        tickets[0]?.createdAt,
        comments[0]?.createdAt
      ].filter(Boolean).map(d => new Date(d!));
      
      const lastActivityDate = lastActivityDates.length > 0 ? 
        new Date(Math.max(...lastActivityDates.map(d => d.getTime()))) : null;
      
      const daysSinceLastActivity = lastActivityDate ? 
        Math.floor((now.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000)) : 999;

      // Activity trend (comparing recent vs historical)
      const historicalTickets = tickets.filter(t => 
        t.createdAt >= ninetyDaysAgo && t.createdAt < thirtyDaysAgo
      ).length;
      const recentTicketTrend = historicalTickets > 0 ? 
        ((recentTickets.length - historicalTickets) / historicalTickets) * 100 : 
        (recentTickets.length > 0 ? 100 : 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        branch: user.branch?.name || 'Unknown',
        branchCode: user.branch?.code || '',
        createdAt: user.createdAt,
        lastLogin: lastLogin?.createdAt || null,
        totalTickets: tickets.length,
        recentTickets: recentTickets.length,
        weeklyTickets: weeklyTickets.length,
        dailyTickets: dailyTickets.length,
        totalComments: comments.length,
        recentComments: recentComments.length,
        weeklyComments: weeklyComments.length,
        totalLogins: loginAttempts.filter(l => l.success).length,
        recentLogins: recentLogins.length,
        weeklyLogins: weeklyLogins.length,
        failedLogins: loginAttempts.filter(l => !l.success).length,
        activityScore: Math.min(activityScore, 100),
        avgTicketsPerWeek: Math.round(avgTicketsPerWeek * 10) / 10,
        avgCommentsPerTicket: Math.round(avgCommentsPerTicket * 10) / 10,
        daysSinceLastActivity,
        recentTicketTrend: Math.round(recentTicketTrend * 10) / 10,
        serviceUsage,
        categoryUsage,
        priorityUsage,
        isActive: daysSinceLastActivity <= 30,
        activityLevel: activityScore >= 70 ? 'High' : 
                       activityScore >= 40 ? 'Medium' : 
                       activityScore >= 20 ? 'Low' : 'Inactive'
      };
    });

    // Overall statistics
    const totalUsers = users.length;
    const activeUsers = userActivity.filter(u => u.isActive).length;
    const highActivityUsers = userActivity.filter(u => u.activityLevel === 'High').length;
    const inactiveUsers = userActivity.filter(u => u.activityLevel === 'Inactive').length;
    
    const avgActivityScore = totalUsers > 0 ? 
      userActivity.reduce((sum, u) => sum + u.activityScore, 0) / totalUsers : 0;
    
    const avgTicketsPerUser = totalUsers > 0 ?
      userActivity.reduce((sum, u) => sum + u.totalTickets, 0) / totalUsers : 0;

    // Role-based analysis
    const roleAnalysis = userActivity.reduce((acc: any, user) => {
      if (!acc[user.role]) {
        acc[user.role] = {
          count: 0,
          totalTickets: 0,
          totalComments: 0,
          avgActivityScore: 0,
          activeUsers: 0
        };
      }
      acc[user.role].count++;
      acc[user.role].totalTickets += user.totalTickets;
      acc[user.role].totalComments += user.totalComments;
      acc[user.role].avgActivityScore += user.activityScore;
      if (user.isActive) acc[user.role].activeUsers++;
      return acc;
    }, {});

    // Calculate role averages
    Object.keys(roleAnalysis).forEach(role => {
      const data = roleAnalysis[role];
      data.avgActivityScore = data.count > 0 ? data.avgActivityScore / data.count : 0;
      data.avgTicketsPerUser = data.count > 0 ? data.totalTickets / data.count : 0;
      data.avgCommentsPerUser = data.count > 0 ? data.totalComments / data.count : 0;
      data.activityRate = data.count > 0 ? (data.activeUsers / data.count) * 100 : 0;
    });

    // Branch-based analysis
    const branchAnalysis = userActivity.reduce((acc: any, user) => {
      const branch = user.branch;
      if (!acc[branch]) {
        acc[branch] = {
          users: 0,
          totalTickets: 0,
          activeUsers: 0,
          avgActivityScore: 0,
          highActivityUsers: 0
        };
      }
      acc[branch].users++;
      acc[branch].totalTickets += user.totalTickets;
      acc[branch].avgActivityScore += user.activityScore;
      if (user.isActive) acc[branch].activeUsers++;
      if (user.activityLevel === 'High') acc[branch].highActivityUsers++;
      return acc;
    }, {});

    // Calculate branch averages
    Object.keys(branchAnalysis).forEach(branch => {
      const data = branchAnalysis[branch];
      data.avgActivityScore = data.users > 0 ? data.avgActivityScore / data.users : 0;
      data.avgTicketsPerUser = data.users > 0 ? data.totalTickets / data.users : 0;
      data.activityRate = data.users > 0 ? (data.activeUsers / data.users) * 100 : 0;
    });

    // Most active users
    const mostActiveUsers = userActivity
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 10);

    // Recently inactive users (were active but now inactive)
    const recentlyInactiveUsers = userActivity
      .filter(u => u.daysSinceLastActivity > 7 && u.daysSinceLastActivity <= 30 && u.totalTickets > 0)
      .sort((a, b) => a.daysSinceLastActivity - b.daysSinceLastActivity)
      .slice(0, 10);

    const summary = {
      totalUsers,
      activeUsers,
      highActivityUsers,
      inactiveUsers,
      avgActivityScore: Math.round(avgActivityScore * 10) / 10,
      avgTicketsPerUser: Math.round(avgTicketsPerUser * 10) / 10,
      activityRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100 * 10) / 10 : 0
    };

    return NextResponse.json({
      summary,
      users: userActivity,
      mostActiveUsers,
      recentlyInactiveUsers,
      roleAnalysis,
      branchAnalysis
    });

  } catch (error) {
    console.error('Error fetching user activity data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}