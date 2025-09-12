import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const legacyTicket = await prisma.legacyTicket.findUnique({
      where: { id: params.id },
      include: {
        service: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true
          }
        },
        supportGroup: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        mappedToTicket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            createdAt: true
          }
        },
        convertedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        },
        migrationBatch: {
          select: {
            id: true,
            source: true,
            status: true,
            createdAt: true,
            completedAt: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!legacyTicket) {
      return NextResponse.json({ error: 'Legacy ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ legacyTicket });

  } catch (error) {
    console.error('Error fetching legacy ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch legacy ticket' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['TECHNICIAN', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isConverted, mappedToTicketId, assignedToId, status } = body;

    const updatedLegacyTicket = await prisma.legacyTicket.update({
      where: { id: params.id },
      data: {
        ...(isConverted !== undefined && { 
          isConverted,
          convertedAt: isConverted ? new Date() : null,
          convertedById: isConverted ? session.user.id : null
        }),
        ...(mappedToTicketId && { mappedToTicketId }),
        ...(assignedToId && { assignedToId }),
        ...(status && { status })
      },
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
        mappedToTicket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({ legacyTicket: updatedLegacyTicket });

  } catch (error) {
    console.error('Error updating legacy ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update legacy ticket' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}