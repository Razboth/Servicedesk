import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { KnowledgeVisibility } from '@prisma/client';

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
  changeNotes: z.string().optional(),
  // Visibility settings
  visibility: z.enum(['EVERYONE', 'BY_ROLE', 'BY_BRANCH', 'PRIVATE']).optional(),
  visibleToRoles: z.array(z.string()).optional(),
  visibleToBranches: z.array(z.string()).optional()
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
        visibleBranches: {
          include: {
            branch: {
              select: { id: true, name: true, code: true }
            }
          }
        },
        collaborators: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
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

    // Check visibility permissions for non-admin users
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      let hasAccess = false;

      switch (article.visibility) {
        case 'EVERYONE':
          hasAccess = true;
          break;
        case 'BY_ROLE':
          hasAccess = article.visibleToRoles.includes(session.user.role);
          break;
        case 'BY_BRANCH':
          hasAccess = session.user.branchId
            ? article.visibleBranches.some(vb => vb.branchId === session.user.branchId)
            : false;
          break;
        case 'PRIVATE':
          hasAccess = article.authorId === session.user.id ||
                      article.collaborators.some(c => c.userId === session.user.id);
          break;
      }

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses ke artikel ini' },
          { status: 403 }
        );
      }
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
        },
        visibleBranches: true
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

    // Extract visibility-related fields
    const { visibleToBranches, ...updateFields } = data;
    const updateData: any = { ...updateFields };

    // Set publishedAt when status changes to PUBLISHED
    if (data.status === 'PUBLISHED' && currentArticle.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    // Check if visibility changed
    const visibilityChanged = data.visibility && data.visibility !== currentArticle.visibility;
    const rolesChanged = data.visibleToRoles &&
      JSON.stringify(data.visibleToRoles.sort()) !== JSON.stringify(currentArticle.visibleToRoles.sort());

    // Check if branches changed
    const currentBranchIds = currentArticle.visibleBranches.map(vb => vb.branchId).sort();
    const newBranchIds = visibleToBranches ? [...visibleToBranches].sort() : currentBranchIds;
    const branchesChanged = JSON.stringify(currentBranchIds) !== JSON.stringify(newBranchIds);

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

    // Handle visible branches update if visibility is BY_BRANCH and branches were provided
    if (visibleToBranches !== undefined && branchesChanged) {
      // Delete old visible branches
      await prisma.knowledgeVisibleBranch.deleteMany({
        where: { articleId: id }
      });

      // Create new visible branches
      if (visibleToBranches.length > 0) {
        await prisma.knowledgeVisibleBranch.createMany({
          data: visibleToBranches.map(branchId => ({
            articleId: id,
            branchId
          }))
        });
      }

      // Log branch access changes
      const addedBranches = visibleToBranches.filter(b => !currentBranchIds.includes(b));
      const removedBranches = currentBranchIds.filter(b => !visibleToBranches.includes(b));

      if (addedBranches.length > 0) {
        await prisma.knowledgeActivity.create({
          data: {
            articleId: id,
            userId: session.user.id,
            action: 'BRANCH_ACCESS_ADDED',
            details: {
              branchIds: addedBranches
            }
          }
        });
      }

      if (removedBranches.length > 0) {
        await prisma.knowledgeActivity.create({
          data: {
            articleId: id,
            userId: session.user.id,
            action: 'BRANCH_ACCESS_REMOVED',
            details: {
              branchIds: removedBranches
            }
          }
        });
      }
    }

    // Log visibility changes
    if (visibilityChanged) {
      await prisma.knowledgeActivity.create({
        data: {
          articleId: id,
          userId: session.user.id,
          action: 'VISIBILITY_CHANGED',
          details: {
            oldVisibility: currentArticle.visibility,
            newVisibility: data.visibility
          }
        }
      });
    }

    // Log role access changes
    if (rolesChanged && data.visibleToRoles) {
      const addedRoles = data.visibleToRoles.filter(r => !currentArticle.visibleToRoles.includes(r));
      const removedRoles = currentArticle.visibleToRoles.filter(r => !data.visibleToRoles!.includes(r));

      if (addedRoles.length > 0) {
        await prisma.knowledgeActivity.create({
          data: {
            articleId: id,
            userId: session.user.id,
            action: 'ROLE_ACCESS_ADDED',
            details: {
              roles: addedRoles
            }
          }
        });
      }

      if (removedRoles.length > 0) {
        await prisma.knowledgeActivity.create({
          data: {
            articleId: id,
            userId: session.user.id,
            action: 'ROLE_ACCESS_REMOVED',
            details: {
              roles: removedRoles
            }
          }
        });
      }
    }

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

    // Fetch updated article with branches
    const finalArticle = await prisma.knowledgeArticle.findUnique({
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
        visibleBranches: {
          include: {
            branch: {
              select: { id: true, name: true, code: true }
            }
          }
        }
      }
    });

    return NextResponse.json(finalArticle);

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