import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// POST /api/knowledge/[id]/versions/[versionId]/restore - Restore article to this version
export async function POST(
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
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Article not found' },
        { status: 404 }
      );
    }

    // Get the version to restore
    const versionToRestore = await prisma.knowledgeVersion.findUnique({
      where: { id: versionId },
    });

    if (!versionToRestore || versionToRestore.articleId !== id) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Version not found' },
        { status: 404 }
      );
    }

    // Get the latest version number
    const latestVersion = article.versions[0];
    const nextVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    // Start a transaction to restore the version
    const result = await prisma.$transaction(async (tx) => {
      // Update the article with the version's content
      const updatedArticle = await tx.knowledgeArticle.update({
        where: { id },
        data: {
          title: versionToRestore.title,
          content: versionToRestore.content,
          summary: versionToRestore.summary,
          updatedAt: new Date(),
        },
      });

      // Create a new version entry for this restore action
      const newVersion = await tx.knowledgeVersion.create({
        data: {
          articleId: id,
          version: nextVersionNumber,
          title: versionToRestore.title,
          content: versionToRestore.content,
          summary: versionToRestore.summary,
          changeNotes: `Restored from version ${versionToRestore.version}`,
          authorId: session.user.id,
        },
      });

      // Log the activity
      await tx.knowledgeActivity.create({
        data: {
          articleId: id,
          userId: session.user.id,
          action: 'VERSION_RESTORED',
          details: {
            restoredFromVersion: versionToRestore.version,
            restoredFromVersionId: versionId,
            newVersion: nextVersionNumber,
            newVersionId: newVersion.id,
          },
        },
      });

      return { updatedArticle, newVersion };
    });

    return NextResponse.json({
      success: true,
      message: `Article restored to version ${versionToRestore.version}`,
      data: {
        article: result.updatedArticle,
        newVersion: result.newVersion,
        restoredFromVersion: versionToRestore.version,
      },
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to restore version' },
      { status: 500 }
    );
  }
}
