import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';
import { transformStatusResponse } from '@/lib/omnichannel/transformer';
import { z } from 'zod';

/**
 * GET /api/omnichannel/tickets/[ticketNumber]
 * Get detailed ticket status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketNumber: string }> }
) {
  try {
    const { ticketNumber } = await params;

    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permissions
    if (!checkApiPermission(authResult.apiKey!, 'omnichannel:read')) {
      return createApiErrorResponse('Insufficient permissions to read tickets', 403);
    }

    // Find ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { ticketNumber },
          { channelReferenceId: ticketNumber }
        ]
      },
      include: {
        assignedTo: true,
        service: {
          include: { supportGroup: true }
        },
        branch: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          where: {
            isInternal: false // Only show public comments
          },
          include: {
            user: {
              select: { name: true, role: true }
            }
          }
        },
        slaTracking: true,
        attachments: {
          select: {
            filename: true,
            size: true,
            createdAt: true
          }
        }
      }
    });

    if (!ticket) {
      return createApiErrorResponse('Ticket not found', 404);
    }

    // Transform to omnichannel format
    const response = {
      ...transformStatusResponse(ticket),
      service: {
        name: ticket.service?.name,
        supportGroup: ticket.service?.supportGroup?.name
      },
      branch: {
        name: ticket.branch?.name,
        code: ticket.branch?.code
      },
      comments: ticket.comments.map(c => ({
        content: c.content,
        author: c.user?.name || 'System',
        timestamp: c.createdAt,
        isFromSupport: ['TECHNICIAN', 'ADMIN', 'MANAGER'].includes(c.user?.role || '')
      })),
      attachments: ticket.attachments.map(a => ({
        filename: a.filename,
        size: a.size,
        uploadedAt: a.createdAt
      })),
      metadata: ticket.metadata
    };

    return createApiSuccessResponse(response);

  } catch (error) {
    console.error('Omnichannel ticket fetch error:', error);
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to fetch ticket',
      500
    );
  }
}

/**
 * PATCH /api/omnichannel/tickets/[ticketNumber]
 * Update ticket (add comment, change status, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketNumber: string }> }
) {
  try {
    const { ticketNumber } = await params;

    // Authenticate API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permissions
    if (!checkApiPermission(authResult.apiKey!, 'omnichannel:update')) {
      return createApiErrorResponse('Insufficient permissions to update tickets', 403);
    }

    // Parse request body
    const body = await request.json();

    // Validate update data
    const updateSchema = z.object({
      action: z.enum(['ADD_COMMENT', 'UPDATE_STATUS', 'ADD_ATTACHMENT']),
      comment: z.string().optional(),
      status: z.enum(['CANCELLED', 'PENDING']).optional(), // Limited status updates from omnichannel
      attachments: z.array(z.object({
        filename: z.string(),
        mimeType: z.string(),
        size: z.number(),
        content: z.string()
      })).optional()
    });

    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return createApiErrorResponse('Invalid update data', 400, validation.error.errors);
    }

    const updateData = validation.data;

    // Find ticket
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { ticketNumber },
          { channelReferenceId: ticketNumber }
        ]
      }
    });

    if (!ticket) {
      return createApiErrorResponse('Ticket not found', 404);
    }

    // Check if ticket can be updated
    if (['CLOSED', 'RESOLVED'].includes(ticket.status)) {
      return createApiErrorResponse('Cannot update closed or resolved tickets', 400);
    }

    // Process update based on action
    let updateResult: any = {};

    switch (updateData.action) {
      case 'ADD_COMMENT':
        if (!updateData.comment) {
          return createApiErrorResponse('Comment content is required', 400);
        }

        // Get API key user
        const apiKeyUser = authResult.apiKey!.linkedUser || authResult.apiKey!.createdBy;

        const comment = await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            userId: apiKeyUser?.id || ticket.createdById,
            content: `[Via Omnichannel] ${updateData.comment}`,
            isInternal: false
          },
          include: {
            user: {
              select: { name: true }
            }
          }
        });

        updateResult.comment = {
          id: comment.id,
          content: comment.content,
          author: comment.user?.name,
          timestamp: comment.createdAt
        };

        // Create notification
        if (ticket.assignedToId) {
          await prisma.notification.create({
            data: {
              userId: ticket.assignedToId,
              type: 'TICKET_COMMENT',
              title: 'New comment on ticket',
              message: `Omnichannel comment added to ticket ${ticket.ticketNumber}`,
              data: { ticketId: ticket.id, commentId: comment.id }
            }
          });
        }
        break;

      case 'UPDATE_STATUS':
        if (!updateData.status) {
          return createApiErrorResponse('Status is required', 400);
        }

        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: updateData.status,
            updatedAt: new Date()
          }
        });

        updateResult.status = updateData.status;

        // Add system comment for status change
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            userId: ticket.createdById,
            content: `[Omnichannel Update] Status changed to ${updateData.status}`,
            isInternal: false
          }
        });
        break;

      case 'ADD_ATTACHMENT':
        if (!updateData.attachments || updateData.attachments.length === 0) {
          return createApiErrorResponse('Attachments are required', 400);
        }

        const uploadedFiles = [];
        for (const att of updateData.attachments) {
          try {
            const fileBuffer = Buffer.from(att.content, 'base64');
            const { saveFile } = await import('@/lib/file-storage');
            const saveResult = await saveFile(
              fileBuffer,
              att.filename,
              att.mimeType,
              ticket.createdById
            );

            if (saveResult.success && saveResult.filename) {
              const dbAttachment = await prisma.ticketAttachment.create({
                data: {
                  ticketId: ticket.id,
                  filename: att.filename,
                  originalName: att.filename,
                  path: saveResult.filename,
                  mimeType: att.mimeType,
                  size: att.size
                }
              });
              uploadedFiles.push({
                filename: dbAttachment.filename,
                size: dbAttachment.size
              });
            }
          } catch (error) {
            console.error('Failed to upload attachment:', error);
          }
        }

        updateResult.attachments = uploadedFiles;
        break;
    }

    // Log the update
    await prisma.omnichannelLog.create({
      data: {
        apiKeyId: authResult.apiKey!.id,
        channel: 'API',
        serviceType: 'UPDATE',
        requestData: body,
        ticketId: ticket.id,
        status: 'SUCCESS',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return createApiSuccessResponse({
      success: true,
      ticketNumber: ticket.ticketNumber,
      action: updateData.action,
      result: updateResult,
      message: `Ticket updated successfully`
    });

  } catch (error) {
    console.error('Omnichannel ticket update error:', error);
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to update ticket',
      500
    );
  }
}