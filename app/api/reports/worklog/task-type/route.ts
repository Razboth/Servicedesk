import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow ADMIN, SUPER_ADMIN, MANAGER, TECHNICIAN to view worklog reports
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const isTechnician = session.user.role === 'TECHNICIAN';
    const branchId = user?.branchId;

    // Build where clause for filtering based on role
    let taskFilter: any = {};

    if (isTechnician) {
      // Technicians can only see their own tasks
      taskFilter.completedById = session.user.id;
    } else if (isBranchRole && branchId) {
      // Managers see tasks from their branch
      taskFilter.ticket = {
        branchId: branchId
      };
    }
    // Admins see all tasks (no additional filter)

    // Get all task templates with their completed tasks
    const taskTemplates = await prisma.taskTemplate.findMany({
      where: { isActive: true },
      include: {
        items: {
          where: { isActive: true }
        },
        tasks: {
          where: {
            ...taskFilter,
            completedAt: { not: null }
          },
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                priority: true,
                status: true,
                createdAt: true,
                resolvedAt: true,
                branch: {
                  select: { name: true, code: true }
                },
                service: {
                  select: { name: true, category: { select: { name: true } } }
                }
              }
            },
            completedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                branch: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });

    // Date ranges for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Analyze each task template
    const taskTypeAnalysis = taskTemplates.map(template => {
      const tasks = template.tasks;
      const recentTasks = tasks.filter(t => t.completedAt && t.completedAt >= thirtyDaysAgo);
      const weeklyTasks = tasks.filter(t => t.completedAt && t.completedAt >= sevenDaysAgo);

      // Time analysis
      const totalMinutes = tasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);
      const avgMinutes = tasks.length > 0 ? totalMinutes / tasks.length : 0;
      const minMinutes = tasks.length > 0 ? Math.min(...tasks.map(t => t.actualMinutes || 0)) : 0;
      const maxMinutes = tasks.length > 0 ? Math.max(...tasks.map(t => t.actualMinutes || 0)) : 0;

      // Efficiency calculation (actual vs estimated)
      const estimatedMinutes = template.estimatedMinutes || 0;
      const efficiency = estimatedMinutes > 0 && avgMinutes > 0 ? (estimatedMinutes / avgMinutes) * 100 : 0;

      // Completion rate analysis
      const totalAssigned = template.tasks.length; // This would need to be calculated differently if we track assigned vs completed separately
      const completionRate = 100; // Since we're only looking at completed tasks

      // Priority distribution
      const priorityDistribution = tasks.reduce((acc: any, task) => {
        const priority = task.ticket?.priority || 'Unknown';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {});

      // Service distribution
      const serviceDistribution = tasks.reduce((acc: any, task) => {
        const serviceName = task.ticket?.service?.name || 'Unknown';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});

      // Branch distribution
      const branchDistribution = tasks.reduce((acc: any, task) => {
        const branchName = task.ticket?.branch?.name || 'Unknown';
        acc[branchName] = (acc[branchName] || 0) + 1;
        return acc;
      }, {});

      // Technician performance on this task type
      const technicianPerformance = tasks.reduce((acc: any, task) => {
        if (task.completedBy) {
          const techId = task.completedBy.id;
          if (!acc[techId]) {
            acc[techId] = {
              name: task.completedBy.name,
              email: task.completedBy.email,
              branch: task.completedBy.branch?.name || 'Unknown',
              taskCount: 0,
              totalMinutes: 0,
              avgMinutes: 0
            };
          }
          acc[techId].taskCount++;
          acc[techId].totalMinutes += task.actualMinutes || 0;
          acc[techId].avgMinutes = acc[techId].totalMinutes / acc[techId].taskCount;
        }
        return acc;
      }, {});

      // Convert technician performance to array and sort
      const topTechnicians = Object.values(technicianPerformance)
        .sort((a: any, b: any) => b.taskCount - a.taskCount)
        .slice(0, 5);

      // Monthly trend (last 6 months)
      const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        
        const monthTasks = tasks.filter(task => {
          if (!task.completedAt) return false;
          const taskDate = new Date(task.completedAt);
          return taskDate >= monthStart && taskDate <= monthEnd;
        });

        return {
          month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          taskCount: monthTasks.length,
          totalMinutes: monthTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0),
          avgMinutes: monthTasks.length > 0 ? monthTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / monthTasks.length : 0
        };
      });

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        estimatedMinutes: template.estimatedMinutes || 0,
        estimatedHours: Math.round((template.estimatedMinutes || 0) / 60 * 10) / 10,
        totalTasks: tasks.length,
        recentTasks: recentTasks.length,
        weeklyTasks: weeklyTasks.length,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        avgMinutes: Math.round(avgMinutes * 10) / 10,
        avgHours: Math.round((avgMinutes / 60) * 10) / 10,
        minMinutes,
        maxMinutes,
        efficiency: Math.round(efficiency * 10) / 10,
        completionRate,
        items: template.items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          isRequired: item.isRequired
        })),
        priorityDistribution,
        serviceDistribution,
        branchDistribution,
        topTechnicians,
        monthlyTrend
      };
    });

    // Overall statistics
    const totalTaskTypes = taskTemplates.length;
    const activeTaskTypes = taskTypeAnalysis.filter(t => t.recentTasks > 0).length;
    const totalTasksCompleted = taskTypeAnalysis.reduce((sum, t) => sum + t.totalTasks, 0);
    const totalHoursLogged = taskTypeAnalysis.reduce((sum, t) => sum + t.totalHours, 0);
    const avgEfficiency = totalTaskTypes > 0 ? 
      taskTypeAnalysis.reduce((sum, t) => sum + t.efficiency, 0) / totalTaskTypes : 0;

    // Category-wise analysis
    const categoryAnalysis = taskTypeAnalysis.reduce((acc: any, taskType) => {
      const category = taskType.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          taskTypes: 0,
          totalTasks: 0,
          totalHours: 0,
          avgEfficiency: 0
        };
      }
      acc[category].taskTypes++;
      acc[category].totalTasks += taskType.totalTasks;
      acc[category].totalHours += taskType.totalHours;
      acc[category].avgEfficiency += taskType.efficiency;
      return acc;
    }, {});

    // Calculate category averages
    Object.keys(categoryAnalysis).forEach(category => {
      const data = categoryAnalysis[category];
      data.avgEfficiency = data.taskTypes > 0 ? data.avgEfficiency / data.taskTypes : 0;
      data.avgTasksPerType = data.taskTypes > 0 ? data.totalTasks / data.taskTypes : 0;
      data.avgHoursPerType = data.taskTypes > 0 ? data.totalHours / data.taskTypes : 0;
    });

    // Most used task types
    const mostUsedTaskTypes = taskTypeAnalysis
      .sort((a, b) => b.totalTasks - a.totalTasks)
      .slice(0, 10);

    // Most efficient task types
    const mostEfficientTaskTypes = taskTypeAnalysis
      .filter(t => t.efficiency > 0)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 10);

    const summary = {
      totalTaskTypes,
      activeTaskTypes,
      totalTasksCompleted,
      totalHoursLogged: Math.round(totalHoursLogged * 10) / 10,
      avgTasksPerType: totalTaskTypes > 0 ? Math.round((totalTasksCompleted / totalTaskTypes) * 10) / 10 : 0,
      avgHoursPerType: totalTaskTypes > 0 ? Math.round((totalHoursLogged / totalTaskTypes) * 10) / 10 : 0,
      avgEfficiency: Math.round(avgEfficiency * 10) / 10
    };

    return NextResponse.json({
      summary,
      taskTypes: taskTypeAnalysis,
      categoryAnalysis,
      mostUsedTaskTypes,
      mostEfficientTaskTypes
    });

  } catch (error) {
    console.error('Error fetching worklog by task type data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}