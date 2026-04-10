import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistType, ChecklistShiftType, ServerChecklistStatus } from '@prisma/client';
import { isItemUnlocked, getLockStatusMessage, getCurrentTimeWITA } from '@/lib/time-lock';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Determine if current time is daytime (08:00-19:59) or nighttime (20:00-07:59)
 */
function isDayTime(): boolean {
  const witaTime = getCurrentTimeWITA();
  const hour = witaTime.getHours();
  return hour >= 8 && hour < 20;
}

/**
 * Get the appropriate date for the checklist based on shift type
 * Night shifts that span midnight use the previous day's date
 */
function getChecklistDate(shiftType: ChecklistShiftType): Date {
  const witaTime = getCurrentTimeWITA();
  const hour = witaTime.getHours();

  // For night shift, if between 00:00-07:59, use yesterday's date
  if (shiftType === 'SHIFT_MALAM' && hour >= 0 && hour < 8) {
    const yesterday = new Date(witaTime);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }

  // Otherwise use today's date
  const today = new Date(witaTime);
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Determine which shift type applies based on current time
 * Simplified to 2 shifts: SHIFT_SIANG (08:00-20:00), SHIFT_MALAM (20:00-08:00)
 */
function getCurrentShiftType(): ChecklistShiftType {
  const witaTime = getCurrentTimeWITA();
  const hour = witaTime.getHours();

  // Night shift: 20:00-07:59
  if (hour >= 20 || hour < 8) {
    return 'SHIFT_MALAM';
  }

  // Day shift: 08:00-19:59
  return 'SHIFT_SIANG';
}

/**
 * Sort items for night checklists (22:00 should come before 00:00)
 */
function sortNightChecklistItems<T extends { section: string; timeSlot: string | null; order: number }>(
  items: T[],
  shiftType: ChecklistShiftType
): T[] {
  if (shiftType !== 'SHIFT_MALAM') {
    return items;
  }

  return [...items].sort((a, b) => {
    // Sort by section first
    if (a.section !== b.section) {
      return a.section.localeCompare(b.section);
    }

    // Parse hours from timeSlot for night ordering
    const aTime = a.timeSlot || '00:00';
    const bTime = b.timeSlot || '00:00';
    const aHour = parseInt(aTime.split(':')[0], 10);
    const bHour = parseInt(bTime.split(':')[0], 10);

    // For night shift: times >= 20 come first, then 00-07
    const aAdjusted = aHour < 12 ? aHour + 24 : aHour;
    const bAdjusted = bHour < 12 ? bHour + 24 : bHour;

    if (aAdjusted !== bAdjusted) {
      return aAdjusted - bAdjusted;
    }

    return a.order - b.order;
  });
}

/**
 * GET /api/v2/checklist
 * Get checklist for current user based on checklistType and shift
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checklistType = searchParams.get('checklistType') as ChecklistType | null;
    const shiftType = searchParams.get('shiftType') as ChecklistShiftType | null;
    const dateParam = searchParams.get('date');

    // Determine shift type if not provided
    const effectiveShiftType = shiftType || getCurrentShiftType();

    // Determine checklistType if not provided (default to IT_INFRASTRUKTUR)
    const effectiveChecklistType = checklistType || 'IT_INFRASTRUKTUR';

    // Get date for the checklist
    const checklistDate = dateParam
      ? new Date(dateParam)
      : getChecklistDate(effectiveShiftType);

    // Find the checklist for this date/checklistType/shift
    let checklist = await prisma.dailyChecklistV2.findFirst({
      where: {
        date: checklistDate,
        checklistType: effectiveChecklistType,
        shiftType: effectiveShiftType,
      },
      include: {
        items: {
          orderBy: [
            { section: 'asc' },
            { order: 'asc' },
          ],
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
    });

    // Get shift assignment for buddy info
    const shiftAssignment = await prisma.shiftAssignmentV2.findFirst({
      where: {
        date: checklistDate,
        shiftType: effectiveShiftType,
        isActive: true,
      },
      include: {
        primaryUser: {
          select: { id: true, name: true, username: true, checklistType: true },
        },
        buddyUser: {
          select: { id: true, name: true, username: true, checklistType: true },
        },
      },
    });

    // If no checklist exists, return empty state with template info
    if (!checklist) {
      // Get templates for this checklistType/shift
      const templates = await prisma.checklistTemplateV2.findMany({
        where: {
          checklistType: effectiveChecklistType,
          shiftType: effectiveShiftType,
          isActive: true,
        },
        orderBy: [
          { section: 'asc' },
          { order: 'asc' },
        ],
      });

      const response = NextResponse.json({
        checklist: null,
        templateCount: templates.length,
        canCreate: templates.length > 0,
        checklistType: effectiveChecklistType,
        shiftType: effectiveShiftType,
        date: checklistDate.toISOString().split('T')[0],
        currentTime: getCurrentTimeWITA().toISOString(),
        shiftAssignment,
        serverTime: {
          wita: getCurrentTimeWITA().toISOString(),
          witaHour: getCurrentTimeWITA().getHours(),
          witaMinute: getCurrentTimeWITA().getMinutes(),
          iso: new Date().toISOString(),
        },
      });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }

    // Check if current user is assigned
    const userAssignment = checklist.assignments.find(a => a.userId === session.user.id);
    const isNightChecklist = effectiveShiftType === 'SHIFT_MALAM';

    // Check if user is primary or buddy for this shift
    const isPrimaryUser = shiftAssignment?.primaryUserId === session.user.id;
    const isBuddyUser = shiftAssignment?.buddyUserId === session.user.id;
    const canTakeover = isBuddyUser && !shiftAssignment?.takenOver;

    // Add lock status to items
    const currentTime = getCurrentTimeWITA();
    const itemsWithLockStatus = checklist.items.map(item => {
      const isLocked = item.timeSlot
        ? !isItemUnlocked(item.timeSlot, currentTime, isNightChecklist)
        : false;
      const lockMessage = isLocked && item.timeSlot
        ? getLockStatusMessage(item.timeSlot, currentTime, isNightChecklist)
        : null;

      return {
        ...item,
        isLocked,
        lockMessage,
      };
    });

    // Sort items appropriately
    const sortedItems = sortNightChecklistItems(itemsWithLockStatus, effectiveShiftType);

    // Group items by section
    const sections = sortedItems.reduce((acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = {
          section: item.section,
          sectionTitle: item.sectionTitle,
          items: [],
        };
      }
      acc[item.section].items.push(item);
      return acc;
    }, {} as Record<string, { section: string; sectionTitle: string; items: typeof sortedItems }>);

    // Calculate progress
    const totalItems = checklist.items.length;
    const completedItems = checklist.items.filter(
      i => i.status === 'COMPLETED' || i.status === 'NOT_APPLICABLE'
    ).length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const response = NextResponse.json({
      checklist: {
        ...checklist,
        items: sortedItems,
        sections: Object.values(sections),
      },
      currentUserId: session.user.id,
      userAssignment,
      isAssigned: !!userAssignment,
      canEdit: !!userAssignment && userAssignment.role === 'STAFF',
      isSupervisor: !!userAssignment && userAssignment.role === 'SUPERVISOR',
      isPrimaryUser,
      isBuddyUser,
      canTakeover,
      shiftAssignment,
      progress,
      totalItems,
      completedItems,
      checklistType: effectiveChecklistType,
      shiftType: effectiveShiftType,
      date: checklistDate.toISOString().split('T')[0],
      currentTime: getCurrentTimeWITA().toISOString(),
      serverTime: {
        wita: getCurrentTimeWITA().toISOString(),
        witaHour: getCurrentTimeWITA().getHours(),
        witaMinute: getCurrentTimeWITA().getMinutes(),
        iso: new Date().toISOString(),
      },
    });

    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');

    return response;
  } catch (error) {
    console.error('[Checklist V2] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/checklist
 * Create a new checklist for the specified date/checklistType/shift
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { checklistType, shiftType, date } = body as {
      checklistType?: ChecklistType;
      shiftType?: ChecklistShiftType;
      date?: string;
    };

    // Determine effective values
    const effectiveShiftType = shiftType || getCurrentShiftType();
    const effectiveChecklistType = checklistType || 'IT_INFRASTRUKTUR';
    const checklistDate = date
      ? new Date(date)
      : getChecklistDate(effectiveShiftType);

    // Check if checklist already exists
    const existing = await prisma.dailyChecklistV2.findFirst({
      where: {
        date: checklistDate,
        checklistType: effectiveChecklistType,
        shiftType: effectiveShiftType,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Checklist already exists for this date/type/shift' },
        { status: 409 }
      );
    }

    // Get templates
    const templates = await prisma.checklistTemplateV2.findMany({
      where: {
        checklistType: effectiveChecklistType,
        shiftType: effectiveShiftType,
        isActive: true,
      },
      orderBy: [
        { section: 'asc' },
        { order: 'asc' },
      ],
    });

    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'No templates found for this checklist type/shift' },
        { status: 400 }
      );
    }

    // Get shift assignment for auto-assigning users
    const shiftAssignment = await prisma.shiftAssignmentV2.findFirst({
      where: {
        date: checklistDate,
        shiftType: effectiveShiftType,
        isActive: true,
      },
    });

    // Create checklist with items in a transaction
    const checklist = await prisma.$transaction(async (tx) => {
      // Create the checklist
      const newChecklist = await tx.dailyChecklistV2.create({
        data: {
          date: checklistDate,
          checklistType: effectiveChecklistType,
          shiftType: effectiveShiftType,
          status: 'PENDING',
        },
      });

      // Create items from templates
      await tx.checklistItemV2.createMany({
        data: templates.map(t => ({
          checklistId: newChecklist.id,
          templateId: t.id,
          section: t.section,
          sectionTitle: t.sectionTitle,
          itemNumber: t.itemNumber,
          title: t.title,
          description: t.description,
          toolSystem: t.toolSystem,
          timeSlot: t.timeSlot,
          isRequired: t.isRequired,
          order: t.order,
          status: 'PENDING',
        })),
      });

      // Auto-assign users from shift assignment
      if (shiftAssignment) {
        const assignmentsToCreate = [];

        // Assign primary user as STAFF
        if (shiftAssignment.primaryUserId) {
          assignmentsToCreate.push({
            checklistId: newChecklist.id,
            userId: shiftAssignment.primaryUserId,
            role: 'STAFF' as const,
          });
        }

        // Assign buddy user as STAFF (backup)
        if (shiftAssignment.buddyUserId && shiftAssignment.buddyUserId !== shiftAssignment.primaryUserId) {
          assignmentsToCreate.push({
            checklistId: newChecklist.id,
            userId: shiftAssignment.buddyUserId,
            role: 'STAFF' as const,
          });
        }

        if (assignmentsToCreate.length > 0) {
          await tx.checklistAssignmentV2.createMany({
            data: assignmentsToCreate,
          });
        }
      }

      // Return checklist with items
      return tx.dailyChecklistV2.findUnique({
        where: { id: newChecklist.id },
        include: {
          items: {
            orderBy: [
              { section: 'asc' },
              { order: 'asc' },
            ],
          },
          assignments: {
            include: {
              user: {
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
    });

    return NextResponse.json({
      checklist,
      message: 'Checklist created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[Checklist V2] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create checklist' },
      { status: 500 }
    );
  }
}
