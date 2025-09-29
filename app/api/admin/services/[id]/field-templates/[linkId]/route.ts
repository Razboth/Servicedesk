import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// PATCH /api/admin/services/[id]/field-templates/[linkId] - Update a field template link
const updateSchema = z.object({
  order: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
  isUserVisible: z.boolean().optional(),
  helpText: z.string().nullable().optional(),
  placeholder: z.string().nullable().optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: serviceId, linkId } = await params;
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Check if link exists
    const existingLink = await prisma.serviceFieldTemplate.findFirst({
      where: {
        id: linkId,
        serviceId: serviceId
      }
    });

    if (!existingLink) {
      return NextResponse.json({ error: 'Field template link not found' }, { status: 404 });
    }

    // Update the link
    const updatedLink = await prisma.serviceFieldTemplate.update({
      where: { id: linkId },
      data: validatedData,
      include: {
        fieldTemplate: true
      }
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating field template link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/services/[id]/field-templates/[linkId] - Remove a field template from a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: serviceId, linkId } = await params;

    // Check if link exists and get detailed info
    const existingLink = await prisma.serviceFieldTemplate.findFirst({
      where: {
        id: linkId,
        serviceId: serviceId
      },
      include: {
        fieldTemplate: {
          select: {
            id: true,
            name: true,
            label: true
          }
        },
        service: {
          select: {
            name: true
          }
        }
      }
    });

    if (!existingLink) {
      return NextResponse.json({ error: 'Field template link not found' }, { status: 404 });
    }

    // Delete the link
    await prisma.serviceFieldTemplate.delete({
      where: { id: linkId }
    });

    // Verify complete removal
    const remainingLink = await prisma.serviceFieldTemplate.findUnique({
      where: { id: linkId }
    });

    if (remainingLink) {
      console.error(`Warning: Field template link ${linkId} still exists after deletion`);
    }

    // Update service timestamp
    await prisma.service.update({
      where: { id: serviceId },
      data: { updatedAt: new Date() }
    });

    // Create audit log for the deletion
    try {
      const { createAuditLog } = await import('@/lib/audit-logger');
      await createAuditLog({
        action: 'service_field_template_unlink',
        userId: session.user.id,
        resourceType: 'serviceFieldTemplate',
        resourceId: linkId,
        details: {
          fieldTemplateName: existingLink.fieldTemplate.name,
          fieldTemplateLabel: existingLink.fieldTemplate.label,
          fieldTemplateId: existingLink.fieldTemplate.id,
          serviceName: existingLink.service.name,
          serviceId: serviceId
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({
      message: 'Field template unlinked successfully',
      templateName: existingLink.fieldTemplate.name,
      serviceName: existingLink.service.name
    });
  } catch (error) {
    console.error('Error deleting field template link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}