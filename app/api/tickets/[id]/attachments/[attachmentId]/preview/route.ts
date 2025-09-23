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

    // Check access permissions (matching ticket visibility logic)
    let canAccess = false;

    if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
      canAccess = true;
    } else if (session.user.role === 'SECURITY_ANALYST') {
      // Security analysts can access their own tickets and tickets in their support group
      canAccess = ticket.createdById === session.user.id ||
                  ticket.assignedToId === session.user.id ||
                  (userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId);
    } else if (session.user.role === 'MANAGER') {
      // Managers can access tickets from their branch
      canAccess = userWithDetails?.branchId === ticket.branchId;
    } else if (session.user.role === 'TECHNICIAN') {
      const isCallCenterTech = userWithDetails?.supportGroup?.code === 'CALL_CENTER';
      const isTransactionClaimsSupport = userWithDetails?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT';
      const isITHelpdeskTech = userWithDetails?.supportGroup?.code === 'IT_HELPDESK';

      if (isCallCenterTech || isTransactionClaimsSupport) {
        // These technicians have broader access to transaction-related tickets
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
        const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';

        // Get the full ticket with category info
        const fullTicket = await prisma.ticket.findUnique({
          where: { id: ticket.id },
          select: {
            categoryId: true,
            service: {
              select: {
                tier1CategoryId: true
              }
            }
          }
        });

        canAccess = ticket.createdById === session.user.id ||
                    ticket.assignedToId === session.user.id ||
                    fullTicket?.categoryId === TRANSACTION_CLAIMS_CATEGORY_ID ||
                    fullTicket?.service?.tier1CategoryId === TRANSACTION_CLAIMS_CATEGORY_ID ||
                    fullTicket?.categoryId === ATM_SERVICES_CATEGORY_ID ||
                    fullTicket?.service?.tier1CategoryId === ATM_SERVICES_CATEGORY_ID;
      } else if (isITHelpdeskTech) {
        // IT Helpdesk has broad access
        canAccess = true;
      } else {
        // Regular technicians: access to tickets they created, are assigned to, or in their support group
        const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
        const isSupportGroupMatch = !!(userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId);
        canAccess = isCreatorOrAssignee || isSupportGroupMatch;
      }
    } else if (session.user.role === 'USER') {
      const isCallCenterUser = userWithDetails?.supportGroup?.code === 'CALL_CENTER';

      if (isCallCenterUser) {
        // Call Center users can see transaction claims
        const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';

        const fullTicket = await prisma.ticket.findUnique({
          where: { id: ticket.id },
          select: {
            categoryId: true,
            service: {
              select: {
                tier1CategoryId: true
              }
            }
          }
        });

        canAccess = ticket.createdById === session.user.id ||
                    fullTicket?.categoryId === TRANSACTION_CLAIMS_CATEGORY_ID ||
                    fullTicket?.service?.tier1CategoryId === TRANSACTION_CLAIMS_CATEGORY_ID;
      } else if (userWithDetails?.branchId) {
        // Regular users can see all tickets from their branch
        canAccess = ticket.branchId === userWithDetails.branchId;
      } else {
        // Users without branch can only see their own tickets
        canAccess = ticket.createdById === session.user.id;
      }
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

    // Check if the file type is previewable
    const previewableMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ];

    if (!previewableMimeTypes.includes(attachment.mimeType)) {
      return NextResponse.json({ error: 'File type not previewable' }, { status: 400 });
    }

    // Check if path contains base64 data or is a file path
    const pathValue = attachment.path || attachment.filename;
    let fileBuffer: Buffer;
    
    if (pathValue.startsWith('data:')) {
      // Handle data URI format: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...
      const base64Data = pathValue.split(',')[1];
      if (!base64Data) {
        return NextResponse.json({ error: 'Invalid data URI format' }, { status: 400 });
      }
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else if (pathValue.length > 100 && /^[A-Za-z0-9+/=]+$/.test(pathValue)) {
      // Handle pure base64 data
      fileBuffer = Buffer.from(pathValue, 'base64');
    } else {
      // Handle file path - try different path combinations
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
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
      }
      
      fileBuffer = fs.readFileSync(fullPath);
    }

    // Return the file with appropriate headers for inline display
    const response = new NextResponse(fileBuffer as any);
    
    response.headers.set('Content-Type', attachment.mimeType);
    response.headers.set('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    response.headers.set('Content-Length', attachment.size.toString());
    response.headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    return response;

  } catch (error) {
    console.error('Error previewing attachment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}