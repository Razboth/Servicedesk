import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Get linked services
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const links = await prisma.knowledgeServiceLink.findMany({
      where: { articleId: params.id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching service links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service links' },
      { status: 500 }
    );
  }
}

// Add service link
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceId, categoryId } = await request.json();

    // Validate that at least one is provided
    if (!serviceId && !categoryId) {
      return NextResponse.json(
        { error: 'Either serviceId or categoryId must be provided' },
        { status: 400 }
      );
    }

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: params.id },
      include: {
        collaborators: true
      }
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check permissions: author, collaborator, or manager+
    const isAuthor = article.authorId === session.user.id;
    const isCollaborator = article.collaborators.some(c => c.userId === session.user.id);
    const isManager = ['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string);

    if (!isAuthor && !isCollaborator && !isManager) {
      return NextResponse.json(
        { error: 'You do not have permission to link services' },
        { status: 403 }
      );
    }

    // Check for existing link
    if (serviceId) {
      const existingLink = await prisma.knowledgeServiceLink.findUnique({
        where: {
          articleId_serviceId: {
            articleId: params.id,
            serviceId
          }
        }
      });

      if (existingLink) {
        return NextResponse.json(
          { error: 'This service is already linked' },
          { status: 400 }
        );
      }
    }

    if (categoryId) {
      const existingLink = await prisma.knowledgeServiceLink.findUnique({
        where: {
          articleId_categoryId: {
            articleId: params.id,
            categoryId
          }
        }
      });

      if (existingLink) {
        return NextResponse.json(
          { error: 'This category is already linked' },
          { status: 400 }
        );
      }
    }

    // Create link
    const link = await prisma.knowledgeServiceLink.create({
      data: {
        articleId: params.id,
        serviceId,
        categoryId,
        linkedBy: session.user.id
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Log activity
    await prisma.knowledgeActivity.create({
      data: {
        articleId: params.id,
        userId: session.user.id,
        action: 'SERVICE_LINKED',
        details: {
          serviceId,
          categoryId,
          serviceName: link.service?.name,
          categoryName: link.category?.name
        }
      }
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error('Error linking service:', error);
    return NextResponse.json(
      { error: 'Failed to link service' },
      { status: 500 }
    );
  }
}

// Remove service link
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
    const linkId = searchParams.get('linkId');

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    const link = await prisma.knowledgeServiceLink.findUnique({
      where: { id: linkId },
      include: {
        service: true,
        category: true
      }
    });

    if (!link || link.articleId !== params.id) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const article = await prisma.knowledgeArticle.findUnique({
      where: { id: params.id },
      include: {
        collaborators: true
      }
    });

    // Check permissions
    const isAuthor = article?.authorId === session.user.id;
    const isCollaborator = article?.collaborators.some(c => c.userId === session.user.id);
    const isManager = ['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string);

    if (!isAuthor && !isCollaborator && !isManager) {
      return NextResponse.json(
        { error: 'You do not have permission to remove service links' },
        { status: 403 }
      );
    }

    await prisma.knowledgeServiceLink.delete({
      where: { id: linkId }
    });

    // Log activity
    await prisma.knowledgeActivity.create({
      data: {
        articleId: params.id,
        userId: session.user.id,
        action: 'SERVICE_UNLINKED',
        details: {
          serviceId: link.serviceId,
          categoryId: link.categoryId,
          serviceName: link.service?.name,
          categoryName: link.category?.name
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing service link:', error);
    return NextResponse.json(
      { error: 'Failed to remove service link' },
      { status: 500 }
    );
  }
}