import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ServerMetricStatus } from '@prisma/client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/v2/server-metrics - Get latest server metrics collection
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as ServerMetricStatus | null;

    // Get the latest collection with all snapshots
    const collection = await prisma.serverMetricCollectionV2.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        snapshots: {
          where: statusFilter ? { status: statusFilter } : undefined,
          orderBy: [
            { status: 'asc' },  // WARNING first, then CAUTION, then OK
            { storagePercent: 'desc' },
          ],
        },
      },
    });

    if (!collection) {
      return NextResponse.json({
        data: null,
        message: 'No server metrics data available',
      });
    }

    // Format response
    const response = {
      data: {
        id: collection.id,
        metadata: {
          dashboard: collection.dashboard,
          source: collection.source,
          fetchedAt: collection.fetchedAt,
          fetchedAtLocal: collection.fetchedAtLocal,
          timeRange: collection.timeRange,
        },
        summary: {
          totalServers: collection.totalServers,
          warningCount: collection.warningCount,
          cautionCount: collection.cautionCount,
          okCount: collection.okCount,
        },
        servers: collection.snapshots.map((s) => ({
          id: s.id,
          serverName: s.serverName,
          instance: s.instance,
          cpuPercent: s.cpuPercent,
          memoryPercent: s.memoryPercent,
          storagePercent: s.storagePercent,
          status: s.status,
        })),
        createdAt: collection.createdAt,
      },
    };

    const res = NextResponse.json(response);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('[Server Metrics V2] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server metrics' },
      { status: 500 }
    );
  }
}
