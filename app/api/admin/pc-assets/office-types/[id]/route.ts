import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/office-types/[id] - Get single Office type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const office = await prisma.officeProduct.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            pcAssets: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!office) {
      return NextResponse.json({ error: 'Office type not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...office,
      usageCount: office._count.pcAssets
    });
  } catch (error) {
    console.error('Error fetching Office type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Office type' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pc-assets/office-types/[id] - Update Office type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check if Office type exists
    const existingOffice = await prisma.officeProduct.findUnique({
      where: { id: params.id }
    });

    if (!existingOffice) {
      return NextResponse.json({ error: 'Office type not found' }, { status: 404 });
    }

    // Check for duplicate if name or version changed
    if (data.name !== existingOffice.name || data.version !== existingOffice.version) {
      const duplicate = await prisma.officeProduct.findFirst({
        where: {
          name: data.name,
          version: data.version || null,
          NOT: { id: params.id }
        }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'Office type with this name and version already exists' },
          { status: 400 }
        );
      }
    }

    const office = await prisma.officeProduct.update({
      where: { id: params.id },
      data: {
        name: data.name,
        version: data.version || null,
        type: data.type,
        edition: data.edition || null,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive
      },
      include: {
        _count: {
          select: {
            pcAssets: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_OFFICE_TYPE',
        entity: 'OfficeProduct',
        entityId: office.id,
        userId: session.user.id,
        oldValues: existingOffice,
        newValues: {
          name: office.name,
          version: office.version,
          type: office.type
        }
      }
    });

    return NextResponse.json({
      ...office,
      usageCount: office._count.pcAssets
    });
  } catch (error) {
    console.error('Error updating Office type:', error);
    return NextResponse.json(
      { error: 'Failed to update Office type' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pc-assets/office-types/[id] - Delete Office type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Office type exists
    const office = await prisma.officeProduct.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            pcAssets: true
          }
        }
      }
    });

    if (!office) {
      return NextResponse.json({ error: 'Office type not found' }, { status: 404 });
    }

    // Don't allow deletion if in use
    if (office._count.pcAssets > 0) {
      return NextResponse.json(
        { error: `Cannot delete Office type that is in use by ${office._count.pcAssets} PC asset(s)` },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.officeProduct.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_OFFICE_TYPE',
        entity: 'OfficeProduct',
        entityId: office.id,
        userId: session.user.id,
        oldValues: {
          name: office.name,
          version: office.version
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Office type:', error);
    return NextResponse.json(
      { error: 'Failed to delete Office type' },
      { status: 500 }
    );
  }
}