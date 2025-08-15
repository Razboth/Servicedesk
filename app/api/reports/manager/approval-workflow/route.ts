import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/manager/approval-workflow - Get approval workflow analytics for manager
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can access this report
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    const managerId = session.user.id;

    // Get manager's branch information for context
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: {
        branchId: true,
        branch: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });

    // Get all approvals handled by this manager
    const approvals = await prisma.approval.findMany({
      where: {
        approverId: managerId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            service: {
              select: {
                name: true,
                tier1Category: {
                  select: { name: true }
                }
              }
            },
            createdBy: {
              select: {
                name: true,
                role: true
              }
            }
          }
        },
        requester: {
          select: {
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get pending approvals
    const pendingApprovals = await prisma.approval.findMany({
      where: {
        approverId: managerId,
        status: 'PENDING'
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            priority: true,
            service: {
              select: {
                name: true
              }
            }
          }
        },
        requester: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Calculate summary metrics
    const totalApprovals = approvals.length;
    const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
    const rejectedCount = approvals.filter(a => a.status === 'REJECTED').length;
    const pendingCount = pendingApprovals.length;

    const approvalRate = totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0;

    // Calculate average response time for completed approvals
    const completedApprovals = approvals.filter(a => a.status !== 'PENDING' && a.approvedAt);
    const avgResponseTime = completedApprovals.length > 0 ?
      completedApprovals.reduce((sum, approval) => {
        const responseTimeHours = (approval.approvedAt!.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + responseTimeHours;
      }, 0) / completedApprovals.length : 0;

    // Analyze approval types
    const approvalTypes = approvals.reduce((acc, approval) => {
      const type = approval.type || 'General';
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0
        };
      }
      acc[type].total++;
      if (approval.status === 'APPROVED') acc[type].approved++;
      else if (approval.status === 'REJECTED') acc[type].rejected++;
      else if (approval.status === 'PENDING') acc[type].pending++;
      
      return acc;
    }, {} as Record<string, any>);

    const approvalTypeStats = Object.entries(approvalTypes).map(([type, stats]) => ({
      type,
      total: stats.total,
      approved: stats.approved,
      rejected: stats.rejected,
      pending: stats.pending,
      approvalRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    // Analyze by requester role
    const byRequesterRole = approvals.reduce((acc, approval) => {
      const role = approval.requester.role;
      if (!acc[role]) {
        acc[role] = {
          total: 0,
          approved: 0,
          rejected: 0,
          avgResponseTime: 0,
          totalResponseTime: 0,
          completedCount: 0
        };
      }
      acc[role].total++;
      if (approval.status === 'APPROVED') acc[role].approved++;
      else if (approval.status === 'REJECTED') acc[role].rejected++;
      
      if (approval.approvedAt) {
        const responseTime = (approval.approvedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
        acc[role].totalResponseTime += responseTime;
        acc[role].completedCount++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const requesterRoleStats = Object.entries(byRequesterRole).map(([role, stats]) => ({
      role,
      total: stats.total,
      approved: stats.approved,
      rejected: stats.rejected,
      approvalRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
      avgResponseTime: stats.completedCount > 0 ? 
        Math.round((stats.totalResponseTime / stats.completedCount) * 10) / 10 : 0
    })).sort((a, b) => b.total - a.total);

    // Analyze by service category
    const byCategoryStats = approvals.reduce((acc, approval) => {
      const category = approval.ticket?.service.tier1Category?.name || 'Other';
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          approved: 0,
          rejected: 0
        };
      }
      acc[category].total++;
      if (approval.status === 'APPROVED') acc[category].approved++;
      else if (approval.status === 'REJECTED') acc[category].rejected++;
      
      return acc;
    }, {} as Record<string, any>);

    const categoryStats = Object.entries(byCategoryStats).map(([category, stats]) => ({
      category,
      total: stats.total,
      approved: stats.approved,
      rejected: stats.rejected,
      approvalRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
    })).sort((a, b) => b.total - a.total);

    // Daily approval trends
    const dailyTrends = await Promise.all(
      Array.from({ length: 14 }, async (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        const dayApprovals = await prisma.approval.count({
          where: {
            approverId: managerId,
            createdAt: {
              gte: dateStart,
              lte: dateEnd
            }
          }
        });

        const dayApproved = await prisma.approval.count({
          where: {
            approverId: managerId,
            status: 'APPROVED',
            approvedAt: {
              gte: dateStart,
              lte: dateEnd
            }
          }
        });

        return {
          date: date.toISOString().split('T')[0],
          value: dayApprovals,
          approved: dayApproved,
          label: `${dayApprovals} requests, ${dayApproved} approved`
        };
      })
    );

    // Response time distribution
    const responseTimeRanges = {
      immediate: 0,  // < 1 hour
      fast: 0,       // 1-4 hours
      normal: 0,     // 4-24 hours
      slow: 0        // > 24 hours
    };

    completedApprovals.forEach(approval => {
      const responseHours = (approval.approvedAt!.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
      if (responseHours < 1) responseTimeRanges.immediate++;
      else if (responseHours <= 4) responseTimeRanges.fast++;
      else if (responseHours <= 24) responseTimeRanges.normal++;
      else responseTimeRanges.slow++;
    });

    const responseTimeDistribution = [
      { label: 'Immediate (<1h)', value: responseTimeRanges.immediate },
      { label: 'Fast (1-4h)', value: responseTimeRanges.fast },
      { label: 'Normal (4-24h)', value: responseTimeRanges.normal },
      { label: 'Slow (>24h)', value: responseTimeRanges.slow }
    ];

    // Priority analysis
    const priorityStats = approvals.reduce((acc, approval) => {
      const priority = approval.ticket?.priority || 'MEDIUM';
      if (!acc[priority]) {
        acc[priority] = {
          total: 0,
          approved: 0,
          avgResponseTime: 0,
          totalResponseTime: 0,
          completedCount: 0
        };
      }
      acc[priority].total++;
      if (approval.status === 'APPROVED') acc[priority].approved++;
      
      if (approval.approvedAt) {
        const responseTime = (approval.approvedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
        acc[priority].totalResponseTime += responseTime;
        acc[priority].completedCount++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const priorityAnalysis = Object.entries(priorityStats).map(([priority, stats]) => ({
      priority,
      total: stats.total,
      approved: stats.approved,
      approvalRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
      avgResponseTime: stats.completedCount > 0 ? 
        Math.round((stats.totalResponseTime / stats.completedCount) * 10) / 10 : 0
    }));

    // Identify bottlenecks (slow response items)
    const bottlenecks = approvals
      .filter(approval => {
        if (!approval.approvedAt) return false;
        const responseHours = (approval.approvedAt.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60);
        return responseHours > 48; // Items taking more than 48 hours
      })
      .map(approval => ({
        id: approval.id,
        type: approval.type,
        ticketTitle: approval.ticket?.title || 'N/A',
        requesterName: approval.requester.name,
        responseTime: Math.round(((approval.approvedAt!.getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60)) * 10) / 10,
        status: approval.status,
        createdAt: approval.createdAt
      }))
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 10);

    return NextResponse.json({
      branch: {
        name: manager?.branch?.name || 'Unknown Branch',
        code: manager?.branch?.code || 'N/A'
      },
      summary: {
        totalApprovals,
        approvedCount,
        rejectedCount,
        pendingCount,
        approvalRate,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10
      },
      breakdown: {
        byType: approvalTypeStats,
        byRequesterRole: requesterRoleStats,
        byCategory: categoryStats,
        byPriority: priorityAnalysis
      },
      trends: {
        daily: dailyTrends,
        responseTime: responseTimeDistribution
      },
      performance: {
        bottlenecks: bottlenecks,
        pending: pendingApprovals.map(approval => ({
          id: approval.id,
          type: approval.type,
          ticketTitle: approval.ticket?.title || 'N/A',
          requesterName: approval.requester.name,
          priority: approval.ticket?.priority || 'MEDIUM',
          createdAt: approval.createdAt,
          daysPending: Math.floor((new Date().getTime() - approval.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        })).slice(0, 10)
      },
      period: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching approval workflow data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}