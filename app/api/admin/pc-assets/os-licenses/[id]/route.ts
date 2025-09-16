import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/os-licenses/[id] - Get single OS license
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await prisma.oSLicense.findUnique({
      where: { id: params.id },
      include: {
        pcAsset: true,
        branch: true,
        user: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    return NextResponse.json(license);
  } catch (error) {
    console.error('Error fetching OS license:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OS license' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pc-assets/os-licenses/[id] - Update OS license
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

    // Check if license exists
    const existingLicense = await prisma.oSLicense.findUnique({
      where: { id: params.id }
    });

    if (!existingLicense) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // Check for duplicate license key if changed
    if (data.licenseKey && data.licenseKey !== existingLicense.licenseKey) {
      const duplicate = await prisma.oSLicense.findUnique({
        where: { licenseKey: data.licenseKey }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'License key already exists' },
          { status: 400 }
        );
      }
    }

    const license = await prisma.oSLicense.update({
      where: { id: params.id },
      data: {
        name: data.name,
        osName: data.osName,
        osVersion: data.osVersion,
        licenseType: data.licenseType,
        licenseKey: data.licenseKey,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        cost: data.cost ? parseFloat(data.cost) : null,
        vendor: data.vendor,
        invoiceNumber: data.invoiceNumber,
        maxActivations: data.maxActivations,
        currentActivations: data.currentActivations,
        isActive: data.isActive,
        notes: data.notes,
        assignedToPC: data.assignedToPC,
        assignedToBranch: data.assignedToBranch,
        assignedToUser: data.assignedToUser
      },
      include: {
        pcAsset: true,
        branch: true,
        user: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_OS_LICENSE',
        entity: 'OSLicense',
        entityId: license.id,
        userId: session.user.id,
        oldValues: existingLicense,
        newValues: {
          name: license.name,
          osName: license.osName,
          licenseKey: license.licenseKey ? '***' : null
        }
      }
    });

    return NextResponse.json(license);
  } catch (error) {
    console.error('Error updating OS license:', error);
    return NextResponse.json(
      { error: 'Failed to update OS license' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pc-assets/os-licenses/[id] - Delete OS license
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if license exists
    const license = await prisma.oSLicense.findUnique({
      where: { id: params.id }
    });

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await prisma.oSLicense.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_OS_LICENSE',
        entity: 'OSLicense',
        entityId: license.id,
        userId: session.user.id,
        oldValues: {
          name: license.name,
          osName: license.osName
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting OS license:', error);
    return NextResponse.json(
      { error: 'Failed to delete OS license' },
      { status: 500 }
    );
  }
}