import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit, createUserBasedKeyGenerator } from '@/lib/rate-limit';

/**
 * GET /api/technician/leaves
 * Get all leave requests for the current technician
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Get technician's staff profile
    const staffProfile = await prisma.staffShiftProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = {
      staffProfileId: staffProfile.id
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        staffProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                branch: {
                  select: {
                    name: true,
                    code: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch approver and rejector details separately
    const leavesWithUsers = await Promise.all(
      leaves.map(async (leave) => {
        const [approver, rejector] = await Promise.all([
          leave.approvedBy
            ? prisma.user.findUnique({
                where: { id: leave.approvedBy },
                select: { id: true, name: true, email: true }
              })
            : null,
          leave.rejectedBy
            ? prisma.user.findUnique({
                where: { id: leave.rejectedBy },
                select: { id: true, name: true, email: true }
              })
            : null
        ]);

        return {
          ...leave,
          approver,
          rejector
        };
      })
    );

    return NextResponse.json({
      success: true,
      leaves: leavesWithUsers
    });
  } catch (error: any) {
    console.error('Error fetching leaves:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaves' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/technician/leaves
 * Create a new leave request (status: PENDING)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 10 leave requests per minute per user
    const rateLimitResult = rateLimit(request, {
      limit: 10,
      windowMs: 60000,
      keyGenerator: createUserBasedKeyGenerator(session.user.id),
      message: 'Too many leave requests. Please try again in a minute.',
    });
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { leaveType, startDate, endDate, reason, contactNumber, emergencyContact } = body;

    // Validate required fields
    if (!leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get technician's staff profile
    const staffProfile = await prisma.staffShiftProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            branchId: true
          }
        }
      }
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: 'Staff profile not found. Please contact your manager to create a staff profile.' },
        { status: 404 }
      );
    }

    // Calculate total days - use UTC to avoid timezone issues
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set to start of day in UTC to avoid timezone offset issues
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    // Validate date range
    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be after or equal to start date' },
        { status: 400 }
      );
    }

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping leaves
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        status: {
          in: ['PENDING', 'APPROVED']
        },
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'Leave period overlaps with existing leave request' },
        { status: 400 }
      );
    }

    // Create leave request with PENDING status
    const leave = await prisma.leaveRequest.create({
      data: {
        staffProfileId: staffProfile.id,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        contactNumber,
        emergencyContact,
        status: 'PENDING', // Technicians submit as PENDING, waiting for manager approval
      },
      include: {
        staffProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Leave request submitted successfully. Waiting for manager approval.',
      leave
    });
  } catch (error: any) {
    console.error('Error creating leave:', error);
    return NextResponse.json(
      { error: 'Failed to create leave request' },
      { status: 500 }
    );
  }
}
