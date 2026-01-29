import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createMaintenanceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  entityType: z.enum(['BRANCH', 'ATM']).optional().nullable(),
  entityId: z.string().optional().nullable(),
  startTime: z.string().transform(s => new Date(s)),
  endTime: z.string().transform(s => new Date(s)),
});

/**
 * GET /api/monitoring/maintenance
 * List maintenance windows
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeExpired = searchParams.get('includeExpired') === 'true';
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    const where: any = {};

    // Filter by active only unless includeExpired
    if (!includeExpired) {
      where.OR = [
        { endTime: { gte: new Date() } },
        { isActive: true }
      ];
    }

    // Filter by entity
    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }

    const windows = await prisma.maintenanceWindow.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: 100
    });

    // Enrich with entity names
    const enrichedWindows = await Promise.all(
      windows.map(async (w) => {
        let entityName = 'Global';

        if (w.entityType === 'BRANCH' && w.entityId) {
          const branch = await prisma.branch.findUnique({
            where: { id: w.entityId },
            select: { name: true, code: true }
          });
          entityName = branch ? `${branch.code} - ${branch.name}` : 'Unknown Branch';
        } else if (w.entityType === 'ATM' && w.entityId) {
          const atm = await prisma.aTM.findUnique({
            where: { id: w.entityId },
            select: { name: true, code: true }
          });
          entityName = atm ? `${atm.code} - ${atm.name}` : 'Unknown ATM';
        } else if (w.entityType && !w.entityId) {
          entityName = `All ${w.entityType}s`;
        }

        const now = new Date();
        const isCurrentlyActive = w.isActive && w.startTime <= now && w.endTime >= now;
        const isUpcoming = w.isActive && w.startTime > now;
        const isExpired = w.endTime < now;

        return {
          ...w,
          entityName,
          isCurrentlyActive,
          isUpcoming,
          isExpired
        };
      })
    );

    return NextResponse.json({
      success: true,
      windows: enrichedWindows,
      total: enrichedWindows.length
    });
  } catch (error) {
    console.error('Error fetching maintenance windows:', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance windows' }, { status: 500 });
  }
}

/**
 * POST /api/monitoring/maintenance
 * Create a new maintenance window
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin/manager role
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'];
    if (!allowedRoles.includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createMaintenanceSchema.parse(body);

    // Validate time range
    if (validated.endTime <= validated.startTime) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Create maintenance window
    const window = await prisma.maintenanceWindow.create({
      data: {
        title: validated.title,
        description: validated.description,
        entityType: validated.entityType || null,
        entityId: validated.entityId || null,
        startTime: validated.startTime,
        endTime: validated.endTime,
        isActive: true,
        createdById: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      window
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating maintenance window:', error);
    return NextResponse.json({ error: 'Failed to create maintenance window' }, { status: 500 });
  }
}

/**
 * DELETE /api/monitoring/maintenance
 * Deactivate a maintenance window
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin/manager role
    const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'];
    if (!allowedRoles.includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Window ID required' }, { status: 400 });
    }

    await prisma.maintenanceWindow.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating maintenance window:', error);
    return NextResponse.json({ error: 'Failed to deactivate maintenance window' }, { status: 500 });
  }
}
