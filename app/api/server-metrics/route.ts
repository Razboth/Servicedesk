import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Helper to determine status based on metrics
function getServerStatus(cpuPercent: number | null, memoryPercent: number | null, storage: any): 'healthy' | 'warning' | 'critical' {
  // Check storage for high usage
  let maxStorageUsage = 0;
  if (storage && Array.isArray(storage)) {
    for (const item of storage) {
      if (item.usagePercent && item.usagePercent > maxStorageUsage) {
        maxStorageUsage = item.usagePercent;
      }
    }
  }

  // Critical if any metric is >= 90%
  if ((cpuPercent && cpuPercent >= 90) || (memoryPercent && memoryPercent >= 90) || maxStorageUsage >= 90) {
    return 'critical';
  }

  // Warning if any metric is >= 75%
  if ((cpuPercent && cpuPercent >= 75) || (memoryPercent && memoryPercent >= 75) || maxStorageUsage >= 75) {
    return 'warning';
  }

  return 'healthy';
}

// GET /api/server-metrics - List all monitored servers with latest metrics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { serverName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count first (without metrics for speed)
    const totalCount = await prisma.monitoredServer.count({ where });

    // Get latest collection for timestamp info
    const latestCollection = await prisma.metricCollection.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, fetchedAt: true, reportTimestamp: true },
    });

    // Get paginated servers with their most recent metric (regardless of collection)
    const servers = await prisma.monitoredServer.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        metricSnapshots: {
          take: 1,
          orderBy: { collectedAt: 'desc' },
        },
      },
      orderBy: { ipAddress: 'asc' },
    });

    // Transform results
    const result = servers.map((server) => {
      const latestMetric = server.metricSnapshots[0] || null;
      const serverStatus = latestMetric
        ? getServerStatus(latestMetric.cpuPercent, latestMetric.memoryPercent, latestMetric.storage)
        : 'healthy';

      // Calculate max storage usage
      let maxStorageUsage = 0;
      let maxStoragePartition = '';
      if (latestMetric?.storage && Array.isArray(latestMetric.storage)) {
        for (const item of latestMetric.storage as any[]) {
          if (item.usagePercent && item.usagePercent > maxStorageUsage) {
            maxStorageUsage = item.usagePercent;
            maxStoragePartition = item.partition;
          }
        }
      }

      return {
        id: server.id,
        ipAddress: server.ipAddress,
        serverName: server.serverName,
        description: server.description,
        category: server.category,
        isActive: server.isActive,
        status: serverStatus,
        latestMetrics: latestMetric ? {
          cpuPercent: latestMetric.cpuPercent,
          memoryPercent: latestMetric.memoryPercent,
          maxStorageUsage,
          maxStoragePartition,
          storage: latestMetric.storage,
          timestamp: latestMetric.timestamp,
          collectedAt: latestMetric.collectedAt,
        } : null,
      };
    });

    // Calculate summary stats from current page only (for performance)
    const stats = {
      total: totalCount,
      healthy: result.filter((s) => s.status === 'healthy').length,
      warning: result.filter((s) => s.status === 'warning').length,
      critical: result.filter((s) => s.status === 'critical').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        servers: result,
        stats,
        total: totalCount,
        limit,
        offset,
        latestCollection: latestCollection ? {
          fetchedAt: latestCollection.fetchedAt,
          reportTimestamp: latestCollection.reportTimestamp,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching server metrics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch server metrics' },
      { status: 500 }
    );
  }
}

// Get all unique categories
export async function OPTIONS(request: NextRequest) {
  try {
    const categories = await prisma.monitoredServer.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });

    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map((c) => c.category).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
