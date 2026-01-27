import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBusinessHours } from '@/lib/sla-utils';

// GET /api/reports/business/customer-experience - Get customer experience analytics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can access this report
    if (!['MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const branchId = searchParams.get('branchId');

    // Get all tickets for customer experience analysis
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        ...(branchId && { branchId })
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
            role: true
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
        branch: {
          select: {
            name: true,
            city: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        },
        comments: {
          select: {
            id: true,
            createdAt: true,
            user: {
              select: {
                role: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate response time metrics
    const responseTimeMetrics = tickets.map(ticket => {
      const firstTechnicianComment = ticket.comments.find(comment => 
        comment.user?.role === 'TECHNICIAN'
      );
      
      const responseTime = firstTechnicianComment
        ? calculateBusinessHours(new Date(ticket.createdAt), new Date(firstTechnicianComment.createdAt)) * 60 // business minutes
        : null;
      
      return {
        ticketId: ticket.id,
        priority: ticket.priority,
        responseTime,
        hasResponse: !!firstTechnicianComment
      };
    }).filter(item => item.responseTime !== null);

    // Calculate average response times by priority
    const avgResponseByPriority = {
      CRITICAL: responseTimeMetrics.filter(t => t.priority === 'CRITICAL'),
      HIGH: responseTimeMetrics.filter(t => t.priority === 'HIGH'),
      MEDIUM: responseTimeMetrics.filter(t => t.priority === 'MEDIUM'),
      LOW: responseTimeMetrics.filter(t => t.priority === 'LOW')
    };

    Object.keys(avgResponseByPriority).forEach(priority => {
      const times = avgResponseByPriority[priority as keyof typeof avgResponseByPriority].map(t => t.responseTime!);
      avgResponseByPriority[priority as keyof typeof avgResponseByPriority] = {
        count: times.length,
        avgMinutes: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0,
        times
      } as any;
    });

    // Customer satisfaction indicators
    const satisfactionIndicators = {
      quickResolutions: tickets.filter(t => {
        if (!t.resolvedAt) return false;
        const resolutionTime = calculateBusinessHours(new Date(t.createdAt), new Date(t.resolvedAt));
        const target = ['HIGH', 'CRITICAL', 'EMERGENCY'].includes(t.priority) ? 4 : 24;
        return resolutionTime <= target;
      }).length,
      
      escalatedTickets: tickets.filter(t => 
        t.comments.length > 5 || // Many comments might indicate escalation
        t.priority === 'CRITICAL'
      ).length,
      
      reopenedTickets: tickets.filter(t => 
        // Tickets that were resolved/closed but are now open again
        (t.comments.length > 3 && t.status === 'OPEN')
      ).length
    };

    // Service quality metrics
    const serviceQuality = tickets.reduce((acc, ticket) => {
      const serviceName = ticket.service?.name || 'General Service';
      const category = ticket.category?.name || 'General';
      
      if (!acc[category]) {
        acc[category] = {
          services: {},
          totalTickets: 0,
          resolvedTickets: 0,
          avgResolutionTime: 0,
          resolutionTimes: []
        };
      }
      
      if (!acc[category].services[serviceName]) {
        acc[category].services[serviceName] = {
          tickets: 0,
          resolved: 0,
          avgResponseTime: 0,
          responseTimes: []
        };
      }
      
      acc[category].totalTickets++;
      acc[category].services[serviceName].tickets++;
      
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[category].resolvedTickets++;
        acc[category].services[serviceName].resolved++;
        
        if (ticket.resolvedAt) {
          const resTime = calculateBusinessHours(new Date(ticket.createdAt), new Date(ticket.resolvedAt));
          acc[category].resolutionTimes.push(resTime);
        }
      }
      
      // Add response time data
      const responseMetric = responseTimeMetrics.find(r => r.ticketId === ticket.id);
      if (responseMetric?.responseTime) {
        acc[category].services[serviceName].responseTimes.push(responseMetric.responseTime);
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for service quality
    Object.keys(serviceQuality).forEach(category => {
      const data = serviceQuality[category];
      data.resolutionRate = data.totalTickets > 0 ? (data.resolvedTickets / data.totalTickets) * 100 : 0;
      data.avgResolutionTime = data.resolutionTimes.length > 0
        ? data.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / data.resolutionTimes.length
        : 0;
      
      Object.keys(data.services).forEach(service => {
        const serviceData = data.services[service];
        serviceData.resolutionRate = serviceData.tickets > 0 ? (serviceData.resolved / serviceData.tickets) * 100 : 0;
        serviceData.avgResponseTime = serviceData.responseTimes.length > 0
          ? serviceData.responseTimes.reduce((a: number, b: number) => a + b, 0) / serviceData.responseTimes.length
          : 0;
        delete serviceData.responseTimes; // Clean up raw data
      });
      
      delete data.resolutionTimes; // Clean up raw data
    });

    // Customer journey analysis
    const customerJourney = tickets.reduce((acc, ticket) => {
      const customerEmail = ticket.createdBy?.email || 'unknown';
      if (!acc[customerEmail]) {
        acc[customerEmail] = {
          name: ticket.createdBy?.name || 'Unknown',
          totalTickets: 0,
          resolvedTickets: 0,
          avgResolutionTime: 0,
          lastTicketDate: ticket.createdAt,
          resolutionTimes: []
        };
      }
      
      acc[customerEmail].totalTickets++;
      if (new Date(ticket.createdAt) > new Date(acc[customerEmail].lastTicketDate)) {
        acc[customerEmail].lastTicketDate = ticket.createdAt;
      }
      
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[customerEmail].resolvedTickets++;
        if (ticket.resolvedAt) {
          const resTime = calculateBusinessHours(new Date(ticket.createdAt), new Date(ticket.resolvedAt));
          acc[customerEmail].resolutionTimes.push(resTime);
        }
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate customer averages
    Object.keys(customerJourney).forEach(email => {
      const data = customerJourney[email];
      data.resolutionRate = data.totalTickets > 0 ? (data.resolvedTickets / data.totalTickets) * 100 : 0;
      data.avgResolutionTime = data.resolutionTimes.length > 0
        ? data.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / data.resolutionTimes.length
        : 0;
      delete data.resolutionTimes;
    });

    // Branch experience comparison
    const branchExperience = tickets.reduce((acc, ticket) => {
      const branchName = ticket.branch?.name || 'Unknown';
      if (!acc[branchName]) {
        acc[branchName] = {
          totalTickets: 0,
          resolvedTickets: 0,
          avgResponseTime: 0,
          responseTimes: [],
          customerSatisfactionScore: 0
        };
      }
      
      acc[branchName].totalTickets++;
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[branchName].resolvedTickets++;
      }
      
      const responseMetric = responseTimeMetrics.find(r => r.ticketId === ticket.id);
      if (responseMetric?.responseTime) {
        acc[branchName].responseTimes.push(responseMetric.responseTime);
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate branch metrics
    Object.keys(branchExperience).forEach(branch => {
      const data = branchExperience[branch];
      data.resolutionRate = data.totalTickets > 0 ? (data.resolvedTickets / data.totalTickets) * 100 : 0;
      data.avgResponseTime = data.responseTimes.length > 0
        ? data.responseTimes.reduce((a: number, b: number) => a + b, 0) / data.responseTimes.length
        : 0;
      
      // Simple satisfaction score based on resolution rate and response time
      const responseScore = Math.max(0, 100 - (data.avgResponseTime / 60)); // Penalty for slow response
      data.customerSatisfactionScore = Math.round((data.resolutionRate + responseScore) / 2);
      
      delete data.responseTimes;
    });

    const response = {
      summary: {
        totalTickets: tickets.length,
        avgResponseTimeMinutes: responseTimeMetrics.length > 0
          ? Math.round(responseTimeMetrics.reduce((sum, item) => sum + item.responseTime!, 0) / responseTimeMetrics.length)
          : 0,
        responseRate: tickets.length > 0 ? Math.round((responseTimeMetrics.length / tickets.length) * 100) : 0,
        quickResolutions: satisfactionIndicators.quickResolutions,
        escalatedTickets: satisfactionIndicators.escalatedTickets,
        customerSatisfactionScore: Math.round(
          ((satisfactionIndicators.quickResolutions / Math.max(tickets.length, 1)) * 100 +
           (100 - (satisfactionIndicators.escalatedTickets / Math.max(tickets.length, 1)) * 100)) / 2
        )
      },
      responseMetrics: {
        byPriority: avgResponseByPriority,
        overall: {
          avgMinutes: responseTimeMetrics.length > 0
            ? Math.round(responseTimeMetrics.reduce((sum, item) => sum + item.responseTime!, 0) / responseTimeMetrics.length)
            : 0,
          medianMinutes: responseTimeMetrics.length > 0
            ? responseTimeMetrics.sort((a, b) => a.responseTime! - b.responseTime!)[Math.floor(responseTimeMetrics.length / 2)]?.responseTime || 0
            : 0
        }
      },
      serviceQuality,
      customerInsights: {
        topCustomers: Object.entries(customerJourney)
          .sort(([_, a], [__, b]) => (b as any).totalTickets - (a as any).totalTickets)
          .slice(0, 10)
          .map(([email, data]) => ({ email, ...(data as any) })),
        branchExperience
      },
      trends: {
        dailyTickets: tickets.reduce((acc, ticket) => {
          const date = new Date(ticket.createdAt).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      recommendations: [
        responseTimeMetrics.length / tickets.length < 0.8 ? 'Improve initial response rate to customer tickets' : null,
        satisfactionIndicators.escalatedTickets > tickets.length * 0.1 ? 'Reduce ticket escalations through better first-contact resolution' : null,
        Object.values(avgResponseByPriority).some((p: any) => p.avgMinutes > 240) ? 'Optimize response times for high-priority tickets' : null
      ].filter(Boolean)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching customer experience report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer experience report' },
      { status: 500 }
    );
  }
}