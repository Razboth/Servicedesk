import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const reviewSchema = z.object({
  notes: z.string().optional(),
  nextReviewDays: z.number().optional(), // Override default review frequency
});

// POST /api/knowledge/[id]/review - Mark article as reviewed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const data = reviewSchema.parse(body);

    // Verify article exists
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        reviewFrequencyDays: true,
        isStale: true,
        lastReviewedAt: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Article not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    // Calculate next review date
    const reviewFrequency = data.nextReviewDays || article.reviewFrequencyDays || 90;
    const nextReviewDate = new Date(now.getTime() + reviewFrequency * 24 * 60 * 60 * 1000);

    // Update article
    const updatedArticle = await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        lastReviewedAt: now,
        lastReviewedBy: session.user.id,
        nextReviewDate,
        isStale: false,
        reviewFrequencyDays: data.nextReviewDays || article.reviewFrequencyDays,
      },
      include: {
        lastReviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the activity
    await prisma.knowledgeActivity.create({
      data: {
        articleId: id,
        userId: session.user.id,
        action: 'ARTICLE_REVIEWED',
        details: {
          notes: data.notes || null,
          previousReviewDate: article.lastReviewedAt?.toISOString() || null,
          wasStale: article.isStale,
          nextReviewDate: nextReviewDate.toISOString(),
          reviewFrequencyDays: reviewFrequency,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Article marked as reviewed',
      data: {
        article: {
          id: updatedArticle.id,
          title: updatedArticle.title,
          lastReviewedAt: updatedArticle.lastReviewedAt,
          lastReviewer: updatedArticle.lastReviewer,
          nextReviewDate: updatedArticle.nextReviewDate,
          isStale: updatedArticle.isStale,
          reviewFrequencyDays: updatedArticle.reviewFrequencyDays,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error marking article as reviewed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to mark article as reviewed' },
      { status: 500 }
    );
  }
}

// GET /api/knowledge/[id]/review - Get review status
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

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        reviewFrequencyDays: true,
        nextReviewDate: true,
        lastReviewedAt: true,
        isStale: true,
        lastReviewer: {
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
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Article not found' },
        { status: 404 }
      );
    }

    // Calculate days until next review or days overdue
    let daysUntilReview: number | null = null;
    let daysOverdue: number | null = null;

    if (article.nextReviewDate) {
      const now = new Date();
      const diff = article.nextReviewDate.getTime() - now.getTime();
      const days = Math.ceil(diff / (24 * 60 * 60 * 1000));

      if (days > 0) {
        daysUntilReview = days;
      } else {
        daysOverdue = Math.abs(days);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...article,
        daysUntilReview,
        daysOverdue,
        needsReview: article.isStale || (daysOverdue !== null && daysOverdue > 0),
      },
    });
  } catch (error) {
    console.error('Error fetching review status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch review status' },
      { status: 500 }
    );
  }
}
