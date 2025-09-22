import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// Get collaborators for an article
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
      where: { id: params.id },
      include: {
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            },
            inviter: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if user is author or collaborator
    const isAuthor = article.authorId === session.user.id;
    const isCollaborator = article.collaborators.some(c => c.userId === session.user.id);
    const isManager = ['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string);

    if (!isAuthor && !isCollaborator && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      author: article.author,
      collaborators: article.collaborators
    });
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaborators' },
      { status: 500 }
    );
  }
}

// Add a collaborator
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: params.id },
      include: {
        collaborators: true
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Only author or existing collaborators with OWNER role can add new collaborators
    const isAuthor = article.authorId === session.user.id;
    const ownerCollaborator = article.collaborators.find(
      c => c.userId === session.user.id && c.role === 'OWNER'
    );

    if (!isAuthor && !ownerCollaborator) {
      return NextResponse.json(
        { error: 'Only the author or owners can add collaborators' },
        { status: 403 }
      );
    }

    // Check if user is already a collaborator
    const existingCollaborator = article.collaborators.find(c => c.userId === userId);
    if (existingCollaborator) {
      return NextResponse.json(
        { error: 'User is already a collaborator' },
        { status: 400 }
      );
    }

    // Add collaborator
    const collaborator = await prisma.knowledgeCollaborator.create({
      data: {
        articleId: params.id,
        userId,
        invitedBy: session.user.id,
        role: 'EDITOR'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    // Log activity
    await prisma.knowledgeActivity.create({
      data: {
        articleId: params.id,
        userId: session.user.id,
        action: 'COLLABORATOR_ADDED',
        details: {
          collaboratorId: userId,
          collaboratorName: collaborator.user.name
        }
      }
    });

    return NextResponse.json(collaborator);
  } catch (error) {
    console.error('Error adding collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to add collaborator' },
      { status: 500 }
    );
  }
}

// Update collaborator role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collaboratorId, role } = await request.json();

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: params.id },
      include: {
        collaborators: true
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Only author can change roles
    if (article.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the author can change collaborator roles' },
        { status: 403 }
      );
    }

    const collaborator = await prisma.knowledgeCollaborator.update({
      where: {
        articleId_userId: {
          articleId: params.id,
          userId: collaboratorId
        }
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    // Log activity
    await prisma.knowledgeActivity.create({
      data: {
        articleId: params.id,
        userId: session.user.id,
        action: 'COLLABORATOR_ROLE_CHANGED',
        details: {
          collaboratorId,
          newRole: role,
          collaboratorName: collaborator.user.name
        }
      }
    });

    return NextResponse.json(collaborator);
  } catch (error) {
    console.error('Error updating collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to update collaborator' },
      { status: 500 }
    );
  }
}

// Remove a collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get('userId');

    if (!collaboratorId) {
      return NextResponse.json(
        { error: 'Collaborator ID is required' },
        { status: 400 }
      );
    }

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: params.id },
      include: {
        collaborators: {
          where: { userId: collaboratorId }
        }
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Only author or the collaborator themselves can remove
    const isAuthor = article.authorId === session.user.id;
    const isSelf = collaboratorId === session.user.id;

    if (!isAuthor && !isSelf) {
      return NextResponse.json(
        { error: 'Only the author or the collaborator can remove themselves' },
        { status: 403 }
      );
    }

    const collaborator = article.collaborators[0];
    if (!collaborator) {
      return NextResponse.json(
        { error: 'Collaborator not found' },
        { status: 404 }
      );
    }

    await prisma.knowledgeCollaborator.delete({
      where: {
        articleId_userId: {
          articleId: params.id,
          userId: collaboratorId
        }
      }
    });

    // Log activity
    await prisma.knowledgeActivity.create({
      data: {
        articleId: params.id,
        userId: session.user.id,
        action: isSelf ? 'COLLABORATOR_LEFT' : 'COLLABORATOR_REMOVED',
        details: {
          collaboratorId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to remove collaborator' },
      { status: 500 }
    );
  }
}