import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ShiftChecklistStatus } from '@prisma/client';
import { isItemUnlocked, getLockStatusMessage } from '@/lib/time-lock';

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

    // Update each item with time-lock validation
    const now = new Date();
    const updates = [];
    const errors = [];

    for (const item of body.items as Array<{ id: string; status?: ShiftChecklistStatus; notes?: string }>) {
      // Fetch the item to check time-lock
      const existingItem = await prisma.shiftChecklistItem.findUnique({
        where: { id: item.id },
      });

      if (!existingItem) {
        errors.push({ id: item.id, error: 'Item tidak ditemukan' });
        continue;
      }

      // Verify item belongs to this report
      if (existingItem.shiftReportId !== shiftAssignment.shiftReport!.id) {
        errors.push({ id: item.id, error: 'Item tidak termasuk dalam laporan ini' });
        continue;
      }

      // Check time-lock when trying to complete
      if (item.status === 'COMPLETED' && !isItemUnlocked(existingItem.unlockTime, now)) {
        errors.push({
          id: item.id,
          error: `Item masih terkunci. ${getLockStatusMessage(existingItem.unlockTime, now)}`,
        });
        continue;
      }

      const updateData: {
        status?: ShiftChecklistStatus;
        notes?: string;
        completedAt?: Date | null;
      } = {};

      if (item.status !== undefined) {
        updateData.status = item.status;
        // Set completedAt when marking as completed
        if (item.status === 'COMPLETED') {
          updateData.completedAt = now;
        } else if (item.status === 'PENDING') {
          updateData.completedAt = null;
        }
      }

      if (item.notes !== undefined) {
        updateData.notes = item.notes;
      }

      const updated = await prisma.shiftChecklistItem.update({
        where: { id: item.id },
        data: updateData,
      });

      updates.push(updated);
    }

    // Update report status to IN_PROGRESS if it's still DRAFT
    if (shiftAssignment.shiftReport.status === 'DRAFT') {
      await prisma.shiftReport.update({
        where: { id: shiftAssignment.shiftReport.id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Get updated checklist items with lock status
    const checklistItems = await prisma.shiftChecklistItem.findMany({
      where: { shiftReportId: shiftAssignment.shiftReport.id },
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });

    // Add lock status to items
    const checklistItemsWithLockStatus = checklistItems.map((item) => ({
      ...item,
      isLocked: !isItemUnlocked(item.unlockTime, now),
      lockMessage: getLockStatusMessage(item.unlockTime, now),
    }));

    // Calculate stats
    const stats = {
      total: checklistItems.length,
      completed: checklistItems.filter((i) => i.status === 'COMPLETED').length,
      pending: checklistItems.filter((i) => i.status === 'PENDING').length,
      inProgress: checklistItems.filter((i) => i.status === 'IN_PROGRESS').length,
      skipped: checklistItems.filter((i) => i.status === 'SKIPPED').length,
      locked: checklistItemsWithLockStatus.filter((i) => i.isLocked).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: updates.length,
        checklistItems: checklistItemsWithLockStatus,
        stats,
        errors: errors.length > 0 ? errors : undefined,
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
