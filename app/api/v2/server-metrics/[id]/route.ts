import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/v2/server-metrics/[id] - Get specific collection by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const collection = await prisma.serverMetricCollectionV2.findUnique({
      where: { id },
      include: {
        snapshots: {
          orderBy: [
            { status: 'asc' },
            { storagePercent: 'desc' },
          ],
        },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

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
    console.error('[Server Metrics V2] GET by ID error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server metrics collection' },
      { status: 500 }
    );
  }
}
