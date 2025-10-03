import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/manager/leaves
 * Get all leave requests for staff in manager's branch
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['MANAGER_IT', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const staffProfileId = searchParams.get('staffProfileId');
    const scheduleId = searchParams.get('scheduleId');

    // Build where clause
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (staffProfileId) {
      where.staffProfileId = staffProfileId;
    }

    if (scheduleId) {
      where.scheduleId = scheduleId;
    } else if (session.user.role !== 'ADMIN') {
      // For managers, only show leaves from their branch staff
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });

      if (!user?.branchId) {
        return NextResponse.json({ error: 'User branch not found' }, { status: 404 });
      }

      // Get staff profiles from manager's branch
      const staffProfiles = await prisma.staffShiftProfile.findMany({
        where: {
          user: {
            branchId: user.branchId
          }
        },
        select: { id: true }
      });

      where.staffProfileId = {
        in: staffProfiles.map(sp => sp.id)
      };
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
 * POST /api/manager/leaves
 * Create a new leave request for a staff member
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || !['MANAGER_IT', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { staffProfileId, leaveType, startDate, endDate, reason, contactNumber, emergencyContact, scheduleId } = body;

    // Validate required fields
    if (!staffProfileId || !leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if staff profile exists
    const staffProfile = await prisma.staffShiftProfile.findUnique({
      where: { id: staffProfileId },
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
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    // For non-admin managers, verify staff is in their branch
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });

      if (user?.branchId !== staffProfile.user.branchId) {
        return NextResponse.json(
          { error: 'Cannot create leave for staff outside your branch' },
          { status: 403 }
        );
      }
    }

    // Calculate total days - use UTC to avoid timezone issues
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set to start of day in UTC to avoid timezone offset issues
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping leaves
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        staffProfileId,
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

    // Create leave request
    const leave = await prisma.leaveRequest.create({
      data: {
        staffProfileId,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        contactNumber,
        emergencyContact,
        scheduleId, // Link to schedule if provided
        status: 'APPROVED', // Auto-approve when created by manager
        approvedBy: session.user.id,
        approvedAt: new Date()
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
      leave
    });
  } catch (error: any) {
    console.error('Error creating leave:', error);
    return NextResponse.json(
      { error: 'Failed to create leave' },
      { status: 500 }
    );
  }
}
