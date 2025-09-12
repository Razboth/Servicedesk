import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const originalSystem = searchParams.get('originalSystem') || '';
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { originalTicketId: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (originalSystem) {
      where.originalSystem = originalSystem;
    }

    // Get tickets with relations
    const [legacyTickets, total] = await Promise.all([
      prisma.legacyTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          supportGroup: {
            select: {
              id: true,
              name: true
            }
          },
          mappedToTicket: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
              status: true
            }
          },
          _count: {
            select: {
              comments: true
            }
          }
        }
      }),
      prisma.legacyTicket.count({ where })
    ]);

    return NextResponse.json({
      legacyTickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching legacy tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legacy tickets' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}