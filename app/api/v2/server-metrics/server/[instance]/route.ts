import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/v2/server-metrics/server/[instance] - Get server history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instance: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { instance: encodedInstance } = await params;
    const instance = decodeURIComponent(encodedInstance);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get recent snapshots for this server instance
    const snapshots = await prisma.serverMetricSnapshotV2.findMany({
      where: { instance },
      take: Math.min(limit, 100),
      orderBy: { collection: { createdAt: 'desc' } },
      include: {
        collection: {
          select: {
            fetchedAt: true,
            fetchedAtLocal: true,
            createdAt: true,
          },
        },
      },
    });

    if (snapshots.length === 0) {
      return NextResponse.json(
        { error: 'Server not found', message: `No data found for instance: ${instance}` },
        { status: 404 }
      );
    }

    // Get server name from most recent snapshot
    const latestSnapshot = snapshots[0];

    const response = {
      data: {
        instance,
        serverName: latestSnapshot.serverName,
        currentStatus: latestSnapshot.status,
        current: {
          cpuPercent: latestSnapshot.cpuPercent,
          memoryPercent: latestSnapshot.memoryPercent,
          storagePercent: latestSnapshot.storagePercent,
          status: latestSnapshot.status,
        },
        history: snapshots.map((s) => ({
          timestamp: s.collection.fetchedAt,
          timestampLocal: s.collection.fetchedAtLocal,
          cpuPercent: s.cpuPercent,
          memoryPercent: s.memoryPercent,
          storagePercent: s.storagePercent,
          status: s.status,
        })).reverse(), // Chronological order for charts
        totalDataPoints: snapshots.length,
      },
    };

    const res = NextResponse.json(response);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('[Server Metrics V2] Server history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server history' },
      { status: 500 }
    );
  }
}
