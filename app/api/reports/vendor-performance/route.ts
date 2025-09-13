import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, differenceInHours, differenceInDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin and managers to view vendor performance reports
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const vendorId = searchParams.get('vendorId');
    const period = searchParams.get('period') || '3months'; // 1month, 3months, 6months, 1year
    
    // Calculate date range
    let startDate: Date;
    const endDate = new Date();
    
    switch (period) {
      case '1month':
        startDate = subMonths(endDate, 1);
        break;
      case '6months':
        startDate = subMonths(endDate, 6);
        break;
      case '1year':
        startDate = subMonths(endDate, 12);
        break;
      default: // 3months
        startDate = subMonths(endDate, 3);
    }

    // Build query conditions
    const whereConditions: any = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (vendorId) {
      whereConditions.vendorId = vendorId;
    }

    // Fetch all vendor tickets in the period
    const vendorTickets = await prisma.vendorTicket.findMany({
      where: whereConditions,
      include: {
        vendor: true,
        ticket: {
          include: {
            service: {
              include: {
                category: true
              }
            },
            branch: true
          }
        },
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group tickets by vendor
    const vendorMap = new Map<string, any>();

    vendorTickets.forEach(vt => {
      const vendorKey = vt.vendorId;
      
      if (!vendorMap.has(vendorKey)) {
        vendorMap.set(vendorKey, {
          vendor: vt.vendor,
          totalTickets: 0,
          resolvedTickets: 0,
          pendingTickets: 0,
          cancelledTickets: 0,
          totalResponseTime: 0,
          totalResolutionTime: 0,
          ticketsByCategory: new Map(),
          ticketsByMonth: new Map(),
          slaCompliant: 0,
          slaBreach: 0,
          avgRating: 0,
          tickets: []
        });
      }

      const vendorData = vendorMap.get(vendorKey);
      vendorData.totalTickets++;
      vendorData.tickets.push(vt);

      // Status counts
      switch (vt.status) {
        case 'RESOLVED':
          vendorData.resolvedTickets++;
          break;
        case 'PENDING':
        case 'IN_PROGRESS':
          vendorData.pendingTickets++;
          break;
        case 'CANCELLED':
          vendorData.cancelledTickets++;
          break;
      }

      // Response time (time from assignment to first response)
      if (vt.respondedAt) {
        const responseTime = differenceInHours(new Date(vt.respondedAt), new Date(vt.createdAt));
        vendorData.totalResponseTime += responseTime;
      }

      // Resolution time
      if (vt.resolvedAt) {
        const resolutionTime = differenceInHours(new Date(vt.resolvedAt), new Date(vt.createdAt));
        vendorData.totalResolutionTime += resolutionTime;
        
        // Check SLA compliance (assuming 48 hours SLA for vendors)
        if (resolutionTime <= 48) {
          vendorData.slaCompliant++;
        } else {
          vendorData.slaBreach++;
        }
      }

      // Category breakdown
      const category = vt.ticket.service.category.name;
      if (!vendorData.ticketsByCategory.has(category)) {
        vendorData.ticketsByCategory.set(category, 0);
      }
      vendorData.ticketsByCategory.set(category, vendorData.ticketsByCategory.get(category) + 1);

      // Monthly breakdown
      const monthKey = `${new Date(vt.createdAt).getFullYear()}-${String(new Date(vt.createdAt).getMonth() + 1).padStart(2, '0')}`;
      if (!vendorData.ticketsByMonth.has(monthKey)) {
        vendorData.ticketsByMonth.set(monthKey, 0);
      }
      vendorData.ticketsByMonth.set(monthKey, vendorData.ticketsByMonth.get(monthKey) + 1);
    });

    // Calculate metrics and format response
    const vendorPerformance = Array.from(vendorMap.values()).map(data => {
      const avgResponseTime = data.totalTickets > 0 && data.totalResponseTime > 0
        ? Math.round(data.totalResponseTime / data.totalTickets)
        : 0;
      
      const avgResolutionTime = data.resolvedTickets > 0
        ? Math.round(data.totalResolutionTime / data.resolvedTickets)
        : 0;

      const resolutionRate = data.totalTickets > 0
        ? Math.round((data.resolvedTickets / data.totalTickets) * 100)
        : 0;

      const slaComplianceRate = (data.slaCompliant + data.slaBreach) > 0
        ? Math.round((data.slaCompliant / (data.slaCompliant + data.slaBreach)) * 100)
        : 0;

      return {
        vendor: {
          id: data.vendor.id,
          name: data.vendor.name,
          code: data.vendor.code,
          contactEmail: data.vendor.contactEmail,
          contactPhone: data.vendor.contactPhone
        },
        metrics: {
          totalTickets: data.totalTickets,
          resolvedTickets: data.resolvedTickets,
          pendingTickets: data.pendingTickets,
          cancelledTickets: data.cancelledTickets,
          resolutionRate,
          avgResponseTimeHours: avgResponseTime,
          avgResolutionTimeHours: avgResolutionTime,
          slaComplianceRate,
          slaCompliant: data.slaCompliant,
          slaBreach: data.slaBreach
        },
        breakdown: {
          byCategory: Object.fromEntries(data.ticketsByCategory),
          byMonth: Object.fromEntries(data.ticketsByMonth)
        },
        recentTickets: data.tickets.slice(0, 5).map((vt: any) => ({
          id: vt.id,
          ticketNumber: vt.ticket.ticketNumber,
          vendorTicketNumber: vt.vendorTicketNumber,
          title: vt.ticket.title,
          status: vt.status,
          createdAt: vt.createdAt,
          resolvedAt: vt.resolvedAt,
          branch: vt.ticket.branch?.name || 'N/A',
          service: vt.ticket.service.name
        }))
      };
    });

    // Sort by total tickets descending
    vendorPerformance.sort((a, b) => b.metrics.totalTickets - a.metrics.totalTickets);

    // Calculate overall statistics
    const overallStats = {
      totalVendors: vendorPerformance.length,
      totalTickets: vendorPerformance.reduce((sum, v) => sum + v.metrics.totalTickets, 0),
      totalResolved: vendorPerformance.reduce((sum, v) => sum + v.metrics.resolvedTickets, 0),
      totalPending: vendorPerformance.reduce((sum, v) => sum + v.metrics.pendingTickets, 0),
      avgResolutionRate: vendorPerformance.length > 0
        ? Math.round(vendorPerformance.reduce((sum, v) => sum + v.metrics.resolutionRate, 0) / vendorPerformance.length)
        : 0,
      avgSlaCompliance: vendorPerformance.length > 0
        ? Math.round(vendorPerformance.reduce((sum, v) => sum + v.metrics.slaComplianceRate, 0) / vendorPerformance.length)
        : 0
    };

    return NextResponse.json({
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: period
      },
      overall: overallStats,
      vendors: vendorPerformance
    });

  } catch (error) {
    console.error('Error generating vendor performance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate vendor performance report' },
      { status: 500 }
    );
  }
}