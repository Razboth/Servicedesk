import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/manager/leaves/[leaveId]
 * Get a specific leave request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { leaveId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || !['MANAGER_IT', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.leaveId },
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
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        rejector: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      leave
    });
  } catch (error: any) {
    console.error('Error fetching leave:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/manager/leaves/[leaveId]
 * Update a leave request
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { leaveId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || !['MANAGER_IT', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leaveType, startDate, endDate, reason, contactNumber, emergencyContact, status } = body;

    // Get existing leave
    const existingLeave = await prisma.leaveRequest.findUnique({
      where: { id: params.leaveId },
      include: {
        staffProfile: {
          include: {
            user: {
              select: {
                branchId: true
              }
            }
          }
        }
      }
    });

    if (!existingLeave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    // For non-admin managers, verify staff is in their branch
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });

      if (user?.branchId !== existingLeave.staffProfile.user.branchId) {
        return NextResponse.json(
          { error: 'Cannot update leave for staff outside your branch' },
          { status: 403 }
        );
      }
    }

    // Build update data
    const updateData: any = {};

    if (leaveType) updateData.leaveType = leaveType;
    if (reason !== undefined) updateData.reason = reason;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;

    // Update dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Check for overlapping leaves (excluding current leave)
      const overlapping = await prisma.leaveRequest.findFirst({
        where: {
          id: { not: params.leaveId },
          staffProfileId: existingLeave.staffProfileId,
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

      updateData.startDate = start;
      updateData.endDate = end;
      updateData.totalDays = totalDays;
    }

    // Update status if provided
    if (status) {
      updateData.status = status;
      if (status === 'APPROVED') {
        updateData.approvedBy = session.user.id;
        updateData.approvedAt = new Date();
        updateData.rejectedBy = null;
        updateData.rejectedAt = null;
      } else if (status === 'REJECTED') {
        updateData.rejectedBy = session.user.id;
        updateData.rejectedAt = new Date();
        updateData.approvedBy = null;
        updateData.approvedAt = null;
      }
    }

    const leave = await prisma.leaveRequest.update({
      where: { id: params.leaveId },
      data: updateData,
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
    console.error('Error updating leave:', error);
    return NextResponse.json(
      { error: 'Failed to update leave' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/manager/leaves/[leaveId]
 * Approve or reject a leave request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { leaveId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || !['MANAGER_IT', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    if (action === 'REJECT' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: params.leaveId },
      include: {
        staffProfile: {
          include: {
            user: {
              select: {
                branchId: true
              }
            }
          }
        }
      }
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // For non-admin managers, verify the staff is in their branch
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });

      if (user?.branchId !== leaveRequest.staffProfile.user.branchId) {
        return NextResponse.json(
          { error: 'Cannot manage leave for staff outside your branch' },
          { status: 403 }
        );
      }
    }

    // Only pending requests can be approved/rejected
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Leave request is already ${leaveRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Update leave request
    const updateData: any = {
      updatedAt: new Date()
    };

    if (action === 'APPROVE') {
      updateData.status = 'APPROVED';
      updateData.approvedBy = session.user.id;
      updateData.approvedAt = new Date();
    } else {
      updateData.status = 'REJECTED';
      updateData.rejectedBy = session.user.id;
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason;
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: params.leaveId },
      data: updateData,
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
      message: `Leave request ${action.toLowerCase()}d successfully`,
      leave: updatedLeave
    });
  } catch (error: any) {
    console.error('Error updating leave:', error);
    return NextResponse.json(
      { error: 'Failed to update leave request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/manager/leaves/[leaveId]
 * Delete a leave request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { leaveId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user || !['MANAGER_IT', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing leave
    const existingLeave = await prisma.leaveRequest.findUnique({
      where: { id: params.leaveId },
      include: {
        staffProfile: {
          include: {
            user: {
              select: {
                branchId: true
              }
            }
          }
        }
      }
    });

    if (!existingLeave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    // For non-admin managers, verify staff is in their branch
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });

      if (user?.branchId !== existingLeave.staffProfile.user.branchId) {
        return NextResponse.json(
          { error: 'Cannot delete leave for staff outside your branch' },
          { status: 403 }
        );
      }
    }

    await prisma.leaveRequest.delete({
      where: { id: params.leaveId }
    });

    return NextResponse.json({
      success: true,
      message: 'Leave deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting leave:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave' },
      { status: 500 }
    );
  }
}
