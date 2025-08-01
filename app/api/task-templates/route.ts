import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTaskTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  serviceId: z.string().min(1, 'Service ID is required'),
  items: z.array(z.object({
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    estimatedMinutes: z.number().min(0).optional(),
    isRequired: z.boolean().default(true),
    order: z.number().min(0)
  }))
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    const where = serviceId ? { serviceId } : {};

    const taskTemplates = await prisma.taskTemplate.findMany({
      where,
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
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(taskTemplates);
  } catch (error) {
    console.error('Error fetching task templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const validatedData = createTaskTemplateSchema.parse(body);

    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: validatedData.serviceId }
    });

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    const taskTemplate = await prisma.taskTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        serviceId: validatedData.serviceId,
        items: {
          create: validatedData.items
        }
      },
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

    return NextResponse.json(taskTemplate, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating task template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}