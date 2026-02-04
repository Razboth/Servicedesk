import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DailyChecklistType, ChecklistInputType } from '@prisma/client';

// GET - List all checklist templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only MANAGER_IT, ADMIN, SUPER_ADMIN can access
    if (!['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const checklistType = searchParams.get('type') as DailyChecklistType | null;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const templates = await prisma.serverAccessChecklistTemplate.findMany({
      where: {
        ...(checklistType && { checklistType }),
        ...(!includeInactive && { isActive: true }),
      },
      orderBy: [
        { checklistType: 'asc' },
        { category: 'asc' },
        { order: 'asc' },
      ],
    });

    // Group by checklist type
    const grouped = templates.reduce((acc, template) => {
      if (!acc[template.checklistType]) {
        acc[template.checklistType] = [];
      }
      acc[template.checklistType].push(template);
      return acc;
    }, {} as Record<string, typeof templates>);

    return NextResponse.json({
      templates,
      grouped,
      total: templates.length,
    });
  } catch (error) {
    console.error('Error fetching checklist templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create new checklist template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      checklistType,
      order,
      isRequired,
      unlockTime,
      inputType,
    } = body;

    if (!title || !category || !checklistType) {
      return NextResponse.json(
        { error: 'Title, category, and checklistType are required' },
        { status: 400 }
      );
    }

    // Validate checklistType (v3 - only 4 types)
    const validTypes: DailyChecklistType[] = [
      'OPS_SIANG', 'OPS_MALAM', 'MONITORING_SIANG', 'MONITORING_MALAM',
    ];
    if (!validTypes.includes(checklistType)) {
      return NextResponse.json(
        { error: 'Invalid checklist type' },
        { status: 400 }
      );
    }

    // Validate inputType if provided
    const validInputTypes: ChecklistInputType[] = [
      'CHECKBOX', 'TIMESTAMP', 'GRAFANA_STATUS', 'ATM_ALERT',
      'PENDING_TICKETS', 'APP_STATUS', 'AVAILABILITY_STATUS', 'TEXT_INPUT',
    ];
    if (inputType && !validInputTypes.includes(inputType)) {
      return NextResponse.json(
        { error: 'Invalid input type' },
        { status: 400 }
      );
    }

    const template = await prisma.serverAccessChecklistTemplate.create({
      data: {
        title,
        description: description || null,
        category,
        checklistType,
        order: order || 0,
        isRequired: isRequired !== false,
        isActive: true,
        unlockTime: unlockTime || null,
        inputType: inputType || 'CHECKBOX',
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error creating checklist template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// PUT - Update checklist template
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = await prisma.serverAccessChecklistTemplate.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error updating checklist template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE - Delete checklist template
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    await prisma.serverAccessChecklistTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    console.error('Error deleting checklist template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
