import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const endpointId = searchParams.get('endpointId');
    const endpointType = searchParams.get('type') || 'BRANCH';
    const hours = parseInt(searchParams.get('hours') || '24');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!endpointId) {
      return NextResponse.json(
        { error: 'Endpoint ID is required' },
        { status: 400 }
      );
    }

    const since = new Date();
    since.setHours(since.getHours() - hours);

    // Get ping results history
    const pingHistory = await prisma.networkPingResult.findMany({
      where: {
        entityType: endpointType,
        entityId: endpointId,
        checkedAt: { gte: since }
      },
      orderBy: { checkedAt: 'desc' },
      take: limit
    });

    // Get status change history
    const statusHistory = await prisma.networkStatusHistory.findMany({
      where: {
        entityType: endpointType,
        entityId: endpointId,
        startedAt: { gte: since }
      },
      orderBy: { startedAt: 'desc' },
      take: Math.floor(limit / 2)
    });

    // Get current monitoring log
    const currentStatus = await prisma.networkMonitoringLog.findUnique({
      where: {
        entityType_entityId: {
          entityType: endpointType,
          entityId: endpointId
        }
      }
    });

    // Calculate statistics
    const stats = {
      totalPings: pingHistory.length,
      successfulPings: pingHistory.filter(p => p.status === 'ONLINE').length,
      failedPings: pingHistory.filter(p => ['OFFLINE', 'TIMEOUT', 'ERROR'].includes(p.status)).length,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0,
      averagePacketLoss: 0,
      statusChanges: statusHistory.length,
      uptimePercentage: 100
    };

    const validResponseTimes = pingHistory
      .filter(p => p.responseTimeMs && p.responseTimeMs > 0)
      .map(p => p.responseTimeMs!);

    if (validResponseTimes.length > 0) {
      stats.averageResponseTime = Math.round(
        validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
      );
      stats.maxResponseTime = Math.max(...validResponseTimes);
      stats.minResponseTime = Math.min(...validResponseTimes);
    }

    const validPacketLoss = pingHistory
      .filter(p => p.packetLoss !== null && p.packetLoss !== undefined)
      .map(p => p.packetLoss!);

    if (validPacketLoss.length > 0) {
      stats.averagePacketLoss = parseFloat(
        (validPacketLoss.reduce((sum, loss) => sum + loss, 0) / validPacketLoss.length).toFixed(2)
      );
    }

    if (stats.totalPings > 0) {
      stats.uptimePercentage = Math.round((stats.successfulPings / stats.totalPings) * 100);
    }

    // Group ping results by hour for trend analysis
    const hourlyData: Record<string, any> = {};
    pingHistory.forEach(ping => {
      const hour = new Date(ping.checkedAt).toISOString().slice(0, 13) + ':00:00.000Z';
      if (!hourlyData[hour]) {
        hourlyData[hour] = {
          hour,
          total: 0,
          online: 0,
          offline: 0,
          slow: 0,
          error: 0,
          avgResponseTime: 0,
          responseTimeSum: 0,
          responseTimeCount: 0
        };
      }
      
      const data = hourlyData[hour];
      data.total++;
      
      switch (ping.status) {
        case 'ONLINE':
          data.online++;
          break;
        case 'OFFLINE':
          data.offline++;
          break;
        case 'SLOW':
          data.slow++;
          break;
        case 'TIMEOUT':
        case 'ERROR':
          data.error++;
          break;
      }
      
      if (ping.responseTimeMs && ping.responseTimeMs > 0) {
        data.responseTimeSum += ping.responseTimeMs;
        data.responseTimeCount++;
      }
    });

    // Calculate average response times for each hour
    Object.values(hourlyData).forEach((data: any) => {
      if (data.responseTimeCount > 0) {
        data.avgResponseTime = Math.round(data.responseTimeSum / data.responseTimeCount);
      }
      delete data.responseTimeSum;
      delete data.responseTimeCount;
    });

    const trends = Object.values(hourlyData).sort((a: any, b: any) => 
      new Date(a.hour).getTime() - new Date(b.hour).getTime()
    );

    return NextResponse.json({
      success: true,
      endpointId,
      endpointType,
      hours,
      currentStatus,
      stats,
      pingHistory: pingHistory.slice(0, 50), // Limit for display
      statusHistory,
      trends,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Network history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network history' },
      { status: 500 }
    );
  }
}