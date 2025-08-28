import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating comments
const createCommentSchema = z.object({
  content: z.string().max(500000).default(''), // Increased to 500KB to support base64 images
  isInternal: z.boolean().default(false),
  attachments: z.array(z.object({
    filename: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number()
  })).optional()
});

// GET /api/tickets/[id]/comments - Get ticket comments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id },
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
        supportGroupId: true
      }
    });

    // Check access permissions
    let canAccess = false;
    
    if (session.user.role === 'ADMIN') {
      // Super admin can see all
      canAccess = true;
    } else if (session.user.role === 'MANAGER') {
      // Managers can see comments from tickets in their branch
      canAccess = userWithDetails?.branchId === ticket.branchId;
    } else if (session.user.role === 'TECHNICIAN') {
      // Technicians can see comments from tickets they created, are assigned to, or match their support group
      const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
      const isSupportGroupMatch = !!(userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId);
      canAccess = isCreatorOrAssignee || isSupportGroupMatch;
    } else if (session.user.role === 'USER') {
      // Users can only see comments from their own tickets
      canAccess = ticket.createdById === session.user.id;
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Filter comments based on user role
    const whereClause: any = {
      ticketId: id
    };

    // Regular users can't see internal comments
    if (session.user.role === 'USER') {
      whereClause.isInternal = false;
    }

    const comments = await prisma.ticketComment.findMany({
      where: whereClause,
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
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tickets/[id]/comments - Add comment to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createCommentSchema.parse(body);

    // Check if ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        branchId: true,
        status: true,
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
        supportGroupId: true
      }
    });

    // Check access permissions
    let canComment = false;
    
    if (session.user.role === 'ADMIN') {
      // Super admin can comment on all
      canComment = true;
    } else if (session.user.role === 'MANAGER') {
      // Managers can comment on tickets in their branch
      canComment = userWithDetails?.branchId === ticket.branchId;
    } else if (session.user.role === 'TECHNICIAN') {
      // Technicians can comment on tickets they created, are assigned to, or match their support group
      const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
      const isSupportGroupMatch = !!(userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId);
      canComment = isCreatorOrAssignee || isSupportGroupMatch;
    } else if (session.user.role === 'USER') {
      // Users can only comment on their own tickets
      canComment = ticket.createdById === session.user.id;
    }

    if (!canComment) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Regular users cannot create internal comments
    if (session.user.role === 'USER' && validatedData.isInternal) {
      return NextResponse.json(
        { error: 'Users cannot create internal comments' },
        { status: 403 }
      );
    }

    // Handle comment attachments
    const attachmentData = [];
    if (validatedData.attachments && validatedData.attachments.length > 0) {
      const path = require('path');
      
      for (const attachment of validatedData.attachments) {
        // File already uploaded via /api/upload, just reference it
        attachmentData.push({
          filename: attachment.filename,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          size: attachment.size,
          path: path.join('uploads', attachment.filename)
        });
      }
    }

    // Create comment with attachments
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        content: validatedData.content,
        isInternal: validatedData.isInternal,
        attachments: attachmentData.length > 0 ? {
          create: attachmentData
        } : undefined
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

    // Update ticket's updatedAt timestamp
    await prisma.ticket.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}