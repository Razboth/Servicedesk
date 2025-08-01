import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for creating tickets
const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  serviceId: z.string().min(1, 'Service is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  category: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).default('INCIDENT'),
  issueClassification: z.enum([
    'HUMAN_ERROR', 'SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE',
    'SECURITY_INCIDENT', 'DATA_ISSUE', 'PROCESS_GAP', 'EXTERNAL_FACTOR'
  ]).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  fieldValues: z.array(z.object({
    fieldId: z.string(),
    value: z.string()
  })).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    content: z.string() // base64 encoded content
  })).optional()
});

// GET /api/tickets - List tickets with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');

    // Build where clause based on user role and filters
    const where: any = {};
    
    // Role-based filtering
    if (session.user.role === 'USER') {
      where.createdById = session.user.id;
    } else if (session.user.role === 'TECHNICIAN') {
      where.OR = [
        { createdById: session.user.id },
        { assignedToId: session.user.id },
        { assignedToId: null } // Unassigned tickets
      ];
    }
    // ADMIN and MANAGER can see all tickets

    // Apply filters
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedToId = assignedTo;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          service: { select: { name: true } },
          createdBy: { select: { name: true, email: true } },
          assignedTo: { select: { name: true, email: true } },
          _count: { select: { comments: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.ticket.count({ where })
    ]);

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug logging for session
    console.log('Session user ID:', session.user.id);
    console.log('Session user:', JSON.stringify(session.user, null, 2));
    
    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true }
    });
    console.log('User exists in DB:', userExists);
    
    if (!userExists) {
      console.error('User not found in database:', session.user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    // Generate ticket number
    const ticketCount = await prisma.ticket.count();
    const ticketNumber = `TKT-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(4, '0')}`;

    // Determine initial status based on user role and approval workflow
    // Regular users' tickets go to PENDING_APPROVAL, managers and technicians bypass approval
    const initialStatus = (session.user.role === 'USER') ? 'PENDING_APPROVAL' : 'OPEN';

    // Handle file attachments
    const attachmentData = [];
    if (validatedData.attachments && validatedData.attachments.length > 0) {
      const fs = require('fs').promises;
      const path = require('path');
      
      for (const attachment of validatedData.attachments) {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets');
        await fs.mkdir(uploadsDir, { recursive: true });
        
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${attachment.filename}`;
        const filePath = path.join(uploadsDir, filename);
        
        // Save file
        const buffer = Buffer.from(attachment.content, 'base64');
        await fs.writeFile(filePath, buffer);
        
        attachmentData.push({
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          size: attachment.size,
          path: `uploads/tickets/${filename}`
        });
      }
    }

    // Create ticket with field values and attachments
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: validatedData.title,
        description: validatedData.description,
        serviceId: validatedData.serviceId,
        category: validatedData.category,
        issueClassification: validatedData.issueClassification,
        categoryId: validatedData.categoryId,
        subcategoryId: validatedData.subcategoryId,
        itemId: validatedData.itemId,
        priority: validatedData.priority,
        status: initialStatus,
        createdById: session.user.id,
        fieldValues: validatedData.fieldValues ? {
          create: validatedData.fieldValues
        } : undefined,
        attachments: attachmentData.length > 0 ? {
          create: attachmentData
        } : undefined
      },
      include: {
        service: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true } }
          }
        },
        attachments: true
      }
    });

    // Check if service has task templates and create tasks automatically
    const taskTemplates = await prisma.taskTemplate.findMany({
      where: { serviceId: validatedData.serviceId },
      include: {
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    // Create tasks from all task templates for this service
    if (taskTemplates.length > 0) {
      const tasksToCreate = [];
      
      for (const template of taskTemplates) {
        for (const item of template.items) {
          tasksToCreate.push({
            ticketId: ticket.id,
            taskTemplateItemId: item.id,
            status: 'PENDING'
          });
        }
      }

      if (tasksToCreate.length > 0) {
        await prisma.ticketTask.createMany({
          data: tasksToCreate
        });
      }
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}