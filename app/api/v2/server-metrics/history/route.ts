import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/v2/server-metrics/history - Get collection history for trends
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '24', 10);

    // Get recent collections (summary only, no snapshots)
    const collections = await prisma.serverMetricCollectionV2.findMany({
      take: Math.min(limit, 100), // Max 100 records
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fetchedAt: true,
        fetchedAtLocal: true,
        totalServers: true,
        warningCount: true,
        cautionCount: true,
        okCount: true,
        createdAt: true,
      },
    });

    const response = {
      data: {
        collections: collections.map((c) => ({
          id: c.id,
          fetchedAt: c.fetchedAt,
          fetchedAtLocal: c.fetchedAtLocal,
          totalServers: c.totalServers,
          summary: {
            warning: c.warningCount,
            caution: c.cautionCount,
            ok: c.okCount,
          },
          createdAt: c.createdAt,
        })),
        total: collections.length,
      },
    };

    const res = NextResponse.json(response);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  } catch (error) {
    console.error('[Server Metrics V2] History error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server metrics history' },
      { status: 500 }
    );
  }
}
