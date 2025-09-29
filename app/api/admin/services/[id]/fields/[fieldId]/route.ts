import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/services/[id]/fields/[fieldId] - Delete a single field
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const { id: serviceId, fieldId } = await params;
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if field exists and belongs to the service
    const existingField = await prisma.serviceField.findFirst({
      where: {
        id: fieldId,
        serviceId: serviceId
      },
      select: {
        id: true,
        name: true,
        serviceId: true,
        _count: {
          select: {
            fieldValues: true
          }
        }
      }
    });

    if (!existingField) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }

    // Check for existing ticket field values
    const hasTicketData = existingField._count.fieldValues > 0;

    // Get service info for audit logging
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { name: true }
    });

    // Delete the field (CASCADE will automatically delete related TicketFieldValues)
    await prisma.serviceField.delete({
      where: { id: fieldId }
    });

    // Verify complete removal
    const remainingField = await prisma.serviceField.findUnique({
      where: { id: fieldId }
    });

    if (remainingField) {
      console.error(`Warning: Field ${fieldId} still exists after deletion`);
    }

    // Update service updated timestamp
    await prisma.service.update({
      where: { id: serviceId },
      data: { updatedAt: new Date() }
    });

    // Create audit log for the deletion
    try {
      const { createAuditLog } = await import('@/lib/audit-logger');
      await createAuditLog({
        action: 'service_field_delete',
        userId: session.user.id,
        resourceType: 'serviceField',
        resourceId: fieldId,
        details: {
          fieldName: existingField.name,
          serviceName: service?.name || 'Unknown Service',
          serviceId: serviceId,
          hadTicketData: hasTicketData,
          ticketFieldValuesDeleted: existingField._count.fieldValues
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({
      message: 'Field deleted successfully',
      deletedFieldValues: existingField._count.fieldValues,
      fieldName: existingField.name
    });
  } catch (error) {
    console.error('Error deleting service field:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/services/[id]/fields/[fieldId] - Update a single field
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fieldId: string }> }
) {
  try {
    const { id: serviceId, fieldId } = await params;
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const body = await request.json();

    // Check if field exists and belongs to the service
    const existingField = await prisma.serviceField.findFirst({
      where: {
        id: fieldId,
        serviceId: serviceId
      }
    });

    if (!existingField) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }

    // Update the field
    const updatedField = await prisma.serviceField.update({
      where: { id: fieldId },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });

    // Update service updated timestamp
    await prisma.service.update({
      where: { id: serviceId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json(updatedField);
  } catch (error) {
    console.error('Error updating service field:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}