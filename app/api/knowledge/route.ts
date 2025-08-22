import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { KnowledgeStatus } from '@prisma/client';

// Schema for creating knowledge articles
const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  summary: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'PUBLISHED']).default('DRAFT'),
  expiresAt: z.string().optional().transform((str) => str ? new Date(str) : undefined)
});

// GET: List knowledge articles with search and filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const subcategoryId = searchParams.get('subcategoryId');
    const itemId = searchParams.get('itemId');
    const status = searchParams.get('status') as KnowledgeStatus | null;
    const tags = searchParams.get('tags')?.split(',') || [];
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: true
    };

    // Role-based filtering
    if (session.user.role === 'USER') {
      // Users can only see published articles
      where.status = 'PUBLISHED';
    } else if (session.user.role === 'TECHNICIAN') {
      // Technicians can see published and their own drafts
      where.OR = [
        { status: 'PUBLISHED' },
        { status: 'UNDER_REVIEW' },
        { authorId: session.user.id }
      ];
    }
    // Admins and managers can see all articles

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (itemId) where.itemId = itemId;
    if (status && session.user.role !== 'USER') where.status = status;
    
    if (tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // Execute queries
    const [articles, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          category: {
            select: { id: true, name: true }
          },
          subcategory: {
            select: { id: true, name: true }
          },
          item: {
            select: { id: true, name: true }
          },
          _count: {
            select: {
              comments: true,
              versions: true,
              attachments: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.knowledgeArticle.count({ where })
    ]);

    return NextResponse.json({
      articles: articles.map(article => ({
        ...article,
        commentCount: article._count.comments,
        versionCount: article._count.versions,
        attachmentCount: article._count.attachments,
        _count: undefined
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching knowledge articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge articles' },
      { status: 500 }
    );
  }
}

// POST: Create new knowledge article
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check permissions
    if (!['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create knowledge articles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = createArticleSchema.parse(body);

    // Generate unique slug from title
    const baseSlug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);

    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await prisma.knowledgeArticle.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the article
    const article = await prisma.knowledgeArticle.create({
      data: {
        ...data,
        slug,
        authorId: session.user.id,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : undefined
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        category: {
          select: { id: true, name: true }
        },
        subcategory: {
          select: { id: true, name: true }
        },
        item: {
          select: { id: true, name: true }
        }
      }
    });

    // Create initial version
    await prisma.knowledgeVersion.create({
      data: {
        articleId: article.id,
        version: 1,
        title: article.title,
        content: article.content,
        summary: article.summary,
        changeNotes: 'Initial version',
        authorId: session.user.id
      }
    });

    return NextResponse.json(article, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating knowledge article:', error);
    return NextResponse.json(
      { error: 'Failed to create knowledge article' },
      { status: 500 }
    );
  }
}