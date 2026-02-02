import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const transferOwnershipSchema = z.object({
  newOwnerId: z.string(),
  reason: z.string().optional(),
});

// POST /api/knowledge/[id]/ownership - Transfer ownership of an article
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
    const data = transferOwnershipSchema.parse(body);

    // Verify article exists
    const article = await prisma.knowledgeArticle.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        ownerId: true,
        title: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Article not found' },
        { status: 404 }
      );
    }

    // Verify new owner exists
    const newOwner = await prisma.user.findUnique({
      where: { id: data.newOwnerId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!newOwner) {
      return NextResponse.json(
        { error: 'Not Found', message: 'New owner not found' },
        { status: 404 }
      );
    }

    // Get current owner info
    const currentOwnerId = article.ownerId || article.authorId;
    const currentOwner = await prisma.user.findUnique({
      where: { id: currentOwnerId },
      select: { id: true, name: true },
    });

    // Update article ownership
    const updatedArticle = await prisma.knowledgeArticle.update({
      where: { id },
      data: {
        ownerId: data.newOwnerId,
      },
      include: {
        owner: {
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
        action: 'OWNERSHIP_TRANSFERRED',
        details: {
          previousOwnerId: currentOwnerId,
          previousOwnerName: currentOwner?.name,
          newOwnerId: data.newOwnerId,
          newOwnerName: newOwner.name,
          reason: data.reason || null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Ownership transferred to ${newOwner.name}`,
      data: {
        article: updatedArticle,
        previousOwner: currentOwner,
        newOwner,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error transferring ownership:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to transfer ownership' },
      { status: 500 }
    );
  }
}
