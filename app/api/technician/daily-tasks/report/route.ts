import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/technician/daily-tasks/report - Generate daily report
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'TECHNICIAN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const technicianId = searchParams.get('technicianId') || session.user.id;

    // Only allow viewing other technicians' data for managers and admins
    if (technicianId !== session.user.id &&
        !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse the date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get technician info
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: {
        id: true,
        name: true,
        email: true,
        branch: {
          select: {
            name: true,
          },
        },
        supportGroup: {
          select: {
            name: true,
          },
        },
      },
    });

    // Get daily task list
    const taskList = await prisma.dailyTaskList.findFirst({
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
                    category: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
                createdBy: {
                  select: {
                    name: true,
                    branch: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { status: 'asc' },
            { order: 'asc' },
          ],
        },
      },
    });

    // Get all tickets assigned to technician (including those not in daily tasks)
    const assignedTickets = await prisma.ticket.findMany({
      where: {
        assignedToId: technicianId,
        OR: [
          {
            createdAt: {
              gte: targetDate,
              lt: nextDate,
            },
          },
          {
            updatedAt: {
              gte: targetDate,
              lt: nextDate,
            },
          },
          {
            status: {
              in: ['OPEN', 'IN_PROGRESS', 'PENDING'],
            },
          },
        ],
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        service: {
          select: {
            name: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            name: true,
            branch: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        priority: 'desc',
      },
    });

    // Calculate statistics
    const stats = {
      tasks: {
        total: taskList?.tasks.length || 0,
        completed: taskList?.tasks.filter(t => t.status === 'COMPLETED').length || 0,
        inProgress: taskList?.tasks.filter(t => t.status === 'IN_PROGRESS').length || 0,
        pending: taskList?.tasks.filter(t => t.status === 'PENDING').length || 0,
        cancelled: taskList?.tasks.filter(t => t.status === 'CANCELLED').length || 0,
        deferred: taskList?.tasks.filter(t => t.status === 'DEFERRED').length || 0,
      },
      tickets: {
        total: assignedTickets.length,
        open: assignedTickets.filter(t => t.status === 'OPEN').length,
        inProgress: assignedTickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolved: assignedTickets.filter(t => t.status === 'RESOLVED').length,
        closed: assignedTickets.filter(t => t.status === 'CLOSED').length,
        newToday: assignedTickets.filter(t =>
          t.createdAt >= targetDate && t.createdAt < nextDate
        ).length,
        resolvedToday: assignedTickets.filter(t =>
          t.resolvedAt && t.resolvedAt >= targetDate && t.resolvedAt < nextDate
        ).length,
      },
      time: {
        totalMinutes: taskList?.tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) || 0,
        byCategory: {},
      },
      productivity: {
        completionRate: taskList?.tasks.length
          ? Math.round((taskList.tasks.filter(t => t.status === 'COMPLETED').length / taskList.tasks.length) * 100)
          : 0,
        averageTaskTime: taskList?.tasks.filter(t => t.actualMinutes).length
          ? Math.round(
              taskList.tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) /
              taskList.tasks.filter(t => t.actualMinutes).length
            )
          : 0,
      },
    };

    // Calculate time by category
    if (taskList?.tasks) {
      taskList.tasks.forEach(task => {
        if (task.actualMinutes) {
          stats.time.byCategory[task.category] =
            (stats.time.byCategory[task.category] || 0) + task.actualMinutes;
        }
      });
    }

    // Group tasks by category for the report
    const tasksByCategory = taskList?.tasks.reduce((acc, task) => {
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    }, {} as Record<string, typeof taskList.tasks>) || {};

    return NextResponse.json({
      date: targetDate.toISOString(),
      technician,
      taskList: taskList || null,
      tasksByCategory,
      assignedTickets,
      stats,
      summary: {
        totalTasks: stats.tasks.total,
        completedTasks: stats.tasks.completed,
        totalTickets: stats.tickets.total,
        resolvedTickets: stats.tickets.resolved,
        totalHours: Math.round(stats.time.totalMinutes / 60 * 10) / 10,
        completionRate: stats.productivity.completionRate,
      },
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily report' },
      { status: 500 }
    );
  }
}