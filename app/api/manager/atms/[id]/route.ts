import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !['MANAGER', 'MANAGER_IT', 'ADMIN'].includes(session.user.role)) {
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

    // Fetch ATM details
    const atm = await prisma.aTM.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        _count: {
          select: {
            incidents: true
          }
        },
        incidents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!atm) {
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this ATM's branch
    if ((session.user.role === 'MANAGER' || session.user.role === 'MANAGER_IT') && atm.branchId !== user.branch.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch recent tickets related to this ATM
    const recentTickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { description: { contains: atm.code, mode: 'insensitive' } },
          { title: { contains: atm.code, mode: 'insensitive' } }
          // Note: Custom field search would require joining with TicketFieldValue table
        ],
        branchId: atm.branchId
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        createdBy: {
          select: {
            name: true
          }
        },
        assignedTo: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      ...atm,
      recentTickets
    });
  } catch (error) {
    console.error('Error fetching ATM details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM details' },
      { status: 500 }
    );
  }
}