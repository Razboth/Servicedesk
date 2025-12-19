import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for creating/updating daily tasks
const dailyTaskSchema = z.object({
  ticketId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  category: z.enum(['TICKET', 'MAINTENANCE', 'MEETING', 'TRAINING', 'DOCUMENTATION', 'SUPPORT', 'OTHER']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DEFERRED']).default('PENDING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().nullable(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  actualMinutes: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  order: z.number().default(0),
});

// GET /api/technician/daily-tasks - Get daily tasks for a technician
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians can access this
    if (session.user.role !== 'TECHNICIAN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const technicianId = searchParams.get('technicianId') || session.user.id;

    // Only allow viewing other technicians' tasks for managers and admins
    if (technicianId !== session.user.id &&
        !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse the date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Find or create the daily task list for the date
    let taskList = await prisma.dailyTaskList.findFirst({
      where: {
        technicianId,
        date: {
          gte: targetDate,
          lt: nextDate,
        },
      },
      include: {
        tasks: {
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
          },
          orderBy: {
            order: 'asc',
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If no task list exists, create one and populate with tickets updated today
    if (!taskList) {
      taskList = await prisma.dailyTaskList.create({
        data: {
          technicianId,
          date: targetDate,
        },
        include: {
          tasks: true,
          technician: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Auto-populate with ALL tickets that were updated by this technician on this specific date
      // This includes tickets they worked on, commented on, or changed status ON THIS DATE ONLY
      const tickets = await prisma.ticket.findMany({
        where: {
          OR: [
            // Tickets assigned to technician that were updated on this specific date
            {
              assignedToId: technicianId,
              updatedAt: {
                gte: targetDate,
                lt: nextDate,
              },
            },
            // Tickets that the technician commented on this specific date (even if not assigned)
            {
              comments: {
                some: {
                  userId: technicianId,
                  createdAt: {
                    gte: targetDate,
                    lt: nextDate,
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          description: true,
          priority: true,
          status: true,
          updatedAt: true,
          service: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      // Create tasks for each ticket (avoid duplicates)
      if (tickets.length > 0) {
        const uniqueTickets = Array.from(new Map(tickets.map(t => [t.id, t])).values());
        const tasksToCreate = uniqueTickets.map((ticket, index) => ({
          taskListId: taskList.id,
          ticketId: ticket.id,
          title: ticket.title, // Just the title, no ticket number prefix
          description: ticket.description,
          category: 'TICKET' as const,
          // Copy the exact status from the ticket - this is just for reporting
          status: 'PENDING' as const, // Default status for the task record
          priority: ticket.priority,
          order: index,
          notes: ticket.service?.name || '',
        }));

        await prisma.dailyTask.createMany({
          data: tasksToCreate,
        });

        // Refetch with created tasks
        taskList = await prisma.dailyTaskList.findFirst({
          where: { id: taskList.id },
          include: {
            tasks: {
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
              },
              orderBy: {
                order: 'asc',
              },
            },
            technician: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });
      }
    }

    // Calculate statistics
    const stats = {
      total: taskList?.tasks.length || 0,
      completed: taskList?.tasks.filter(t => t.status === 'COMPLETED').length || 0,
      inProgress: taskList?.tasks.filter(t => t.status === 'IN_PROGRESS').length || 0,
      pending: taskList?.tasks.filter(t => t.status === 'PENDING').length || 0,
      totalMinutes: taskList?.tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) || 0,
    };

    return NextResponse.json({
      taskList,
      stats,
    });
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily tasks' },
      { status: 500 }
    );
  }
}

// POST /api/technician/daily-tasks - Create a new daily task
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TECHNICIAN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { date, ...taskData } = body;

    // Validate task data
    const validatedData = dailyTaskSchema.parse(taskData);

    // Parse the date
    const targetDate = new Date(date || new Date().toISOString().split('T')[0]);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Find or create task list for the date
    let taskList = await prisma.dailyTaskList.findFirst({
      where: {
        technicianId: session.user.id,
        date: {
          gte: targetDate,
          lt: nextDate,
        },
      },
    });

    if (!taskList) {
      taskList = await prisma.dailyTaskList.create({
        data: {
          technicianId: session.user.id,
          date: targetDate,
        },
      });
    }

    // Create the task
    const task = await prisma.dailyTask.create({
      data: {
        ...validatedData,
        taskListId: taskList.id,
        startTime: validatedData.startTime ? new Date(validatedData.startTime) : null,
        endTime: validatedData.endTime ? new Date(validatedData.endTime) : null,
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

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating daily task:', error);
    return NextResponse.json(
      { error: 'Failed to create daily task' },
      { status: 500 }
    );
  }
}

// PUT /api/technician/daily-tasks - Update multiple tasks (for reordering)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TECHNICIAN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { tasks } = await request.json();

    if (!Array.isArray(tasks)) {
      return NextResponse.json(
        { error: 'Tasks must be an array' },
        { status: 400 }
      );
    }

    // Update all tasks with their new order
    const updatePromises = tasks.map((task, index) =>
      prisma.dailyTask.update({
        where: { id: task.id },
        data: { order: index },
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ message: 'Tasks reordered successfully' });
  } catch (error) {
    console.error('Error reordering tasks:', error);
    return NextResponse.json(
      { error: 'Failed to reorder tasks' },
      { status: 500 }
    );
  }
}