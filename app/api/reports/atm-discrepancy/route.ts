import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/atm-discrepancy
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to reports
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER_IT', 'MANAGER', 'TECHNICIAN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const atmCode = searchParams.get('atmCode');
    const status = searchParams.get('status');
    const discrepancyType = searchParams.get('discrepancyType');

    // Find the service
    const service = await prisma.service.findFirst({
      where: {
        name: { startsWith: 'Permintaan Penyelesaian Selisih ATM' }
      }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Get tickets for this service
    const tickets = await prisma.ticket.findMany({
      where: {
        serviceId: service.id,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        ...(status ? { status: status as any } : {})
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        fieldValues: {
          include: {
            field: true
          }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            author: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Process tickets to extract custom field values
    const processedTickets = tickets.map(ticket => {
      const customFields: Record<string, any> = {};

      ticket.fieldValues.forEach(fv => {
        if (fv.field) {
          customFields[fv.field.name] = fv.value;
        }
      });

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        resolvedAt: ticket.resolvedAt,
        closedAt: ticket.closedAt,
        createdBy: ticket.createdBy,
        assignedTo: ticket.assignedTo,
        branch: ticket.branch,
        lastComment: ticket.comments[0] || null,
        // Custom fields
        atmCode: customFields['atm_code'] || null,
        atmLocation: customFields['atm_location'] || null,
        discrepancyType: customFields['discrepancy_type'] || null,
        journalLog: customFields['journal_log'] || null,
        rcFile: customFields['rc_file'] || null,
        transactionAmount: customFields['transaction_amount'] ? parseFloat(customFields['transaction_amount']) : null
      };
    });

    // Apply additional filters
    let filteredTickets = processedTickets;

    if (atmCode) {
      filteredTickets = filteredTickets.filter(t =>
        t.atmCode && t.atmCode.toLowerCase().includes(atmCode.toLowerCase())
      );
    }

    if (discrepancyType) {
      filteredTickets = filteredTickets.filter(t =>
        t.discrepancyType && t.discrepancyType.toLowerCase().includes(discrepancyType.toLowerCase())
      );
    }

    // Calculate summary statistics
    const totalTickets = filteredTickets.length;
    const totalAmount = filteredTickets.reduce((sum, t) => sum + (t.transactionAmount || 0), 0);

    const statusBreakdown = {
      OPEN: filteredTickets.filter(t => t.status === 'OPEN').length,
      IN_PROGRESS: filteredTickets.filter(t => t.status === 'IN_PROGRESS').length,
      ON_HOLD: filteredTickets.filter(t => t.status === 'ON_HOLD').length,
      RESOLVED: filteredTickets.filter(t => t.status === 'RESOLVED').length,
      CLOSED: filteredTickets.filter(t => t.status === 'CLOSED').length,
      CANCELLED: filteredTickets.filter(t => t.status === 'CANCELLED').length
    };

    // Group by ATM
    const atmBreakdown: Record<string, { count: number; totalAmount: number; tickets: any[] }> = {};
    filteredTickets.forEach(ticket => {
      const atm = ticket.atmCode || 'Unknown';
      if (!atmBreakdown[atm]) {
        atmBreakdown[atm] = { count: 0, totalAmount: 0, tickets: [] };
      }
      atmBreakdown[atm].count++;
      atmBreakdown[atm].totalAmount += ticket.transactionAmount || 0;
      atmBreakdown[atm].tickets.push(ticket);
    });

    // Group by discrepancy type
    const discrepancyBreakdown: Record<string, { count: number; totalAmount: number }> = {};
    filteredTickets.forEach(ticket => {
      const type = ticket.discrepancyType || 'Unknown';
      if (!discrepancyBreakdown[type]) {
        discrepancyBreakdown[type] = { count: 0, totalAmount: 0 };
      }
      discrepancyBreakdown[type].count++;
      discrepancyBreakdown[type].totalAmount += ticket.transactionAmount || 0;
    });

    // Group by branch
    const branchBreakdown: Record<string, { count: number; totalAmount: number }> = {};
    filteredTickets.forEach(ticket => {
      const branchName = ticket.branch?.name || ticket.createdBy?.branch?.name || 'Unknown';
      if (!branchBreakdown[branchName]) {
        branchBreakdown[branchName] = { count: 0, totalAmount: 0 };
      }
      branchBreakdown[branchName].count++;
      branchBreakdown[branchName].totalAmount += ticket.transactionAmount || 0;
    });

    // Monthly trend
    const monthlyTrend: Record<string, { count: number; totalAmount: number }> = {};
    filteredTickets.forEach(ticket => {
      const month = new Date(ticket.createdAt).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyTrend[month]) {
        monthlyTrend[month] = { count: 0, totalAmount: 0 };
      }
      monthlyTrend[month].count++;
      monthlyTrend[month].totalAmount += ticket.transactionAmount || 0;
    });

    // Resolution time analysis
    const resolvedTickets = filteredTickets.filter(t => t.resolvedAt);
    const avgResolutionTime = resolvedTickets.length > 0
      ? resolvedTickets.reduce((sum, t) => {
          const created = new Date(t.createdAt).getTime();
          const resolved = new Date(t.resolvedAt!).getTime();
          return sum + (resolved - created);
        }, 0) / resolvedTickets.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTickets,
          totalAmount,
          avgResolutionTimeHours: Math.round(avgResolutionTime * 10) / 10,
          resolvedCount: resolvedTickets.length,
          pendingCount: totalTickets - statusBreakdown.RESOLVED - statusBreakdown.CLOSED - statusBreakdown.CANCELLED
        },
        statusBreakdown,
        atmBreakdown: Object.entries(atmBreakdown)
          .map(([atm, data]) => ({ atm, ...data }))
          .sort((a, b) => b.count - a.count),
        discrepancyBreakdown: Object.entries(discrepancyBreakdown)
          .map(([type, data]) => ({ type, ...data }))
          .sort((a, b) => b.count - a.count),
        branchBreakdown: Object.entries(branchBreakdown)
          .map(([branch, data]) => ({ branch, ...data }))
          .sort((a, b) => b.count - a.count),
        monthlyTrend: Object.entries(monthlyTrend)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        tickets: filteredTickets
      }
    });
  } catch (error) {
    console.error('Error generating ATM discrepancy report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
