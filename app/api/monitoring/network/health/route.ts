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

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build base where clauses for filtering
    const branchWhere: any = { isActive: true };
    const atmWhere: any = { isActive: true };
    const networkIncidentWhere: any = {};
    
    if (branchId) {
      branchWhere.id = branchId;
      atmWhere.branchId = branchId;
      networkIncidentWhere.OR = [
        { branchId: branchId },
        { atm: { branchId: branchId } }
      ];
    }

    // Fetch overall network health metrics
    const [
      // Entity counts
      totalBranches,
      monitoredBranches,
      totalATMs,
      monitoredATMs,
      
      // Recent monitoring activity
      recentLogs,
      
      // Incident statistics
      openIncidents,
      incidentsLast24h,
      incidentsLast7d,
      
      // Performance metrics
      recentPerformanceData
    ] = await Promise.all([
      // Entity counts
      prisma.branch.count({ where: branchWhere }),
      prisma.branch.count({ 
        where: { 
          ...branchWhere, 
          monitoringEnabled: true, 
          ipAddress: { not: null } 
        } 
      }),
      prisma.aTM.count({ where: atmWhere }),
      prisma.aTM.count({ 
        where: { 
          ...atmWhere, 
          ipAddress: { not: null } 
        } 
      }),
      
      // Recent monitoring activity (last hour)
      prisma.networkMonitoringLog.findMany({
        where: {
          checkedAt: { gte: oneHourAgo },
          ...(branchId ? {
            OR: [
              { entityType: 'BRANCH', entityId: branchId },
              { 
                entityType: 'ATM', 
                entityId: { 
                  in: (await prisma.aTM.findMany({
                    where: { branchId },
                    select: { id: true }
                  })).map(atm => atm.id)
                } 
              }
            ]
          } : {})
        },
        select: {
          entityType: true,
          entityId: true,
          status: true,
          responseTimeMs: true,
          packetLoss: true,
          checkedAt: true
        },
        orderBy: { checkedAt: 'desc' }
      }),
      
      // Incident statistics
      prisma.networkIncident.count({
        where: { ...networkIncidentWhere, status: 'OPEN' }
      }),
      prisma.networkIncident.count({
        where: { ...networkIncidentWhere, createdAt: { gte: twentyFourHoursAgo } }
      }),
      prisma.networkIncident.count({
        where: { ...networkIncidentWhere, createdAt: { gte: sevenDaysAgo } }
      }),
      
      // Recent performance data (last 24 hours)
      prisma.networkMonitoringLog.findMany({
        where: {
          checkedAt: { gte: twentyFourHoursAgo },
          status: { in: ['ONLINE', 'SLOW'] },
          responseTimeMs: { not: null },
          ...(branchId ? {
            OR: [
              { entityType: 'BRANCH', entityId: branchId },
              { 
                entityType: 'ATM', 
                entityId: { 
                  in: (await prisma.aTM.findMany({
                    where: { branchId },
                    select: { id: true }
                  })).map(atm => atm.id)
                } 
              }
            ]
          } : {})
        },
        select: {
          responseTimeMs: true,
          packetLoss: true
        }
      })
    ]);

    // Process recent logs for current status
    const entityStatus = new Map();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Group logs by entity and get latest status
    for (const log of recentLogs) {
      const entityKey = `${log.entityType}-${log.entityId}`;
      const existing = entityStatus.get(entityKey);
      
      if (!existing || log.checkedAt > existing.checkedAt) {
        entityStatus.set(entityKey, {
          ...log,
          isStale: log.checkedAt < fiveMinutesAgo
        });
      }
    }

    // Calculate status distribution
    const statusCounts = {
      ONLINE: 0,
      SLOW: 0,
      OFFLINE: 0,
      ERROR: 0,
      STALE: 0,
      UNKNOWN: 0
    };

    for (const status of entityStatus.values()) {
      if (status.isStale) {
        statusCounts.STALE++;
      } else {
        statusCounts[status.status] = (statusCounts[status.status] || 0) + 1;
      }
    }

    // Add entities that have never been monitored as UNKNOWN
    const monitoredEntityCount = entityStatus.size;
    const totalEntities = monitoredBranches + monitoredATMs;
    statusCounts.UNKNOWN = Math.max(0, totalEntities - monitoredEntityCount);

    // Calculate performance metrics
    const responseTimes = recentPerformanceData
      .map(log => log.responseTimeMs)
      .filter(rt => rt !== null);
    
    const packetLosses = recentPerformanceData
      .map(log => log.packetLoss)
      .filter(pl => pl !== null);

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;
    
    const maxResponseTime = responseTimes.length > 0
      ? Math.max(...responseTimes)
      : null;
    
    const avgPacketLoss = packetLosses.length > 0
      ? Math.round((packetLosses.reduce((a, b) => a + b, 0) / packetLosses.length) * 100) / 100
      : null;

    // Calculate overall health score (0-100)
    const onlinePercentage = totalEntities > 0 
      ? (statusCounts.ONLINE / totalEntities) * 100 
      : 0;
    
    const incidentImpact = Math.max(0, 100 - (openIncidents * 10)); // Each open incident reduces score by 10
    const performanceScore = avgResponseTime 
      ? Math.max(0, 100 - Math.max(0, avgResponseTime - 100) / 10) // Penalize response times > 100ms
      : 100;
    
    const healthScore = Math.round(
      (onlinePercentage * 0.6 + incidentImpact * 0.2 + performanceScore * 0.2)
    );

    // Determine overall health status
    let overallStatus = 'HEALTHY';
    if (healthScore < 50 || statusCounts.OFFLINE > 0) {
      overallStatus = 'CRITICAL';
    } else if (healthScore < 80 || openIncidents > 0 || statusCounts.ERROR > 0) {
      overallStatus = 'WARNING';
    } else if (statusCounts.SLOW > 0 || statusCounts.STALE > 2) {
      overallStatus = 'DEGRADED';
    }

    // Get monitoring service status (check if logs are recent)
    const latestLog = recentLogs.length > 0 ? recentLogs[0] : null;
    const monitoringServiceActive = latestLog 
      ? latestLog.checkedAt > new Date(now.getTime() - 10 * 60 * 1000) // Active if logs within 10 minutes
      : false;

    // Get top issues (entities with problems)
    const problemEntities = [];
    for (const [entityKey, status] of entityStatus.entries()) {
      if (['OFFLINE', 'ERROR', 'SLOW'].includes(status.status) || status.isStale) {
        const [entityType, entityId] = entityKey.split('-');
        
        // Get entity details
        let entityDetails = null;
        if (entityType === 'BRANCH') {
          entityDetails = await prisma.branch.findUnique({
            where: { id: entityId },
            select: { name: true, code: true, city: true }
          });
        } else if (entityType === 'ATM') {
          entityDetails = await prisma.aTM.findUnique({
            where: { id: entityId },
            select: { name: true, code: true, location: true }
          });
        }
        
        if (entityDetails) {
          problemEntities.push({
            entityType,
            entityId,
            entityName: entityDetails.name,
            entityCode: entityDetails.code,
            location: entityType === 'BRANCH' ? entityDetails.city : entityDetails.location,
            status: status.isStale ? 'STALE' : status.status,
            lastChecked: status.checkedAt,
            responseTime: status.responseTimeMs,
            packetLoss: status.packetLoss
          });
        }
      }
    }

    // Sort problem entities by severity
    problemEntities.sort((a, b) => {
      const severityOrder = { OFFLINE: 0, ERROR: 1, STALE: 2, SLOW: 3 };
      return severityOrder[a.status] - severityOrder[b.status];
    });

    const healthData = {
      overallStatus,
      healthScore,
      
      // Entity summary
      entities: {
        total: totalBranches + totalATMs,
        monitored: monitoredBranches + monitoredATMs,
        branches: {
          total: totalBranches,
          monitored: monitoredBranches
        },
        atms: {
          total: totalATMs,
          monitored: monitoredATMs
        }
      },
      
      // Current status distribution
      statusDistribution: statusCounts,
      
      // Performance metrics (last 24 hours)
      performance: {
        avgResponseTime,
        maxResponseTime,
        avgPacketLoss,
        sampleSize: responseTimes.length
      },
      
      // Incident statistics
      incidents: {
        open: openIncidents,
        last24h: incidentsLast24h,
        last7d: incidentsLast7d
      },
      
      // Problem entities (top 10)
      problemEntities: problemEntities.slice(0, 10),
      
      // Monitoring service status
      monitoringService: {
        active: monitoringServiceActive,
        lastActivity: latestLog?.checkedAt || null,
        totalChecksLastHour: recentLogs.length
      },
      
      // Metadata
      timestamp: now.toISOString(),
      scope: branchId ? 'BRANCH' : 'GLOBAL'
    };

    return NextResponse.json(healthData);

  } catch (error) {
    console.error('Error fetching network health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network health data' },
      { status: 500 }
    );
  }
}