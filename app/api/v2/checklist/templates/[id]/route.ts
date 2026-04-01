import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v2/checklist/templates/[id]
 * Get a single template by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.checklistTemplateV2.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('[Checklist V2] Template GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v2/checklist/templates/[id]
 * Update a template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'Only managers can update templates' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if template exists
    const existing = await prisma.checklistTemplateV2.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Update only allowed fields
    const {
      section,
      sectionTitle,
      itemNumber,
      title,
      description,
      toolSystem,
      timeSlot,
      isRequired,
      order,
      isActive,
    } = body;

    const template = await prisma.checklistTemplateV2.update({
      where: { id },
      data: {
        ...(section !== undefined && { section }),
        ...(sectionTitle !== undefined && { sectionTitle }),
        ...(itemNumber !== undefined && { itemNumber }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(toolSystem !== undefined && { toolSystem }),
        ...(timeSlot !== undefined && { timeSlot }),
        ...(isRequired !== undefined && { isRequired }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('[Checklist V2] Template PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/checklist/templates/[id]
 * Delete a single template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';

    // Check if template exists
    const existing = await prisma.checklistTemplateV2.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      await prisma.checklistTemplateV2.delete({
        where: { id },
      });
    } else {
      await prisma.checklistTemplateV2.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return NextResponse.json({
      message: hardDelete ? 'Template deleted' : 'Template deactivated',
    });
  } catch (error) {
    console.error('[Checklist V2] Template DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
