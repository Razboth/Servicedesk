import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistUnit, ChecklistShiftType, ChecklistRole, ServerChecklistStatus } from '@prisma/client';
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
 * Determine which shift type applies based on current time and day of week
 */
function getCurrentShiftType(): ChecklistShiftType {
  const witaTime = getCurrentTimeWITA();
  const hour = witaTime.getHours();
  const dayOfWeek = witaTime.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Night shift: 20:00-07:59
  if (hour >= 20 || hour < 8) {
    return 'SHIFT_MALAM';
  }

  // Weekend/holiday day shift: 08:00-19:59
  if (isWeekend) {
    return 'SHIFT_SIANG_WEEKEND';
  }

  // Weekday standby overtime: 17:00-19:59
  if (hour >= 17) {
    return 'STANDBY_LEMBUR';
  }

  // Weekday office hours: 08:00-16:59
  return 'HARIAN_KANTOR';
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
 * Get checklist for current user based on unit and shift
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unit = searchParams.get('unit') as ChecklistUnit | null;
    const shiftType = searchParams.get('shiftType') as ChecklistShiftType | null;
    const dateParam = searchParams.get('date');

    // Determine shift type if not provided
    const effectiveShiftType = shiftType || getCurrentShiftType();

    // Determine unit if not provided (default to IT_OPERATIONS)
    const effectiveUnit = unit || 'IT_OPERATIONS';

    // Get date for the checklist
    const checklistDate = dateParam
      ? new Date(dateParam)
      : getChecklistDate(effectiveShiftType);

    // Find the checklist for this date/unit/shift
    let checklist = await prisma.dailyChecklistV2.findUnique({
      where: {
        date_unit_shiftType: {
          date: checklistDate,
          unit: effectiveUnit,
          shiftType: effectiveShiftType,
        },
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

    // If no checklist exists, return empty state with template info
    if (!checklist) {
      // Get templates for this unit/shift
      const templates = await prisma.checklistTemplateV2.findMany({
        where: {
          unit: effectiveUnit,
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
        unit: effectiveUnit,
        shiftType: effectiveShiftType,
        date: checklistDate.toISOString().split('T')[0],
        currentTime: getCurrentTimeWITA().toISOString(),
      });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return response;
    }

    // Check if current user is assigned
    const userAssignment = checklist.assignments.find(a => a.userId === session.user.id);
    const isNightChecklist = effectiveShiftType === 'SHIFT_MALAM';

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
      progress,
      totalItems,
      completedItems,
      unit: effectiveUnit,
      shiftType: effectiveShiftType,
      date: checklistDate.toISOString().split('T')[0],
      currentTime: getCurrentTimeWITA().toISOString(),
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
 * Create a new checklist for the specified date/unit/shift
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { unit, shiftType, date } = body as {
      unit?: ChecklistUnit;
      shiftType?: ChecklistShiftType;
      date?: string;
    };

    // Determine effective values
    const effectiveShiftType = shiftType || getCurrentShiftType();
    const effectiveUnit = unit || 'IT_OPERATIONS';
    const checklistDate = date
      ? new Date(date)
      : getChecklistDate(effectiveShiftType);

    // Check if checklist already exists
    const existing = await prisma.dailyChecklistV2.findUnique({
      where: {
        date_unit_shiftType: {
          date: checklistDate,
          unit: effectiveUnit,
          shiftType: effectiveShiftType,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Checklist already exists for this date/unit/shift' },
        { status: 409 }
      );
    }

    // Get templates
    const templates = await prisma.checklistTemplateV2.findMany({
      where: {
        unit: effectiveUnit,
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
        { error: 'No templates found for this unit/shift type' },
        { status: 400 }
      );
    }

    // Create checklist with items in a transaction
    const checklist = await prisma.$transaction(async (tx) => {
      // Create the checklist
      const newChecklist = await tx.dailyChecklistV2.create({
        data: {
          date: checklistDate,
          unit: effectiveUnit,
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
          assignments: true,
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
