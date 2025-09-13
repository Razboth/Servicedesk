import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.supportGroupCode !== 'TECH_SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const license = await prisma.officeLicense.findUnique({
      where: { id: params.id },
      include: {
        pcAsset: true,
        branch: true,
        user: true,
        createdByUser: true
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.supportGroupCode !== 'TECH_SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    const updatedLicense = await prisma.officeLicense.update({
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
        assignedToPC: data.assignedToPC || null,
        assignedToBranch: data.assignedToBranch || null,
        assignedToUser: data.assignedToUser || null
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
        entityType: 'OfficeLicense',
        entityId: updatedLicense.id,
        userId: session.user.id,
        details: {
          name: updatedLicense.name,
          changes: data
        }
      }
    });

    return NextResponse.json(updatedLicense);
  } catch (error) {
    console.error('Error updating Office license:', error);
    return NextResponse.json(
      { error: 'Failed to update Office license' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        entityType: 'OfficeLicense',
        entityId: params.id,
        userId: session.user.id,
        details: {
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