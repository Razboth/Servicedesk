import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating tickets
const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'PENDING_VENDOR', 'RESOLVED', 'CLOSED', 'CANCELLED']).optional(),
  assignedToId: z.string().nullable().optional(),
  issueClassification: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'PROBLEM']).optional(),
  rootCause: z.string().optional(),
  resolutionNotes: z.string().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional()
});

// GET /api/tickets/[id] - Get specific ticket
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

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            name: true,
            supportGroupId: true,
            requiresApproval: true,
            category: { select: { name: true } },
            // Include 3-tier category IDs from service
            categoryId: true,
            subcategoryId: true,
            itemId: true
          }
        },
        createdBy: { 
          select: { 
            name: true, 
            email: true, 
            role: true, 
            branchId: true,
            branch: {
              select: { 
                id: true, 
                name: true, 
                code: true 
              }
            }
          } 
        },
        assignedTo: { select: { name: true, email: true, role: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true, label: true } }
          }
        },
        comments: {
          include: {
            user: { select: { name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        slaTracking: {
          include: {
            slaTemplate: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        atmClaimVerification: true,
        branchAssignments: {
          include: {
            assignedTo: { select: { name: true } },
            assignedBy: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
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

    // Check access permissions
    let canAccess = false;
    
    if (session.user.role === 'ADMIN') {
      // Super admin can see all tickets
      canAccess = true;
    } else if (session.user.role === 'MANAGER') {
      // Managers can see tickets assigned to their branch (for ATM claims and inter-branch tickets)
      const isFromSameBranch = userWithDetails?.branchId === ticket.branchId;
      canAccess = isFromSameBranch;
    } else if (session.user.role === 'TECHNICIAN') {
      // Check if this is a Call Center technician
      const isCallCenterTech = userWithDetails?.supportGroup?.code === 'CALL_CENTER';
      
      if (isCallCenterTech) {
        // Call Center can ONLY access transaction-related claims - strict filtering
        const serviceName = ticket.service?.name || '';
        const isTransactionClaim = 
          serviceName.includes('Claim') ||
          serviceName.includes('claim') ||
          serviceName.includes('Dispute') ||
          serviceName.includes('dispute') ||
          // Only allow "Transaction" if it also contains "Claim" or "Error"
          (serviceName.includes('Transaction') && 
           (serviceName.includes('Claim') || serviceName.includes('Error'))) ||
          // Only allow ATM if it's specifically ATM Claim
          (serviceName.includes('ATM') && serviceName.includes('Claim'));
        
        canAccess = isTransactionClaim;
      } else {
        // Regular technicians can see:
        // 1. Tickets they created or are assigned to
        const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
        
        // 2. All approved tickets (or tickets that don't require approval)
        let isApprovedOrNoApprovalNeeded = true;
        if (ticket.service?.requiresApproval) {
          // Check if ticket is approved
          const latestApproval = ticket.approvals?.[0]; // Already ordered by desc
          isApprovedOrNoApprovalNeeded = latestApproval?.status === 'APPROVED';
        }
        
        canAccess = isCreatorOrAssignee || isApprovedOrNoApprovalNeeded;
      }
    } else if (session.user.role === 'SECURITY_ANALYST') {
      // Security Analysts function like technicians
      const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
      
      // All approved tickets (or tickets that don't require approval)
      let isApprovedOrNoApprovalNeeded = true;
      if (ticket.service?.requiresApproval) {
        // Check if ticket is approved
        const latestApproval = ticket.approvals?.[0]; // Already ordered by desc
        isApprovedOrNoApprovalNeeded = latestApproval?.status === 'APPROVED';
      }
      
      const isSecurityAnalystTicket = ticket.createdBy?.role === 'SECURITY_ANALYST';
      canAccess = isCreatorOrAssignee || isApprovedOrNoApprovalNeeded || isSecurityAnalystTicket;
    } else if (session.user.role === 'USER' || session.user.role === 'AGENT') {
      // Users can see:
      // 1. Their own tickets
      // 2. Tickets assigned to their branch (for ATM claims processing)
      const isOwnTicket = ticket.createdById === session.user.id;
      const isBranchTicket = userWithDetails?.branchId === ticket.branchId;
      
      // For ATM claims, check if this is an ATM claim service
      const isATMClaim = ticket.service?.name?.toLowerCase().includes('atm claim');
      
      if (isATMClaim && isBranchTicket) {
        canAccess = true;
      } else {
        canAccess = isOwnTicket;
      }
    }

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] - Partial update ticket (for status changes)
export async function PATCH(
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
    const validatedData = updateTicketSchema.parse(body);

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        status: true,
        service: {
          select: {
            name: true
          }
        }
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions for updates based on role
    let canUpdate = false;
    let allowedFields: string[] = [];
    
    if (session.user.role === 'ADMIN') {
      // Admin can update everything
      canUpdate = true;
      allowedFields = Object.keys(validatedData);
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // Technicians can only update tickets they are assigned to
      if (existingTicket.assignedToId === session.user.id) {
        canUpdate = true;
        allowedFields = Object.keys(validatedData);
      } else {
        return NextResponse.json(
          { error: 'Only the assigned technician can update this ticket' },
          { status: 403 }
        );
      }
    } else if (session.user.role === 'USER' && existingTicket.createdById === session.user.id) {
      // Users can only update title and description of their own tickets
      canUpdate = true;
      allowedFields = ['title', 'description'];
    } else if (session.user.role === 'MANAGER' && existingTicket.createdById === session.user.id) {
      // Managers can update basic fields of tickets they created
      canUpdate = true;
      allowedFields = ['title', 'description', 'priority'];
    }

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user is trying to update fields they're not allowed to
    if (session.user.role !== 'ADMIN' && allowedFields.length > 0) {
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        const disallowedFields = updateFields.filter(f => !allowedFields.includes(f));
        const role = session.user.role?.toLowerCase() || 'user';
        return NextResponse.json(
          { error: `${role}s cannot update these fields: ${disallowedFields.join(', ')}` },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    // Set resolution timestamp when status changes to RESOLVED
    if (validatedData.status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }
    
    // Clear closedAt timestamp when reopening a closed ticket
    if (existingTicket.status === 'CLOSED' && validatedData.status && validatedData.status !== 'CLOSED') {
      updateData.closedAt = null;
    }

    // Track what's changing for audit log
    const changes: any = {};
    if (validatedData.status && validatedData.status !== existingTicket.status) {
      changes.status = { old: existingTicket.status, new: validatedData.status };
    }
    
    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        service: {
          select: {
            name: true,
            category: { select: { name: true } }
          }
        },
        createdBy: { 
          select: { 
            name: true, 
            email: true, 
            role: true, 
            branchId: true,
            branch: {
              select: { 
                id: true, 
                name: true, 
                code: true 
              }
            }
          } 
        },
        assignedTo: { select: { name: true, email: true, role: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true, label: true } }
          }
        },
        comments: {
          include: {
            user: { select: { name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    // Create audit log if there were changes
    if (Object.keys(changes).length > 0) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'STATUS_UPDATE',
          entity: 'TICKET',
          entityId: id,
          oldValues: changes.status ? { status: changes.status.old } : {},
          newValues: changes.status ? { status: changes.status.new, updatedBy: session.user.name || session.user.email } : {}
        },
      });
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update ticket
export async function PUT(
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
    const validatedData = updateTicketSchema.parse(body);

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        status: true,
        service: {
          select: {
            name: true
          }
        }
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get user details for additional permission checks
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

    // Check permissions for updates
    let canUpdate = false;
    if (session.user.role === 'ADMIN' || session.user.role === 'SECURITY_ANALYST') {
      canUpdate = true;
    } else if (session.user.role === 'TECHNICIAN') {
      // Check if Call Center technician
      const isCallCenterTech = userWithDetails?.supportGroup?.code === 'CALL_CENTER';
      if (isCallCenterTech) {
        // Call Center can only update transaction claims - strict filtering
        const serviceName = existingTicket.service?.name || '';
        const isTransactionClaim = 
          serviceName.includes('Claim') ||
          serviceName.includes('claim') ||
          serviceName.includes('Dispute') ||
          serviceName.includes('dispute') ||
          // Only allow "Transaction" if it also contains "Claim" or "Error"
          (serviceName.includes('Transaction') && 
           (serviceName.includes('Claim') || serviceName.includes('Error'))) ||
          // Only allow ATM if it's specifically ATM Claim
          (serviceName.includes('ATM') && serviceName.includes('Claim'));
        canUpdate = isTransactionClaim;
      } else {
        // Regular technicians can update
        canUpdate = true;
      }
    } else if (session.user.role === 'USER' && existingTicket.createdById === session.user.id) {
      canUpdate = true;
    } else if (session.user.role === 'MANAGER' && existingTicket.createdById === session.user.id) {
      canUpdate = true;
    }

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Users can only update certain fields
    if (session.user.role === 'USER') {
      const allowedFields = ['title', 'description'];
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: 'Users can only update title and description' },
          { status: 403 }
        );
      }
    }

    // Managers can only update certain fields (cannot change status, assign tickets, etc.)
    if (session.user.role === 'MANAGER') {
      const allowedFields = ['title', 'description', 'priority'];
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: 'Managers cannot update ticket status, assignments, or technical fields' },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    // Set resolution timestamp when status changes to RESOLVED
    if (validatedData.status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }
    
    // Set closed timestamp when status changes to CLOSED
    if (validatedData.status === 'CLOSED' && existingTicket.status !== 'CLOSED') {
      updateData.closedAt = new Date();
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        service: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true } }
          }
        }
      }
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete ticket (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete tickets
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await prisma.ticket.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}