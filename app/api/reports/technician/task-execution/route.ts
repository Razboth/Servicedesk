import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/technician/task-execution - Get task execution performance for technician
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
                category: {
                  select: { name: true }
                }
              }
            }
          }
        },
        taskTemplateItem: {
          select: {
            title: true,
            description: true,
            estimatedMinutes: true,
            taskTemplate: {
              select: {
                name: true
              }
            }
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
          assignedToId: userId,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        },
        status: 'PENDING',
        completedAt: null
      },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            priority: true,
            createdAt: true,
            service: {
              select: {
                name: true
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
        createdAt: 'asc'
      }
    });

    // Calculate task execution metrics
    const totalCompletedTasks = completedTasks.length;
    const totalPendingTasks = pendingTasks.length;

    // Calculate efficiency metrics
    const tasksWithEstimates = completedTasks.filter(task => 
      task.taskTemplateItem.estimatedMinutes && task.actualMinutes
    );

    let avgEfficiencyRate = 100;
    let totalTimeVariance = 0;
    let onTimeCompletionRate = 0;

    if (tasksWithEstimates.length > 0) {
      const efficiencyRates = tasksWithEstimates.map(task => {
        const estimated = task.taskTemplateItem.estimatedMinutes || 0;
        const actual = task.actualMinutes || 0;
        return estimated > 0 ? Math.round((estimated / actual) * 100) : 100;
      });

      avgEfficiencyRate = Math.round(
        efficiencyRates.reduce((sum, rate) => sum + rate, 0) / efficiencyRates.length
      );

      // Calculate time variance (positive = under budget, negative = over budget)
      totalTimeVariance = tasksWithEstimates.reduce((sum, task) => {
        const estimated = task.taskTemplateItem.estimatedMinutes || 0;
        const actual = task.actualMinutes || 0;
        return sum + (estimated - actual);
      }, 0);

      // Calculate on-time completion rate (within 20% of estimate)
      const onTimeTasks = tasksWithEstimates.filter(task => {
        const estimated = task.taskTemplateItem.estimatedMinutes || 0;
        const actual = task.actualMinutes || 0;
        const variance = Math.abs(estimated - actual) / estimated;
        return variance <= 0.2; // Within 20% of estimate
      });

      onTimeCompletionRate = Math.round((onTimeTasks.length / tasksWithEstimates.length) * 100);
    }

    // Analyze task complexity and types
    const tasksByComplexity = completedTasks.reduce((acc, task) => {
      const estimatedTime = task.taskTemplateItem.estimatedMinutes || 0;
      let complexity: string;
      
      if (estimatedTime <= 15) complexity = 'Simple';
      else if (estimatedTime <= 60) complexity = 'Medium';
      else if (estimatedTime <= 240) complexity = 'Complex';
      else complexity = 'Advanced';

      acc[complexity] = (acc[complexity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const complexityDistribution = Object.entries(tasksByComplexity).map(([label, value]) => ({
      label,
      value
    }));

    // Analyze tasks by service category
    const tasksByCategory = completedTasks.reduce((acc, task) => {
      const category = task.ticket.category?.name || 'Other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryDistribution = Object.entries(tasksByCategory).map(([label, value]) => ({
      label,
      value
    }));

    // Analyze task completion patterns by priority
    const tasksByPriority = completedTasks.reduce((acc, task) => {
      const priority = task.ticket.priority;
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityDistribution = Object.entries(tasksByPriority).map(([label, value]) => ({
      label,
      value
    }));

    // Get daily completion trend for the last 14 days
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      return date.toISOString().split('T')[0];
    });

    const dailyCompletions = completedTasks.reduce((acc, task) => {
      if (task.completedAt) {
        const day = task.completedAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const completionTrend = last14Days.map(date => ({
      date,
      value: dailyCompletions[date] || 0,
      label: `${dailyCompletions[date] || 0} tasks completed`
    }));

    // Identify top performing task templates
    const taskTemplateStats = completedTasks.reduce((acc, task) => {
      const templateName = task.taskTemplateItem.taskTemplate.name;
      if (!acc[templateName]) {
        acc[templateName] = {
          count: 0,
          totalTime: 0,
          totalEstimated: 0
        };
      }
      acc[templateName].count++;
      acc[templateName].totalTime += task.actualMinutes || 0;
      acc[templateName].totalEstimated += task.taskTemplateItem.estimatedMinutes || 0;
      return acc;
    }, {} as Record<string, any>);

    const taskTemplatePerformance = Object.entries(taskTemplateStats)
      .map(([template, stats]) => ({
        template,
        count: stats.count,
        avgTime: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
        avgEstimated: stats.count > 0 ? Math.round(stats.totalEstimated / stats.count) : 0,
        efficiency: stats.totalEstimated > 0 ? 
          Math.round((stats.totalEstimated / stats.totalTime) * 100) : 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate productivity metrics
    const avgTasksPerDay = completedTasks.length > 0 ? 
      Math.round((completedTasks.length / 30) * 10) / 10 : 0;

    const avgTimePerTask = completedTasks.length > 0 ?
      Math.round(completedTasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0) / completedTasks.length) : 0;

    // Identify improvement opportunities
    const slowTasks = completedTasks
      .filter(task => {
        const estimated = task.taskTemplateItem.estimatedMinutes || 0;
        const actual = task.actualMinutes || 0;
        return estimated > 0 && actual > estimated * 1.5; // 50% over estimate
      })
      .map(task => ({
        taskTitle: task.taskTemplateItem.title,
        ticketTitle: task.ticket.title,
        estimatedMinutes: task.taskTemplateItem.estimatedMinutes,
        actualMinutes: task.actualMinutes,
        variance: task.actualMinutes! - task.taskTemplateItem.estimatedMinutes!,
        category: task.ticket.category?.name || 'Other'
      }))
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        totalCompletedTasks,
        totalPendingTasks,
        avgEfficiencyRate,
        totalTimeVariance: Math.round(totalTimeVariance),
        onTimeCompletionRate,
        avgTasksPerDay,
        avgTimePerTask
      },
      distributions: {
        complexity: complexityDistribution,
        category: categoryDistribution,
        priority: priorityDistribution
      },
      trends: {
        daily: completionTrend
      },
      performance: {
        byTemplate: taskTemplatePerformance,
        improvements: slowTasks
      },
      pending: {
        total: totalPendingTasks,
        tasks: pendingTasks.slice(0, 10).map(task => ({
          id: task.id,
          title: task.taskTemplateItem.title,
          ticketTitle: task.ticket.title,
          priority: task.ticket.priority,
          estimatedMinutes: task.taskTemplateItem.estimatedMinutes,
          createdAt: task.createdAt,
          ticketCreatedAt: task.ticket.createdAt
        }))
      },
      recent: {
        tasks: completedTasks.slice(0, 10).map(task => ({
          id: task.id,
          title: task.taskTemplateItem.title,
          ticketTitle: task.ticket.title,
          actualMinutes: task.actualMinutes,
          estimatedMinutes: task.taskTemplateItem.estimatedMinutes,
          completedAt: task.completedAt,
          efficiency: task.taskTemplateItem.estimatedMinutes && task.actualMinutes ?
            Math.round((task.taskTemplateItem.estimatedMinutes / task.actualMinutes) * 100) : 100
        }))
      },
      period: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching task execution data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}