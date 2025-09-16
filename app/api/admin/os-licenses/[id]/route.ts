import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const license = await prisma.oSLicense.findUnique({
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
    console.error('Error fetching OS license:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OS license' },
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
    
    const updatedLicense = await prisma.oSLicense.update({
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
        action: 'UPDATE_OS_LICENSE',
        entityType: 'OSLicense',
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
    console.error('Error updating OS license:', error);
    return NextResponse.json(
      { error: 'Failed to update OS license' },
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
        entityType: 'OSLicense',
        entityId: params.id,
        userId: session.user.id,
        details: {
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