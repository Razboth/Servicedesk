import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for creating comments
const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000),
  parentId: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    mimeType: z.string(),
    size: z.number()
  })).optional()
});

// GET: Get comments for an article
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

    // Check if article exists and user can access it
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { id: true, status: true, authorId: true }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (article.status !== 'PUBLISHED' && 
        session.user.role === 'USER' &&
        article.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Cannot access comments for this article' },
        { status: 403 }
      );
    }

    const comments = await prisma.knowledgeComment.findMany({
      where: {
        articleId: id,
        parentId: null // Only get top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            },
            attachments: true
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ comments });

  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST: Add a comment to an article
export async function POST(
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
    const { content, parentId, attachments } = createCommentSchema.parse(body);

    // Check if article exists and user can access it
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: { id: true, status: true, authorId: true }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Knowledge article not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (article.status !== 'PUBLISHED' && 
        session.user.role === 'USER' &&
        article.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Cannot comment on this article' },
        { status: 403 }
      );
    }

    // If this is a reply, check if parent comment exists
    if (parentId) {
      const parentComment = await prisma.knowledgeComment.findUnique({
        where: { id: parentId },
        select: { articleId: true }
      });

      if (!parentComment || parentComment.articleId !== id) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        );
      }
    }

    // Create the comment with attachments
    const comment = await prisma.knowledgeComment.create({
      data: {
        articleId: id,
        userId: session.user.id,
        content,
        parentId,
        attachments: attachments?.length ? {
          create: attachments.map(att => ({
            filename: att.filename,
            url: att.url,
            mimeType: att.mimeType,
            size: att.size,
            uploadedById: session.user.id
          }))
        } : undefined
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        attachments: true
      }
    });

    // Log activity
    await prisma.knowledgeActivity.create({
      data: {
        articleId: id,
        userId: session.user.id,
        action: 'COMMENT_ADDED',
        details: {
          commentId: comment.id,
          hasAttachments: attachments?.length > 0
        }
      }
    });

    return NextResponse.json(comment, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}