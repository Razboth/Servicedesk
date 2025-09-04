import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const categoryId = searchParams.get('categoryId');
    const supportGroupId = searchParams.get('supportGroupId');

    // Get all services with SLA settings
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { tier1CategoryId: categoryId } : {}),
        ...(supportGroupId ? { supportGroupId } : {})
      },
      include: {
        tier1Category: { select: { name: true } },
        tier2Subcategory: { select: { name: true } },
        tier3Item: { select: { name: true } },
        supportGroup: { select: { name: true } },
        tickets: {
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          },
          include: {
            slaTracking: true
          }
        }
      }
    });

    // Calculate SLA compliance for each service
    const serviceCompliance = services.map(service => {
      const tickets = service.tickets;
      const totalTickets = tickets.length;
      
      if (totalTickets === 0) {
        return {
          id: service.id,
          name: service.name,
          category: service.tier1Category?.name || 'Uncategorized',
          subcategory: service.tier2Subcategory?.name || '-',
          item: service.tier3Item?.name || '-',
          supportGroup: service.supportGroup?.name || 'Unassigned',
          slaResponseTime: service.slaResponseTime,
          slaResolutionTime: service.slaResolutionTime,
          totalTickets: 0,
          metrics: {
            responseCompliance: 100,
            resolutionCompliance: 100,
            overallCompliance: 100,
            avgResponseTime: 0,
            avgResolutionTime: 0
          },
          breaches: {
            response: 0,
            resolution: 0,
            both: 0
          }
        };
      }

      // Analyze SLA tracking data
      let responseBreaches = 0;
      let resolutionBreaches = 0;
      let bothBreaches = 0;
      let totalResponseTime = 0;
      let totalResolutionTime = 0;
      let ticketsWithResponse = 0;
      let ticketsWithResolution = 0;

      tickets.forEach(ticket => {
        const slaTracking = ticket.slaTracking[0]; // Get the latest SLA tracking record
        
        if (slaTracking) {
          if (slaTracking.isResponseBreached) responseBreaches++;
          if (slaTracking.isResolutionBreached) resolutionBreaches++;
          if (slaTracking.isResponseBreached && slaTracking.isResolutionBreached) bothBreaches++;
          
          if (slaTracking.responseTime) {
            const respTime = (slaTracking.responseTime.getTime() - ticket.createdAt.getTime()) / (1000 * 60); // minutes
            totalResponseTime += respTime;
            ticketsWithResponse++;
          }
          
          if (slaTracking.resolutionTime) {
            const resTime = (slaTracking.resolutionTime.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60); // hours
            totalResolutionTime += resTime;
            ticketsWithResolution++;
          }
        } else {
          // Calculate from ticket timestamps if no SLA tracking
          if (ticket.firstResponseAt) {
            const respTime = (new Date(ticket.firstResponseAt).getTime() - ticket.createdAt.getTime()) / (1000 * 60);
            totalResponseTime += respTime;
            ticketsWithResponse++;
            
            // Check if breached based on service SLA
            if (service.slaResponseTime && respTime > service.slaResponseTime) {
              responseBreaches++;
            }
          }
          
          if (ticket.resolvedAt) {
            const resTime = (new Date(ticket.resolvedAt).getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
            totalResolutionTime += resTime;
            ticketsWithResolution++;
            
            // Check if breached based on service SLA
            if (service.slaResolutionTime && resTime > service.slaResolutionTime) {
              resolutionBreaches++;
            }
          }
        }
      });

      // Calculate compliance percentages
      const responseCompliance = totalTickets > 0 ? 
        ((totalTickets - responseBreaches) / totalTickets) * 100 : 100;
      
      const resolutionCompliance = totalTickets > 0 ? 
        ((totalTickets - resolutionBreaches) / totalTickets) * 100 : 100;
      
      const overallCompliance = (responseCompliance + resolutionCompliance) / 2;
      
      // Calculate averages
      const avgResponseTime = ticketsWithResponse > 0 ? 
        totalResponseTime / ticketsWithResponse : 0;
      
      const avgResolutionTime = ticketsWithResolution > 0 ? 
        totalResolutionTime / ticketsWithResolution : 0;

      return {
        id: service.id,
        name: service.name,
        category: service.tier1Category?.name || 'Uncategorized',
        subcategory: service.tier2Subcategory?.name || '-',
        item: service.tier3Item?.name || '-',
        supportGroup: service.supportGroup?.name || 'Unassigned',
        slaResponseTime: service.slaResponseTime,
        slaResolutionTime: service.slaResolutionTime,
        totalTickets,
        metrics: {
          responseCompliance: Math.round(responseCompliance * 10) / 10,
          resolutionCompliance: Math.round(resolutionCompliance * 10) / 10,
          overallCompliance: Math.round(overallCompliance * 10) / 10,
          avgResponseTime: Math.round(avgResponseTime * 10) / 10,
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
        },
        breaches: {
          response: responseBreaches,
          resolution: resolutionBreaches,
          both: bothBreaches
        },
        performance: {
          status: overallCompliance >= 90 ? 'Excellent' : 
                  overallCompliance >= 75 ? 'Good' : 
                  overallCompliance >= 60 ? 'Fair' : 'Poor',
          color: overallCompliance >= 90 ? '#10b981' : 
                 overallCompliance >= 75 ? '#3b82f6' : 
                 overallCompliance >= 60 ? '#f59e0b' : '#ef4444'
        }
      };
    });

    // Filter out services with no tickets
    const activeServices = serviceCompliance.filter(s => s.totalTickets > 0);
    
    // Sort by compliance (lowest first - needs attention)
    const needsAttention = activeServices
      .sort((a, b) => a.metrics.overallCompliance - b.metrics.overallCompliance)
      .slice(0, 10);
    
    // Sort by compliance (highest first - top performers)
    const topPerformers = activeServices
      .sort((a, b) => b.metrics.overallCompliance - a.metrics.overallCompliance)
      .slice(0, 10);

    // Group by category
    const categoryCompliance = serviceCompliance.reduce((acc, service) => {
      const category = service.category;
      if (!acc[category]) {
        acc[category] = {
          name: category,
          services: [],
          totalTickets: 0,
          totalBreaches: 0,
          avgCompliance: 0
        };
      }
      
      acc[category].services.push(service);
      acc[category].totalTickets += service.totalTickets;
      acc[category].totalBreaches += service.breaches.response + service.breaches.resolution;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate category averages
    Object.values(categoryCompliance).forEach((cat: any) => {
      const activeServicesInCat = cat.services.filter((s: any) => s.totalTickets > 0);
      if (activeServicesInCat.length > 0) {
        cat.avgCompliance = activeServicesInCat.reduce((sum: number, s: any) => 
          sum + s.metrics.overallCompliance, 0) / activeServicesInCat.length;
      } else {
        cat.avgCompliance = 100;
      }
      cat.avgCompliance = Math.round(cat.avgCompliance * 10) / 10;
      cat.serviceCount = cat.services.length;
      delete cat.services; // Remove detailed services from category summary
    });

    // Group by support group
    const supportGroupCompliance = serviceCompliance.reduce((acc, service) => {
      const group = service.supportGroup;
      if (!acc[group]) {
        acc[group] = {
          name: group,
          services: [],
          totalTickets: 0,
          avgCompliance: 0
        };
      }
      
      acc[group].services.push(service);
      acc[group].totalTickets += service.totalTickets;
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate support group averages
    Object.values(supportGroupCompliance).forEach((group: any) => {
      const activeServicesInGroup = group.services.filter((s: any) => s.totalTickets > 0);
      if (activeServicesInGroup.length > 0) {
        group.avgCompliance = activeServicesInGroup.reduce((sum: number, s: any) => 
          sum + s.metrics.overallCompliance, 0) / activeServicesInGroup.length;
      } else {
        group.avgCompliance = 100;
      }
      group.avgCompliance = Math.round(group.avgCompliance * 10) / 10;
      group.serviceCount = group.services.length;
      delete group.services;
    });

    // Overall statistics
    const totalTickets = activeServices.reduce((sum, s) => sum + s.totalTickets, 0);
    const totalResponseBreaches = activeServices.reduce((sum, s) => sum + s.breaches.response, 0);
    const totalResolutionBreaches = activeServices.reduce((sum, s) => sum + s.breaches.resolution, 0);
    
    const overallResponseCompliance = totalTickets > 0 ? 
      ((totalTickets - totalResponseBreaches) / totalTickets) * 100 : 100;
    
    const overallResolutionCompliance = totalTickets > 0 ? 
      ((totalTickets - totalResolutionBreaches) / totalTickets) * 100 : 100;
    
    const overallCompliance = (overallResponseCompliance + overallResolutionCompliance) / 2;

    // Breach analysis
    const breachAnalysis = {
      byPriority: await prisma.ticket.groupBy({
        by: ['priority'],
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          slaTracking: {
            some: {
              OR: [
                { isResponseBreached: true },
                { isResolutionBreached: true }
              ]
            }
          }
        },
        _count: true
      }),
      byHour: new Array(24).fill(0),
      byDayOfWeek: new Array(7).fill(0)
    };

    // Get breach patterns
    const breachedTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        slaTracking: {
          some: {
            OR: [
              { isResponseBreached: true },
              { isResolutionBreached: true }
            ]
          }
        }
      },
      select: {
        createdAt: true
      }
    });

    breachedTickets.forEach(ticket => {
      const hour = new Date(ticket.createdAt).getHours();
      const dayOfWeek = new Date(ticket.createdAt).getDay();
      breachAnalysis.byHour[hour]++;
      breachAnalysis.byDayOfWeek[dayOfWeek]++;
    });

    return NextResponse.json({
      services: serviceCompliance,
      topPerformers,
      needsAttention,
      categoryCompliance: Object.values(categoryCompliance),
      supportGroupCompliance: Object.values(supportGroupCompliance),
      breachAnalysis: {
        byPriority: breachAnalysis.byPriority.map(item => ({
          priority: item.priority,
          count: item._count
        })),
        peakBreachHour: breachAnalysis.byHour.indexOf(Math.max(...breachAnalysis.byHour)),
        peakBreachDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
          breachAnalysis.byDayOfWeek.indexOf(Math.max(...breachAnalysis.byDayOfWeek))
        ]
      },
      summary: {
        totalServices: services.length,
        activeServices: activeServices.length,
        totalTickets,
        totalResponseBreaches,
        totalResolutionBreaches,
        overallResponseCompliance: Math.round(overallResponseCompliance * 10) / 10,
        overallResolutionCompliance: Math.round(overallResolutionCompliance * 10) / 10,
        overallCompliance: Math.round(overallCompliance * 10) / 10,
        complianceStatus: overallCompliance >= 90 ? 'Excellent' : 
                         overallCompliance >= 75 ? 'Good' : 
                         overallCompliance >= 60 ? 'Fair' : 'Poor'
      },
      period: { startDate, endDate }
    });

  } catch (error) {
    console.error('Error fetching service SLA compliance report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service SLA compliance report' },
      { status: 500 }
    );
  }
}