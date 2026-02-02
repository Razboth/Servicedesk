import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.object({
    visibility: z.enum(['EVERYONE', 'BY_ROLE', 'BY_BRANCH', 'PRIVATE']),
    visibleToRoles: z.array(z.string()).optional(),
    visibleToBranches: z.array(z.string()).optional(),
    collaboratorPermissions: z.array(z.string()).optional(),
    durationDays: z.number().optional(),
  }),
  isDefault: z.boolean().optional(),
});

// GET /api/knowledge/permission-templates - List all permission templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.knowledgePermissionTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
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
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching permission templates:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch permission templates' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge/permission-templates - Create a new permission template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createTemplateSchema.parse(body);

    // Check if name already exists
    const existing = await prisma.knowledgePermissionTemplate.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'A template with this name already exists' },
        { status: 409 }
      );
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.knowledgePermissionTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.knowledgePermissionTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isDefault: data.isDefault || false,
        createdBy: session.user.id,
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
      data: template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating permission template:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create permission template' },
      { status: 500 }
    );
  }
}
