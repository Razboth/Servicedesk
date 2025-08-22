import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    if (!user?.branch) {
      return NextResponse.json(
        { error: 'No branch assigned' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build where clause - managers can only see tickets from users in their branch
    const where: any = {
      AND: [
        // Ticket must be from the manager's branch
        { branchId: user.branch.id },
        // Ticket creator must be from the same branch as the manager
        {
          createdBy: {
            branchId: user.branch.id
          }
        }
      ]
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    // Fetch tickets with pagination
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          service: {
            select: {
              name: true,
              category: { select: { name: true } }
            }
          },
          createdBy: {
            select: {
              name: true,
              email: true,
              branchId: true
            }
          },
          assignedTo: {
            select: {
              name: true,
              email: true
            }
          },
          _count: {
            select: { comments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.ticket.count({ where })
    ]);

    // Calculate statistics
    const stats = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        AND: [
          { branchId: user.branch.id },
          {
            createdBy: {
              branchId: user.branch.id
            }
          }
        ]
      },
      _count: true
    });

    const avgResolutionTime = await prisma.ticket.aggregate({
      where: {
        AND: [
          { branchId: user.branch.id },
          {
            createdBy: {
              branchId: user.branch.id
            }
          }
        ],
        status: 'RESOLVED',
        actualHours: { not: null }
      },
      _avg: {
        actualHours: true
      }
    });

    // Process stats
    const processedStats = {
      total,
      pending_approval: stats.find(s => s.status === 'PENDING_APPROVAL')?._count || 0,
      open: stats.find(s => s.status === 'OPEN')?._count || 0,
      in_progress: stats.find(s => s.status === 'IN_PROGRESS')?._count || 0,
      resolved: stats.find(s => s.status === 'RESOLVED')?._count || 0,
      closed: stats.find(s => s.status === 'CLOSED')?._count || 0,
      avgResolutionTime: avgResolutionTime._avg.actualHours 
        ? Math.round(avgResolutionTime._avg.actualHours)
        : 0
    };

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: processedStats,
      branch: {
        name: user.branch.name,
        code: user.branch.code
      }
    });
  } catch (error) {
    console.error('Error fetching manager tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}