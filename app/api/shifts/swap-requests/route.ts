import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/swap-requests
 * List shift swap requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');
    const staffProfileId = searchParams.get('staffProfileId');

    const where: any = {};

    if (staffProfileId) {
      where.OR = [
        { initiatorProfileId: staffProfileId },
        { recipientProfileId: staffProfileId },
      ];
    } else if (branchId) {
      where.OR = [
        { initiatorProfile: { branchId } },
        { recipientProfile: { branchId } },
      ];
    }

    if (status) where.status = status;

    const swapRequests = await prisma.shiftSwapRequest.findMany({
      where,
      include: {
        initiatorProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        recipientProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        shiftAssignment: {
          include: {
            schedule: {
              select: {
                id: true,
                month: true,
                year: true,
                branchId: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: swapRequests,
    });
  } catch (error: any) {
    console.error('Error fetching shift swap requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift swap requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shifts/swap-requests
 * Create a shift swap request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      initiatorProfileId,
      recipientProfileId,
      shiftAssignmentId,
      proposedDate,
      reason,
      swapType,
    } = body;

    if (
      !initiatorProfileId ||
      !recipientProfileId ||
      !shiftAssignmentId ||
      !reason ||
      !swapType
    ) {
      return NextResponse.json(
        {
          error:
            'initiatorProfileId, recipientProfileId, shiftAssignmentId, reason, and swapType are required',
        },
        { status: 400 }
      );
    }

    // Verify shift assignment exists
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: shiftAssignmentId },
    });

    if (!shiftAssignment) {
      return NextResponse.json(
        { error: 'Shift assignment not found' },
        { status: 404 }
      );
    }

    // Verify initiator owns the shift
    if (shiftAssignment.staffProfileId !== initiatorProfileId) {
      return NextResponse.json(
        { error: 'Initiator does not own this shift' },
        { status: 400 }
      );
    }

    const swapRequest = await prisma.shiftSwapRequest.create({
      data: {
        initiatorProfileId,
        recipientProfileId,
        shiftAssignmentId,
        proposedDate: proposedDate ? new Date(proposedDate) : null,
        reason,
        swapType,
        status: 'PENDING_RECIPIENT',
      },
      include: {
        initiatorProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        recipientProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        shiftAssignment: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: swapRequest,
      message: 'Shift swap request created successfully',
    });
  } catch (error: any) {
    console.error('Error creating shift swap request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create shift swap request' },
      { status: 500 }
    );
  }
}