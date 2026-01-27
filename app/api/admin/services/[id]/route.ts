import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  helpText: z.string().optional(),
  defaultTitle: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  itemId: z.string().optional(),
  tier1CategoryId: z.string().optional(),
  tier2SubcategoryId: z.string().optional(),
  tier3ItemId: z.string().optional(),
  supportGroupId: z.string().optional(), // Changed from supportGroup enum to supportGroupId
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY']).optional(),
  defaultItilCategory: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST']).optional(),
  estimatedHours: z.number().min(1).optional(),
  slaHours: z.number().min(1).optional(),
  requiresApproval: z.boolean().optional(),
  isConfidential: z.boolean().optional(),
  isActive: z.boolean().optional()
});

// GET /api/admin/services/[id] - Get specific service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true,
        supportGroup: true, // Include support group
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

    if (!service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/services/[id] - Update service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateServiceSchema.parse(body);

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existingService.name) {
      const duplicateService = await prisma.service.findFirst({
        where: {
          name: validatedData.name,
          id: { not: id }
        }
      });

      if (duplicateService) {
        return NextResponse.json(
          { error: 'Service with this name already exists' },
          { status: 400 }
        );
      }
    }

    // If updating category, verify it exists
    if (validatedData.categoryId) {
      const category = await prisma.serviceCategory.findUnique({
        where: { id: validatedData.categoryId }
      });

      if (!category) {
        return NextResponse.json(
          { error: 'Invalid category' },
          { status: 400 }
        );
      }
    }

    // Validate support group if provided
    if (validatedData.supportGroupId) {
      const supportGroup = await prisma.supportGroup.findUnique({
        where: { id: validatedData.supportGroupId }
      });

      if (!supportGroup) {
        return NextResponse.json(
          { error: 'Invalid support group' },
          { status: 400 }
        );
      }
    }

    // Prepare update data - if name is being updated, also update defaultTitle
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };

    // If name is being updated, also update defaultTitle to match
    if (validatedData.name) {
      updateData.defaultTitle = validatedData.name;
    }

    // Update the service
    const updatedService = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true,
        supportGroup: true, // Include support group
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

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error('Error updating service:', error);
    
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

// DELETE /api/admin/services/[id] - Delete service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if service exists
    const existingService = await prisma.service.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tickets: true
          }
        }
      }
    });

    if (!existingService) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if service has associated tickets
    if (existingService._count.tickets > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete service with ${existingService._count.tickets} associated tickets. Please deactivate instead.` 
        },
        { status: 400 }
      );
    }

    // Delete associated fields first
    await prisma.serviceField.deleteMany({
      where: { serviceId: id }
    });

    // Delete the service
    await prisma.service.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Service deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}