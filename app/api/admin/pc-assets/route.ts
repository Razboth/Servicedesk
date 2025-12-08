import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/pc-assets - List all PC assets
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const assignedToId = searchParams.get('assignedToId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const includeServiceLogs = searchParams.get('includeServiceLogs') === 'true';

    // New filter parameters
    const status = searchParams.get('status');
    const formFactor = searchParams.get('formFactor');
    const warrantyStatus = searchParams.get('warrantyStatus');

    const where: any = {};

    if (branchId) where.branchId = branchId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (isActive !== null) where.isActive = isActive === 'true';

    // Apply new filters
    if (status) where.status = status;
    if (formFactor) where.formFactor = formFactor;

    // Warranty status filter
    if (warrantyStatus) {
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      if (warrantyStatus === 'EXPIRING') {
        where.warrantyExpiry = { gte: today, lte: thirtyDaysFromNow };
      } else if (warrantyStatus === 'EXPIRED') {
        where.warrantyExpiry = { lt: today };
      } else if (warrantyStatus === 'ACTIVE') {
        where.warrantyExpiry = { gt: thirtyDaysFromNow };
      }
    }

    if (search) {
      where.OR = [
        { pcName: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { macAddress: { contains: search, mode: 'insensitive' } },
        { assignedUserName: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pcAssets = await prisma.pCAsset.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
        _count: {
          select: {
            serviceLogs: true,
            hardeningChecklists: true,
            osLicenses: true,
            officeLicenses: true
          }
        },
        ...(includeServiceLogs && {
          serviceLogs: {
            take: 5,
            orderBy: { performedAt: 'desc' },
            include: {
              performedBy: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        })
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(pcAssets);
  } catch (error) {
    console.error('Error fetching PC assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PC assets' },
      { status: 500 }
    );
  }
}

// POST /api/admin/pc-assets - Create new PC asset
export async function POST(request: Request) {
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
    
    // Validate required fields
    const requiredFields = ['pcName', 'brand', 'processor', 'ram', 'branchId'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate PC name
    const existingPC = await prisma.pCAsset.findUnique({
      where: { pcName: body.pcName }
    });

    if (existingPC) {
      return NextResponse.json(
        { error: 'PC with this name already exists' },
        { status: 400 }
      );
    }

    // Check for duplicate asset tag if provided
    if (body.assetTag) {
      const existingAssetTag = await prisma.pCAsset.findUnique({
        where: { assetTag: body.assetTag }
      });

      if (existingAssetTag) {
        return NextResponse.json(
          { error: 'Asset tag already exists' },
          { status: 400 }
        );
      }
    }

    // Create PC asset with new fields
    const pcAsset = await prisma.pCAsset.create({
      data: {
        pcName: body.pcName,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        processor: body.processor,
        ram: parseInt(body.ram) || 0,
        formFactor: body.formFactor || null,
        storageType: body.storageType || null,
        storageCapacity: body.storageCapacity,
        storageDevices: body.storageDevices || null,
        macAddress: body.macAddress,
        ipAddress: body.ipAddress,
        branchId: body.branchId,
        department: body.department,
        assignedToId: body.assignedToId,
        assignedUserName: body.assignedUserName,
        status: body.status || 'IN_USE',
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseOrderNumber: body.purchaseOrderNumber,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        assetTag: body.assetTag,
        // Operating System
        operatingSystemId: body.operatingSystemId,
        osLicenseType: body.osLicenseType,
        osProductKey: body.osProductKey,
        osInstallationDate: body.osInstallationDate ? new Date(body.osInstallationDate) : null,
        osSerialNumber: body.osSerialNumber,
        // Office Suite
        officeProductId: body.officeProductId,
        officeLicenseType: body.officeLicenseType,
        officeLicenseAccount: body.officeLicenseAccount,
        officeLicenseStatus: body.officeLicenseStatus,
        officeSerialNumber: body.officeSerialNumber,
        // Antivirus
        antivirusName: body.antivirusName,
        antivirusVersion: body.antivirusVersion,
        antivirusLicenseExpiry: body.antivirusLicenseExpiry ? new Date(body.antivirusLicenseExpiry) : null,
        avRealTimeProtection: body.avRealTimeProtection ?? true,
        avDefinitionDate: body.avDefinitionDate ? new Date(body.avDefinitionDate) : null,
        // Metadata
        notes: body.notes,
        createdById: session.user.id,
        isActive: true
      },
      include: {
        branch: true,
        assignedTo: true,
        createdBy: true,
        operatingSystem: true,
        officeProduct: true
      }
    });

    // Assign OS License if provided
    if (body.osLicenseId) {
      await prisma.oSLicense.update({
        where: { id: body.osLicenseId },
        data: {
          assignedToPC: pcAsset.id,
          currentActivations: { increment: 1 }
        }
      });
    }

    // Assign Office License if provided
    if (body.officeLicenseId) {
      await prisma.officeLicense.update({
        where: { id: body.officeLicenseId },
        data: {
          assignedToPC: pcAsset.id,
          currentUsers: { increment: 1 }
        }
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'PC_ASSET',
        entityId: pcAsset.id,
        details: `Created PC asset: ${pcAsset.pcName}`,
        userId: session.user.id,
        metadata: {
          pcName: pcAsset.pcName,
          brand: pcAsset.brand,
          branch: pcAsset.branch.name
        }
      }
    });

    return NextResponse.json(pcAsset, { status: 201 });
  } catch (error: any) {
    console.error('Error creating PC asset:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to create PC asset', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}