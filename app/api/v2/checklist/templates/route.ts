import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistUnit, ChecklistShiftType } from '@prisma/client';

/**
 * GET /api/v2/checklist/templates
 * List all checklist templates, optionally filtered by unit and shift type
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
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    // Build where clause
    const whereClause: {
      unit?: ChecklistUnit;
      shiftType?: ChecklistShiftType;
      isActive?: boolean;
    } = {};

    if (unit) whereClause.unit = unit;
    if (shiftType) whereClause.shiftType = shiftType;
    if (activeOnly) whereClause.isActive = true;

    const templates = await prisma.checklistTemplateV2.findMany({
      where: whereClause,
      orderBy: [
        { unit: 'asc' },
        { shiftType: 'asc' },
        { section: 'asc' },
        { order: 'asc' },
      ],
    });

    // Group by unit and shift type
    const grouped = templates.reduce((acc, template) => {
      const key = `${template.unit}-${template.shiftType}`;
      if (!acc[key]) {
        acc[key] = {
          unit: template.unit,
          shiftType: template.shiftType,
          sections: {},
          totalItems: 0,
        };
      }

      if (!acc[key].sections[template.section]) {
        acc[key].sections[template.section] = {
          section: template.section,
          sectionTitle: template.sectionTitle,
          items: [],
        };
      }

      acc[key].sections[template.section].items.push(template);
      acc[key].totalItems++;

      return acc;
    }, {} as Record<string, {
      unit: ChecklistUnit;
      shiftType: ChecklistShiftType;
      sections: Record<string, { section: string; sectionTitle: string; items: typeof templates }>;
      totalItems: number;
    }>);

    // Convert sections to array
    const groupedArray = Object.values(grouped).map(g => ({
      ...g,
      sections: Object.values(g.sections),
    }));

    return NextResponse.json({
      templates,
      grouped: groupedArray,
      total: templates.length,
    });
  } catch (error) {
    console.error('[Checklist V2] Templates GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/checklist/templates
 * Create a new checklist template
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only managers can create templates' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      unit,
      shiftType,
      section,
      sectionTitle,
      itemNumber,
      title,
      description,
      toolSystem,
      timeSlot,
      isRequired = true,
      order,
    } = body;

    // Validate required fields
    if (!unit || !shiftType || !section || !sectionTitle || !title || itemNumber === undefined || order === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const template = await prisma.checklistTemplateV2.create({
      data: {
        unit,
        shiftType,
        section,
        sectionTitle,
        itemNumber,
        title,
        description,
        toolSystem,
        timeSlot,
        isRequired,
        order,
        isActive: true,
      },
    });

    return NextResponse.json({
      template,
      message: 'Template created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[Checklist V2] Templates POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/checklist/templates
 * Bulk delete or deactivate templates
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Only admins can delete templates' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',');
    const hardDelete = searchParams.get('hardDelete') === 'true';

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing template IDs' },
        { status: 400 }
      );
    }

    if (hardDelete) {
      await prisma.checklistTemplateV2.deleteMany({
        where: { id: { in: ids } },
      });
    } else {
      await prisma.checklistTemplateV2.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      });
    }

    return NextResponse.json({
      message: hardDelete
        ? `Deleted ${ids.length} templates`
        : `Deactivated ${ids.length} templates`,
    });
  } catch (error) {
    console.error('[Checklist V2] Templates DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete templates' },
      { status: 500 }
    );
  }
}
