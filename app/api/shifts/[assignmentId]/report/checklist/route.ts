import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ShiftChecklistStatus } from '@prisma/client';

// PUT /api/shifts/[assignmentId]/report/checklist - Batch update checklist items
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;
    const body = await request.json();

    // Validate request body
    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Items array is required' },
        { status: 400 }
      );
    }

    // Verify the shift assignment exists
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: true,
        shiftReport: true,
      },
    });

    if (!shiftAssignment) {
      return NextResponse.json(
        { error: 'Shift assignment not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    if (!isAdmin && shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only update your own shift reports' },
        { status: 403 }
      );
    }

    if (!shiftAssignment.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found' },
        { status: 404 }
      );
    }

    // Update each item
    const updates = await Promise.all(
      body.items.map(async (item: { id: string; status?: ShiftChecklistStatus; notes?: string }) => {
        const updateData: {
          status?: ShiftChecklistStatus;
          notes?: string;
          completedAt?: Date | null;
        } = {};

        if (item.status !== undefined) {
          updateData.status = item.status;
          // Set completedAt when marking as completed
          if (item.status === 'COMPLETED') {
            updateData.completedAt = new Date();
          } else if (item.status === 'PENDING') {
            updateData.completedAt = null;
          }
        }

        if (item.notes !== undefined) {
          updateData.notes = item.notes;
        }

        return prisma.shiftChecklistItem.update({
          where: { id: item.id },
          data: updateData,
        });
      })
    );

    // Update report status to IN_PROGRESS if it's still DRAFT
    if (shiftAssignment.shiftReport.status === 'DRAFT') {
      await prisma.shiftReport.update({
        where: { id: shiftAssignment.shiftReport.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Get updated checklist items
    const checklistItems = await prisma.shiftChecklistItem.findMany({
      where: { shiftReportId: shiftAssignment.shiftReport.id },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });

    // Calculate stats
    const stats = {
      total: checklistItems.length,
      completed: checklistItems.filter((i) => i.status === 'COMPLETED').length,
      pending: checklistItems.filter((i) => i.status === 'PENDING').length,
      inProgress: checklistItems.filter((i) => i.status === 'IN_PROGRESS').length,
      skipped: checklistItems.filter((i) => i.status === 'SKIPPED').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: updates.length,
        checklistItems,
        stats,
      },
    });
  } catch (error) {
    console.error('Error updating checklist items:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
