import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/antivirus-licenses/[id] - Get single Antivirus license
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await prisma.antivirusLicense.findUnique({
      where: { id: params.id },
      include: {
        pcAsset: true,
        branch: true,
        user: true
      }
    });

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    return NextResponse.json(license);
  } catch (error) {
    console.error('Error fetching Antivirus license:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Antivirus license' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pc-assets/antivirus-licenses/[id] - Update Antivirus license
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
    const existingLicense = await prisma.antivirusLicense.findUnique({
      where: { id: params.id }
    });

    if (!existingLicense) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // Check for duplicate license key if changed
    if (data.licenseKey && data.licenseKey !== existingLicense.licenseKey) {
      const duplicate = await prisma.antivirusLicense.findUnique({
        where: { licenseKey: data.licenseKey }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'License key already exists' },
          { status: 400 }
        );
      }
    }

    const license = await prisma.antivirusLicense.update({
      where: { id: params.id },
      data: {
        name: data.name,
        productName: data.productName,
        productVersion: data.productVersion,
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
        maxDevices: data.maxDevices,
        currentDevices: data.currentDevices,
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
        action: 'UPDATE_ANTIVIRUS_LICENSE',
        entity: 'AntivirusLicense',
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
    console.error('Error updating Antivirus license:', error);
    return NextResponse.json(
      { error: 'Failed to update Antivirus license' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pc-assets/antivirus-licenses/[id] - Delete Antivirus license
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
    const license = await prisma.antivirusLicense.findUnique({
      where: { id: params.id }
    });

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    await prisma.antivirusLicense.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_ANTIVIRUS_LICENSE',
        entity: 'AntivirusLicense',
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
    console.error('Error deleting Antivirus license:', error);
    return NextResponse.json(
      { error: 'Failed to delete Antivirus license' },
      { status: 500 }
    );
  }
}