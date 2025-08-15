import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const supportGroupId = searchParams.get('supportGroupId');
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';

    // Build where clause
    const where: any = {
      role: 'TECHNICIAN'
    };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (supportGroupId && supportGroupId !== 'all') {
      where.supportGroupId = supportGroupId;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Fetch technicians with statistics
    const technicians = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        supportGroup: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            assignedTickets: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // If includeStats is true, get additional statistics
    if (includeStats) {
      const techniciansWithStats = await Promise.all(
        technicians.map(async (tech) => {
          // Get ticket statistics
          const [openTickets, inProgressTickets, resolvedToday] = await Promise.all([
            prisma.ticket.count({
              where: {
                assignedToId: tech.id,
                status: 'OPEN'
              }
            }),
            prisma.ticket.count({
              where: {
                assignedToId: tech.id,
                status: 'IN_PROGRESS'
              }
            }),
            prisma.ticket.count({
              where: {
                assignedToId: tech.id,
                status: 'RESOLVED',
                resolvedAt: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
              }
            })
          ]);

          // Calculate average resolution time (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const resolvedTickets = await prisma.ticket.findMany({
            where: {
              assignedToId: tech.id,
              status: 'RESOLVED',
              resolvedAt: {
                gte: thirtyDaysAgo
              }
            },
            select: {
              createdAt: true,
              resolvedAt: true
            }
          });

          let avgResolutionTime = 0;
          if (resolvedTickets.length > 0) {
            const totalTime = resolvedTickets.reduce((sum, ticket) => {
              if (ticket.resolvedAt) {
                return sum + (ticket.resolvedAt.getTime() - ticket.createdAt.getTime());
              }
              return sum;
            }, 0);
            avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // Convert to hours
          }

          return {
            ...tech,
            stats: {
              openTickets,
              inProgressTickets,
              resolvedToday,
              avgResolutionTime: Math.round(avgResolutionTime)
            }
          };
        })
      );

      return NextResponse.json(techniciansWithStats);
    }

    return NextResponse.json(technicians);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technicians' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { technicianIds, supportGroupId, action } = body;

    if (!technicianIds || !Array.isArray(technicianIds) || technicianIds.length === 0) {
      return NextResponse.json(
        { error: 'Technician IDs are required' },
        { status: 400 }
      );
    }

    if (action === 'assign' && !supportGroupId) {
      return NextResponse.json(
        { error: 'Support group ID is required for assignment' },
        { status: 400 }
      );
    }

    // Verify all users are technicians
    const users = await prisma.user.findMany({
      where: {
        id: { in: technicianIds },
        role: 'TECHNICIAN'
      }
    });

    if (users.length !== technicianIds.length) {
      return NextResponse.json(
        { error: 'Some users are not technicians' },
        { status: 400 }
      );
    }

    // Update technicians
    let updateData: any = {};
    
    if (action === 'assign') {
      updateData.supportGroupId = supportGroupId;
    } else if (action === 'unassign') {
      updateData.supportGroupId = null;
    } else if (action === 'activate') {
      updateData.isActive = true;
    } else if (action === 'deactivate') {
      updateData.isActive = false;
    }

    const result = await prisma.user.updateMany({
      where: {
        id: { in: technicianIds },
        role: 'TECHNICIAN'
      },
      data: updateData
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_UPDATE',
        entity: 'Technician',
        entityId: technicianIds.join(','),
        newValues: { action, ...updateData },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    });

    return NextResponse.json({
      success: true,
      updated: result.count
    });
  } catch (error) {
    console.error('Error updating technicians:', error);
    return NextResponse.json(
      { error: 'Failed to update technicians' },
      { status: 500 }
    );
  }
}