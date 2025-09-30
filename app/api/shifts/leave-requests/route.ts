import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/leave-requests
 * List leave requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffProfileId = searchParams.get('staffProfileId');
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');

    const where: any = {};

    if (staffProfileId) {
      where.staffProfileId = staffProfileId;
    } else if (branchId) {
      where.staffProfile = {
        branchId,
      };
    }

    if (status) where.status = status;

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        staffProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: leaveRequests,
    });
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shifts/leave-requests
 * Create a leave request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      staffProfileId,
      leaveType,
      startDate,
      endDate,
      reason,
      contactNumber,
      emergencyContact,
    } = body;

    if (!staffProfileId || !leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'staffProfileId, leaveType, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Calculate total days
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        staffProfileId,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        contactNumber,
        emergencyContact,
        status: 'PENDING',
      },
      include: {
        staffProfile: {
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
      },
    });

    return NextResponse.json({
      success: true,
      data: leaveRequest,
      message: 'Leave request submitted successfully',
    });
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create leave request' },
      { status: 500 }
    );
  }
}