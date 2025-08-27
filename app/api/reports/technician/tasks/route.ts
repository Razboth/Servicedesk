import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/technician/tasks - Get task execution performance for technician
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians can access this report
    if (session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    const userId = session.user.id;

    // Get all completed tasks by this technician
    const completedTasks = await prisma.ticketTask.findMany({
      where: {
        completedById: userId,
        completedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            service: {
              select: {
                name: true,
                tier1Category: {
                  select: { name: true }
                }
              }
            }
          }
        },
        taskTemplateItem: {
          select: {
            title: true,
            estimatedMinutes: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      }
    });

    // Get pending tasks assigned to this technician
    const pendingTasks = await prisma.ticketTask.findMany({
      where: {
        ticket: {
          assignedToId: userId
        },
        status: 'PENDING'
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true
          }
        },
        taskTemplateItem: {
          select: {
            title: true,
            estimatedMinutes: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Calculate performance metrics
    const totalCompleted = completedTasks.length;
    const totalPending = pendingTasks.length;
    
    // Calculate average completion time
    const completionTimes = completedTasks
      .filter(task => task.createdAt && task.completedAt)
      .map(task => {
        const created = new Date(task.createdAt).getTime();
        const completed = new Date(task.completedAt!).getTime();
        return (completed - created) / (1000 * 60); // minutes
      });
    
    const avgCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length 
      : 0;

    // Calculate efficiency (actual vs estimated time)
    const efficiencyData = completedTasks
      .filter(task => task.taskTemplateItem?.estimatedMinutes && task.createdAt && task.completedAt)
      .map(task => {
        const actualMinutes = (new Date(task.completedAt!).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60);
        const estimatedMinutes = task.taskTemplateItem!.estimatedMinutes!;
        return {
          taskId: task.id,
          taskTitle: task.taskTemplateItem!.title,
          ticketTitle: task.ticket.title,
          actualMinutes,
          estimatedMinutes,
          efficiency: estimatedMinutes > 0 ? (estimatedMinutes / actualMinutes) * 100 : 0
        };
      });

    const avgEfficiency = efficiencyData.length > 0
      ? efficiencyData.reduce((sum, item) => sum + item.efficiency, 0) / efficiencyData.length
      : 0;

    // Group tasks by priority
    const tasksByPriority = {
      LOW: completedTasks.filter(t => t.ticket.priority === 'LOW').length,
      MEDIUM: completedTasks.filter(t => t.ticket.priority === 'MEDIUM').length,
      HIGH: completedTasks.filter(t => t.ticket.priority === 'HIGH').length,
      CRITICAL: completedTasks.filter(t => t.ticket.priority === 'CRITICAL').length
    };

    // Group tasks by service category
    const tasksByCategory = completedTasks.reduce((acc, task) => {
      const category = task.ticket.service?.tier1Category?.name || 'Uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily completion trend
    const dailyCompletions = completedTasks.reduce((acc, task) => {
      const date = new Date(task.completedAt!).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const response = {
      summary: {
        totalCompleted,
        totalPending,
        avgCompletionTime: Math.round(avgCompletionTime),
        avgEfficiency: Math.round(avgEfficiency)
      },
      distributions: {
        byPriority: tasksByPriority,
        byCategory: tasksByCategory
      },
      timeline: {
        dailyCompletions
      },
      recentTasks: completedTasks.slice(0, 10).map(task => ({
        id: task.id,
        title: task.taskTemplateItem?.title || 'Task',
        ticketTitle: task.ticket.title,
        ticketId: task.ticket.id,
        priority: task.ticket.priority,
        completedAt: task.completedAt,
        actualMinutes: task.createdAt && task.completedAt 
          ? Math.round((new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()) / (1000 * 60))
          : null,
        estimatedMinutes: task.taskTemplateItem?.estimatedMinutes
      })),
      pendingTasks: pendingTasks.slice(0, 10).map(task => ({
        id: task.id,
        title: task.taskTemplateItem?.title || 'Task',
        ticketTitle: task.ticket.title,
        ticketId: task.ticket.id,
        priority: task.ticket.priority,
        createdAt: task.createdAt,
        estimatedMinutes: task.taskTemplateItem?.estimatedMinutes,
        daysWaiting: Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      })),
      efficiencyData: efficiencyData.slice(0, 20)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching task execution report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task execution report' },
      { status: 500 }
    );
  }
}