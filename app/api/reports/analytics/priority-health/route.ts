import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/analytics/priority-health - Analyze priority distribution and health
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow ADMIN and MANAGER roles to see priority health
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30'; // days
    const branchId = searchParams.get('branchId');

    const days = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build filters
    let whereClause: any = {
      createdAt: { gte: startDate }
    };

    if (branchId) {
      whereClause.branchId = branchId;
    }

    // Get priority distribution
    const priorityDistribution = await prisma.ticket.groupBy({
      by: ['priority'],
      where: whereClause,
      _count: true,
      orderBy: { _count: { priority: 'desc' } }
    });

    const totalTickets = priorityDistribution.reduce((sum, p) => sum + p._count, 0);

    // Calculate percentages and ideal distribution
    const priorityAnalysis = priorityDistribution.map(p => ({
      priority: p.priority,
      count: p._count,
      percentage: Math.round((p._count / totalTickets) * 100 * 10) / 10,
      isHealthy: false // We'll calculate this below
    }));

    // Define healthy priority distribution (industry best practice)
    const idealDistribution = {
      LOW: 40,      // 40% low priority
      MEDIUM: 30,   // 30% medium priority  
      HIGH: 25,     // 25% high priority
      URGENT: 4,    // 4% urgent
      CRITICAL: 1   // 1% critical
    };

    // Check health status
    priorityAnalysis.forEach(p => {
      const ideal = idealDistribution[p.priority as keyof typeof idealDistribution] || 0;
      // Healthy if within ±10% of ideal
      p.isHealthy = Math.abs(p.percentage - ideal) <= 10;
    });

    // Calculate overall health score (0-100)
    let healthScore = 0;
    Object.entries(idealDistribution).forEach(([priority, idealPercent]) => {
      const actual = priorityAnalysis.find(p => p.priority === priority);
      const actualPercent = actual?.percentage || 0;
      const deviation = Math.abs(actualPercent - idealPercent);
      const priorityScore = Math.max(0, 100 - (deviation * 2)); // 2 points lost per % deviation
      healthScore += priorityScore * (idealPercent / 100); // Weight by ideal percentage
    });
    healthScore = Math.round(healthScore);

    // Analyze priority trends over time (last 8 weeks)
    const weeklyTrends = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - ((i - 1) * 7));

      const weekTickets = await prisma.ticket.groupBy({
        by: ['priority'],
        where: {
          ...whereClause,
          createdAt: { gte: weekStart, lt: weekEnd }
        },
        _count: true
      });

      const weekTotal = weekTickets.reduce((sum, t) => sum + t._count, 0);
      const weekData: any = {
        weekStart: weekStart.toISOString().split('T')[0],
        total: weekTotal
      };

      // Add priority counts
      ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'].forEach(priority => {
        const priorityData = weekTickets.find(t => t.priority === priority);
        weekData[priority.toLowerCase()] = priorityData?._count || 0;
        weekData[`${priority.toLowerCase()}Percent`] = weekTotal > 0 
          ? Math.round((weekData[priority.toLowerCase()] / weekTotal) * 100) 
          : 0;
      });

      weeklyTrends.push(weekData);
    }

    // Analyze by service to identify priority inflation sources
    const serviceAnalysis = await prisma.ticket.groupBy({
      by: ['serviceId', 'priority'],
      where: whereClause,
      _count: true
    });

    // Group by service and calculate priority health per service
    const serviceMap = new Map();
    for (const sa of serviceAnalysis) {
      if (!serviceMap.has(sa.serviceId)) {
        serviceMap.set(sa.serviceId, {
          serviceId: sa.serviceId,
          total: 0,
          priorities: {}
        });
      }
      const service = serviceMap.get(sa.serviceId);
      service.total += sa._count;
      service.priorities[sa.priority] = sa._count;
    }

    // Get top services with priority issues (high % of HIGH/URGENT/CRITICAL)
    const problemServices = [];
    for (const [serviceId, data] of serviceMap.entries()) {
      const service = data as any;
      const highPriorityCount = (service.priorities.HIGH || 0) + 
                               (service.priorities.URGENT || 0) + 
                               (service.priorities.CRITICAL || 0);
      const highPriorityPercent = Math.round((highPriorityCount / service.total) * 100);
      
      if (highPriorityPercent > 60 && service.total >= 5) { // 60%+ high priority with at least 5 tickets
        // Get service details
        const serviceDetails = await prisma.service.findUnique({
          where: { id: serviceId },
          select: { 
            name: true,
            category: { select: { name: true } }
          }
        });

        problemServices.push({
          serviceId,
          name: serviceDetails?.name || 'Unknown',
          category: serviceDetails?.category?.name || 'Unknown',
          totalTickets: service.total,
          highPriorityCount,
          highPriorityPercent,
          priorities: service.priorities,
          healthScore: Math.max(0, 100 - ((highPriorityPercent - 25) * 2)) // 25% high priority is ideal
        });
      }
    }

    problemServices.sort((a, b) => b.totalTickets - a.totalTickets); // Sort by volume

    // Branch analysis (if not filtering by specific branch)
    let branchAnalysis = [];
    if (!branchId) {
      const branchPriority = await prisma.ticket.groupBy({
        by: ['branchId', 'priority'],
        where: {
          ...whereClause,
          branchId: { not: null }
        },
        _count: true
      });

      const branchMap = new Map();
      for (const bp of branchPriority) {
        if (!branchMap.has(bp.branchId)) {
          branchMap.set(bp.branchId, { total: 0, priorities: {} });
        }
        const branch = branchMap.get(bp.branchId);
        branch.total += bp._count;
        branch.priorities[bp.priority] = bp._count;
      }

      // Calculate health score per branch
      for (const [branchId, data] of branchMap.entries()) {
        const branch = data as any;
        const highPriorityCount = (branch.priorities.HIGH || 0) + 
                                 (branch.priorities.URGENT || 0) + 
                                 (branch.priorities.CRITICAL || 0);
        const highPriorityPercent = Math.round((highPriorityCount / branch.total) * 100);

        // Get branch details
        const branchDetails = await prisma.branch.findUnique({
          where: { id: branchId! },
          select: { name: true, code: true }
        });

        branchAnalysis.push({
          branchId,
          name: branchDetails?.name || 'Unknown',
          code: branchDetails?.code || 'N/A',
          totalTickets: branch.total,
          highPriorityPercent,
          healthScore: Math.max(0, 100 - ((highPriorityPercent - 25) * 2)),
          priorities: branch.priorities
        });
      }

      branchAnalysis.sort((a, b) => b.totalTickets - a.totalTickets);
    }

    // Generate recommendations
    const recommendations = [];
    
    if (healthScore < 50) {
      recommendations.push({
        type: 'CRITICAL',
        title: 'Severe Priority Inflation Detected',
        description: `${priorityAnalysis.find(p => p.priority === 'HIGH')?.percentage || 0}% of tickets are marked HIGH priority. Industry best practice is 25%.`,
        action: 'Implement priority validation rules and user training immediately.'
      });
    }

    if (problemServices.length > 0) {
      recommendations.push({
        type: 'WARNING', 
        title: 'Services with Priority Issues',
        description: `${problemServices.length} services have >60% high-priority tickets.`,
        action: `Review priority guidelines for: ${problemServices.slice(0, 3).map(s => s.name).join(', ')}`
      });
    }

    if (healthScore >= 70) {
      recommendations.push({
        type: 'SUCCESS',
        title: 'Good Priority Distribution',
        description: 'Priority distribution is reasonably healthy.',
        action: 'Continue monitoring and maintain current practices.'
      });
    }

    const response = {
      summary: {
        totalTickets,
        healthScore,
        timeRangeDays: days,
        lastUpdated: new Date().toISOString()
      },
      priorityDistribution: priorityAnalysis,
      idealDistribution,
      weeklyTrends,
      problemServices: problemServices.slice(0, 10),
      branchAnalysis: branchAnalysis.slice(0, 10),
      recommendations,
      insights: {
        mostOverusedPriority: priorityAnalysis[0]?.priority || 'N/A',
        mostUnderusedPriority: priorityAnalysis[priorityAnalysis.length - 1]?.priority || 'N/A',
        totalProblemServices: problemServices.length,
        avgHighPriorityPercent: Math.round(
          priorityAnalysis.find(p => p.priority === 'HIGH')?.percentage || 0
        )
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching priority health report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch priority health report' },
      { status: 500 }
    );
  }
}