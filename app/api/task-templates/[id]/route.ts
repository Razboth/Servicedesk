import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTaskTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(), // For existing items
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    estimatedMinutes: z.number().min(0).optional(),
    isRequired: z.boolean().default(true),
    order: z.number().min(0)
  })).optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskTemplate = await prisma.taskTemplate.findUnique({
      where: { id: params.id },
      include: {
        service: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!taskTemplate) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(taskTemplate);
  } catch (error) {
    console.error('Error fetching task template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or manager
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateTaskTemplateSchema.parse(body);

    // Check if task template exists
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: { id: params.id },
      include: { items: true }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      );
    }

    // Update task template
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;

    // Handle items update if provided
    if (validatedData.items) {
      // Delete existing items and create new ones
      await prisma.taskTemplateItem.deleteMany({
        where: { taskTemplateId: params.id }
      });

      updateData.items = {
        create: validatedData.items.map(item => ({
          title: item.title,
          description: item.description,
          estimatedMinutes: item.estimatedMinutes,
          isRequired: item.isRequired,
          order: item.order
        }))
      };
    }

    const taskTemplate = await prisma.taskTemplate.update({
      where: { id: params.id },
      data: updateData,
      include: {
        service: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    return NextResponse.json(taskTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating task template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or manager
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if task template exists
    const existingTemplate = await prisma.taskTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      );
    }

    // Delete task template (items will be deleted due to cascade)
    await prisma.taskTemplate.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Task template deleted successfully' });
  } catch (error) {
    console.error('Error deleting task template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}