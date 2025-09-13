import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/vendors/[id]/tickets - List vendor tickets
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {
      vendorId: params.id
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const vendorTickets = await prisma.vendorTicket.findMany({
      where,
      include: {
        ticket: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            branch: true,
            service: true
          }
        },
        vendor: true,
        assignedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(vendorTickets);
  } catch (error) {
    console.error('Error fetching vendor tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor tickets' },
      { status: 500 }
    );
  }
}

// POST /api/vendors/[id]/tickets - Assign ticket to vendor
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.ticketId || !data.vendorTicketNumber) {
      return NextResponse.json(
        { error: 'Ticket ID and vendor ticket number are required' },
        { status: 400 }
      );
    }

    // Check if vendor exists and is active
    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id }
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (!vendor.isActive) {
      return NextResponse.json({ error: 'Vendor is not active' }, { status: 400 });
    }

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: data.ticketId },
      include: {
        service: true,
        branch: true
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if ticket is already assigned to a vendor
    const existingVendorTicket = await prisma.vendorTicket.findFirst({
      where: {
        ticketId: data.ticketId,
        status: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    });

    if (existingVendorTicket) {
      return NextResponse.json(
        { error: 'Ticket is already assigned to a vendor' },
        { status: 400 }
      );
    }

    // Create vendor ticket
    const vendorTicket = await prisma.vendorTicket.create({
      data: {
        ticketId: data.ticketId,
        vendorId: params.id,
        vendorTicketNumber: data.vendorTicketNumber,
        assignedById: session.user.id,
        status: 'IN_PROGRESS',
        notes: data.notes
      },
      include: {
        vendor: true,
        ticket: true
      }
    });

    // Update ticket status to PENDING_VENDOR
    await prisma.ticket.update({
      where: { id: data.ticketId },
      data: {
        status: 'PENDING_VENDOR',
        updatedAt: new Date()
      }
    });

    // Create a comment on the ticket
    await prisma.comment.create({
      data: {
        content: `Telah di Follow Up ke ${vendor.name} dengan Ticket ${data.vendorTicketNumber}`,
        ticketId: data.ticketId,
        userId: session.user.id,
        isInternal: false
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ASSIGN_TICKET_TO_VENDOR',
        entity: 'VendorTicket',
        entityId: vendorTicket.id,
        userId: session.user.id,
        newValues: {
          ticketNumber: ticket.ticketNumber,
          vendorName: vendor.name,
          vendorTicketNumber: data.vendorTicketNumber
        }
      }
    });

    return NextResponse.json(vendorTicket);
  } catch (error) {
    console.error('Error assigning ticket to vendor:', error);
    return NextResponse.json(
      { error: 'Failed to assign ticket to vendor' },
      { status: 500 }
    );
  }
}