import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']).optional(),
  actualMinutes: z.number().min(0).optional(),
  notes: z.string().optional()
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

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

    // Check if user can modify tasks
    const canModify = 
      session.user.role === 'ADMIN' ||
      ticket.assignedToId === session.user.id ||
      (session.user.role === 'MANAGER' && 
       ticket.createdBy.supportGroup === session.user.supportGroup);

    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify task exists and belongs to the ticket
    const existingTask = await prisma.ticketTask.findFirst({
      where: {
        id: params.taskId,
        ticketId: params.id
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;
      
      // Set completion details if task is being completed
      if (validatedData.status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completedById = session.user.id;
      } else if (existingTask.status === 'COMPLETED' && validatedData.status !== 'COMPLETED') {
        // If changing from completed to another status, clear completion details
        updateData.completedAt = null;
        updateData.completedById = null;
      }
    }
    
    if (validatedData.actualMinutes !== undefined) {
      updateData.actualMinutes = validatedData.actualMinutes;
    }
    
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    const updatedTask = await prisma.ticketTask.update({
      where: { id: params.taskId },
      data: updateData,
      include: {
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating ticket task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
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

    // Check if user can modify tasks (only admins and managers can delete tasks)
    const canDelete = 
      session.user.role === 'ADMIN' ||
      (session.user.role === 'MANAGER' && 
       ticket.createdBy.supportGroup === session.user.supportGroup);

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify task exists and belongs to the ticket
    const existingTask = await prisma.ticketTask.findFirst({
      where: {
        id: params.taskId,
        ticketId: params.id
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await prisma.ticketTask.delete({
      where: { id: params.taskId }
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}