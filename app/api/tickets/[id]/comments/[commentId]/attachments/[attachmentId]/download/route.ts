import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import path from 'path';

// GET /api/tickets/[id]/comments/[commentId]/attachments/[attachmentId]/download
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string; attachmentId: string }> }
) {
  const { id, commentId, attachmentId } = await params;
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the attachment
    const attachment = await prisma.commentAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        comment: {
          include: {
            ticket: {
              select: {
                id: true,
                createdById: true,
                assignedToId: true,
                branchId: true
              }
            }
          }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Verify the attachment belongs to the correct comment and ticket
    if (attachment.comment.ticketId !== id || attachment.commentId !== commentId) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Check access permissions
    const ticket = attachment.comment.ticket;
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        branchId: true, 
        role: true, 
        supportGroupId: true
      }
    });

    let canAccess = false;
    
    if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
      canAccess = true;
    } else if (session.user.role === 'MANAGER') {
      canAccess = userWithDetails?.branchId === ticket.branchId;
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
      canAccess = isCreatorOrAssignee;
    } else if (session.user.role === 'USER') {
      canAccess = ticket.createdById === session.user.id;
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Read the file
    const filePath = path.join(process.cwd(), attachment.path);
    const fileBuffer = await readFile(filePath);

    // Return file with proper headers
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.originalName}"`,
        'Content-Length': attachment.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json(
      { error: 'Failed to download attachment' },
      { status: 500 }
    );
  }
}