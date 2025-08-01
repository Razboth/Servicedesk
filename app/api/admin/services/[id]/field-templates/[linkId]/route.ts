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
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: serviceId, linkId } = params;
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
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: serviceId, linkId } = params;

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

    // Delete the link
    await prisma.serviceFieldTemplate.delete({
      where: { id: linkId }
    });

    return NextResponse.json({ message: 'Field template unlinked successfully' });
  } catch (error) {
    console.error('Error deleting field template link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}