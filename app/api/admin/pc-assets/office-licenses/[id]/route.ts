import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/office-licenses/[id] - Get single Office license
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await prisma.officeLicense.findUnique({
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
    console.error('Error fetching Office license:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Office license' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pc-assets/office-licenses/[id] - Update Office license
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
    const existingLicense = await prisma.officeLicense.findUnique({
      where: { id: params.id }
    });

    if (!existingLicense) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // Check for duplicate license key if changed
    if (data.licenseKey && data.licenseKey !== existingLicense.licenseKey) {
      const duplicate = await prisma.officeLicense.findUnique({
        where: { licenseKey: data.licenseKey }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'License key already exists' },
          { status: 400 }
        );
      }
    }

    const license = await prisma.officeLicense.update({
      where: { id: params.id },
      data: {
        name: data.name,
        productName: data.productName,
        productType: data.productType,
        licenseType: data.licenseType,
        licenseKey: data.licenseKey,
        subscriptionId: data.subscriptionId,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        cost: data.cost ? parseFloat(data.cost) : null,
        costPeriod: data.costPeriod,
        vendor: data.vendor,
        invoiceNumber: data.invoiceNumber,
        maxUsers: data.maxUsers,
        currentUsers: data.currentUsers,
        isActive: data.isActive,
        autoRenew: data.autoRenew,
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
        action: 'UPDATE_OFFICE_LICENSE',
        entity: 'OfficeLicense',
        entityId: license.id,
        userId: session.user.id,
        oldValues: existingLicense,
        newValues: {
          name: license.name,
          productName: license.productName,
          licenseKey: license.licenseKey ? '***' : null
        }
      }
    });

    return NextResponse.json(license);
  } catch (error) {
    console.error('Error updating Office license:', error);
    return NextResponse.json(
      { error: 'Failed to update Office license' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pc-assets/office-licenses/[id] - Delete Office license
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
    const license = await prisma.officeLicense.findUnique({
      where: { id: params.id }
    });

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await prisma.officeLicense.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_OFFICE_LICENSE',
        entity: 'OfficeLicense',
        entityId: license.id,
        userId: session.user.id,
        oldValues: {
          name: license.name,
          productName: license.productName
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Office license:', error);
    return NextResponse.json(
      { error: 'Failed to delete Office license' },
      { status: 500 }
    );
  }
}