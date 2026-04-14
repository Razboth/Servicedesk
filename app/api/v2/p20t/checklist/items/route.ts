import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { P20TItemStatus } from '@prisma/client';

// PUT /api/v2/p20t/checklist/items - Update a checklist item
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, status, value, notes } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    // Get the item with its checklist
    const item = await prisma.p20TChecklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if user is assigned to this checklist
    const assignment = await prisma.p20TAssignment.findUnique({
      where: {
        date_shift_category: {
          date: item.checklist.date,
          shift: item.checklist.shift,
          category: item.checklist.category,
        },
      },
    });

    if (!assignment || assignment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses untuk mengubah checklist ini' },
        { status: 403 }
      );
    }

    // Update the item
    const updatedItem = await prisma.p20TChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(status !== undefined && { status: status as P20TItemStatus }),
        ...(value !== undefined && { value }),
        ...(notes !== undefined && { notes }),
        ...(status === 'COMPLETED' && {
          completedAt: new Date(),
          completedById: session.user.id,
        }),
        ...(status !== 'COMPLETED' && status !== undefined && {
          completedAt: null,
          completedById: null,
        }),
      },
      include: {
        template: true,
        completedBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Check if all items are completed to update checklist status
    const allItems = await prisma.p20TChecklistItem.findMany({
      where: { checklistId: item.checklistId },
    });

    const allCompleted = allItems.every(
      (i) => i.status === 'COMPLETED' || i.status === 'SKIPPED' || i.status === 'NA'
    );

    if (allCompleted) {
      await prisma.p20TDailyChecklist.update({
        where: { id: item.checklistId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      });
    } else {
      await prisma.p20TDailyChecklist.update({
        where: { id: item.checklistId },
        data: {
          isCompleted: false,
          completedAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    console.error('Error updating P20T checklist item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
