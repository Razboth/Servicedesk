import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/knowledge/analytics - Get KMS analytics overview
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Calculate start date based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
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
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get overall article statistics
    const [
      totalArticles,
      publishedArticles,
      draftArticles,
      archivedArticles,
      staleArticles,
    ] = await Promise.all([
      prisma.knowledgeArticle.count({ where: { isActive: true } }),
      prisma.knowledgeArticle.count({ where: { isActive: true, status: 'PUBLISHED' } }),
      prisma.knowledgeArticle.count({ where: { isActive: true, status: 'DRAFT' } }),
      prisma.knowledgeArticle.count({ where: { isActive: true, status: 'ARCHIVED' } }),
      prisma.knowledgeArticle.count({ where: { isActive: true, isStale: true } }),
    ]);

    // Get access logs for the period
    const accessLogs = await prisma.knowledgeAccessLog.findMany({
      where: {
        accessedAt: { gte: startDate },
      },
      select: {
        accessedAt: true,
        accessType: true,
        userId: true,
        articleId: true,
        searchQuery: true,
      },
    });

    // Calculate access statistics
    const totalViews = accessLogs.filter((l) => l.accessType === 'VIEW').length;
    const totalDownloads = accessLogs.filter((l) => l.accessType === 'DOWNLOAD').length;
    const uniqueUsers = new Set(accessLogs.map((l) => l.userId)).size;
    const uniqueArticlesViewed = new Set(accessLogs.map((l) => l.articleId)).size;

    // Views by date
    const viewsByDate: Record<string, number> = {};
    accessLogs.forEach((log) => {
      const date = log.accessedAt.toISOString().split('T')[0];
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    const viewsByDateArray = Object.entries(viewsByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top viewed articles
    const articleViewCounts: Record<string, number> = {};
    accessLogs
      .filter((l) => l.accessType === 'VIEW')
      .forEach((log) => {
        articleViewCounts[log.articleId] = (articleViewCounts[log.articleId] || 0) + 1;
      });

    const topArticleIds = Object.entries(articleViewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    const topArticles = await prisma.knowledgeArticle.findMany({
      where: { id: { in: topArticleIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        helpful: true,
        notHelpful: true,
        author: {
          select: { name: true },
        },
        category: {
          select: { name: true },
        },
      },
    });

    // Sort by period views
    const topArticlesWithPeriodViews = topArticles
      .map((article) => ({
        ...article,
        periodViews: articleViewCounts[article.id] || 0,
        helpfulRate:
          article.helpful + article.notHelpful > 0
            ? Math.round((article.helpful / (article.helpful + article.notHelpful)) * 100)
            : null,
      }))
      .sort((a, b) => b.periodViews - a.periodViews);

    // Top search queries
    const searchQueryCounts: Record<string, number> = {};
    accessLogs
      .filter((l) => l.searchQuery)
      .forEach((log) => {
        const query = log.searchQuery!.toLowerCase();
        searchQueryCounts[query] = (searchQueryCounts[query] || 0) + 1;
      });

    const topSearchQueries = Object.entries(searchQueryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Get feedback statistics
    const [totalHelpful, totalNotHelpful] = await Promise.all([
      prisma.knowledgeArticle.aggregate({
        where: { isActive: true },
        _sum: { helpful: true },
      }),
      prisma.knowledgeArticle.aggregate({
        where: { isActive: true },
        _sum: { notHelpful: true },
      }),
    ]);

    const helpfulSum = totalHelpful._sum.helpful || 0;
    const notHelpfulSum = totalNotHelpful._sum.notHelpful || 0;
    const overallHelpfulRate =
      helpfulSum + notHelpfulSum > 0
        ? Math.round((helpfulSum / (helpfulSum + notHelpfulSum)) * 100)
        : null;

    // Articles needing attention (stale + low helpful rate)
    const articlesNeedingAttention = await prisma.knowledgeArticle.findMany({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        OR: [
          { isStale: true },
          { nextReviewDate: { lt: now } },
        ],
      },
      take: 5,
      orderBy: { nextReviewDate: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        isStale: true,
        nextReviewDate: true,
        lastReviewedAt: true,
      },
    });

    // Recent activity
    const recentActivity = await prisma.knowledgeActivity.findMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true },
        },
        article: {
          select: { title: true, slug: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        overview: {
          totalArticles,
          publishedArticles,
          draftArticles,
          archivedArticles,
          staleArticles,
        },
        accessStats: {
          totalViews,
          totalDownloads,
          uniqueUsers,
          uniqueArticlesViewed,
        },
        feedback: {
          totalHelpful: helpfulSum,
          totalNotHelpful: notHelpfulSum,
          overallHelpfulRate,
        },
        viewsByDate: viewsByDateArray,
        topArticles: topArticlesWithPeriodViews,
        topSearchQueries,
        articlesNeedingAttention,
        recentActivity,
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
