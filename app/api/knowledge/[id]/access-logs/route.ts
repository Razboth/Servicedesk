import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/knowledge/[id]/access-logs - List access logs for an article
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const accessType = searchParams.get('accessType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    // Verify article exists
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Article not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = { articleId: id };

    if (accessType) {
      where.accessType = accessType;
    }

    if (startDate) {
      where.accessedAt = { ...where.accessedAt, gte: new Date(startDate) };
    }

    if (endDate) {
      where.accessedAt = { ...where.accessedAt, lte: new Date(endDate) };
    }

    if (userId) {
      where.userId = userId;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.knowledgeAccessLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { accessedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
              branch: {
                select: { name: true, code: true },
              },
            },
          },
        },
      }),
      prisma.knowledgeAccessLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch access logs' },
      { status: 500 }
    );
  }
}

// POST /api/knowledge/[id]/access-logs - Log an access event
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
    const body = await request.json();

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

    // Get IP and User Agent from headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent') || null;

    const log = await prisma.knowledgeAccessLog.create({
      data: {
        articleId: id,
        userId: session.user.id,
        accessType: body.accessType || 'VIEW',
        ipAddress,
        userAgent,
        duration: body.duration || null,
        referrer: body.referrer || null,
        searchQuery: body.searchQuery || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('Error logging access:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to log access' },
      { status: 500 }
    );
  }
}
