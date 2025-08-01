import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']),
  actualMinutes: z.number().min(0).optional(),
  notes: z.string().optional()
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

    // Verify ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        assignedToId: true,
        createdById: true,
        createdBy: {
          select: {
            supportGroup: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    const hasAccess = 
      session.user.role === 'ADMIN' ||
      ticket.assignedToId === session.user.id ||
      ticket.createdById === session.user.id ||
      (session.user.role === 'MANAGER' && 
       ticket.createdBy.supportGroup === session.user.supportGroup);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tasks = await prisma.ticketTask.findMany({
      where: { ticketId: params.id },
      include: {
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching ticket tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskTemplateId } = body;

    if (!taskTemplateId) {
      return NextResponse.json(
        { error: 'Task template ID is required' },
        { status: 400 }
      );
    }

    // Verify ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        assignedToId: true,
        createdById: true,
        serviceId: true,
        createdBy: {
          select: {
            supportGroup: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check if user can modify tasks
    const canModify = 
      session.user.role === 'ADMIN' ||
      ticket.assignedToId === session.user.id ||
      (session.user.role === 'MANAGER' && 
       ticket.createdBy.supportGroup === session.user.supportGroup);

    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get task template with items
    const taskTemplate = await prisma.taskTemplate.findUnique({
      where: { id: taskTemplateId },
      include: {
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

    // Verify template belongs to the ticket's service
    if (taskTemplate.serviceId !== ticket.serviceId) {
      return NextResponse.json(
        { error: 'Task template does not match ticket service' },
        { status: 400 }
      );
    }

    // Create tasks from template
    const tasks = await Promise.all(
      taskTemplate.items.map(item => 
        prisma.ticketTask.create({
          data: {
            ticketId: params.id,
            taskTemplateItemId: item.id,
            status: 'PENDING'
          }
        })
      )
    );

    return NextResponse.json(tasks, { status: 201 });
  } catch (error) {
    console.error('Error creating ticket tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}