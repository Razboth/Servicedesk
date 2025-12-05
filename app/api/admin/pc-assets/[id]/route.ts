import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Allow admin roles, TECH_SUPPORT, and PC_AUDITOR group members
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.user.role);
    const isTechSupport = session.user.supportGroupCode === 'TECH_SUPPORT';
    const isPCAuditor = session.user.supportGroupCode === 'PC_AUDITOR';

    if (!isAdmin && !isTechSupport && !isPCAuditor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pcAsset = await prisma.pCAsset.findUnique({
      where: { id: params.id },
      include: {
        branch: true,
        assignedTo: true,
        createdBy: true,
        operatingSystem: {
          select: {
            id: true,
            name: true,
            version: true,
            type: true
          }
        },
        officeProduct: {
          select: {
            id: true,
            name: true,
            version: true,
            type: true
          }
        },
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
        },
        osLicenses: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            osName: true,
            osVersion: true,
            licenseType: true,
            licenseKey: true,
            maxActivations: true,
            currentActivations: true
          }
        },
        officeLicenses: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            productName: true,
            productType: true,
            licenseType: true,
            licenseKey: true,
            maxUsers: true,
            currentUsers: true,
            expiryDate: true
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
    const existingPC = await prisma.pCAsset.findUnique({
      where: { id: params.id }
    });

    if (!existingPC) {
      return NextResponse.json({ error: 'PC asset not found' }, { status: 404 });
    }

    // Check for duplicate PC name if changed
    if (body.pcName && body.pcName !== existingPC.pcName) {
      const duplicateName = await prisma.pCAsset.findUnique({
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
      const duplicateTag = await prisma.pCAsset.findUnique({
        where: { assetTag: body.assetTag }
      });

      if (duplicateTag) {
        return NextResponse.json(
          { error: 'Asset tag already exists' },
          { status: 400 }
        );
      }
    }

    // Update PC asset with all fields including new ones
    const updatedPC = await prisma.pCAsset.update({
      where: { id: params.id },
      data: {
        pcName: body.pcName,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        processor: body.processor,
        ram: typeof body.ram === 'string' ? parseInt(body.ram) || 0 : body.ram,
        // New fields
        formFactor: body.formFactor || undefined,
        storageType: body.storageType || undefined,
        storageCapacity: body.storageCapacity,
        storageDevices: body.storageDevices,
        department: body.department,
        assignedUserName: body.assignedUserName,
        status: body.status || undefined,
        // Network
        macAddress: body.macAddress,
        ipAddress: body.ipAddress,
        // Location & Assignment
        branchId: body.branchId,
        assignedToId: body.assignedToId,
        // Purchase & Warranty
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
        purchaseOrderNumber: body.purchaseOrderNumber,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : undefined,
        assetTag: body.assetTag,
        // Operating System
        operatingSystemId: body.operatingSystemId,
        osLicenseType: body.osLicenseType,
        osProductKey: body.osProductKey,
        osInstallationDate: body.osInstallationDate ? new Date(body.osInstallationDate) : undefined,
        osSerialNumber: body.osSerialNumber,
        // Office Suite
        officeProductId: body.officeProductId,
        officeLicenseType: body.officeLicenseType,
        officeLicenseAccount: body.officeLicenseAccount,
        officeLicenseStatus: body.officeLicenseStatus,
        officeSerialNumber: body.officeSerialNumber,
        // Antivirus & Security
        antivirusName: body.antivirusName,
        antivirusVersion: body.antivirusVersion,
        antivirusLicenseExpiry: body.antivirusLicenseExpiry ? new Date(body.antivirusLicenseExpiry) : undefined,
        avRealTimeProtection: body.avRealTimeProtection,
        avDefinitionDate: body.avDefinitionDate ? new Date(body.avDefinitionDate) : undefined,
        // Metadata
        notes: body.notes,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        lastAuditDate: body.lastAuditDate ? new Date(body.lastAuditDate) : undefined
      },
      include: {
        branch: true,
        assignedTo: true,
        createdBy: true,
        operatingSystem: true,
        officeProduct: true
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
    const existingPC = await prisma.pCAsset.findUnique({
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
      const updatedPC = await prisma.pCAsset.update({
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
    await prisma.pCAsset.delete({
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