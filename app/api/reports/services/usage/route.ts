import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'quarter';
    const groupBy = searchParams.get('groupBy') || 'service'; // service, category, branch, supportGroup
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfMonth(subMonths(now, 2));
        break;
      case 'year':
        startDate = startOfMonth(subMonths(now, 11));
        break;
      default:
        startDate = startOfMonth(subMonths(now, 2));
    }

    // Get all tickets with service information
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      include: {
        service: {
          include: {
            tier1Category: { select: { name: true } },
            tier2Subcategory: { select: { name: true } },
            tier3Item: { select: { name: true } },
            supportGroup: { select: { name: true } }
          }
        },
        createdBy: {
          select: {
            branch: { select: { id: true, name: true, code: true } }
          }
        },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        item: { select: { name: true } }
      }
    });

    // Analyze usage patterns
    const usageData: Record<string, any> = {};
    const timeSeriesData: Record<string, any> = {};
    const branchUsage: Record<string, any> = {};
    const categoryUsage: Record<string, any> = {};
    const peakHours: number[] = new Array(24).fill(0);
    const dayOfWeekUsage: number[] = new Array(7).fill(0);

    tickets.forEach(ticket => {
      const serviceId = ticket.serviceId || 'no-service';
      const serviceName = ticket.service?.name || 'No Service';
      const category = ticket.category?.name || 'Uncategorized';
      const subcategory = ticket.subcategory?.name || 'No Subcategory';
      const branchName = ticket.createdBy.branch?.name || 'Unknown Branch';
      const supportGroup = ticket.service?.supportGroup?.name || 'No Support Group';
      
      // Group based on parameter
      let groupKey: string;
      let groupName: string;
      
      switch (groupBy) {
        case 'category':
          groupKey = category;
          groupName = category;
          break;
        case 'branch':
          groupKey = ticket.createdBy.branch?.id || 'unknown';
          groupName = branchName;
          break;
        case 'supportGroup':
          groupKey = ticket.service?.supportGroup?.id || 'unknown';
          groupName = supportGroup;
          break;
        default: // service
          groupKey = serviceId;
          groupName = serviceName;
      }

      // Initialize usage data
      if (!usageData[groupKey]) {
        usageData[groupKey] = {
          id: groupKey,
          name: groupName,
          category,
          subcategory,
          supportGroup,
          totalRequests: 0,
          uniqueUsers: new Set(),
          branches: new Set(),
          statusCounts: {
            open: 0,
            inProgress: 0,
            resolved: 0,
            closed: 0,
            pending: 0
          },
          priorityCounts: {
            low: 0,
            medium: 0,
            high: 0,
            urgent: 0,
            critical: 0
          },
          resolutionTimes: [],
          responseTimes: [],
          monthlyTrend: {}
        };
      }

      // Update counts
      usageData[groupKey].totalRequests++;
      usageData[groupKey].uniqueUsers.add(ticket.createdById);
      usageData[groupKey].branches.add(branchName);

      // Status counts
      if (ticket.status === 'OPEN') usageData[groupKey].statusCounts.open++;
      else if (ticket.status === 'IN_PROGRESS') usageData[groupKey].statusCounts.inProgress++;
      else if (ticket.status === 'RESOLVED') usageData[groupKey].statusCounts.resolved++;
      else if (ticket.status === 'CLOSED') usageData[groupKey].statusCounts.closed++;
      else if (ticket.status.startsWith('PENDING')) usageData[groupKey].statusCounts.pending++;

      // Priority counts
      const priority = ticket.priority?.toLowerCase() || 'medium';
      if (priority in usageData[groupKey].priorityCounts) {
        usageData[groupKey].priorityCounts[priority]++;
      }

      // Time-based analysis
      const createdDate = new Date(ticket.createdAt);
      const hour = createdDate.getHours();
      const dayOfWeek = createdDate.getDay();
      const monthYear = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

      peakHours[hour]++;
      dayOfWeekUsage[dayOfWeek]++;

      // Monthly trend
      if (!usageData[groupKey].monthlyTrend[monthYear]) {
        usageData[groupKey].monthlyTrend[monthYear] = 0;
      }
      usageData[groupKey].monthlyTrend[monthYear]++;

      // Time series data
      if (!timeSeriesData[monthYear]) {
        timeSeriesData[monthYear] = {};
      }
      if (!timeSeriesData[monthYear][groupKey]) {
        timeSeriesData[monthYear][groupKey] = 0;
      }
      timeSeriesData[monthYear][groupKey]++;

      // Branch usage
      if (!branchUsage[branchName]) {
        branchUsage[branchName] = {
          name: branchName,
          services: new Set(),
          totalRequests: 0
        };
      }
      branchUsage[branchName].services.add(serviceName);
      branchUsage[branchName].totalRequests++;

      // Category usage
      if (!categoryUsage[category]) {
        categoryUsage[category] = {
          name: category,
          services: new Set(),
          totalRequests: 0,
          subcategories: {}
        };
      }
      categoryUsage[category].services.add(serviceName);
      categoryUsage[category].totalRequests++;
      
      if (!categoryUsage[category].subcategories[subcategory]) {
        categoryUsage[category].subcategories[subcategory] = 0;
      }
      categoryUsage[category].subcategories[subcategory]++;

      // Resolution time tracking
      if (ticket.resolvedAt) {
        const resolutionTime = (new Date(ticket.resolvedAt).getTime() - createdDate.getTime()) / (1000 * 60 * 60);
        usageData[groupKey].resolutionTimes.push(resolutionTime);
      }

      // Response time tracking
      if (ticket.firstResponseAt) {
        const responseTime = (new Date(ticket.firstResponseAt).getTime() - createdDate.getTime()) / (1000 * 60);
        usageData[groupKey].responseTimes.push(responseTime);
      }
    });

    // Calculate averages and format data
    const formattedUsageData = Object.values(usageData).map((item: any) => {
      const avgResolutionTime = item.resolutionTimes.length > 0 ?
        item.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / item.resolutionTimes.length : 0;
      
      const avgResponseTime = item.responseTimes.length > 0 ?
        item.responseTimes.reduce((a: number, b: number) => a + b, 0) / item.responseTimes.length : 0;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        supportGroup: item.supportGroup,
        totalRequests: item.totalRequests,
        uniqueUsers: item.uniqueUsers.size,
        branchCount: item.branches.size,
        statusCounts: item.statusCounts,
        priorityCounts: item.priorityCounts,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        completionRate: item.totalRequests > 0 ?
          Math.round(((item.statusCounts.resolved + item.statusCounts.closed) / item.totalRequests) * 1000) / 10 : 0,
        monthlyTrend: Object.entries(item.monthlyTrend).map(([month, count]) => ({
          month,
          count
        }))
      };
    }).sort((a, b) => b.totalRequests - a.totalRequests);

    // Format branch usage
    const formattedBranchUsage = Object.values(branchUsage).map((branch: any) => ({
      name: branch.name,
      serviceCount: branch.services.size,
      totalRequests: branch.totalRequests
    })).sort((a, b) => b.totalRequests - a.totalRequests);

    // Format category usage
    const formattedCategoryUsage = Object.values(categoryUsage).map((cat: any) => ({
      name: cat.name,
      serviceCount: cat.services.size,
      totalRequests: cat.totalRequests,
      subcategories: Object.entries(cat.subcategories)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
    })).sort((a, b) => b.totalRequests - a.totalRequests);

    // Peak hours analysis
    const peakHourData = peakHours.map((count, hour) => ({
      hour: `${hour}:00`,
      count
    }));

    // Day of week analysis
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekData = dayOfWeekUsage.map((count, day) => ({
      day: days[day],
      count
    }));

    // Growth trends
    const sortedMonths = Object.keys(timeSeriesData).sort();
    const growthTrend = sortedMonths.map(month => {
      const total = Object.values(timeSeriesData[month]).reduce((sum: number, count: any) => sum + count, 0);
      return {
        month,
        total,
        services: Object.keys(timeSeriesData[month]).length
      };
    });

    // Calculate growth rate
    let growthRate = 0;
    if (growthTrend.length >= 2) {
      const firstMonth = growthTrend[0].total;
      const lastMonth = growthTrend[growthTrend.length - 1].total;
      growthRate = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
    }

    // Top growing services
    const topGrowing = formattedUsageData
      .filter(s => s.monthlyTrend.length >= 2)
      .map(s => {
        const firstMonth = s.monthlyTrend[0].count;
        const lastMonth = s.monthlyTrend[s.monthlyTrend.length - 1].count;
        const growth = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth) * 100 : 0;
        return { ...s, growthRate: growth };
      })
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, 5);

    // Summary statistics
    const totalRequests = tickets.length;
    const uniqueUsers = new Set(tickets.map(t => t.createdById)).size;
    const activeServices = formattedUsageData.filter(s => s.totalRequests > 0).length;
    const avgRequestsPerUser = uniqueUsers > 0 ? totalRequests / uniqueUsers : 0;
    const avgRequestsPerService = activeServices > 0 ? totalRequests / activeServices : 0;

    return NextResponse.json({
      usage: formattedUsageData,
      branchUsage: formattedBranchUsage,
      categoryUsage: formattedCategoryUsage,
      peakHours: peakHourData,
      dayOfWeek: dayOfWeekData,
      growthTrend,
      topGrowing,
      summary: {
        totalRequests,
        uniqueUsers,
        activeServices,
        avgRequestsPerUser: Math.round(avgRequestsPerUser * 10) / 10,
        avgRequestsPerService: Math.round(avgRequestsPerService * 10) / 10,
        growthRate: Math.round(growthRate * 10) / 10,
        peakHour: peakHourData.reduce((max, h) => h.count > max.count ? h : max).hour,
        busiestDay: dayOfWeekData.reduce((max, d) => d.count > max.count ? d : max).day
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching service usage report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service usage report' },
      { status: 500 }
    );
  }
}