import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'MANAGER_IT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    if (!user?.branch) {
      return NextResponse.json(
        { error: 'No branch assigned' },
        { status: 400 }
      );
    }

    const branchId = user.branch.id;

    // Fetch branch statistics
    const [
      totalUsers,
      activeUsers,
      totalATMs,
      activeATMs,
      openTickets,
      pendingTickets,
      resolvedTodayCount,
      avgResolutionData
    ] = await Promise.all([
      // User counts
      prisma.user.count({ where: { branchId } }),
      prisma.user.count({ where: { branchId, isActive: true } }),
      
      // ATM counts
      prisma.aTM.count({ where: { branchId } }),
      prisma.aTM.count({ where: { branchId, isActive: true } }),
      
      // Ticket counts - only from users in manager's branch
      prisma.ticket.count({ 
        where: { 
          branchId,
          createdBy: { branchId },
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        } 
      }),
      prisma.ticket.count({ 
        where: { 
          branchId,
          createdBy: { branchId },
          status: 'PENDING_APPROVAL'
        } 
      }),
      
      // Resolved today - only from users in manager's branch
      prisma.ticket.count({
        where: {
          branchId,
          createdBy: { branchId },
          status: 'RESOLVED',
          resolvedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // Average resolution time (last 30 days) - only from users in manager's branch
      prisma.ticket.aggregate({
        where: {
          branchId,
          createdBy: { branchId },
          status: 'RESOLVED',
          resolvedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _avg: {
          actualHours: true
        }
      })
    ]);

    // Fetch recent tickets - only from users in manager's branch
    const recentTickets = await prisma.ticket.findMany({
      where: { 
        branchId,
        createdBy: { branchId }
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        createdBy: {
          select: {
            name: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Fetch ATM incidents/alerts (using incidents as alerts)
    const atmAlerts = await prisma.aTMIncident.findMany({
      where: {
        atm: { branchId },
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
      select: {
        id: true,
        type: true,
        severity: true,
        createdAt: true,
        atm: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const avgResolutionTime = avgResolutionData._avg.actualHours 
      ? Math.round(avgResolutionData._avg.actualHours)
      : 0;

    return NextResponse.json({
      branch: {
        id: user.branch.id,
        name: user.branch.name,
        code: user.branch.code
      },
      stats: {
        totalUsers,
        activeUsers,
        totalATMs,
        activeATMs,
        openTickets,
        pendingApprovals: pendingTickets,
        resolvedToday: resolvedTodayCount,
        avgResolutionTime
      },
      recentTickets,
      atmAlerts
    });
  } catch (error) {
    console.error('Error fetching manager dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}