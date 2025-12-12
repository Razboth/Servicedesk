import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// GET: Get attachment info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if article exists
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

    // Get attachment info
    const attachment = await prisma.knowledgeAttachment.findUnique({
      where: {
        id: attachmentId,
        articleId: id
      },
      include: {
        uploader: {
          select: { name: true, email: true }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(attachment);

  } catch (error) {
    console.error('Error fetching attachment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachment' },
      { status: 500 }
    );
  }
}

// DELETE: Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if article exists
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

    // Check permissions - only author, admin, or manager can delete
    const canDelete =
      session.user.role === 'ADMIN' ||
      session.user.role === 'SUPER_ADMIN' ||
      session.user.role === 'MANAGER' ||
      session.user.role === 'MANAGER_IT' ||
      article.authorId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete attachment' },
        { status: 403 }
      );
    }

    // Get attachment info
    const attachment = await prisma.knowledgeAttachment.findUnique({
      where: {
        id: attachmentId,
        articleId: id
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Delete file from disk
    const filePath = join(process.cwd(), attachment.path);
    if (existsSync(filePath)) {
      try {
        await unlink(filePath);
      } catch (err) {
        console.error('Failed to delete file from disk:', err);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await prisma.knowledgeAttachment.delete({
      where: { id: attachmentId }
    });

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting attachment:', error);
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    );
  }
}
