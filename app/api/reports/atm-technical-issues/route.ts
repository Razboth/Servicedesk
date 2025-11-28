import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

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
  resolvedAt: string | null;
  closedAt: string | null;
  branch: { name: string; code: string } | null;
  assignedTo: { name: string } | null;
  customFields: Record<string, string>;
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

    // 1. Find ATM Technical Issue services
    const atmServices = await prisma.service.findMany({
      where: {
        name: {
          in: ['ATM - Permasalahan Teknis', 'ATM Technical Issue']
        },
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
          avgResolutionTime: 0
        },
        statusDistribution: [],
        priorityDistribution: [],
        branchBreakdown: [],
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

    // 3. Get tickets with custom field values
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
        fieldValues: {
          include: {
            field: { select: { id: true, name: true, label: true, type: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Calculate summary statistics
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'OPEN').length;
    const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;

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

    // 5. Status distribution
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

    // 6. Priority distribution
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

    // 7. Branch breakdown
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

    // 8. Transform tickets with custom fields
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
        avgResolutionTime
      },
      statusDistribution,
      priorityDistribution,
      branchBreakdown,
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
