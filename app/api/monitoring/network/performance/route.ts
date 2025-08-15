import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's branch if not admin
    let branchId: string | undefined;
    if (session.user.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });
      branchId = user?.branchId || undefined;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '24h'; // 1h, 6h, 24h, 7d, 30d
    const entityType = searchParams.get('entityType'); // 'BRANCH', 'ATM', or null for both
    const entityId = searchParams.get('entityId'); // Specific entity ID

    // Calculate time range based on period
    const now = new Date();
    const timeRanges = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '6h': new Date(now.getTime() - 6 * 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };

    const fromDate = timeRanges[period] || timeRanges['24h'];

    // Build where clause for monitoring logs
    const where: any = {
      checkedAt: { gte: fromDate }
    };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    // Add branch filtering for non-admin users
    if (branchId) {
      if (entityType === 'BRANCH') {
        where.entityId = branchId;
      } else if (entityType === 'ATM') {
        // Need to filter ATMs by branch - get ATM IDs first
        const atmIds = await prisma.aTM.findMany({
          where: { branchId },
          select: { id: true }
        });
        where.entityId = { in: atmIds.map(atm => atm.id) };
      } else {
        // Both types - need complex filtering
        const atmIds = await prisma.aTM.findMany({
          where: { branchId },
          select: { id: true }
        });
        
        where.OR = [
          { entityType: 'BRANCH', entityId: branchId },
          { entityType: 'ATM', entityId: { in: atmIds.map(atm => atm.id) } }
        ];
      }
    }

    // Fetch monitoring logs
    const logs = await prisma.networkMonitoringLog.findMany({
      where,
      orderBy: { checkedAt: 'asc' },
      select: {
        entityType: true,
        entityId: true,
        status: true,
        responseTimeMs: true,
        packetLoss: true,
        checkedAt: true
      }
    });

    // Get entity details for logs
    const branchIds = [...new Set(logs.filter(l => l.entityType === 'BRANCH').map(l => l.entityId))];
    const atmIds = [...new Set(logs.filter(l => l.entityType === 'ATM').map(l => l.entityId))];

    const [branches, atms] = await Promise.all([
      branchIds.length > 0 ? prisma.branch.findMany({
        where: { id: { in: branchIds } },
        select: { id: true, name: true, code: true }
      }) : [],
      atmIds.length > 0 ? prisma.aTM.findMany({
        where: { id: { in: atmIds } },
        select: { id: true, name: true, code: true }
      }) : []
    ]);

    // Create entity lookup maps
    const branchMap = new Map(branches.map(b => [b.id, b]));
    const atmMap = new Map(atms.map(a => [a.id, a]));

    // Process logs for performance metrics
    const entityMetrics = new Map();
    const timeSeriesData = [];

    for (const log of logs) {
      const entityKey = `${log.entityType}-${log.entityId}`;
      const entity = log.entityType === 'BRANCH' ? branchMap.get(log.entityId) : atmMap.get(log.entityId);
      
      if (!entity) continue;

      // Initialize entity metrics if not exists
      if (!entityMetrics.has(entityKey)) {
        entityMetrics.set(entityKey, {
          entityType: log.entityType,
          entityId: log.entityId,
          entityName: entity.name,
          entityCode: entity.code,
          totalChecks: 0,
          onlineChecks: 0,
          responseTimes: [],
          packetLosses: [],
          statuses: { ONLINE: 0, SLOW: 0, OFFLINE: 0, ERROR: 0, TIMEOUT: 0 }
        });
      }

      const metrics = entityMetrics.get(entityKey);
      metrics.totalChecks++;
      metrics.statuses[log.status] = (metrics.statuses[log.status] || 0) + 1;
      
      if (log.status === 'ONLINE' || log.status === 'SLOW') {
        metrics.onlineChecks++;
      }
      
      if (log.responseTimeMs !== null) {
        metrics.responseTimes.push(log.responseTimeMs);
      }
      
      if (log.packetLoss !== null) {
        metrics.packetLosses.push(log.packetLoss);
      }

      // Add to time series data
      timeSeriesData.push({
        timestamp: log.checkedAt,
        entityType: log.entityType,
        entityId: log.entityId,
        entityName: entity.name,
        status: log.status,
        responseTime: log.responseTimeMs,
        packetLoss: log.packetLoss
      });
    }

    // Calculate summary statistics for each entity
    const entitySummaries = Array.from(entityMetrics.values()).map(metrics => {
      const avgResponseTime = metrics.responseTimes.length > 0 
        ? Math.round(metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length)
        : null;
      
      const maxResponseTime = metrics.responseTimes.length > 0 
        ? Math.max(...metrics.responseTimes)
        : null;
      
      const avgPacketLoss = metrics.packetLosses.length > 0
        ? Math.round((metrics.packetLosses.reduce((a, b) => a + b, 0) / metrics.packetLosses.length) * 100) / 100
        : null;
      
      const uptime = metrics.totalChecks > 0
        ? Math.round((metrics.onlineChecks / metrics.totalChecks) * 10000) / 100
        : null;

      return {
        entityType: metrics.entityType,
        entityId: metrics.entityId,
        entityName: metrics.entityName,
        entityCode: metrics.entityCode,
        totalChecks: metrics.totalChecks,
        uptime: uptime,
        avgResponseTime,
        maxResponseTime,
        avgPacketLoss,
        statusDistribution: metrics.statuses
      };
    });

    // Calculate overall performance summary
    const allResponseTimes = Array.from(entityMetrics.values())
      .flatMap(m => m.responseTimes);
    const allPacketLosses = Array.from(entityMetrics.values())
      .flatMap(m => m.packetLosses);
    const allUptimes = entitySummaries
      .map(s => s.uptime)
      .filter(u => u !== null);

    const overallSummary = {
      period,
      totalEntities: entitySummaries.length,
      totalChecks: logs.length,
      avgResponseTime: allResponseTimes.length > 0 
        ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length)
        : null,
      avgPacketLoss: allPacketLosses.length > 0
        ? Math.round((allPacketLosses.reduce((a, b) => a + b, 0) / allPacketLosses.length) * 100) / 100
        : null,
      avgUptime: allUptimes.length > 0
        ? Math.round((allUptimes.reduce((a, b) => a + b, 0) / allUptimes.length) * 100) / 100
        : null,
      healthyEntities: entitySummaries.filter(s => s.uptime >= 95).length,
      degradedEntities: entitySummaries.filter(s => s.uptime >= 90 && s.uptime < 95).length,
      unhealthyEntities: entitySummaries.filter(s => s.uptime < 90).length
    };

    // Group time series data by time intervals for charts
    const intervalMinutes = period === '1h' ? 5 : 
                           period === '6h' ? 15 :
                           period === '24h' ? 60 :
                           period === '7d' ? 360 : 1440; // 1440 = 24 hours

    const chartData = [];
    const intervalMs = intervalMinutes * 60 * 1000;
    const startTime = fromDate.getTime();
    const endTime = now.getTime();

    for (let time = startTime; time < endTime; time += intervalMs) {
      const intervalStart = new Date(time);
      const intervalEnd = new Date(time + intervalMs);
      
      const intervalLogs = timeSeriesData.filter(
        log => log.timestamp >= intervalStart && log.timestamp < intervalEnd
      );
      
      if (intervalLogs.length > 0) {
        const avgResponseTime = intervalLogs
          .filter(log => log.responseTime !== null)
          .reduce((sum, log, _, arr) => sum + log.responseTime / arr.length, 0);
        
        const avgPacketLoss = intervalLogs
          .filter(log => log.packetLoss !== null)
          .reduce((sum, log, _, arr) => sum + log.packetLoss / arr.length, 0);
        
        const statusCounts = intervalLogs.reduce((acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {});

        chartData.push({
          timestamp: intervalStart,
          avgResponseTime: Math.round(avgResponseTime) || null,
          avgPacketLoss: Math.round(avgPacketLoss * 100) / 100 || null,
          totalChecks: intervalLogs.length,
          statusCounts
        });
      }
    }

    return NextResponse.json({
      summary: overallSummary,
      entities: entitySummaries,
      chartData,
      period,
      fromDate,
      toDate: now,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching network performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network performance data' },
      { status: 500 }
    );
  }
}