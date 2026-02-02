import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/knowledge/[id]/versions/[versionId] - Get specific version details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, versionId } = await params;

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

    const version = await prisma.knowledgeVersion.findUnique({
      where: { id: versionId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!version || version.articleId !== id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: version,
    });
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}

// PATCH /api/knowledge/[id]/versions/[versionId] - Mark version as stable/approved
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, versionId } = await params;
    const body = await request.json();

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

    const version = await prisma.knowledgeVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.articleId !== id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Version not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    // Handle marking as stable
    if (body.isStable !== undefined) {
      updateData.isStable = body.isStable;

      if (body.isStable) {
        // When marking as stable, record who approved it
        updateData.approvedBy = session.user.id;
        updateData.approvedAt = new Date();

        // Unmark other stable versions for this article
        await prisma.knowledgeVersion.updateMany({
          where: {
            articleId: id,
            id: { not: versionId },
            isStable: true,
          },
          data: {
            isStable: false,
          },
        });
      } else {
        // When removing stable mark, clear approval info
        updateData.approvedBy = null;
        updateData.approvedAt = null;
      }
    }

    const updatedVersion = await prisma.knowledgeVersion.update({
      where: { id: versionId },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
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
        action: body.isStable ? 'VERSION_MARKED_STABLE' : 'VERSION_UNMARKED_STABLE',
        details: {
          versionId: versionId,
          versionNumber: version.version,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedVersion,
    });
  } catch (error) {
    console.error('Error updating version:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to update version' },
      { status: 500 }
    );
  }
}
