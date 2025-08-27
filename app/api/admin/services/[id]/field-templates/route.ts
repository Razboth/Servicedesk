import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/admin/services/[id]/field-templates - Get field templates for a service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: serviceId } = await params;

    // Get service field templates
    const serviceFieldTemplates = await prisma.serviceFieldTemplate.findMany({
      where: {
        serviceId: serviceId
      },
      include: {
        fieldTemplate: true
      },
      orderBy: {
        order: 'asc'
      }
    });

    return NextResponse.json(serviceFieldTemplates);
  } catch (error) {
    console.error('Error fetching service field templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/services/[id]/field-templates - Link a field template to a service
const linkSchema = z.object({
  fieldTemplateId: z.string(),
  order: z.number().int().min(0),
  isRequired: z.boolean().optional(),
  isUserVisible: z.boolean().optional(),
  helpText: z.string().optional(),
  placeholder: z.string().optional()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: serviceId } = await params;
    const body = await request.json();
    const validatedData = linkSchema.parse(body);

    // Check if service exists
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check if field template exists
    const fieldTemplate = await prisma.fieldTemplate.findUnique({
      where: { id: validatedData.fieldTemplateId }
    });

    if (!fieldTemplate) {
      return NextResponse.json({ error: 'Field template not found' }, { status: 404 });
    }

    // Check if already linked
    const existingLink = await prisma.serviceFieldTemplate.findUnique({
      where: {
        serviceId_fieldTemplateId: {
          serviceId: serviceId,
          fieldTemplateId: validatedData.fieldTemplateId
        }
      }
    });

    if (existingLink) {
      return NextResponse.json({ error: 'Field template already linked to this service' }, { status: 400 });
    }

    // Create the link
    const serviceFieldTemplate = await prisma.serviceFieldTemplate.create({
      data: {
        serviceId: serviceId,
        fieldTemplateId: validatedData.fieldTemplateId,
        order: validatedData.order,
        isRequired: validatedData.isRequired ?? fieldTemplate.isRequired,
        isUserVisible: validatedData.isUserVisible ?? true,
        helpText: validatedData.helpText
      },
      include: {
        fieldTemplate: true
      }
    });

    return NextResponse.json(serviceFieldTemplate, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error linking field template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/services/[id]/field-templates - Unlink a field template from a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: serviceId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const fieldTemplateId = searchParams.get('fieldTemplateId');

    if (!fieldTemplateId) {
      return NextResponse.json({ error: 'fieldTemplateId is required' }, { status: 400 });
    }

    // Check if link exists
    const existingLink = await prisma.serviceFieldTemplate.findUnique({
      where: {
        serviceId_fieldTemplateId: {
          serviceId: serviceId,
          fieldTemplateId: fieldTemplateId
        }
      }
    });

    if (!existingLink) {
      return NextResponse.json({ error: 'Field template link not found' }, { status: 404 });
    }

    // Delete the link
    await prisma.serviceFieldTemplate.delete({
      where: {
        serviceId_fieldTemplateId: {
          serviceId: serviceId,
          fieldTemplateId: fieldTemplateId
        }
      }
    });

    return NextResponse.json({ message: 'Field template unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking field template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/services/[id]/field-templates - Update multiple field templates
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: serviceId } = await params;
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 });
    }

    // Update each field template link
    const updatePromises = updates.map(update => 
      prisma.serviceFieldTemplate.update({
        where: { id: update.id },
        data: {
          order: update.order,
          isRequired: update.isRequired,
          isUserVisible: update.isUserVisible,
          helpText: update.helpText,
          defaultValue: update.defaultValue
        }
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ message: 'Field templates updated successfully' });
  } catch (error) {
    console.error('Error updating field templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}