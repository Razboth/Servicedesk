import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for updating daily tasks
const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: z.enum(['TICKET', 'MAINTENANCE', 'MEETING', 'TRAINING', 'DOCUMENTATION', 'SUPPORT', 'OTHER']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DEFERRED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().nullable(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  actualMinutes: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  order: z.number().optional(),
});

// GET /api/technician/daily-tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const task = await prisma.dailyTask.findUnique({
      where: { id },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            service: {
              select: {
                name: true,
              },
            },
          },
        },
        taskList: {
          select: {
            technicianId: true,
            date: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check access - only the assigned technician or managers can view
    if (task.taskList.technicianId !== session.user.id &&
        !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/technician/daily-tasks/[id] - Update a specific task
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validate input
    const validatedData = updateTaskSchema.parse(body);

    // Check if task exists and belongs to the user
    const existingTask = await prisma.dailyTask.findUnique({
      where: { id },
      include: {
        taskList: {
          select: {
            technicianId: true,
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only the assigned technician can update
    if (existingTask.taskList.technicianId !== session.user.id &&
        session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Handle time tracking
    let actualMinutes = validatedData.actualMinutes;
    if (validatedData.startTime && validatedData.endTime) {
      const start = new Date(validatedData.startTime);
      const end = new Date(validatedData.endTime);
      actualMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    }

    // Update the task
    const updatedTask = await prisma.dailyTask.update({
      where: { id },
      data: {
        ...validatedData,
        startTime: validatedData.startTime ? new Date(validatedData.startTime) : undefined,
        endTime: validatedData.endTime ? new Date(validatedData.endTime) : undefined,
        actualMinutes,
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/technician/daily-tasks/[id] - Delete a specific task
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if task exists and belongs to the user
    const existingTask = await prisma.dailyTask.findUnique({
      where: { id },
      include: {
        taskList: {
          select: {
            technicianId: true,
          },
        },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only the assigned technician can delete
    if (existingTask.taskList.technicianId !== session.user.id &&
        session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Don't allow deleting ticket-related tasks
    if (existingTask.ticketId && existingTask.category === 'TICKET') {
      return NextResponse.json(
        { error: 'Cannot delete ticket-related tasks. Mark as cancelled instead.' },
        { status: 400 }
      );
    }

    await prisma.dailyTask.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}