import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/admin/services/[id]/fields/[fieldId] - Delete a single field
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: serviceId, fieldId } = params;

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

    // Delete the field
    await prisma.serviceField.delete({
      where: { id: fieldId }
    });

    // Update service updated timestamp
    await prisma.service.update({
      where: { id: serviceId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ message: 'Field deleted successfully' });
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
  { params }: { params: { id: string; fieldId: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: serviceId, fieldId } = params;
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