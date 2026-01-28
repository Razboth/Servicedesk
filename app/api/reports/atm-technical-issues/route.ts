import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

interface PriorityDistribution {
  priority: string;
  count: number;
  percentage: number;
}

interface BranchBreakdown {
  branchName: string;
  branchCode: string;
  count: number;
}

interface CustomFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: string;
}

interface TicketData {
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  claimedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  branch: { name: string; code: string } | null;
  assignedTo: { name: string } | null;
  customFields: Record<string, string>;
}

interface ATMMetrics {
  atmCode: string;
  atmName: string;
  atmLocation: string;
  branchName: string;
  branchCode: string;
  currentMonthTickets: number;
  lastMonthTickets: number;
  changeFromLastMonth: number;
  changePercentage: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResolutionTime: number;
  // Monitoring data
  availability: number | null;
  totalDowntimeHours: number;
  activeIncidents: number;
  lastPingStatus: string | null;
  networkVendor: string | null;
  ipAddress: string | null;
  // Error types breakdown
  errorTypes: { type: string; count: number }[];
}

interface ErrorTypeBreakdown {
  errorType: string;
  count: number;
  percentage: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Validate month and year
    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
    }

    const targetDate = new Date(year, month - 1, 1);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    // Calculate last month range
    const lastMonthDate = subMonths(targetDate, 1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);

    // 1. Find ATM Technical Issue services (using startsWith to handle trailing spaces)
    const atmServices = await prisma.service.findMany({
      where: {
        OR: [
          { name: { startsWith: 'ATM - Permasalahan Teknis' } },
          { name: { startsWith: 'ATM Technical Issue' } }
        ],
        isActive: true
      },
      select: { id: true, name: true }
    });

    const serviceIds = atmServices.map(s => s.id);

    if (serviceIds.length === 0) {
      return NextResponse.json({
        summary: {
          totalTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          avgResolutionTime: 0,
          lastMonthTotal: 0,
          changeFromLastMonth: 0
        },
        statusDistribution: [],
        priorityDistribution: [],
        branchBreakdown: [],
        atmMetrics: [],
        errorTypeBreakdown: [],
        tickets: [],
        customFieldDefinitions: [],
        period: { month, year }
      });
    }

    // 2. Get custom field definitions for these services
    const customFields = await prisma.serviceField.findMany({
      where: {
        serviceId: { in: serviceIds },
        isActive: true
      },
      select: { id: true, name: true, label: true, type: true },
      orderBy: { order: 'asc' }
    });

    const customFieldDefinitions: CustomFieldDefinition[] = customFields.map(f => ({
      id: f.id,
      name: f.name,
      label: f.label,
      type: f.type
    }));

    // Find the atm_code field ID
    const atmCodeField = customFields.find(f => f.name === 'atm_code');
    const errorTypeField = customFields.find(f => f.name === 'daftar_error_atm');

    // 3. Get tickets with custom field values for current month
    const tickets = await prisma.ticket.findMany({
      where: {
        serviceId: { in: serviceIds },
        createdAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      include: {
        createdBy: {
          select: {
            name: true,
            branch: { select: { name: true, code: true } }
          }
        },
        assignedTo: { select: { name: true } },
        service: { select: { name: true } },
        branch: { select: { name: true, code: true } },
        comments: {
          where: {
            OR: [
              { content: { contains: 'Ticket claimed by', mode: 'insensitive' } },
              { content: { contains: 'Ticket assigned to', mode: 'insensitive' } }
            ]
          },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' as const },
          take: 1
        },
        fieldValues: {
          include: {
            field: { select: { id: true, name: true, label: true, type: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Get last month tickets for comparison
    const lastMonthTickets = await prisma.ticket.findMany({
      where: {
        serviceId: { in: serviceIds },
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      },
      include: {
        fieldValues: {
          where: atmCodeField ? { fieldId: atmCodeField.id } : undefined,
          include: {
            field: { select: { name: true } }
          }
        }
      }
    });

    // 5. Calculate summary statistics
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'OPEN').length;
    const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;
    const lastMonthTotal = lastMonthTickets.length;
    const changeFromLastMonth = totalTickets - lastMonthTotal;

    // Calculate average resolution time (created to resolved/closed)
    let totalResolutionTime = 0;
    let ticketsWithResolution = 0;
    for (const ticket of tickets) {
      const endTime = ticket.resolvedAt || ticket.closedAt;
      if (endTime) {
        const duration = (endTime.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60); // hours
        if (duration >= 0) {
          totalResolutionTime += duration;
          ticketsWithResolution++;
        }
      }
    }
    const avgResolutionTime = ticketsWithResolution > 0
      ? Math.round((totalResolutionTime / ticketsWithResolution) * 10) / 10
      : 0;

    // 6. Status distribution
    const statusCounts = new Map<string, number>();
    for (const ticket of tickets) {
      const count = statusCounts.get(ticket.status) || 0;
      statusCounts.set(ticket.status, count + 1);
    }
    const statusDistribution: StatusDistribution[] = Array.from(statusCounts.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 100 * 10) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 7. Priority distribution
    const priorityCounts = new Map<string, number>();
    for (const ticket of tickets) {
      const count = priorityCounts.get(ticket.priority) || 0;
      priorityCounts.set(ticket.priority, count + 1);
    }
    const priorityDistribution: PriorityDistribution[] = Array.from(priorityCounts.entries())
      .map(([priority, count]) => ({
        priority,
        count,
        percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 100 * 10) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 8. Branch breakdown
    const branchCounts = new Map<string, { name: string; code: string; count: number }>();
    for (const ticket of tickets) {
      const branch = ticket.branch;
      if (branch) {
        const key = branch.code || branch.name;
        const existing = branchCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          branchCounts.set(key, {
            name: branch.name,
            code: branch.code || '',
            count: 1
          });
        }
      }
    }
    const branchBreakdown: BranchBreakdown[] = Array.from(branchCounts.values())
      .sort((a, b) => b.count - a.count);

    // 9. Error type breakdown
    const errorTypeCounts = new Map<string, number>();
    for (const ticket of tickets) {
      const errorTypeValue = ticket.fieldValues.find(fv => fv.field.name === 'daftar_error_atm');
      if (errorTypeValue?.value) {
        // Could be comma-separated for multiselect
        const errorTypes = errorTypeValue.value.split(',').map(e => e.trim());
        for (const errorType of errorTypes) {
          if (errorType) {
            const count = errorTypeCounts.get(errorType) || 0;
            errorTypeCounts.set(errorType, count + 1);
          }
        }
      }
    }
    const errorTypeBreakdown: ErrorTypeBreakdown[] = Array.from(errorTypeCounts.entries())
      .map(([errorType, count]) => ({
        errorType,
        count,
        percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 100 * 10) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 10. ATM Metrics - Group tickets by ATM code
    const atmTicketMap = new Map<string, {
      atmCode: string;
      atmName: string;
      atmLocation: string;
      branchName: string;
      branchCode: string;
      tickets: typeof tickets;
      errorTypes: Map<string, number>;
    }>();

    // Build last month ATM counts
    const lastMonthAtmCounts = new Map<string, number>();
    for (const ticket of lastMonthTickets) {
      const atmCodeValue = ticket.fieldValues.find(fv => fv.field.name === 'atm_code');
      if (atmCodeValue?.value) {
        const atmCode = atmCodeValue.value.split(' - ')[0].trim();
        const count = lastMonthAtmCounts.get(atmCode) || 0;
        lastMonthAtmCounts.set(atmCode, count + 1);
      }
    }

    // Process current month tickets by ATM
    for (const ticket of tickets) {
      const atmCodeValue = ticket.fieldValues.find(fv => fv.field.name === 'atm_code');
      const atmLocationValue = ticket.fieldValues.find(fv => fv.field.name === 'atm_location');
      const errorTypeValue = ticket.fieldValues.find(fv => fv.field.name === 'daftar_error_atm');

      if (atmCodeValue?.value) {
        const fullAtmCode = atmCodeValue.value;
        const parts = fullAtmCode.split(' - ');
        const atmCode = parts[0].trim();
        const atmName = parts.slice(1).join(' - ').trim() || fullAtmCode;

        const existing = atmTicketMap.get(atmCode);
        if (existing) {
          existing.tickets.push(ticket);
          // Count error types
          if (errorTypeValue?.value) {
            const errorTypes = errorTypeValue.value.split(',').map(e => e.trim());
            for (const et of errorTypes) {
              if (et) {
                const count = existing.errorTypes.get(et) || 0;
                existing.errorTypes.set(et, count + 1);
              }
            }
          }
        } else {
          const errorTypes = new Map<string, number>();
          if (errorTypeValue?.value) {
            const ets = errorTypeValue.value.split(',').map(e => e.trim());
            for (const et of ets) {
              if (et) errorTypes.set(et, 1);
            }
          }
          atmTicketMap.set(atmCode, {
            atmCode,
            atmName,
            atmLocation: atmLocationValue?.value || '',
            branchName: ticket.branch?.name || '',
            branchCode: ticket.branch?.code || '',
            tickets: [ticket],
            errorTypes
          });
        }
      }
    }

    // 11. Get ATM monitoring data for all ATM codes
    const atmCodes = Array.from(atmTicketMap.keys());
    const atmRecords = await prisma.aTM.findMany({
      where: {
        code: { in: atmCodes }
      },
      include: {
        branch: { select: { name: true, code: true } },
        incidents: {
          where: {
            OR: [
              { status: 'OPEN' },
              {
                AND: [
                  { detectedAt: { gte: monthStart } },
                  { detectedAt: { lte: monthEnd } }
                ]
              }
            ]
          },
          orderBy: { detectedAt: 'desc' }
        },
        pingResults: {
          take: 100,
          where: {
            checkedAt: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          orderBy: { checkedAt: 'desc' }
        }
      }
    });

    // Build ATM lookup map
    const atmLookup = new Map(atmRecords.map(atm => [atm.code, atm]));

    // 12. Build ATM metrics
    const atmMetrics: ATMMetrics[] = Array.from(atmTicketMap.entries()).map(([atmCode, data]) => {
      const atmRecord = atmLookup.get(atmCode);
      const ticketCount = data.tickets.length;
      const lastMonthCount = lastMonthAtmCounts.get(atmCode) || 0;
      const change = ticketCount - lastMonthCount;

      // Calculate resolution time for this ATM
      let atmResolutionTime = 0;
      let atmTicketsResolved = 0;
      let atmOpenTickets = 0;
      let atmInProgressTickets = 0;
      let atmResolvedTickets = 0;
      let atmClosedTickets = 0;

      for (const ticket of data.tickets) {
        if (ticket.status === 'OPEN') atmOpenTickets++;
        if (ticket.status === 'IN_PROGRESS') atmInProgressTickets++;
        if (ticket.status === 'RESOLVED') atmResolvedTickets++;
        if (ticket.status === 'CLOSED') atmClosedTickets++;

        const endTime = ticket.resolvedAt || ticket.closedAt;
        if (endTime) {
          const duration = (endTime.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          if (duration >= 0) {
            atmResolutionTime += duration;
            atmTicketsResolved++;
          }
        }
      }

      // Calculate availability from ping results
      let availability: number | null = null;
      let lastPingStatus: string | null = null;
      if (atmRecord?.pingResults && atmRecord.pingResults.length > 0) {
        const successfulPings = atmRecord.pingResults.filter(p => p.status === 'SUCCESS').length;
        availability = Math.round((successfulPings / atmRecord.pingResults.length) * 100 * 10) / 10;
        lastPingStatus = atmRecord.pingResults[0]?.status || null;
      }

      // Calculate total downtime from incidents
      let totalDowntimeHours = 0;
      let activeIncidents = 0;
      if (atmRecord?.incidents) {
        for (const incident of atmRecord.incidents) {
          if (incident.status === 'OPEN') {
            activeIncidents++;
            // Calculate ongoing downtime
            const now = new Date();
            const downtimeMs = now.getTime() - incident.detectedAt.getTime();
            totalDowntimeHours += downtimeMs / (1000 * 60 * 60);
          } else if (incident.resolvedAt) {
            const downtimeMs = incident.resolvedAt.getTime() - incident.detectedAt.getTime();
            totalDowntimeHours += downtimeMs / (1000 * 60 * 60);
          }
        }
      }

      // Error types for this ATM
      const errorTypes = Array.from(data.errorTypes.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      return {
        atmCode,
        atmName: data.atmName || atmRecord?.name || '',
        atmLocation: data.atmLocation || atmRecord?.location || '',
        branchName: data.branchName || atmRecord?.branch?.name || '',
        branchCode: data.branchCode || atmRecord?.branch?.code || '',
        currentMonthTickets: ticketCount,
        lastMonthTickets: lastMonthCount,
        changeFromLastMonth: change,
        changePercentage: lastMonthCount > 0 ? Math.round((change / lastMonthCount) * 100) : (ticketCount > 0 ? 100 : 0),
        openTickets: atmOpenTickets,
        inProgressTickets: atmInProgressTickets,
        resolvedTickets: atmResolvedTickets,
        closedTickets: atmClosedTickets,
        avgResolutionTime: atmTicketsResolved > 0
          ? Math.round((atmResolutionTime / atmTicketsResolved) * 10) / 10
          : 0,
        availability,
        totalDowntimeHours: Math.round(totalDowntimeHours * 10) / 10,
        activeIncidents,
        lastPingStatus,
        networkVendor: atmRecord?.networkVendor || null,
        ipAddress: atmRecord?.ipAddress || null,
        errorTypes
      };
    }).sort((a, b) => b.currentMonthTickets - a.currentMonthTickets);

    // 13. Transform tickets with custom fields
    const ticketData: TicketData[] = tickets.map(ticket => {
      // Build custom fields object
      const customFieldsObj: Record<string, string> = {};
      for (const fv of ticket.fieldValues) {
        customFieldsObj[fv.field.name] = fv.value;
      }

      return {
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        claimedAt: ticket.comments[0]?.createdAt?.toISOString() || null,
        resolvedAt: ticket.resolvedAt?.toISOString() || null,
        closedAt: ticket.closedAt?.toISOString() || null,
        branch: ticket.branch ? {
          name: ticket.branch.name,
          code: ticket.branch.code || ''
        } : null,
        assignedTo: ticket.assignedTo ? {
          name: ticket.assignedTo.name || 'Unknown'
        } : null,
        customFields: customFieldsObj
      };
    });

    return NextResponse.json({
      summary: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        avgResolutionTime,
        lastMonthTotal,
        changeFromLastMonth
      },
      statusDistribution,
      priorityDistribution,
      branchBreakdown,
      atmMetrics,
      errorTypeBreakdown,
      tickets: ticketData,
      customFieldDefinitions,
      period: { month, year }
    });

  } catch (error) {
    console.error('Error fetching ATM technical issues report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM technical issues report' },
      { status: 500 }
    );
  }
}
