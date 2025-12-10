import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/shifts/[assignmentId]/report/issues - Create a new issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;
    const body = await request.json();

    // Get the shift report
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: true,
        shiftReport: true,
      },
    });

    if (!shiftAssignment?.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    if (!isAdmin && shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only update your own shift reports' },
        { status: 403 }
      );
    }

    // If ticket number is provided, look up the ticket
    let ticketId = null;
    let ticketNumber = body.ticketNumber || null;

    if (ticketNumber) {
      const ticket = await prisma.ticket.findUnique({
        where: { ticketNumber: ticketNumber },
        select: { id: true, ticketNumber: true },
      });

      if (ticket) {
        ticketId = ticket.id;
        ticketNumber = ticket.ticketNumber;
      }
    }

    // Create the issue
    const newIssue = await prisma.shiftIssue.create({
      data: {
        shiftReportId: shiftAssignment.shiftReport.id,
        title: body.title,
        description: body.description || null,
        status: body.status || 'ONGOING',
        priority: body.priority || 'MEDIUM',
        ticketId,
        ticketNumber,
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            service: { select: { name: true } },
            assignedTo: { select: { name: true } },
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: newIssue,
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT /api/shifts/[assignmentId]/report/issues - Update an issue
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Issue ID is required' },
        { status: 400 }
      );
    }

    // Get the shift report
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: true,
        shiftReport: true,
      },
    });

    if (!shiftAssignment?.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    if (!isAdmin && shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only update your own shift reports' },
        { status: 403 }
      );
    }

    // If ticket number is being updated, look up the ticket
    let ticketUpdateData: { ticketId?: string | null; ticketNumber?: string | null } = {};
    if (body.ticketNumber !== undefined) {
      if (body.ticketNumber) {
        const ticket = await prisma.ticket.findUnique({
          where: { ticketNumber: body.ticketNumber },
          select: { id: true, ticketNumber: true },
        });

        if (ticket) {
          ticketUpdateData.ticketId = ticket.id;
          ticketUpdateData.ticketNumber = ticket.ticketNumber;
        } else {
          // Ticket number provided but not found - still store it
          ticketUpdateData.ticketId = null;
          ticketUpdateData.ticketNumber = body.ticketNumber;
        }
      } else {
        // Clear ticket link
        ticketUpdateData.ticketId = null;
        ticketUpdateData.ticketNumber = null;
      }
    }

    // Update the issue
    const updatedIssue = await prisma.shiftIssue.update({
      where: { id: body.id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        description: body.description !== undefined ? body.description : undefined,
        status: body.status !== undefined ? body.status : undefined,
        priority: body.priority !== undefined ? body.priority : undefined,
        resolution: body.resolution !== undefined ? body.resolution : undefined,
        resolvedAt: body.status === 'RESOLVED' ? new Date() : body.status === 'ONGOING' ? null : undefined,
        ...ticketUpdateData,
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            service: { select: { name: true } },
            assignedTo: { select: { name: true } },
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedIssue,
    });
  } catch (error) {
    console.error('Error updating issue:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/shifts/[assignmentId]/report/issues - Delete an issue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get('id');

    if (!issueId) {
      return NextResponse.json(
        { error: 'Issue ID is required' },
        { status: 400 }
      );
    }

    // Get the shift report
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: true,
        shiftReport: true,
      },
    });

    if (!shiftAssignment?.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    if (!isAdmin && shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only update your own shift reports' },
        { status: 403 }
      );
    }

    // Delete the issue
    await prisma.shiftIssue.delete({
      where: { id: issueId },
    });

    return NextResponse.json({
      success: true,
      message: 'Issue deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting issue:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
