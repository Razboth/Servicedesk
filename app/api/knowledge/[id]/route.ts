import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for updating knowledge articles
const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED']).optional(),
  expiresAt: z.string().optional().transform((str) => str ? new Date(str) : null),
  changeNotes: z.string().optional()
});

// GET: Get single knowledge article
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
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
        versions: {
          select: {
            id: true,
            version: true,
            changeNotes: true,
            createdAt: true,
            author: {
              select: { name: true }
            }
          },
          orderBy: { version: 'desc' }
        },
        comments: {
          where: { parentId: null },
          include: {
            user: {
              select: { id: true, name: true, role: true }
            },
            replies: {
              include: {
                user: {
                  select: { id: true, name: true, role: true }
                }
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        attachments: {
          include: {
            uploader: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            feedback: true
          }
        }
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (article.status !== 'PUBLISHED' && 
        session.user.role === 'USER' &&
        article.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Article not accessible' },
        { status: 403 }
      );
    }

    // Increment view count (but not for the author)
    if (article.authorId !== session.user.id) {
      await prisma.knowledgeArticle.update({
        where: { id },
        data: { views: { increment: 1 } }
      });
    }

    return NextResponse.json({
      ...article,
      feedbackCount: article._count.feedback,
      _count: undefined
    });

  } catch (error) {
    console.error('Error fetching knowledge article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge article' },
      { status: 500 }
    );
  }
}

// PUT: Update knowledge article
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = updateArticleSchema.parse(body);

    // Get current article
    const currentArticle = await prisma.knowledgeArticle.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!currentArticle) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      );
    }

    // Check permissions - allow authors to edit their own articles
    const canEdit = session.user.role === 'ADMIN' || 
                   session.user.role === 'MANAGER' ||
                   currentArticle.authorId === session.user.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit this article' },
        { status: 403 }
      );
    }

    // Check if content has changed significantly to create new version
    const contentChanged = data.title && data.title !== currentArticle.title ||
                          data.content && data.content !== currentArticle.content ||
                          data.summary !== currentArticle.summary;

    const updateData: any = { ...data };
    
    // Set publishedAt when status changes to PUBLISHED
    if (data.status === 'PUBLISHED' && currentArticle.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    // Update the article
    const updatedArticle = await prisma.knowledgeArticle.update({
      where: { id },
      data: updateData,
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

    // Create new version if content changed
    if (contentChanged) {
      const latestVersion = currentArticle.versions[0];
      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

      await prisma.knowledgeVersion.create({
        data: {
          articleId: id,
          version: nextVersion,
          title: updatedArticle.title,
          content: updatedArticle.content,
          summary: updatedArticle.summary,
          changeNotes: data.changeNotes || 'Updated content',
          authorId: session.user.id
        }
      });
    }

    return NextResponse.json(updatedArticle);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating knowledge article:', error);
    return NextResponse.json(
      { error: 'Failed to update knowledge article' },
      { status: 500 }
    );
  }
}

// DELETE: Delete knowledge article (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get current article
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canDelete = session.user.role === 'ADMIN' || 
                     session.user.role === 'MANAGER' ||
                     (session.user.role === 'TECHNICIAN' && article.authorId === session.user.id);

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this article' },
        { status: 403 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.knowledgeArticle.update({
      where: { id },
      data: { 
        isActive: false,
        status: 'ARCHIVED'
      }
    });

    return NextResponse.json({ message: 'Knowledge article deleted successfully' });

  } catch (error) {
    console.error('Error deleting knowledge article:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge article' },
      { status: 500 }
    );
  }
}