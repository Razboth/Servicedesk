import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/branch/atm-claims/[id]/assign - Assign claim to branch staff
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can assign tasks
    if (!['MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only managers can assign tasks' }, { status: 403 });
    }

    const body = await request.json();
    const { assignToId, taskType, instructions, dueHours = 4 } = body;

    // Validate ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { 
        branch: true,
        atmClaimVerification: true
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get manager's branch
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true }
    });

    // Verify manager is from the same branch as the ticket
    if (manager?.branchId !== ticket.branchId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only assign tasks for your branch' },
        { status: 403 }
      );
    }

    // Verify assignee is from the same branch
    const assignee = await prisma.user.findUnique({
      where: { id: assignToId },
      select: { branchId: true, name: true }
    });

    if (assignee?.branchId !== ticket.branchId) {
      return NextResponse.json(
        { error: 'Can only assign to staff from the same branch' },
        { status: 400 }
      );
    }

    // Cancel any existing active assignments for this ticket
    await prisma.branchAssignment.updateMany({
      where: {
        ticketId: id,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
      },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    // Create new assignment
    const assignment = await prisma.branchAssignment.create({
      data: {
        ticketId: id,
        branchId: ticket.branchId!,
        assignedToId: assignToId,
        assignedById: session.user.id,
        taskType: taskType || 'VERIFY_CLAIM',
        dueTime: new Date(Date.now() + (dueHours * 60 * 60 * 1000)),
        priority: ticket.priority,
        instructions,
        status: 'ASSIGNED'
      },
      include: {
        assignedTo: { select: { name: true, email: true } },
        assignedBy: { select: { name: true } }
      }
    });

    // Update ticket if not already assigned
    if (!ticket.assignedToId) {
      await prisma.ticket.update({
        where: { id },
        data: {
          assignedToId: assignToId,
          status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status
        }
      });
    }

    // Add comment about assignment
    await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        content: `Task assigned to ${assignee.name} - Type: ${taskType || 'VERIFY_CLAIM'}${instructions ? `\nInstructions: ${instructions}` : ''}`,
        isInternal: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ASSIGN_TASK',
        entity: 'BRANCH_ASSIGNMENT',
        entityId: assignment.id,
        oldValues: {},
        newValues: {
          assignedTo: assignee.name,
          taskType,
          dueTime: assignment.dueTime
        }
      }
    });

    return NextResponse.json({
      success: true,
      assignment,
      message: `Task assigned to ${assignee.name}`
    });

  } catch (error) {
    console.error('Error assigning task:', error);
    return NextResponse.json(
      { error: 'Failed to assign task' },
      { status: 500 }
    );
  }
}

// GET /api/branch/atm-claims/[id]/assign - Get assignment history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignments = await prisma.branchAssignment.findMany({
      where: { ticketId: id },
      include: {
        assignedTo: { select: { name: true, email: true } },
        assignedBy: { select: { name: true } },
        branch: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(assignments);

  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}