import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']),
  actualMinutes: z.number().min(0).optional(),
  notes: z.string().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        assignedToId: true,
        createdById: true,
        branchId: true,
        service: {
          select: {
            supportGroupId: true
          }
        },
        createdBy: {
          select: {
            supportGroup: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
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
    let hasAccess = false;
    
    if (session.user.role === 'ADMIN') {
      // Super admin can see all
      hasAccess = true;
    } else if (session.user.role === 'MANAGER') {
      // Managers can see tasks from tickets in their branch
      hasAccess = userWithDetails?.branchId === ticket.branchId;
    } else if (session.user.role === 'TECHNICIAN') {
      // Technicians can see tasks from tickets they created, are assigned to, or match their support group
      const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
      const isSupportGroupMatch = !!(userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId);
      hasAccess = isCreatorOrAssignee || isSupportGroupMatch;
    } else if (session.user.role === 'USER') {
      // Users can only see tasks from their own tickets
      hasAccess = ticket.createdById === session.user.id;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tasks = await prisma.ticketTask.findMany({
      where: { ticketId: id },
      include: {
        taskTemplateItem: {
          select: {
            id: true,
            title: true,
            description: true,
            estimatedMinutes: true,
            isRequired: true,
            order: true
          }
        },
        completedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        taskTemplateItem: {
          order: 'asc'
        }
      }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching ticket tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskTemplateId } = body;

    if (!taskTemplateId) {
      return NextResponse.json(
        { error: 'Task template ID is required' },
        { status: 400 }
      );
    }

    // Verify ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        assignedToId: true,
        createdById: true,
        serviceId: true,
        createdBy: {
          select: {
            supportGroup: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Check if user can modify tasks
    const canModify = 
      session.user.role === 'ADMIN' ||
      ticket.assignedToId === session.user.id ||
      (session.user.role === 'MANAGER' && 
       ticket.createdBy?.supportGroup?.id === session.user.supportGroupId) ||
      ticket.createdById === session.user.id;

    if (!canModify) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get task template with items
    const taskTemplate = await prisma.taskTemplate.findUnique({
      where: { id: taskTemplateId },
      include: {
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!taskTemplate) {
      return NextResponse.json(
        { error: 'Task template not found' },
        { status: 404 }
      );
    }

    // Verify template belongs to the ticket's service
    if (taskTemplate.serviceId !== ticket.serviceId) {
      return NextResponse.json(
        { error: 'Task template does not match ticket service' },
        { status: 400 }
      );
    }

    // Create tasks from template
    const tasks = await Promise.all(
      taskTemplate.items.map(item => 
        prisma.ticketTask.create({
          data: {
            ticketId: id,
            taskTemplateItemId: item.id,
            status: 'PENDING'
          }
        })
      )
    );

    return NextResponse.json(tasks, { status: 201 });
  } catch (error) {
    console.error('Error creating ticket tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}