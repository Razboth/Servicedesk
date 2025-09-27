import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeSearchInput } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const apiSource = searchParams.get('apiSource'); // omnichannel, atm-claim, direct-api
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const rawSearch = searchParams.get('search');
    const search = rawSearch ? sanitizeSearchInput(rawSearch) : null;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Get user details for role-based filtering
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    if (!userWithDetails) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build where clause for API-created tickets
    const whereClause: any = {
      OR: [
        // Tickets with sourceChannel (omnichannel tickets)
        { sourceChannel: { not: null } },
        // Tickets with API metadata
        {
          metadata: {
            path: ['integration'],
            not: null
          }
        },
        // ATM claim tickets (identified by specific service or metadata)
        {
          metadata: {
            path: ['originalRequest', 'channel'],
            equals: 'API'
          }
        }
      ]
    };

    // Role-based filtering
    if (!['ADMIN', 'SUPER_ADMIN'].includes(userWithDetails.role)) {
      if (userWithDetails.role === 'MANAGER') {
        // Managers can see all tickets in their branch
        whereClause.branchId = userWithDetails.branchId;
      } else {
        // Other roles see tickets they created or are assigned to
        whereClause.OR = [
          ...whereClause.OR.map((condition: any) => ({
            ...condition,
            createdById: session.user.id
          })),
          ...whereClause.OR.map((condition: any) => ({
            ...condition,
            assignedToId: session.user.id
          }))
        ];
      }
    }

    // Add additional filters
    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (apiSource) {
      switch (apiSource) {
        case 'omnichannel':
          whereClause.sourceChannel = { not: null };
          break;
        case 'atm-claim':
          whereClause.service = {
            name: { contains: 'ATM' }
          };
          break;
        case 'direct-api':
          whereClause.metadata = {
            path: ['integration'],
            not: null
          };
          break;
      }
    }

    // Date filtering
    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo);
      }
    }

    // Search filtering
    if (search) {
      whereClause.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Sort order
    const orderBy = getSortOrder(sortBy, sortOrder);

    // Get tickets with pagination
    const [tickets, totalCount] = await Promise.all([
      prisma.ticket.findMany({
        where: whereClause,
        include: {
          service: {
            include: { supportGroup: true }
          },
          branch: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.ticket.count({ where: whereClause })
    ]);

    // Transform tickets to include API source information
    const transformedTickets = tickets.map(ticket => ({
      ...ticket,
      apiSource: determineApiSource(ticket),
      autoResolved: isAutoResolved(ticket),
      resolutionTime: calculateResolutionTime(ticket),
      channelInfo: extractChannelInfo(ticket)
    }));

    return NextResponse.json({
      tickets: transformedTickets,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching API tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API tickets' },
      { status: 500 }
    );
  }
}

// Helper function to determine sort order
function getSortOrder(sortBy: string, sortOrder: string) {
  const order: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

  switch (sortBy) {
    case 'ticketNumber':
      return { ticketNumber: order };
    case 'title':
      return { title: order };
    case 'priority':
      return [
        { priority: 'desc' as const },
        { createdAt: 'desc' as const }
      ];
    case 'status':
      return { status: order };
    case 'createdAt':
      return { createdAt: order };
    case 'customerName':
      return { customerName: order };
    default:
      return { createdAt: 'desc' as const };
  }
}

// Helper function to determine API source
function determineApiSource(ticket: any): string {
  if (ticket.sourceChannel) {
    return 'omnichannel';
  }

  if (ticket.metadata?.integration) {
    return 'direct-api';
  }

  if (ticket.service?.name?.includes('ATM')) {
    return 'atm-claim';
  }

  return 'unknown';
}

// Helper function to check if ticket was auto-resolved
function isAutoResolved(ticket: any): boolean {
  // Check if ticket was resolved automatically (e.g., by monitoring systems)
  return ticket.metadata?.autoResolved === true ||
         (ticket.status === 'RESOLVED' && ticket.assignedToId === null);
}

// Helper function to calculate resolution time
function calculateResolutionTime(ticket: any): number | null {
  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    const created = new Date(ticket.createdAt);
    const resolved = new Date(ticket.updatedAt);
    return Math.round((resolved.getTime() - created.getTime()) / (1000 * 60)); // minutes
  }
  return null;
}

// Helper function to extract channel information
function extractChannelInfo(ticket: any): any {
  return {
    channel: ticket.sourceChannel || 'API',
    referenceId: ticket.channelReferenceId,
    serviceType: ticket.metadata?.omnichannelType,
    originalChannel: ticket.metadata?.originalRequest?.channel
  };
}