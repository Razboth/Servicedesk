import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/os-types/[id] - Get single OS type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const os = await prisma.operatingSystem.findUnique({
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

    if (!os) {
      return NextResponse.json({ error: 'OS type not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...os,
      usageCount: os._count.pcAssets
    });
  } catch (error) {
    console.error('Error fetching OS type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OS type' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pc-assets/os-types/[id] - Update OS type
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

    // Check if OS type exists
    const existingOS = await prisma.operatingSystem.findUnique({
      where: { id: params.id }
    });

    if (!existingOS) {
      return NextResponse.json({ error: 'OS type not found' }, { status: 404 });
    }

    // Check for duplicate if name or version changed
    if (data.name !== existingOS.name || data.version !== existingOS.version) {
      const duplicate = await prisma.operatingSystem.findFirst({
        where: {
          name: data.name,
          version: data.version || null,
          NOT: { id: params.id }
        }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'OS type with this name and version already exists' },
          { status: 400 }
        );
      }
    }

    const os = await prisma.operatingSystem.update({
      where: { id: params.id },
      data: {
        name: data.name,
        version: data.version || null,
        type: data.type,
        architecture: data.architecture || null,
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
        action: 'UPDATE_OS_TYPE',
        entity: 'OperatingSystem',
        entityId: os.id,
        userId: session.user.id,
        oldValues: existingOS,
        newValues: {
          name: os.name,
          version: os.version,
          type: os.type
        }
      }
    });

    return NextResponse.json({
      ...os,
      usageCount: os._count.pcAssets
    });
  } catch (error) {
    console.error('Error updating OS type:', error);
    return NextResponse.json(
      { error: 'Failed to update OS type' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pc-assets/os-types/[id] - Delete OS type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if OS type exists
    const os = await prisma.operatingSystem.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            pcAssets: true
          }
        }
      }
    });

    if (!os) {
      return NextResponse.json({ error: 'OS type not found' }, { status: 404 });
    }

    // Don't allow deletion if in use
    if (os._count.pcAssets > 0) {
      return NextResponse.json(
        { error: `Cannot delete OS type that is in use by ${os._count.pcAssets} PC asset(s)` },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.operatingSystem.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_OS_TYPE',
        entity: 'OperatingSystem',
        entityId: os.id,
        userId: session.user.id,
        oldValues: {
          name: os.name,
          version: os.version
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting OS type:', error);
    return NextResponse.json(
      { error: 'Failed to delete OS type' },
      { status: 500 }
    );
  }
}