import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/tickets/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the comment to check ownership
    const comment = await prisma.ticketComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        ticketId: true,
        attachments: {
          select: { id: true }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if the ticket ID matches
    if (comment.ticketId !== id) {
      return NextResponse.json({ error: 'Comment does not belong to this ticket' }, { status: 400 });
    }

    // Check permissions - only comment owner or admin can delete
    const canDelete = 
      session.user.role === 'ADMIN' || 
      comment.userId === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 });
    }

    // Delete the comment (attachments will be cascade deleted)
    await prisma.ticketComment.delete({
      where: { id: commentId }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'COMMENT',
        entityId: commentId,
        oldValues: { ticketId: id },
        newValues: {}
      }
    });

    return NextResponse.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id]/comments/[commentId] - Edit a comment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Get the comment to check ownership
    const comment = await prisma.ticketComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        userId: true,
        ticketId: true,
        content: true
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if the ticket ID matches
    if (comment.ticketId !== id) {
      return NextResponse.json({ error: 'Comment does not belong to this ticket' }, { status: 400 });
    }

    // Check permissions - only comment owner can edit (within 5 minutes)
    const canEdit = comment.userId === session.user.id;
    
    if (!canEdit) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 });
    }

    // Update the comment
    const updatedComment = await prisma.ticketComment.update({
      where: { id: commentId },
      data: { 
        content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        attachments: true
      }
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}