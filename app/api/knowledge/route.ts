import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { KnowledgeStatus, KnowledgeVisibility } from '@prisma/client';

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
  expiresAt: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  // Visibility settings
  visibility: z.enum(['EVERYONE', 'BY_ROLE', 'BY_BRANCH', 'PRIVATE']).default('EVERYONE'),
  visibleToRoles: z.array(z.string()).default([]),
  visibleToBranches: z.array(z.string()).default([])
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

    // Visibility filtering for non-admin users
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      const visibilityConditions: any[] = [
        { visibility: 'EVERYONE' as KnowledgeVisibility },
        { visibility: 'BY_ROLE' as KnowledgeVisibility, visibleToRoles: { has: session.user.role } },
        { visibility: 'PRIVATE' as KnowledgeVisibility, authorId: session.user.id },
        { visibility: 'PRIVATE' as KnowledgeVisibility, collaborators: { some: { userId: session.user.id } } }
      ];

      // Add branch-based visibility if user has a branch
      if (session.user.branchId) {
        visibilityConditions.push({
          visibility: 'BY_BRANCH' as KnowledgeVisibility,
          visibleBranches: { some: { branchId: session.user.branchId } }
        });
      }

      // Merge with existing OR conditions
      if (where.OR) {
        // If there are existing OR conditions (from role-based filtering), combine them
        const existingOr = where.OR;
        where.AND = [
          { OR: existingOr },
          { OR: visibilityConditions }
        ];
        delete where.OR;
      } else {
        where.OR = visibilityConditions;
      }
    }

    if (search) {
      const searchConditions = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } }
      ];

      // Properly merge search conditions with existing conditions
      if (where.AND) {
        where.AND.push({ OR: searchConditions });
      } else if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
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
          visibleBranches: {
            include: {
              branch: {
                select: { id: true, name: true, code: true }
              }
            }
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

    // Extract visibility-related fields
    const { visibleToBranches, ...articleData } = data;

    // Generate unique slug from title
    const baseSlug = articleData.title
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

    // Create the article with visibility settings
    const article = await prisma.knowledgeArticle.create({
      data: {
        title: articleData.title,
        content: articleData.content,
        summary: articleData.summary,
        categoryId: articleData.categoryId,
        subcategoryId: articleData.subcategoryId,
        itemId: articleData.itemId,
        tags: articleData.tags,
        status: articleData.status as KnowledgeStatus,
        expiresAt: articleData.expiresAt,
        visibility: articleData.visibility as KnowledgeVisibility,
        visibleToRoles: articleData.visibleToRoles,
        slug,
        authorId: session.user.id,
        publishedAt: articleData.status === 'PUBLISHED' ? new Date() : undefined,
        // Create visible branches if visibility is BY_BRANCH
        ...(articleData.visibility === 'BY_BRANCH' && visibleToBranches.length > 0 ? {
          visibleBranches: {
            create: visibleToBranches.map(branchId => ({
              branchId
            }))
          }
        } : {})
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
        },
        visibleBranches: {
          include: {
            branch: {
              select: { id: true, name: true, code: true }
            }
          }
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

    // Log activity for visibility settings if not default
    if (articleData.visibility !== 'EVERYONE') {
      await prisma.knowledgeActivity.create({
        data: {
          articleId: article.id,
          userId: session.user.id,
          action: 'VISIBILITY_SET',
          details: {
            visibility: articleData.visibility,
            visibleToRoles: articleData.visibleToRoles,
            visibleToBranches: visibleToBranches
          }
        }
      });
    }

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