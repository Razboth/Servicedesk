import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { readFile } from '@/lib/file-storage';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { filename } = await params;

    // Security check: Verify user has access to this file
    // Check if file is attached to a ticket the user can access
    const attachment = await prisma.ticketAttachment.findFirst({
      where: {
        path: filename // In our system, 'path' stores the secure filename
      },
      include: {
        ticket: {
          include: {
            createdBy: true,
            assignedTo: true
          }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Check access permissions based on user role and ticket ownership
    const userRole = session.user.role;
    const userId = session.user.id;
    const ticket = attachment.ticket;

    let hasAccess = false;

    if (userRole === 'ADMIN') {
      // Admins can access all files
      hasAccess = true;
    } else if (userRole === 'MANAGER') {
      // Managers can access files from their branch
      const userWithBranch = await prisma.user.findUnique({
        where: { id: userId },
        select: { branchId: true }
      });

      if (userWithBranch?.branchId === ticket.branchId) {
        hasAccess = true;
      }
    } else if (ticket.createdById === userId || ticket.assignedToId === userId) {
      // Ticket creator or assignee can access files
      hasAccess = true;
    } else if (userRole === 'TECHNICIAN') {
      // Technicians can access files from tickets in their support group
      const userWithSupportGroup = await prisma.user.findUnique({
        where: { id: userId },
        include: { supportGroup: true }
      });

      if (userWithSupportGroup?.supportGroup) {
        const ticketService = await prisma.service.findUnique({
          where: { id: ticket.serviceId },
          select: { supportGroupId: true }
        });

        if (ticketService?.supportGroupId === userWithSupportGroup.supportGroupId) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Read file from secure storage
    const fileResult = await readFile(filename);

    if (!fileResult.success || !fileResult.data) {
      return NextResponse.json(
        { error: fileResult.error || 'Failed to read file' },
        { status: 500 }
      );
    }

    // Determine content type
    const contentType = attachment.mimeType || 'application/octet-stream';

    // Set security headers for file download
    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Length': fileResult.data.length.toString(),
      'Content-Disposition': `attachment; filename="${attachment.originalName || attachment.filename}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Expires': '0',
      'Pragma': 'no-cache'
    });

    // Log file access for audit trail
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'DOWNLOAD_FILE',
          entity: 'TicketAttachment',
          entityId: attachment.id,
          newValues: {
            description: `Downloaded file: ${attachment.filename} from ticket ${ticket.ticketNumber}`
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });
    } catch (error) {
      console.error('Failed to log file access:', error);
    }

    return new NextResponse(fileResult.data, { headers });

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}