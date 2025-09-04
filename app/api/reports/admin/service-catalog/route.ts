import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/admin/service-catalog - Get service catalog performance analytics for admin
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access this report
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Get all service catalog items with usage statistics
    const services = await prisma.service.findMany({
      where: {
        isActive: true
      },
      include: {
        category: {
          select: {
            name: true
          }
        },
        subcategory: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            tickets: {
              where: {
                createdAt: {
                  gte: new Date(startDate),
                  lte: new Date(endDate)
                }
              }
            }
          }
        }
      }
    });

    // Get detailed ticket data for services
    const serviceTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        service: {
          include: {
            category: {
              select: { name: true }
            },
            subcategory: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Calculate service performance metrics
    const servicePerformance = services.map(service => {
      const serviceTicketData = serviceTickets.filter(ticket => ticket.serviceId === service.id);
      
      const resolvedTickets = serviceTicketData.filter(ticket => 
        ['RESOLVED', 'CLOSED'].includes(ticket.status)
      );
      
      const avgResolutionTime = resolvedTickets.length > 0 ?
        resolvedTickets.reduce((sum, ticket) => sum + (ticket.actualHours || 0), 0) / resolvedTickets.length : 0;
      
      const resolutionRate = serviceTicketData.length > 0 ?
        Math.round((resolvedTickets.length / serviceTicketData.length) * 100) : 0;

      const priorityBreakdown = serviceTicketData.reduce((acc, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        id: service.id,
        name: service.name,
        description: service.description,
        category: category?.name || 'Uncategorized',
        tier2Category: subcategory?.name || 'General',
        totalTickets: service._count.tickets,
        resolvedTickets: resolvedTickets.length,
        resolutionRate,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        urgentTickets: priorityBreakdown['URGENT'] || 0,
        highTickets: priorityBreakdown['HIGH'] || 0,
        isActive: service.isActive,
        estimatedHours: service.estimatedHours || 0
      };
    });

    // Sort by usage (total tickets)
    servicePerformance.sort((a, b) => b.totalTickets - a.totalTickets);

    // Calculate category performance
    const categoryStats = serviceTickets.reduce((acc, ticket) => {
      const category = ticket.category?.name || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          totalTickets: 0,
          resolvedTickets: 0,
          totalHours: 0,
          services: new Set()
        };
      }
      acc[category].totalTickets++;
      acc[category].services.add(ticket.service.name);
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[category].resolvedTickets++;
        acc[category].totalHours += ticket.actualHours || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    const categoryPerformance = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      totalTickets: stats.totalTickets,
      resolvedTickets: stats.resolvedTickets,
      resolutionRate: stats.totalTickets > 0 ? Math.round((stats.resolvedTickets / stats.totalTickets) * 100) : 0,
      avgResolutionTime: stats.resolvedTickets > 0 ? Math.round((stats.totalHours / stats.resolvedTickets) * 10) / 10 : 0,
      serviceCount: stats.services.size
    })).sort((a, b) => b.totalTickets - a.totalTickets);

    // Get service utilization trends (monthly for last 6 months)
    const monthlyTrends = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthTickets = await prisma.ticket.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        });

        const monthResolved = await prisma.ticket.count({
          where: {
            status: {
              in: ['RESOLVED', 'CLOSED']
            },
            resolvedAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        });

        const monthStr = monthStart.toISOString().substring(0, 7); // YYYY-MM format
        return {
          date: monthStr,
          value: monthTickets,
          resolved: monthResolved,
          label: `${monthTickets} requests, ${monthResolved} resolved`
        };
      })
    );

    // Identify top performing services
    const topPerformingServices = servicePerformance
      .filter(service => service.totalTickets >= 5) // Minimum threshold for meaningful metrics
      .sort((a, b) => {
        // Score based on resolution rate and usage
        const scoreA = (a.resolutionRate * 0.7) + (Math.min(a.totalTickets / 100, 1) * 30);
        const scoreB = (b.resolutionRate * 0.7) + (Math.min(b.totalTickets / 100, 1) * 30);
        return scoreB - scoreA;
      })
      .slice(0, 10);

    // Identify underutilized services
    const underutilizedServices = servicePerformance
      .filter(service => service.totalTickets <= 2)
      .sort((a, b) => a.totalTickets - b.totalTickets)
      .slice(0, 10);

    // Calculate efficiency metrics
    const totalTickets = serviceTickets.length;
    const totalResolved = serviceTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length;
    const overallResolutionRate = totalTickets > 0 ? Math.round((totalResolved / totalTickets) * 100) : 0;
    
    const avgServiceResolutionTime = servicePerformance.length > 0 ?
      servicePerformance.reduce((sum, service) => sum + service.avgResolutionTime, 0) / servicePerformance.length : 0;

    // Service request patterns by day of week
    const dayOfWeekPattern = serviceTickets.reduce((acc, ticket) => {
      const dayOfWeek = ticket.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
      acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dayOfWeekStats = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      .map(day => ({
        label: day,
        value: dayOfWeekPattern[day] || 0
      }));

    // Service complexity analysis
    const complexityAnalysis = servicePerformance.reduce((acc, service) => {
      let complexity: string;
      if (service.estimatedHours <= 2) complexity = 'Simple';
      else if (service.estimatedHours <= 8) complexity = 'Medium';
      else if (service.estimatedHours <= 24) complexity = 'Complex';
      else complexity = 'Advanced';

      if (!acc[complexity]) {
        acc[complexity] = {
          count: 0,
          totalTickets: 0,
          avgResolutionRate: 0
        };
      }
      acc[complexity].count++;
      acc[complexity].totalTickets += service.totalTickets;
      acc[complexity].avgResolutionRate += service.resolutionRate;
      
      return acc;
    }, {} as Record<string, any>);

    const complexityStats = Object.entries(complexityAnalysis).map(([complexity, stats]) => ({
      complexity,
      serviceCount: stats.count,
      totalTickets: stats.totalTickets,
      avgResolutionRate: stats.count > 0 ? Math.round(stats.avgResolutionRate / stats.count) : 0
    }));

    // Get SLA compliance for service catalog
    const slaCompliance = await prisma.sLATracking.findMany({
      where: {
        ticket: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      }
    });

    const overallSlaCompliance = slaCompliance.length > 0 ?
      Math.round((slaCompliance.filter(sla => !sla.isResponseBreached && !sla.isResolutionBreached).length / slaCompliance.length) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalServices: services.length,
        activeServices: services.filter(s => s.isActive).length,
        totalTickets,
        overallResolutionRate,
        avgServiceResolutionTime: Math.round(avgServiceResolutionTime * 10) / 10,
        overallSlaCompliance,
        topCategories: categoryPerformance.length
      },
      performance: {
        byService: servicePerformance.slice(0, 20), // Top 20 services
        byCategory: categoryPerformance,
        topPerforming: topPerformingServices,
        underutilized: underutilizedServices,
        complexity: complexityStats
      },
      trends: {
        monthly: monthlyTrends,
        dayOfWeek: dayOfWeekStats
      },
      insights: {
        highVolumeServices: servicePerformance.filter(s => s.totalTickets > 50).length,
        lowResolutionServices: servicePerformance.filter(s => s.resolutionRate < 70 && s.totalTickets > 5).length,
        zeroUsageServices: servicePerformance.filter(s => s.totalTickets === 0).length,
        avgTicketsPerService: services.length > 0 ? Math.round(totalTickets / services.length) : 0
      },
      period: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching service catalog performance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}