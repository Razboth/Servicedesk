import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/shifts/swap-requests/[swapRequestId]
 * Respond to or approve/reject shift swap request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { swapRequestId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, response, rejectionReason, managerNotes } = body;

    const swapRequest = await prisma.shiftSwapRequest.findUnique({
      where: { id: params.swapRequestId },
      include: {
        initiatorProfile: true,
        recipientProfile: true,
        shiftAssignment: true,
      },
    });

    if (!swapRequest) {
      return NextResponse.json(
        { error: 'Swap request not found' },
        { status: 404 }
      );
    }

    let updatedSwapRequest;

    // Recipient responding to swap request
    if (action === 'recipient_response') {
      if (!['ACCEPT', 'REJECT'].includes(response)) {
        return NextResponse.json(
          { error: 'Invalid response. Must be ACCEPT or REJECT' },
          { status: 400 }
        );
      }

      if (swapRequest.status !== 'PENDING_RECIPIENT') {
        return NextResponse.json(
          { error: 'Swap request is not pending recipient response' },
          { status: 400 }
        );
      }

      updatedSwapRequest = await prisma.shiftSwapRequest.update({
        where: { id: params.swapRequestId },
        data: {
          recipientResponse: response,
          recipientRespondedAt: new Date(),
          status: response === 'ACCEPT' ? 'PENDING_MANAGER' : 'REJECTED',
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
        data: updatedSwapRequest,
        message: `Swap request ${response.toLowerCase()}ed successfully`,
      });
    }

    // Manager approval/rejection
    if (action === 'manager_decision') {
      if (!['MANAGER', 'MANAGER_IT', 'ADMIN'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions. Manager, IT Manager, or Admin role required.' },
          { status: 403 }
        );
      }

      if (!['APPROVE', 'REJECT'].includes(response)) {
        return NextResponse.json(
          { error: 'Invalid response. Must be APPROVE or REJECT' },
          { status: 400 }
        );
      }

      if (swapRequest.status !== 'PENDING_MANAGER') {
        return NextResponse.json(
          { error: 'Swap request is not pending manager approval' },
          { status: 400 }
        );
      }

      const updateData: any = {
        status: response === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        managerNotes,
      };

      if (response === 'APPROVE') {
        updateData.approvedBy = session.user.id;
        updateData.approvedAt = new Date();
        updateData.completedAt = new Date();

        // Execute the swap
        await prisma.shiftAssignment.update({
          where: { id: swapRequest.shiftAssignmentId },
          data: {
            staffProfileId: swapRequest.recipientProfileId,
            isManualOverride: true,
            status: 'SWAPPED',
          },
        });

        // If there's a proposed date for trade, swap that too
        if (swapRequest.proposedDate && swapRequest.swapType === 'TRADE') {
          const recipientShift = await prisma.shiftAssignment.findFirst({
            where: {
              staffProfileId: swapRequest.recipientProfileId,
              date: swapRequest.proposedDate,
              scheduleId: swapRequest.shiftAssignment.scheduleId,
            },
          });

          if (recipientShift) {
            await prisma.shiftAssignment.update({
              where: { id: recipientShift.id },
              data: {
                staffProfileId: swapRequest.initiatorProfileId,
                isManualOverride: true,
                status: 'SWAPPED',
              },
            });
          }
        }
      } else {
        updateData.rejectedBy = session.user.id;
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = rejectionReason;
      }

      updatedSwapRequest = await prisma.shiftSwapRequest.update({
        where: { id: params.swapRequestId },
        data: updateData,
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
        data: updatedSwapRequest,
        message: `Swap request ${response.toLowerCase()}d successfully`,
      });
    }

    // Cancel swap request (initiator only)
    if (action === 'cancel') {
      if (swapRequest.initiatorProfile.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Only the initiator can cancel the swap request' },
          { status: 403 }
        );
      }

      if (['APPROVED', 'REJECTED', 'CANCELLED'].includes(swapRequest.status)) {
        return NextResponse.json(
          { error: 'Swap request cannot be cancelled in its current state' },
          { status: 400 }
        );
      }

      updatedSwapRequest = await prisma.shiftSwapRequest.update({
        where: { id: params.swapRequestId },
        data: {
          status: 'CANCELLED',
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
        data: updatedSwapRequest,
        message: 'Swap request cancelled successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be recipient_response, manager_decision, or cancel' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error updating shift swap request:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update shift swap request' },
      { status: 500 }
    );
  }
}