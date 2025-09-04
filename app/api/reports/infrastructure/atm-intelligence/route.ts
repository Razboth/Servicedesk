import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/infrastructure/atm-intelligence - Get ATM health and incident analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow TECHNICIAN, MANAGER, and ADMIN roles
    if (!['TECHNICIAN', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const branchId = searchParams.get('branchId');

    // Get ATM-related tickets
    const atmTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        ...(branchId && { branchId }),
        OR: [
          {
            title: {
              contains: 'ATM',
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: 'ATM',
              mode: 'insensitive'
            }
          },
          {
            service: {
              name: {
                contains: 'ATM',
                mode: 'insensitive'
              }
            }
          }
        ]
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            province: true
          }
        },
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
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get all ATMs from branches
    const atms = await prisma.aTM.findMany({
      include: {
        branch: {
          select: {
            name: true,
            province: true
          }
        }
      }
    });

    // Calculate ATM health metrics
    const totalAtms = atms.length;
    const totalIncidents = atmTickets.length;
    const openIncidents = atmTickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
    const criticalIncidents = atmTickets.filter(t => ['HIGH', 'CRITICAL'].includes(t.priority)).length;

    // Group incidents by ATM/Branch
    const incidentsByBranch = atmTickets.reduce((acc, ticket) => {
      const branchName = ticket.branch?.name || 'Unknown';
      if (!acc[branchName]) {
        acc[branchName] = {
          total: 0,
          open: 0,
          critical: 0,
          resolved: 0
        };
      }
      acc[branchName].total++;
      if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[branchName].open++;
      } else {
        acc[branchName].resolved++;
      }
      if (['HIGH', 'CRITICAL'].includes(ticket.priority)) {
        acc[branchName].critical++;
      }
      return acc;
    }, {} as Record<string, any>);

    // Group by incident type/category
    const incidentsByType = atmTickets.reduce((acc, ticket) => {
      const category = ticket.service?.tier1Category?.name || 'Hardware Issues';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate resolution times
    const resolvedTickets = atmTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status) && t.resolvedAt);
    const resolutionTimes = resolvedTickets.map(ticket => {
      const created = new Date(ticket.createdAt).getTime();
      const resolved = new Date(ticket.resolvedAt!).getTime();
      return (resolved - created) / (1000 * 60 * 60); // hours
    });

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    // Daily incident trend
    const dailyIncidents = atmTickets.reduce((acc, ticket) => {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Priority distribution
    const priorityDistribution = {
      LOW: atmTickets.filter(t => t.priority === 'LOW').length,
      MEDIUM: atmTickets.filter(t => t.priority === 'MEDIUM').length,
      HIGH: atmTickets.filter(t => t.priority === 'HIGH').length,
      CRITICAL: atmTickets.filter(t => t.priority === 'CRITICAL').length
    };

    // Regional analysis
    const regionalData = atmTickets.reduce((acc, ticket) => {
      const region = ticket.branch?.province || 'Unknown';
      if (!acc[region]) {
        acc[region] = {
          incidents: 0,
          critical: 0,
          avgResolutionHours: 0
        };
      }
      acc[region].incidents++;
      if (['HIGH', 'CRITICAL'].includes(ticket.priority)) {
        acc[region].critical++;
      }
      return acc;
    }, {} as Record<string, any>);

    // Calculate regional resolution times
    Object.keys(regionalData).forEach(region => {
      const regionTickets = resolvedTickets.filter(t => t.branch?.province === region);
      if (regionTickets.length > 0) {
        const regionResolutionTimes = regionTickets.map(ticket => {
          const created = new Date(ticket.createdAt).getTime();
          const resolved = new Date(ticket.resolvedAt!).getTime();
          return (resolved - created) / (1000 * 60 * 60);
        });
        regionalData[region].avgResolutionHours = Math.round(
          regionResolutionTimes.reduce((a, b) => a + b, 0) / regionResolutionTimes.length
        );
      }
    });

    const response = {
      summary: {
        totalAtms,
        totalIncidents,
        openIncidents,
        criticalIncidents,
        avgResolutionHours: Math.round(avgResolutionTime),
        healthScore: totalAtms > 0 ? Math.round(((totalAtms - (openIncidents / totalAtms)) / totalAtms) * 100) : 100
      },
      distributions: {
        byBranch: incidentsByBranch,
        byType: incidentsByType,
        byPriority: priorityDistribution,
        byRegion: regionalData
      },
      trends: {
        dailyIncidents,
        resolutionTimes: resolutionTimes.slice(-30) // Last 30 resolution times
      },
      recentIncidents: atmTickets.slice(0, 10).map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        branch: ticket.branch?.name,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        assignedTo: ticket.assignedTo?.name,
        category: ticket.service?.tier1Category?.name
      })),
      atmList: atms.map(atm => ({
        id: atm.id,
        name: atm.name,
        branch: atm.branch?.name,
        region: atm.branch?.province,
        isActive: atm.isActive,
        incidentCount: atmTickets.filter(t => 
          t.title.toLowerCase().includes(atm.name.toLowerCase()) ||
          t.description?.toLowerCase().includes(atm.name.toLowerCase())
        ).length
      }))
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching ATM intelligence report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM intelligence report' },
      { status: 500 }
    );
  }
}