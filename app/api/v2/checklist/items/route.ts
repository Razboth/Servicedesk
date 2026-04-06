import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistItemStatusV2, ChecklistShiftType } from '@prisma/client';
import { isItemUnlocked, getCurrentTimeWITA } from '@/lib/time-lock';

interface ItemUpdate {
  id?: string;
  itemId?: string;  // Support both id and itemId from client
  status?: ChecklistItemStatusV2;
  notes?: string;
}

/**
 * PUT /api/v2/checklist/items
 * Update checklist item status and notes
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body as { items: ItemUpdate[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid items array' },
        { status: 400 }
      );
    }

    // Get all items to validate (support both id and itemId)
    const itemIds = items.map(i => i.id || i.itemId).filter(Boolean) as string[];

    if (itemIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid item IDs provided' },
        { status: 400 }
      );
    }
    const existingItems = await prisma.checklistItemV2.findMany({
      where: { id: { in: itemIds } },
      include: {
        checklist: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (existingItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'One or more items not found' },
        { status: 404 }
      );
    }

    // Verify user is assigned as STAFF to the checklist(s)
    const checklistIds = [...new Set(existingItems.map(i => i.checklistId))];
    for (const checklistId of checklistIds) {
      const item = existingItems.find(i => i.checklistId === checklistId);
      if (!item) continue;

      const userAssignment = item.checklist.assignments.find(
        a => a.userId === session.user.id && a.role === 'STAFF'
      );

      if (!userAssignment) {
        return NextResponse.json(
          { error: 'You are not assigned as STAFF to this checklist' },
          { status: 403 }
        );
      }
    }

    // Check time-lock for each item
    const currentTime = getCurrentTimeWITA();
    const results: { success: ItemUpdate[]; failed: { id: string; reason: string }[] } = {
      success: [],
      failed: [],
    };

    for (const update of items) {
      const updateId = update.id || update.itemId;
      const existingItem = existingItems.find(i => i.id === updateId);
      if (!existingItem) {
        results.failed.push({ id: updateId || 'unknown', reason: 'Item not found' });
        continue;
      }

      // Check if item is locked
      const isNightChecklist = existingItem.checklist.shiftType === 'SHIFT_MALAM';
      if (existingItem.timeSlot && !isItemUnlocked(existingItem.timeSlot, currentTime, isNightChecklist)) {
        results.failed.push({
          id: updateId || 'unknown',
          reason: `Item is locked until ${existingItem.timeSlot}`,
        });
        continue;
      }

      // Normalize the update to use 'id' for consistency
      results.success.push({ ...update, id: updateId });
    }

    // Update successful items
    const updatePromises = results.success.map(async (update) => {
      const updateData: {
        status?: ChecklistItemStatusV2;
        notes?: string;
        completedAt?: Date | null;
        completedById?: string | null;
      } = {};

      if (update.status !== undefined) {
        updateData.status = update.status;

        // Set completion info
        if (update.status === 'COMPLETED' || update.status === 'FAILED' || update.status === 'NOT_APPLICABLE') {
          updateData.completedAt = new Date();
          updateData.completedById = session.user.id;
        } else if (update.status === 'PENDING') {
          updateData.completedAt = null;
          updateData.completedById = null;
        }
      }

      if (update.notes !== undefined) {
        updateData.notes = update.notes;
      }

      return prisma.checklistItemV2.update({
        where: { id: update.id },
        data: updateData,
      });
    });

    await Promise.all(updatePromises);

    // Check if all items are completed for any checklist
    for (const checklistId of checklistIds) {
      const allItems = await prisma.checklistItemV2.findMany({
        where: { checklistId },
      });

      const allCompleted = allItems.every(
        i => i.status === 'COMPLETED' || i.status === 'NOT_APPLICABLE'
      );

      if (allCompleted) {
        await prisma.dailyChecklistV2.update({
          where: { id: checklistId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      } else {
        // Ensure status is IN_PROGRESS if not all completed
        await prisma.dailyChecklistV2.update({
          where: { id: checklistId },
          data: { status: 'IN_PROGRESS' },
        });
      }
    }

    return NextResponse.json({
      success: results.success.length,
      failed: results.failed,
      message: results.failed.length > 0
        ? `Updated ${results.success.length} items, ${results.failed.length} failed`
        : `Updated ${results.success.length} items successfully`,
    });
  } catch (error) {
    console.error('[Checklist V2] Items PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update items' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v2/checklist/items
 * Get items for a specific checklist with lock status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get('checklistId');

    if (!checklistId) {
      return NextResponse.json(
        { error: 'Missing required parameter: checklistId' },
        { status: 400 }
      );
    }

    const checklist = await prisma.dailyChecklistV2.findUnique({
      where: { id: checklistId },
      include: {
        items: {
          orderBy: [
            { section: 'asc' },
            { order: 'asc' },
          ],
          include: {
            completedBy: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      );
    }

    const isNightChecklist = checklist.shiftType === 'SHIFT_MALAM';
    const currentTime = getCurrentTimeWITA();

    const itemsWithLockStatus = checklist.items.map(item => ({
      ...item,
      isLocked: item.timeSlot
        ? !isItemUnlocked(item.timeSlot, currentTime, isNightChecklist)
        : false,
    }));

    return NextResponse.json({
      items: itemsWithLockStatus,
      checklistStatus: checklist.status,
    });
  } catch (error) {
    console.error('[Checklist V2] Items GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}
