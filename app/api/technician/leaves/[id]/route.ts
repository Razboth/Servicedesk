import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/technician/leaves/[id]
 * Cancel a pending leave request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

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

    // Find the leave request
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id }
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (leaveRequest.staffProfileId !== staffProfile.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own leave requests' },
        { status: 403 }
      );
    }

    // Only allow cancelling pending requests
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cannot cancel ${leaveRequest.status.toLowerCase()} leave request. Please contact your manager.` },
        { status: 400 }
      );
    }

    // Delete the leave request
    await prisma.leaveRequest.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Leave request cancelled successfully'
    });
  } catch (error: any) {
    console.error('Error cancelling leave:', error);
    return NextResponse.json(
      { error: 'Failed to cancel leave request' },
      { status: 500 }
    );
  }
}
