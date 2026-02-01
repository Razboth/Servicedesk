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
    const status = searchParams.get('status'); // healthy, warning, critical
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
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

    // Get latest collection ID
    const latestCollection = await prisma.metricCollection.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, fetchedAt: true, reportTimestamp: true },
    });

    // Get all servers with their latest metrics
    const servers = await prisma.monitoredServer.findMany({
      where,
      include: {
        metricSnapshots: latestCollection ? {
          where: { collectionId: latestCollection.id },
          take: 1,
          orderBy: { collectedAt: 'desc' },
        } : {
          take: 1,
          orderBy: { collectedAt: 'desc' },
        },
      },
      orderBy: { ipAddress: 'asc' },
    });

    // Transform and filter by status if needed
    let result = servers.map((server) => {
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

    // Filter by status if specified
    if (status) {
      result = result.filter((s) => s.status === status);
    }

    // Apply pagination
    const total = result.length;
    result = result.slice(offset, offset + limit);

    // Calculate summary stats
    const stats = {
      total: servers.length,
      healthy: servers.filter((s) => {
        const m = s.metricSnapshots[0];
        return m ? getServerStatus(m.cpuPercent, m.memoryPercent, m.storage) === 'healthy' : true;
      }).length,
      warning: servers.filter((s) => {
        const m = s.metricSnapshots[0];
        return m ? getServerStatus(m.cpuPercent, m.memoryPercent, m.storage) === 'warning' : false;
      }).length,
      critical: servers.filter((s) => {
        const m = s.metricSnapshots[0];
        return m ? getServerStatus(m.cpuPercent, m.memoryPercent, m.storage) === 'critical' : false;
      }).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        servers: result,
        stats,
        total,
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
