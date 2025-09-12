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
    let userFilter: any = {};
    let taskFilter: any = {};

    if (isTechnician) {
      // Technicians can only see their own worklog
      userFilter.id = session.user.id;
      taskFilter.completedById = session.user.id;
    } else if (isBranchRole && branchId) {
      // Managers see their branch technicians
      userFilter.branchId = branchId;
      userFilter.role = 'TECHNICIAN';
    } else {
      // Admins see all technicians
      userFilter.role = 'TECHNICIAN';
    }

    // Get all relevant users (technicians)
    const technicians = await prisma.user.findMany({
      where: {
        ...userFilter,
        isActive: true
      },
      include: {
        branch: {
          select: { name: true, code: true }
        },
        completedTasks: {
          where: taskFilter,
          include: {
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                priority: true,
                status: true,
                service: {
                  select: { name: true }
                },
                branch: {
                  select: { name: true }
                }
              }
            },
            taskTemplate: {
              select: {
                name: true,
                category: true,
                estimatedMinutes: true
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
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Calculate worklog metrics for each technician
    const technicianWorklog = technicians.map(tech => {
      const tasks = tech.completedTasks;
      const recentTasks = tasks.filter(t => t.completedAt && t.completedAt >= thirtyDaysAgo);
      const weeklyTasks = tasks.filter(t => t.completedAt && t.completedAt >= sevenDaysAgo);
      const dailyTasks = tasks.filter(t => t.completedAt && t.completedAt >= twentyFourHoursAgo);

      // Calculate total time spent
      const totalMinutesLogged = tasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);
      const recentMinutesLogged = recentTasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);
      const weeklyMinutesLogged = weeklyTasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);

      // Calculate efficiency (actual vs estimated time)
      let totalEstimated = 0;
      let totalActual = 0;
      let efficiencyTasks = 0;

      tasks.forEach(task => {
        if (task.actualMinutes && task.taskTemplate?.estimatedMinutes) {
          totalEstimated += task.taskTemplate.estimatedMinutes;
          totalActual += task.actualMinutes;
          efficiencyTasks++;
        }
      });

      const efficiency = totalEstimated > 0 ? (totalEstimated / totalActual) * 100 : 0;

      // Task distribution by category
      const taskByCategory = tasks.reduce((acc: any, task) => {
        const category = task.taskTemplate?.category || 'Unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      // Service distribution
      const taskByService = tasks.reduce((acc: any, task) => {
        const serviceName = task.ticket?.service?.name || 'Unknown';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});

      // Priority distribution
      const taskByPriority = tasks.reduce((acc: any, task) => {
        const priority = task.ticket?.priority || 'Unknown';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {});

      // Average completion time by task category
      const avgCompletionByCategory = Object.keys(taskByCategory).map(category => {
        const categoryTasks = tasks.filter(t => t.taskTemplate?.category === category);
        const totalMinutes = categoryTasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
        return {
          category,
          count: categoryTasks.length,
          avgMinutes: categoryTasks.length > 0 ? totalMinutes / categoryTasks.length : 0
        };
      });

      // Daily worklog pattern (last 7 days)
      const dailyWorklog = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayTasks = tasks.filter(task => {
          if (!task.completedAt) return false;
          const taskDate = new Date(task.completedAt);
          return taskDate >= dayStart && taskDate < dayEnd;
        });

        const dayMinutes = dayTasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);

        return {
          date: dayStart.toISOString().split('T')[0],
          taskCount: dayTasks.length,
          minutesLogged: dayMinutes,
          hoursLogged: Math.round((dayMinutes / 60) * 10) / 10
        };
      });

      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        branch: tech.branch?.name || 'Unknown',
        branchCode: tech.branch?.code || '',
        totalTasks: tasks.length,
        recentTasks: recentTasks.length,
        weeklyTasks: weeklyTasks.length,
        dailyTasks: dailyTasks.length,
        totalHoursLogged: Math.round((totalMinutesLogged / 60) * 10) / 10,
        recentHoursLogged: Math.round((recentMinutesLogged / 60) * 10) / 10,
        weeklyHoursLogged: Math.round((weeklyMinutesLogged / 60) * 10) / 10,
        avgHoursPerTask: tasks.length > 0 ? Math.round((totalMinutesLogged / tasks.length / 60) * 10) / 10 : 0,
        efficiency: Math.round(efficiency * 10) / 10,
        efficiencyTasks,
        taskByCategory,
        taskByService,
        taskByPriority,
        avgCompletionByCategory,
        dailyWorklog,
        productivity: {
          tasksPerDay: weeklyTasks.length / 7,
          hoursPerDay: weeklyMinutesLogged / 7 / 60,
          avgTaskDuration: weeklyTasks.length > 0 ? weeklyMinutesLogged / weeklyTasks.length : 0
        }
      };
    });

    // Overall statistics
    const totalTechnicians = technicians.length;
    const activeTechnicians = technicianWorklog.filter(t => t.recentTasks > 0).length;
    const totalTasksCompleted = technicianWorklog.reduce((sum, t) => sum + t.totalTasks, 0);
    const totalHoursLogged = technicianWorklog.reduce((sum, t) => sum + t.totalHoursLogged, 0);
    const avgEfficiency = totalTechnicians > 0 ? 
      technicianWorklog.reduce((sum, t) => sum + t.efficiency, 0) / totalTechnicians : 0;

    // Top performers by different metrics
    const topByTasks = technicianWorklog.sort((a, b) => b.totalTasks - a.totalTasks).slice(0, 5);
    const topByHours = technicianWorklog.sort((a, b) => b.totalHoursLogged - a.totalHoursLogged).slice(0, 5);
    const topByEfficiency = technicianWorklog.sort((a, b) => b.efficiency - a.efficiency).slice(0, 5);

    // Category analysis across all technicians
    const overallCategoryStats = technicianWorklog.reduce((acc: any, tech) => {
      Object.entries(tech.taskByCategory).forEach(([category, count]) => {
        if (!acc[category]) {
          acc[category] = { count: 0, technicians: new Set() };
        }
        acc[category].count += count as number;
        acc[category].technicians.add(tech.id);
      });
      return acc;
    }, {});

    // Convert Set to count
    Object.keys(overallCategoryStats).forEach(category => {
      overallCategoryStats[category].technicians = overallCategoryStats[category].technicians.size;
    });

    const summary = {
      totalTechnicians,
      activeTechnicians,
      totalTasksCompleted,
      totalHoursLogged: Math.round(totalHoursLogged * 10) / 10,
      avgTasksPerTechnician: totalTechnicians > 0 ? Math.round((totalTasksCompleted / totalTechnicians) * 10) / 10 : 0,
      avgHoursPerTechnician: totalTechnicians > 0 ? Math.round((totalHoursLogged / totalTechnicians) * 10) / 10 : 0,
      avgEfficiency: Math.round(avgEfficiency * 10) / 10
    };

    return NextResponse.json({
      summary,
      technicians: technicianWorklog,
      topPerformers: {
        byTasks: topByTasks,
        byHours: topByHours,
        byEfficiency: topByEfficiency
      },
      categoryStats: overallCategoryStats
    });

  } catch (error) {
    console.error('Error fetching worklog by technician data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}