import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  helpText: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  tier1CategoryId: z.string().optional(),
  tier2SubcategoryId: z.string().optional(),
  tier3ItemId: z.string().optional(),
  supportGroup: z.enum(['IT_HELPDESK', 'NETWORK_TEAM', 'SECURITY_TEAM', 'VENDOR_SUPPORT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY']),
  estimatedHours: z.number().min(1).optional(),
  slaHours: z.number().min(1),
  requiresApproval: z.boolean().default(true),
  isConfidential: z.boolean().default(false),
  defaultTitle: z.string().optional(),
  defaultItilCategory: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).optional(),
  defaultIssueClassification: z.string().optional()
});

// GET /api/admin/services - Get all services with admin details
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const services = await prisma.service.findMany({
      include: {
        category: true,
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true,
        fields: {
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            tickets: true,
            serviceFieldTemplates: true
          }
        },
        serviceFieldTemplates: {
          include: {
            fieldTemplate: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/services - Create new service
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createServiceSchema.parse(body);

    // Check if service name already exists
    const existingService = await prisma.service.findFirst({
      where: {
        name: validatedData.name
      }
    });

    if (existingService) {
      return NextResponse.json(
        { error: 'Service with this name already exists' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.serviceCategory.findUnique({
      where: { id: validatedData.categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Create the service
    const service = await prisma.service.create({
      data: {
        ...validatedData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        category: true,
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true,
        fields: {
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}