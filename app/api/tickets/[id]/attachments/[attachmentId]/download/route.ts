import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id: ticketIdParam, attachmentId } = await params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the id is a ticket number (numeric or full format) or a CUID
    const isFullTicketNumber = /^[A-Z]+-\d{4}-\d+$/.test(ticketIdParam);
    const isNumericOnly = /^\d+$/.test(ticketIdParam);

    let whereClause: any;
    if (isFullTicketNumber || isNumericOnly) {
      // Ticket number format (e.g., "712" or "TKT-2025-712")
      whereClause = { ticketNumber: ticketIdParam };
    } else {
      // Assume it's a CUID
      whereClause = { id: ticketIdParam };
    }

    // First check if user has access to the ticket
    const ticket = await prisma.ticket.findUnique({
      where: whereClause,
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        branchId: true,
        service: {
          select: {
            supportGroupId: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get user's details for access control
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        branchId: true, 
        role: true, 
        supportGroupId: true,
        supportGroup: {
          select: { code: true }
        }
      }
    });

    // Also get ticket approval status
    const ticketWithApproval = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: {
        service: {
          select: {
            requiresApproval: true
          }
        },
        approvals: {
          select: {
            status: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Check access permissions (same logic as ticket access)
    let canAccess = false;

    if (session.user.role === 'ADMIN' || session.user.role === 'MANAGER_IT') {
      // ADMIN and MANAGER_IT have full access
      canAccess = true;
    } else if (session.user.role === 'MANAGER') {
      canAccess = userWithDetails?.branchId === ticket.branchId;
    } else if (session.user.role === 'TECHNICIAN') {
      const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
      
      // IT Helpdesk special case - can see all non-security tickets
      if (userWithDetails?.supportGroup?.code === 'IT_HELPDESK') {
        canAccess = true; // IT Helpdesk has broad access
      } else if (userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId) {
        // For support group tickets, must be approved or pending approval if approval required
        if (ticketWithApproval?.service?.requiresApproval) {
          const latestApproval = ticketWithApproval.approvals?.[0];
          canAccess = isCreatorOrAssignee || 
                     latestApproval?.status === 'APPROVED' || 
                     latestApproval?.status === 'PENDING';
        } else {
          canAccess = isCreatorOrAssignee || true; // No approval needed
        }
      } else {
        canAccess = isCreatorOrAssignee;
      }
    } else if (session.user.role === 'USER') {
      canAccess = ticket.createdById === session.user.id;
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Find the attachment (use the actual ticket.id from the database)
    const attachment = await prisma.ticketAttachment.findUnique({
      where: {
        id: attachmentId,
        ticketId: ticket.id
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        path: true
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Check if attachment has valid data
    if (!attachment.path && attachment.size === 0) {
      console.error('Attachment has no data:', {
        id: attachment.id,
        filename: attachment.filename,
        size: attachment.size
      });
      return NextResponse.json({ error: 'Attachment data is missing or corrupted' }, { status: 500 });
    }

    // Check if path contains base64 data or is a file path
    const pathValue = attachment.path || attachment.filename;
    let fileBuffer: Buffer;
    
    console.log('Attachment details:', {
      id: attachment.id,
      filename: attachment.filename,
      originalName: attachment.originalName,
      path: attachment.path,
      pathLength: pathValue?.length || 0,
      startsWithData: pathValue?.startsWith('data:') || false,
      looksLikeBase64: pathValue && pathValue.length > 100 && /^[A-Za-z0-9+/=]+$/.test(pathValue)
    });
    
    if (pathValue.startsWith('data:')) {
      // Handle data URI format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...
      console.log('Processing data URI format');
      const base64Data = pathValue.split(',')[1];
      if (!base64Data) {
        return NextResponse.json({ error: 'Invalid data URI format' }, { status: 400 });
      }
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else if (pathValue && pathValue.length > 100 && /^[A-Za-z0-9+/=]+$/.test(pathValue.substring(0, 1000))) {
      // Handle pure base64 data (check first 1000 chars for performance)
      console.log('Processing pure base64 data');
      try {
        fileBuffer = Buffer.from(pathValue, 'base64');
        console.log('Successfully decoded base64 data, buffer size:', fileBuffer.length);
      } catch (err) {
        console.error('Failed to decode base64:', err);
        return NextResponse.json({ error: 'Failed to decode attachment data' }, { status: 500 });
      }
    } else {
      // Handle file path - try different path combinations
      console.log('Processing file path');
      const possiblePaths = [
        path.join(process.cwd(), 'uploads', 'tickets', pathValue),
        path.join(process.cwd(), 'uploads', pathValue),
        path.join(process.cwd(), pathValue.startsWith('uploads/') ? pathValue : path.join('uploads', pathValue))
      ];
      
      let fullPath = '';
      let found = false;
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          fullPath = testPath;
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log('File not found in any of the possible paths:', possiblePaths);
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
      }
      
      fileBuffer = fs.readFileSync(fullPath);
    }

    // Return the file with appropriate headers
    const response = new NextResponse(fileBuffer as any);

    response.headers.set('Content-Type', attachment.mimeType || 'application/octet-stream');
    response.headers.set('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    // Use actual buffer size instead of stored size (which might be wrong for base64 data)
    response.headers.set('Content-Length', fileBuffer.length.toString());
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}