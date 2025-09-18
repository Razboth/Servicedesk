import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/technician/daily-tasks/export - Export daily tasks to XLSX
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
    const { startDate, endDate, technicianId } = body;

    const technician = technicianId || session.user.id;

    // Only allow viewing other technicians' data for managers and admins
    if (technician !== session.user.id &&
        !['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch task lists within date range
    const taskLists = await prisma.dailyTaskList.findMany({
      where: {
        technicianId: technician,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        tasks: {
          include: {
            ticket: {
              select: {
                ticketNumber: true,
                title: true,
                status: true,
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
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get technician details
    const technicianData = await prisma.user.findUnique({
      where: { id: technician },
      select: {
        name: true,
        role: true,
      }
    });

    // Format data for export with new format
    const exportData = [];
    for (const taskList of taskLists) {
      for (const task of taskList.tasks) {
        exportData.push({
          'Departemen': 'Operasional TI',
          'Nama': technicianData?.name || taskList.technician?.name || 'Unknown',
          'Role': technicianData?.role || 'TECHNICIAN',
          'Date': taskList.date.toLocaleDateString('id-ID'),
          'Hour': task.startTime ? new Date(task.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '08:00',
          'Description': task.title + (task.ticket?.ticketNumber ? ` (${task.ticket.ticketNumber})` : ''),
          'Status': task.ticket?.status || task.status,
          'Notes': task.notes || task.description || '',
        });
      }
    }

    // Calculate summary statistics
    const summary = {
      totalDays: taskLists.length,
      totalTasks: exportData.length,
      completedTasks: exportData.filter(t => t.Status === 'COMPLETED').length,
      totalMinutes: exportData.reduce((sum, t) => sum + (Number(t['Duration (minutes)']) || 0), 0),
      tasksByCategory: {},
      tasksByStatus: {},
    };

    // Count by category
    exportData.forEach(task => {
      summary.tasksByCategory[task.Category] = (summary.tasksByCategory[task.Category] || 0) + 1;
      summary.tasksByStatus[task.Status] = (summary.tasksByStatus[task.Status] || 0) + 1;
    });

    // Log the export
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EXPORT',
        entity: 'DailyTaskList',
        entityId: technician,
        newValues: {
          description: `Exported daily tasks from ${startDate} to ${endDate}`,
          technicianId: technician,
          technicianName: taskLists[0]?.technician?.name || 'Unknown',
          recordCount: exportData.length,
        },
      },
    });

    return NextResponse.json({
      data: exportData,
      summary,
      metadata: {
        technicianName: taskLists[0]?.technician?.name || session.user.name,
        technicianEmail: taskLists[0]?.technician?.email || session.user.email,
        exportDate: new Date().toISOString(),
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
      filename: `daily-tasks_${startDate}_${endDate}.xlsx`,
    });
  } catch (error) {
    console.error('Error exporting daily tasks:', error);
    return NextResponse.json(
      { error: 'Failed to export daily tasks' },
      { status: 500 }
    );
  }
}