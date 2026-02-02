import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/knowledge/[id]/access-logs/stats - Get aggregated access statistics
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
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, 1y

    // Calculate start date based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Verify article exists
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Article not found' },
        { status: 404 }
      );
    }

    // Get all logs for the period
    const logs = await prisma.knowledgeAccessLog.findMany({
      where: {
        articleId: id,
        accessedAt: { gte: startDate },
      },
      select: {
        accessedAt: true,
        accessType: true,
        duration: true,
        userId: true,
        referrer: true,
      },
    });

    // Calculate statistics
    const totalViews = logs.filter((l) => l.accessType === 'VIEW').length;
    const totalDownloads = logs.filter((l) => l.accessType === 'DOWNLOAD').length;
    const totalPrints = logs.filter((l) => l.accessType === 'PRINT').length;
    const totalShares = logs.filter((l) => l.accessType === 'SHARE').length;

    // Unique visitors
    const uniqueUserIds = new Set(logs.map((l) => l.userId));
    const uniqueVisitors = uniqueUserIds.size;

    // Average duration (only for logs with duration)
    const logsWithDuration = logs.filter((l) => l.duration !== null);
    const avgDuration =
      logsWithDuration.length > 0
        ? logsWithDuration.reduce((sum, l) => sum + (l.duration || 0), 0) / logsWithDuration.length
        : null;

    // Views by date
    const viewsByDate: Record<string, number> = {};
    logs.forEach((log) => {
      const date = log.accessedAt.toISOString().split('T')[0];
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    // Convert to sorted array
    const viewsByDateArray = Object.entries(viewsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Views by hour of day
    const viewsByHour: number[] = new Array(24).fill(0);
    logs.forEach((log) => {
      const hour = log.accessedAt.getHours();
      viewsByHour[hour]++;
    });

    // Top referrers
    const referrerCounts: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.referrer) {
        referrerCounts[log.referrer] = (referrerCounts[log.referrer] || 0) + 1;
      }
    });

    const topReferrers = Object.entries(referrerCounts)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Access type breakdown
    const accessTypeBreakdown = [
      { type: 'VIEW', count: totalViews },
      { type: 'DOWNLOAD', count: totalDownloads },
      { type: 'PRINT', count: totalPrints },
      { type: 'SHARE', count: totalShares },
    ];

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        summary: {
          totalAccess: logs.length,
          totalViews,
          totalDownloads,
          totalPrints,
          totalShares,
          uniqueVisitors,
          avgDuration: avgDuration ? Math.round(avgDuration) : null,
        },
        accessTypeBreakdown,
        viewsByDate: viewsByDateArray,
        viewsByHour,
        topReferrers,
      },
    });
  } catch (error) {
    console.error('Error fetching access stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch access stats' },
      { status: 500 }
    );
  }
}
