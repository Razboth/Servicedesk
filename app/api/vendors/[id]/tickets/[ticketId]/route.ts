import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PUT /api/vendors/[id]/tickets/[ticketId] - Update vendor ticket status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; ticketId: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Find the vendor ticket
    const vendorTicket = await prisma.vendorTicket.findFirst({
      where: {
        vendorId: params.id,
        ticketId: params.ticketId
      },
      include: {
        vendor: true,
        ticket: true
      }
    });

    if (!vendorTicket) {
      return NextResponse.json({ error: 'Vendor ticket not found' }, { status: 404 });
    }

    // Update vendor ticket
    const updatedVendorTicket = await prisma.vendorTicket.update({
      where: { id: vendorTicket.id },
      data: {
        status: data.status,
        vendorTicketNumber: data.vendorTicketNumber || vendorTicket.vendorTicketNumber,
        notes: data.notes,
        respondedAt: data.status === 'IN_PROGRESS' && !vendorTicket.respondedAt 
          ? new Date() 
          : vendorTicket.respondedAt,
        resolvedAt: data.status === 'RESOLVED' 
          ? new Date() 
          : vendorTicket.resolvedAt
      }
    });

    // Update main ticket status based on vendor ticket status
    let ticketStatus = vendorTicket.ticket.status;
    let commentContent = '';

    switch (data.status) {
      case 'IN_PROGRESS':
        ticketStatus = 'PENDING_VENDOR';
        commentContent = `Vendor ${vendorTicket.vendor.name} sedang menangani ticket ini`;
        break;
      case 'RESOLVED':
        ticketStatus = 'IN_PROGRESS';
        commentContent = `Vendor ${vendorTicket.vendor.name} telah menyelesaikan ticket ${vendorTicket.vendorTicketNumber}`;
        break;
      case 'CANCELLED':
        ticketStatus = 'IN_PROGRESS';
        commentContent = `Ticket vendor ${vendorTicket.vendorTicketNumber} dibatalkan`;
        break;
    }

    if (ticketStatus !== vendorTicket.ticket.status) {
      await prisma.ticket.update({
        where: { id: params.ticketId },
        data: {
          status: ticketStatus,
          updatedAt: new Date()
        }
      });
    }

    // Add comment if there's content
    if (commentContent || data.vendorResponse) {
      await prisma.comment.create({
        data: {
          content: data.vendorResponse || commentContent,
          ticketId: params.ticketId,
          userId: session.user.id,
          isInternal: false
        }
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_VENDOR_TICKET',
        entity: 'VendorTicket',
        entityId: vendorTicket.id,
        userId: session.user.id,
        newValues: {
          vendorName: vendorTicket.vendor.name,
          ticketNumber: vendorTicket.ticket.ticketNumber,
          status: data.status,
          previousStatus: vendorTicket.status
        }
      }
    });

    return NextResponse.json(updatedVendorTicket);
  } catch (error) {
    console.error('Error updating vendor ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor ticket' },
      { status: 500 }
    );
  }
}

// DELETE /api/vendors/[id]/tickets/[ticketId] - Remove vendor assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; ticketId: string } }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the vendor ticket
    const vendorTicket = await prisma.vendorTicket.findFirst({
      where: {
        vendorId: params.id,
        ticketId: params.ticketId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      },
      include: {
        vendor: true,
        ticket: true
      }
    });

    if (!vendorTicket) {
      return NextResponse.json({ error: 'Active vendor ticket not found' }, { status: 404 });
    }

    // Update vendor ticket to cancelled
    await prisma.vendorTicket.update({
      where: { id: vendorTicket.id },
      data: {
        status: 'CANCELLED',
        resolvedAt: new Date()
      }
    });

    // Update ticket status back to IN_PROGRESS
    await prisma.ticket.update({
      where: { id: params.ticketId },
      data: {
        status: 'IN_PROGRESS',
        updatedAt: new Date()
      }
    });

    // Add comment
    await prisma.comment.create({
      data: {
        content: `Vendor assignment ke ${vendorTicket.vendor.name} telah dibatalkan`,
        ticketId: params.ticketId,
        userId: session.user.id,
        isInternal: false
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CANCEL_VENDOR_TICKET',
        entity: 'VendorTicket',
        entityId: vendorTicket.id,
        userId: session.user.id,
        newValues: {
          vendorName: vendorTicket.vendor.name,
          ticketNumber: vendorTicket.ticket.ticketNumber,
          vendorTicketNumber: vendorTicket.vendorTicketNumber
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing vendor assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove vendor assignment' },
      { status: 500 }
    );
  }
}