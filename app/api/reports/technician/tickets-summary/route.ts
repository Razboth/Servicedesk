import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view technician reports
    if (!['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Build where clause for tickets
    const whereClause: any = {};
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    // Get all technician users
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ['TECHNICIAN', 'SECURITY_ANALYST'] },
        isActive: true,
        ...(branchId && branchId !== 'ALL' ? { branchId } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        branchId: true,
        supportGroupId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        supportGroup: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Get tickets data for each technician
    const techniciansWithStats = await Promise.all(
      technicians.map(async (technician) => {
        // Tickets created by this technician
        const createdTickets = await prisma.ticket.findMany({
          where: {
            ...whereClause,
            createdById: technician.id
          },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
            closedAt: true,
            service: {
              select: {
                name: true,
                category: {
                  select: { name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        // Tickets assigned to this technician
        const assignedTickets = await prisma.ticket.findMany({
          where: {
            ...whereClause,
            assignedToId: technician.id
          },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            resolvedAt: true,
            closedAt: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            service: {
              select: {
                name: true,
                category: {
                  select: { name: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        // Calculate statistics
        const createdStats = {
          total: createdTickets.length,
          open: createdTickets.filter(t => t.status === 'OPEN').length,
          inProgress: createdTickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolved: createdTickets.filter(t => t.status === 'RESOLVED').length,
          closed: createdTickets.filter(t => t.status === 'CLOSED').length,
          pending: createdTickets.filter(t => ['PENDING', 'PENDING_APPROVAL', 'PENDING_VENDOR'].includes(t.status)).length,
          cancelled: createdTickets.filter(t => t.status === 'CANCELLED').length,
          rejected: createdTickets.filter(t => t.status === 'REJECTED').length
        };

        const assignedStats = {
          total: assignedTickets.length,
          open: assignedTickets.filter(t => t.status === 'OPEN').length,
          inProgress: assignedTickets.filter(t => t.status === 'IN_PROGRESS').length,
          resolved: assignedTickets.filter(t => t.status === 'RESOLVED').length,
          closed: assignedTickets.filter(t => t.status === 'CLOSED').length,
          pending: assignedTickets.filter(t => ['PENDING', 'PENDING_APPROVAL', 'PENDING_VENDOR'].includes(t.status)).length,
          cancelled: assignedTickets.filter(t => t.status === 'CANCELLED').length,
          rejected: assignedTickets.filter(t => t.status === 'REJECTED').length
        };

        // Calculate resolution metrics for assigned tickets
        const resolvedAssignedTickets = assignedTickets.filter(t => t.resolvedAt);
        const avgResolutionTimeHours = resolvedAssignedTickets.length > 0 
          ? resolvedAssignedTickets.reduce((acc, ticket) => {
              const resolutionTime = new Date(ticket.resolvedAt!).getTime() - new Date(ticket.createdAt).getTime();
              return acc + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
            }, 0) / resolvedAssignedTickets.length
          : 0;

        // Calculate tickets resolved today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const resolvedToday = assignedTickets.filter(t => 
          t.resolvedAt && new Date(t.resolvedAt) >= today
        ).length;

        return {
          technician,
          createdTickets,
          assignedTickets,
          stats: {
            created: createdStats,
            assigned: assignedStats,
            performance: {
              avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 100) / 100,
              resolvedToday,
              totalResolved: resolvedAssignedTickets.length,
              resolutionRate: assignedTickets.length > 0 
                ? Math.round((resolvedAssignedTickets.length / assignedTickets.length) * 100)
                : 0
            }
          }
        };
      })
    );

    // Calculate overall statistics
    const overallStats = {
      totalTechnicians: technicians.length,
      totalCreatedTickets: techniciansWithStats.reduce((acc, t) => acc + t.stats.created.total, 0),
      totalAssignedTickets: techniciansWithStats.reduce((acc, t) => acc + t.stats.assigned.total, 0),
      totalResolvedToday: techniciansWithStats.reduce((acc, t) => acc + t.stats.performance.resolvedToday, 0),
      avgResolutionTime: techniciansWithStats.length > 0
        ? techniciansWithStats.reduce((acc, t) => acc + t.stats.performance.avgResolutionTimeHours, 0) / techniciansWithStats.length
        : 0
    };

    return NextResponse.json({
      technicians: techniciansWithStats,
      overallStats: {
        ...overallStats,
        avgResolutionTime: Math.round(overallStats.avgResolutionTime * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error fetching technician tickets summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}