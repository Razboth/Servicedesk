import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/knowledge/stale - List stale articles (past review date or marked stale)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const ownerId = searchParams.get('ownerId');
    const includeUpcoming = searchParams.get('includeUpcoming') === 'true';
    const upcomingDays = parseInt(searchParams.get('upcomingDays') || '7');

    const skip = (page - 1) * limit;
    const now = new Date();

    // Build the where clause
    const whereConditions: any[] = [
      { isActive: true },
      { status: 'PUBLISHED' },
    ];

    if (ownerId) {
      whereConditions.push({
        OR: [{ ownerId }, { authorId: ownerId }],
      });
    }

    // Main condition: stale or past review date
    const staleCondition: any = {
      OR: [
        { isStale: true },
        { nextReviewDate: { lt: now } },
      ],
    };

    // Optionally include upcoming reviews
    if (includeUpcoming) {
      const upcomingDate = new Date(now.getTime() + upcomingDays * 24 * 60 * 60 * 1000);
      staleCondition.OR.push({
        nextReviewDate: { gte: now, lte: upcomingDate },
      });
    }

    whereConditions.push(staleCondition);

    const [articles, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where: { AND: whereConditions },
        skip,
        take: limit,
        orderBy: [
          { isStale: 'desc' },
          { nextReviewDate: 'asc' },
        ],
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          views: true,
          isStale: true,
          reviewFrequencyDays: true,
          nextReviewDate: true,
          lastReviewedAt: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lastReviewer: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.knowledgeArticle.count({
        where: { AND: whereConditions },
      }),
    ]);

    // Enhance with calculated fields
    const enhancedArticles = articles.map((article) => {
      let daysOverdue: number | null = null;
      let daysUntilReview: number | null = null;
      let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';

      if (article.nextReviewDate) {
        const diff = article.nextReviewDate.getTime() - now.getTime();
        const days = Math.ceil(diff / (24 * 60 * 60 * 1000));

        if (days < 0) {
          daysOverdue = Math.abs(days);
          urgency = daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium';
        } else {
          daysUntilReview = days;
          urgency = 'low';
        }
      }

      if (article.isStale) {
        urgency = 'critical';
      }

      return {
        ...article,
        daysOverdue,
        daysUntilReview,
        urgency,
        effectiveOwner: article.owner || article.author,
      };
    });

    // Group by urgency for summary
    const summary = {
      critical: enhancedArticles.filter((a) => a.urgency === 'critical').length,
      high: enhancedArticles.filter((a) => a.urgency === 'high').length,
      medium: enhancedArticles.filter((a) => a.urgency === 'medium').length,
      low: enhancedArticles.filter((a) => a.urgency === 'low').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        articles: enhancedArticles,
        summary,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching stale articles:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch stale articles' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge/stale - Mark articles as stale (batch operation for cron job)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find all articles that are past their review date but not marked stale
    const articlesToMark = await prisma.knowledgeArticle.findMany({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        isStale: false,
        nextReviewDate: { lt: now },
      },
      select: { id: true, title: true },
    });

    if (articlesToMark.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles to mark as stale',
        data: { markedCount: 0 },
      });
    }

    // Mark them as stale
    await prisma.knowledgeArticle.updateMany({
      where: {
        id: { in: articlesToMark.map((a) => a.id) },
      },
      data: { isStale: true },
    });

    return NextResponse.json({
      success: true,
      message: `Marked ${articlesToMark.length} articles as stale`,
      data: {
        markedCount: articlesToMark.length,
        articles: articlesToMark,
      },
    });
  } catch (error) {
    console.error('Error marking articles as stale:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to mark articles as stale' },
      { status: 500 }
    );
  }
}
