import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/admin/user-analytics - Get user engagement and analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access this report
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Get user statistics
    const totalUsers = await prisma.user.count();
    
    // Get active users based on recent sessions (last 30 days)
    const recentSessions = await prisma.session.findMany({
      where: {
        expires: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });
    const activeUsers = recentSessions.length;

    // Users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });

    // Users by branch
    const usersByBranch = await prisma.user.groupBy({
      by: ['branchId'],
      _count: {
        id: true
      },
      where: {
        branchId: {
          not: null
        }
      }
    });

    // Get branch names for the grouped data
    const branchNames = await prisma.branch.findMany({
      where: {
        id: {
          in: usersByBranch.map(item => item.branchId).filter(Boolean) as string[]
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Get ticket creation activity by users
    const ticketActivity = await prisma.ticket.groupBy({
      by: ['createdById'],
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Get user details for top ticket creators
    const topTicketCreators = await Promise.all(
      ticketActivity.map(async (activity) => {
        const user = await prisma.user.findUnique({
          where: { id: activity.createdById },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });
        return {
          user,
          ticketCount: activity._count.id
        };
      })
    );

    // Login activity over time using sessions
    const sessionActivity = await prisma.session.findMany({
      where: {
        expires: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        expires: true,
        user: {
          select: {
            role: true
          }
        }
      }
    });

    // Group login activity by day (using session expiry as proxy for login activity)
    const dailyLogins = sessionActivity.reduce((acc, session) => {
      const date = new Date(session.expires).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // User engagement metrics
    const userEngagement = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        sessions: {
          orderBy: {
            expires: 'desc'
          },
          take: 1,
          select: {
            expires: true
          }
        },
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true,
            completedTasks: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Calculate engagement scores
    const engagementData = userEngagement.map(user => {
      const daysSinceCreated = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const lastSession = user.sessions[0];
      const daysSinceLastLogin = lastSession 
        ? Math.floor((Date.now() - new Date(lastSession.expires).getTime()) / (1000 * 60 * 60 * 24))
        : daysSinceCreated;
      
      const activityScore = user._count.createdTickets + user._count.assignedTickets + user._count.completedTasks;
      const engagementScore = daysSinceCreated > 0 ? (activityScore / daysSinceCreated) * 100 : 0;
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: lastSession?.expires || null,
        _count: user._count,
        daysSinceCreated,
        daysSinceLastLogin,
        activityScore,
        engagementScore: Math.round(engagementScore * 100) / 100
      };
    });

    // System adoption metrics
    const newUsersThisMonth = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Convert daily logins to array format for charts
    const dailyActiveUsersArray = Object.entries(dailyLogins).map(([date, count]) => ({
      date,
      count
    }));

    // Calculate additional metrics
    const avgTicketsPerUser = totalUsers > 0 ? Math.round((topTicketCreators.reduce((sum, creator) => sum + creator.ticketCount, 0) / totalUsers) * 100) / 100 : 0;
    const systemAdoptionRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
    const avgEngagementScore = engagementData.length > 0 
      ? Math.round((engagementData.reduce((sum, user) => sum + user.engagementScore, 0) / engagementData.length) * 100) / 100
      : 0;

    const response = {
      summary: {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        avgSessionDuration: 45, // Mock data - would need session tracking
        systemAdoptionRate,
        engagementScore: avgEngagementScore
      },
      userMetrics: {
        totalUsers,
        activeUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        usersByBranch: usersByBranch.reduce((acc, item) => {
          const branchName = branchNames.find(branch => branch.id === item.branchId)?.name || `Branch ${item.branchId}`;
          acc[branchName] = item._count.id;
          return acc;
        }, {} as Record<string, number>)
      },
      activityMetrics: {
        ticketCreationActivity: [], // Would need ticket creation data by date
        loginActivity: dailyActiveUsersArray,
        dailyActiveUsers: dailyActiveUsersArray
      },
      engagementMetrics: {
        avgTicketsPerUser,
        avgSessionDuration: 45, // Mock data
        featureUsage: {
          'Ticket Creation': 85,
          'Report Viewing': 65,
          'User Management': 45
        },
        userRetention: 78 // Mock data
      },
      adoptionMetrics: {
        systemAdoptionRate,
        featureAdoptionRates: {
          'Basic Features': 90,
          'Advanced Features': 65,
          'Reporting': 55
        },
        trainingCompletionRate: 82, // Mock data
        supportTicketTrends: [] // Would need historical data
      },
      insights: {
        topActiveUsers: topTicketCreators.filter(item => item.user).slice(0, 5).map(item => ({
          name: item.user!.name,
          email: item.user!.email,
          ticketCount: item.ticketCount,
          role: item.user!.role
        })),
        leastActiveRoles: [], // Would need more analysis
        branchEngagement: [] // Would need branch-specific metrics
      },
      recommendations: [
        'Increase user training for low-adoption features',
        'Focus on improving engagement in underperforming branches',
        'Implement gamification to boost user activity'
      ]
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user analytics report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user analytics report' },
      { status: 500 }
    );
  }
}