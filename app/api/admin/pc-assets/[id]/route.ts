import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/admin/pc-assets/[id] - Get single PC asset
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pcAsset = await prisma.PCAsset.findUnique({
      where: { id: params.id },
      include: {
        branch: true,
        assignedTo: true,
        createdBy: true,
        serviceLogs: {
          orderBy: { performedAt: 'desc' },
          include: {
            performedBy: true,
            ticket: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                status: true
              }
            }
          }
        },
        hardeningChecklists: {
          orderBy: { startedAt: 'desc' },
          include: {
            template: true,
            performedBy: true,
            checklistResults: {
              include: {
                checklistItem: true
              }
            }
          }
        }
      }
    });

    if (!pcAsset) {
      return NextResponse.json({ error: 'PC asset not found' }, { status: 404 });
    }

    return NextResponse.json(pcAsset);
  } catch (error) {
    console.error('Error fetching PC asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PC asset' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/pc-assets/[id] - Update PC asset
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow admin roles and TECH_SUPPORT group members
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.user.role);
    const isTechSupport = session.user.supportGroupCode === 'TECH_SUPPORT';
    
    if (!isAdmin && !isTechSupport) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Check if PC exists
    const existingPC = await prisma.PCAsset.findUnique({
      where: { id: params.id }
    });

    if (!existingPC) {
      return NextResponse.json({ error: 'PC asset not found' }, { status: 404 });
    }

    // Check for duplicate PC name if changed
    if (body.pcName && body.pcName !== existingPC.pcName) {
      const duplicateName = await prisma.PCAsset.findUnique({
        where: { pcName: body.pcName }
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: 'PC with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate asset tag if changed
    if (body.assetTag && body.assetTag !== existingPC.assetTag) {
      const duplicateTag = await prisma.PCAsset.findUnique({
        where: { assetTag: body.assetTag }
      });

      if (duplicateTag) {
        return NextResponse.json(
          { error: 'Asset tag already exists' },
          { status: 400 }
        );
      }
    }

    // Update PC asset
    const updatedPC = await prisma.PCAsset.update({
      where: { id: params.id },
      data: {
        pcName: body.pcName,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        processor: body.processor,
        ram: body.ram,
        storageDevices: body.storageDevices,
        macAddress: body.macAddress,
        ipAddress: body.ipAddress,
        branchId: body.branchId,
        assignedToId: body.assignedToId,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
        purchaseOrderNumber: body.purchaseOrderNumber,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
        assetTag: body.assetTag,
        osName: body.osName,
        osVersion: body.osVersion,
        osLicenseType: body.osLicenseType,
        osSerialNumber: body.osSerialNumber,
        officeProduct: body.officeProduct,
        officeVersion: body.officeVersion,
        officeProductType: body.officeProductType,
        officeLicenseType: body.officeLicenseType,
        officeSerialNumber: body.officeSerialNumber,
        antivirusName: body.antivirusName,
        antivirusVersion: body.antivirusVersion,
        antivirusLicenseExpiry: body.antivirusLicenseExpiry ? new Date(body.antivirusLicenseExpiry) : undefined,
        notes: body.notes,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        lastAuditDate: body.lastAuditDate ? new Date(body.lastAuditDate) : undefined
      },
      include: {
        branch: true,
        assignedTo: true,
        createdBy: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'PC_ASSET',
        entityId: updatedPC.id,
        details: `Updated PC asset: ${updatedPC.pcName}`,
        userId: session.user.id,
        metadata: {
          changes: body,
          previousValues: existingPC
        }
      }
    });

    return NextResponse.json(updatedPC);
  } catch (error) {
    console.error('Error updating PC asset:', error);
    return NextResponse.json(
      { error: 'Failed to update PC asset' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pc-assets/[id] - Delete PC asset
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow only super admin and admin for deletion
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if PC exists
    const existingPC = await prisma.PCAsset.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            serviceLogs: true,
            hardeningChecklists: true
          }
        }
      }
    });

    if (!existingPC) {
      return NextResponse.json({ error: 'PC asset not found' }, { status: 404 });
    }

    // Don't delete if there are service logs or hardening checklists
    if (existingPC._count.serviceLogs > 0 || existingPC._count.hardeningChecklists > 0) {
      // Soft delete instead
      const updatedPC = await prisma.PCAsset.update({
        where: { id: params.id },
        data: { isActive: false }
      });

      await prisma.auditLog.create({
        data: {
          action: 'DEACTIVATE',
          entityType: 'PC_ASSET',
          entityId: params.id,
          details: `Deactivated PC asset: ${existingPC.pcName} (has related records)`,
          userId: session.user.id
        }
      });

      return NextResponse.json({ 
        message: 'PC asset deactivated (soft delete due to related records)',
        pcAsset: updatedPC 
      });
    }

    // Hard delete if no related records
    await prisma.PCAsset.delete({
      where: { id: params.id }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'PC_ASSET',
        entityId: params.id,
        details: `Deleted PC asset: ${existingPC.pcName}`,
        userId: session.user.id,
        metadata: existingPC
      }
    });

    return NextResponse.json({ message: 'PC asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting PC asset:', error);
    return NextResponse.json(
      { error: 'Failed to delete PC asset' },
      { status: 500 }
    );
  }
}