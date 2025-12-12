import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeSearchInput } from '@/lib/security';

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
    case 'updatedAt':
      return { updatedAt: order };
    default:
      return { createdAt: 'desc' as const };
  }
}

/**
 * GET /api/tickets/my-tickets
 *
 * Returns tickets created by the current user with filtering and pagination.
 * This endpoint is designed for end users (USER role) to see their own tickets,
 * but works for all authenticated users.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    // Filter parameters
    const statusParam = searchParams.get('status');
    const status = statusParam && statusParam !== 'all' ? statusParam.split(',').filter(Boolean) : null;
    const priorityParam = searchParams.get('priority');
    const priority = priorityParam && priorityParam !== 'all' ? priorityParam.split(',').filter(Boolean) : null;
    const rawSearch = searchParams.get('search');
    const search = rawSearch ? sanitizeSearchInput(rawSearch) : null;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Date range filters
    const createdAfter = searchParams.get('createdAfter');
    const createdBefore = searchParams.get('createdBefore');

    // Build where clause - always filter by createdById (user's own tickets)
    const where: any = {
      createdById: session.user.id,
    };

    // Exclude ATM Claim tickets (they have their own page)
    where.NOT = {
      service: {
        name: {
          contains: 'ATM Claim'
        }
      }
    };

    // Apply status filter
    if (status && status.length > 0) {
      where.status = status.length === 1 ? status[0] : { in: status };
    } else {
      // Exclude rejected tickets by default
      where.status = { not: 'REJECTED' };
    }

    // Apply priority filter
    if (priority && priority.length > 0) {
      where.priority = priority.length === 1 ? priority[0] : { in: priority };
    }

    // Apply date range filters
    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        const endDate = new Date(createdBefore);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Apply search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { service: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Fetch tickets and total count in parallel
    const [tickets, total, statsResult] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          service: {
            select: {
              name: true,
              slaHours: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true, code: true } },
          _count: { select: { comments: true } }
        },
        orderBy: getSortOrder(sortBy, sortOrder),
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.ticket.count({ where }),
      // Get statistics for the user's tickets
      prisma.ticket.groupBy({
        by: ['status'],
        where: {
          createdById: session.user.id,
          NOT: {
            service: {
              name: {
                contains: 'ATM Claim'
              }
            }
          }
        },
        _count: {
          status: true
        }
      })
    ]);

    // Process statistics
    const statsMap = new Map<string, number>(statsResult.map(s => [s.status, s._count.status]));
    const stats = {
      total: Array.from(statsMap.values()).reduce((a: number, b: number) => a + b, 0),
      open: statsMap.get('OPEN') || 0,
      inProgress: statsMap.get('IN_PROGRESS') || 0,
      resolved: (statsMap.get('RESOLVED') || 0) + (statsMap.get('CLOSED') || 0),
      pending: (statsMap.get('PENDING') || 0) +
               (statsMap.get('PENDING_APPROVAL') || 0) +
               (statsMap.get('PENDING_VENDOR') || 0),
    };

    return NextResponse.json({
      tickets,
      total,
      pages: Math.ceil(total / limit),
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
