import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const branchId = user?.branchId;

    // Build where clause for filtering based on role
    let ticketFilter: any = {};
    if (isBranchRole && branchId) {
      ticketFilter.branchId = branchId;
    }

    // Get all tickets for temporal analysis
    const tickets = await prisma.ticket.findMany({
      where: ticketFilter,
      include: {
        service: {
          select: {
            name: true,
            category: { select: { name: true } }
          }
        },
        createdBy: {
          select: { name: true, role: true }
        },
        assignedTo: {
          select: { name: true, role: true }
        },
        branch: {
          select: { name: true, code: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const now = new Date();

    // Daily analysis for the last 30 days
    const dailyAnalysis = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= dayStart && ticketDate < dayEnd;
      });

      // Status breakdown for the day
      const statusBreakdown = dayTickets.reduce((acc: any, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      // Priority breakdown for the day
      const priorityBreakdown = dayTickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      // Calculate day of week patterns
      const dayOfWeek = dayStart.toLocaleDateString('en-US', { weekday: 'long' });
      const isWeekend = dayStart.getDay() === 0 || dayStart.getDay() === 6;

      return {
        date: dayStart.toISOString().split('T')[0],
        dayOfWeek,
        isWeekend,
        totalTickets: dayTickets.length,
        openTickets: statusBreakdown.OPEN || 0,
        inProgressTickets: statusBreakdown.IN_PROGRESS || 0,
        resolvedTickets: statusBreakdown.RESOLVED || 0,
        closedTickets: statusBreakdown.CLOSED || 0,
        criticalTickets: priorityBreakdown.CRITICAL || 0,
        highTickets: priorityBreakdown.HIGH || 0,
        mediumTickets: priorityBreakdown.MEDIUM || 0,
        lowTickets: priorityBreakdown.LOW || 0
      };
    });

    // Weekly analysis for the last 12 weeks
    const weeklyAnalysis = Array.from({ length: 12 }, (_, i) => {
      const weekStart = new Date(now.getTime() - (11 - i) * 7 * 24 * 60 * 60 * 1000);
      const weekStartDay = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStartDay.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= weekStartDay && ticketDate < weekEnd;
      });

      const resolvedThisWeek = weekTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));

      return {
        weekStart: weekStartDay.toISOString().split('T')[0],
        weekEnd: new Date(weekEnd.getTime() - 1).toISOString().split('T')[0],
        weekNumber: i + 1,
        totalTickets: weekTickets.length,
        resolvedTickets: resolvedThisWeek.length,
        resolutionRate: weekTickets.length > 0 ? (resolvedThisWeek.length / weekTickets.length) * 100 : 0,
        avgTicketsPerDay: Math.round((weekTickets.length / 7) * 10) / 10
      };
    });

    // Monthly analysis for the last 12 months
    const monthlyAnalysis = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const monthTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= monthStart && ticketDate <= monthEnd;
      });

      // Service distribution for the month
      const serviceDistribution = monthTickets.reduce((acc: any, ticket) => {
        const serviceName = ticket.service?.name || 'Unknown';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});

      // Branch distribution for the month
      const branchDistribution = monthTickets.reduce((acc: any, ticket) => {
        const branchName = ticket.branch?.name || 'Unknown';
        acc[branchName] = (acc[branchName] || 0) + 1;
        return acc;
      }, {});

      const resolvedThisMonth = monthTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const daysInMonth = monthEnd.getDate();

      return {
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthYear: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        totalTickets: monthTickets.length,
        resolvedTickets: resolvedThisMonth.length,
        resolutionRate: monthTickets.length > 0 ? (resolvedThisMonth.length / monthTickets.length) * 100 : 0,
        avgTicketsPerDay: Math.round((monthTickets.length / daysInMonth) * 10) / 10,
        topService: Object.entries(serviceDistribution).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'None',
        topBranch: Object.entries(branchDistribution).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'None'
      };
    });

    // Hourly pattern analysis (24-hour breakdown)
    const hourlyPattern = Array.from({ length: 24 }, (_, hour) => {
      const hourTickets = tickets.filter(ticket => {
        const ticketHour = new Date(ticket.createdAt).getHours();
        return ticketHour === hour;
      });

      return {
        hour,
        hourLabel: `${String(hour).padStart(2, '0')}:00`,
        ticketCount: hourTickets.length,
        avgPerDay: Math.round((hourTickets.length / 30) * 10) / 10 // Average over 30 days
      };
    });

    // Day of week pattern analysis
    const dayOfWeekPattern = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, dayIndex) => {
      const dayTickets = tickets.filter(ticket => {
        const ticketDay = new Date(ticket.createdAt).getDay();
        return ticketDay === dayIndex;
      });

      return {
        day: dayName,
        dayIndex,
        ticketCount: dayTickets.length,
        isWeekend: dayIndex === 0 || dayIndex === 6,
        avgPerWeek: Math.round((dayTickets.length / 12) * 10) / 10 // Average over 12 weeks
      };
    });

    // Seasonal trends (quarterly analysis)
    const quarterlyAnalysis = Array.from({ length: 4 }, (_, quarter) => {
      const currentYear = now.getFullYear();
      const quarterStart = new Date(currentYear, quarter * 3, 1);
      const quarterEnd = new Date(currentYear, (quarter + 1) * 3, 0, 23, 59, 59);
      
      const quarterTickets = tickets.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= quarterStart && ticketDate <= quarterEnd;
      });

      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterResolved = quarterTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));

      return {
        quarter: quarterNames[quarter],
        quarterNumber: quarter + 1,
        totalTickets: quarterTickets.length,
        resolvedTickets: quarterResolved.length,
        resolutionRate: quarterTickets.length > 0 ? (quarterResolved.length / quarterTickets.length) * 100 : 0,
        avgTicketsPerMonth: Math.round((quarterTickets.length / 3) * 10) / 10
      };
    });

    // Calculate peaks and trends
    const peakDay = dailyAnalysis.reduce((max, day) => day.totalTickets > max.totalTickets ? day : max, dailyAnalysis[0]);
    const peakHour = hourlyPattern.reduce((max, hour) => hour.ticketCount > max.ticketCount ? hour : max, hourlyPattern[0]);
    const busiestDayOfWeek = dayOfWeekPattern.reduce((max, day) => day.ticketCount > max.ticketCount ? day : max, dayOfWeekPattern[0]);

    // Overall statistics
    const totalTickets = tickets.length;
    const recentTickets = tickets.filter(t => t.createdAt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
    const weekendTickets = tickets.filter(t => {
      const day = new Date(t.createdAt).getDay();
      return day === 0 || day === 6;
    });

    const summary = {
      totalTickets,
      recentTickets: recentTickets.length,
      avgTicketsPerDay: Math.round((totalTickets / 365) * 10) / 10,
      weekendTicketsPercent: totalTickets > 0 ? Math.round((weekendTickets.length / totalTickets) * 100 * 10) / 10 : 0,
      peakDay: {
        date: peakDay.date,
        count: peakDay.totalTickets
      },
      peakHour: {
        hour: peakHour.hourLabel,
        count: peakHour.ticketCount
      },
      busiestDayOfWeek: busiestDayOfWeek.day,
      currentTrend: dailyAnalysis.slice(-7).reduce((sum, day) => sum + day.totalTickets, 0) >
                    dailyAnalysis.slice(-14, -7).reduce((sum, day) => sum + day.totalTickets, 0) ? 'Increasing' : 'Decreasing'
    };

    return NextResponse.json({
      summary,
      dailyAnalysis,
      weeklyAnalysis,
      monthlyAnalysis,
      hourlyPattern,
      dayOfWeekPattern,
      quarterlyAnalysis
    });

  } catch (error) {
    console.error('Error fetching requests by created date data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}