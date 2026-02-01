import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface StorageItem {
  partition: string;
  usagePercent: number;
}

// GET /api/server-metrics/analytics - Get aggregated analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get latest collection
    const latestCollection = await prisma.metricCollection.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        snapshots: {
          include: {
            server: {
              select: {
                id: true,
                ipAddress: true,
                serverName: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!latestCollection) {
      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalServers: 0,
            avgCpu: null,
            avgMemory: null,
            healthyCount: 0,
            warningCount: 0,
            criticalCount: 0,
          },
          topCpuServers: [],
          topMemoryServers: [],
          storageAlerts: [],
          historicalTrends: [],
          latestCollection: null,
        },
      });
    }

    // Calculate summary statistics from latest collection
    const latestSnapshots = latestCollection.snapshots;
    let totalCpu = 0;
    let totalMemory = 0;
    let cpuCount = 0;
    let memoryCount = 0;
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    const storageAlerts: {
      serverId: string;
      ipAddress: string;
      serverName: string | null;
      partition: string;
      usagePercent: number;
    }[] = [];

    const serverMetrics: {
      serverId: string;
      ipAddress: string;
      serverName: string | null;
      category: string | null;
      cpuPercent: number | null;
      memoryPercent: number | null;
      maxStorageUsage: number;
    }[] = [];

    for (const snapshot of latestSnapshots) {
      if (snapshot.cpuPercent !== null) {
        totalCpu += snapshot.cpuPercent;
        cpuCount++;
      }
      if (snapshot.memoryPercent !== null) {
        totalMemory += snapshot.memoryPercent;
        memoryCount++;
      }

      // Calculate max storage usage and check for alerts
      let maxStorageUsage = 0;
      if (snapshot.storage && Array.isArray(snapshot.storage)) {
        for (const item of snapshot.storage as StorageItem[]) {
          if (item.usagePercent > maxStorageUsage) {
            maxStorageUsage = item.usagePercent;
          }
          // Alert if storage > 80%
          if (item.usagePercent >= 80) {
            storageAlerts.push({
              serverId: snapshot.server.id,
              ipAddress: snapshot.server.ipAddress,
              serverName: snapshot.server.serverName,
              partition: item.partition,
              usagePercent: item.usagePercent,
            });
          }
        }
      }

      serverMetrics.push({
        serverId: snapshot.server.id,
        ipAddress: snapshot.server.ipAddress,
        serverName: snapshot.server.serverName,
        category: snapshot.server.category,
        cpuPercent: snapshot.cpuPercent,
        memoryPercent: snapshot.memoryPercent,
        maxStorageUsage,
      });

      // Determine status
      const isCritical = (snapshot.cpuPercent && snapshot.cpuPercent >= 90) ||
        (snapshot.memoryPercent && snapshot.memoryPercent >= 90) ||
        maxStorageUsage >= 90;
      const isWarning = (snapshot.cpuPercent && snapshot.cpuPercent >= 75) ||
        (snapshot.memoryPercent && snapshot.memoryPercent >= 75) ||
        maxStorageUsage >= 75;

      if (isCritical) {
        criticalCount++;
      } else if (isWarning) {
        warningCount++;
      } else {
        healthyCount++;
      }
    }

    // Get top 5 servers by CPU usage
    const topCpuServers = [...serverMetrics]
      .filter((s) => s.cpuPercent !== null)
      .sort((a, b) => (b.cpuPercent || 0) - (a.cpuPercent || 0))
      .slice(0, 5);

    // Get top 5 servers by memory usage
    const topMemoryServers = [...serverMetrics]
      .filter((s) => s.memoryPercent !== null)
      .sort((a, b) => (b.memoryPercent || 0) - (a.memoryPercent || 0))
      .slice(0, 5);

    // Sort storage alerts by usage (highest first)
    storageAlerts.sort((a, b) => b.usagePercent - a.usagePercent);

    // Get historical trends (average CPU and memory per day)
    const collections = await prisma.metricCollection.findMany({
      where: { createdAt: { gte: startDate } },
      orderBy: { createdAt: 'asc' },
      include: {
        snapshots: {
          select: {
            cpuPercent: true,
            memoryPercent: true,
          },
        },
      },
    });

    const historicalTrends = collections.map((collection) => {
      let collectionTotalCpu = 0;
      let collectionTotalMemory = 0;
      let collectionCpuCount = 0;
      let collectionMemoryCount = 0;

      for (const snapshot of collection.snapshots) {
        if (snapshot.cpuPercent !== null) {
          collectionTotalCpu += snapshot.cpuPercent;
          collectionCpuCount++;
        }
        if (snapshot.memoryPercent !== null) {
          collectionTotalMemory += snapshot.memoryPercent;
          collectionMemoryCount++;
        }
      }

      return {
        date: collection.reportTimestamp,
        avgCpu: collectionCpuCount > 0 ? collectionTotalCpu / collectionCpuCount : null,
        avgMemory: collectionMemoryCount > 0 ? collectionTotalMemory / collectionMemoryCount : null,
        serverCount: collection.snapshots.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalServers: latestSnapshots.length,
          avgCpu: cpuCount > 0 ? totalCpu / cpuCount : null,
          avgMemory: memoryCount > 0 ? totalMemory / memoryCount : null,
          healthyCount,
          warningCount,
          criticalCount,
        },
        topCpuServers,
        topMemoryServers,
        storageAlerts: storageAlerts.slice(0, 20), // Limit to 20 alerts
        historicalTrends,
        latestCollection: {
          id: latestCollection.id,
          fetchedAt: latestCollection.fetchedAt,
          reportTimestamp: latestCollection.reportTimestamp,
          totalIps: latestCollection.totalIps,
        },
        periodDays: days,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
