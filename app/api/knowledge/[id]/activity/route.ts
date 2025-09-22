import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: params.id }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Get all activities for the article
    const activities = await prisma.knowledgeActivity.findMany({
      where: { articleId: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Get version history
    const versions = await prisma.knowledgeVersion.findMany({
      where: { articleId: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Combine and sort by date
    const timeline = [
      ...activities.map(a => ({
        id: a.id,
        type: 'activity' as const,
        action: a.action,
        details: a.details,
        metadata: a.metadata,
        user: a.user,
        createdAt: a.createdAt
      })),
      ...versions.map(v => ({
        id: v.id,
        type: 'version' as const,
        action: 'VERSION_CREATED',
        details: {
          version: v.version,
          changelog: v.changelog,
          title: v.title
        },
        metadata: v.metadata,
        user: v.author,
        createdAt: v.createdAt
      }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}