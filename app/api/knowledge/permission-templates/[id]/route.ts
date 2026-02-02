import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  permissions: z
    .object({
      visibility: z.enum(['EVERYONE', 'BY_ROLE', 'BY_BRANCH', 'PRIVATE']),
      visibleToRoles: z.array(z.string()).optional(),
      visibleToBranches: z.array(z.string()).optional(),
      collaboratorPermissions: z.array(z.string()).optional(),
      durationDays: z.number().optional(),
    })
    .optional(),
  isDefault: z.boolean().optional(),
});

// GET /api/knowledge/permission-templates/[id] - Get a specific template
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

    const template = await prisma.knowledgePermissionTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Permission template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error fetching permission template:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch permission template' },
      { status: 500 }
    );
  }
}

// PUT /api/knowledge/permission-templates/[id] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateTemplateSchema.parse(body);

    const template = await prisma.knowledgePermissionTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Permission template not found' },
        { status: 404 }
      );
    }

    // Check if new name already exists (if name is being updated)
    if (data.name && data.name !== template.name) {
      const existing = await prisma.knowledgePermissionTemplate.findUnique({
        where: { name: data.name },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Conflict', message: 'A template with this name already exists' },
          { status: 409 }
        );
      }
    }

    // If setting as default, unset other defaults
    if (data.isDefault && !template.isDefault) {
      await prisma.knowledgePermissionTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updatedTemplate = await prisma.knowledgePermissionTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions || undefined,
        isDefault: data.isDefault,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating permission template:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update permission template' },
      { status: 500 }
    );
  }
}

// DELETE /api/knowledge/permission-templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.knowledgePermissionTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Permission template not found' },
        { status: 404 }
      );
    }

    await prisma.knowledgePermissionTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Permission template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting permission template:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to delete permission template' },
      { status: 500 }
    );
  }
}
