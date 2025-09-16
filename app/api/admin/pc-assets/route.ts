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

    // Allow admin roles and TECH_SUPPORT group members
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(session.user.role);
    const isTechSupport = session.user.supportGroupCode === 'TECH_SUPPORT';
    
    if (!isAdmin && !isTechSupport) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const assignedToId = searchParams.get('assignedToId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const includeServiceLogs = searchParams.get('includeServiceLogs') === 'true';

    const where: any = {};

    if (branchId) where.branchId = branchId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (isActive !== null) where.isActive = isActive === 'true';
    
    if (search) {
      where.OR = [
        { pcName: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { macAddress: { contains: search, mode: 'insensitive' } }
      ];
    }

    const pcAssets = await prisma.PCAsset.findMany({
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
    const requiredFields = ['pcName', 'brand', 'processor', 'ram', 'branchId', 'osName', 'osLicenseType'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate PC name
    const existingPC = await prisma.PCAsset.findUnique({
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
      const existingAssetTag = await prisma.PCAsset.findUnique({
        where: { assetTag: body.assetTag }
      });

      if (existingAssetTag) {
        return NextResponse.json(
          { error: 'Asset tag already exists' },
          { status: 400 }
        );
      }
    }

    // Create PC asset
    const pcAsset = await prisma.PCAsset.create({
      data: {
        pcName: body.pcName,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        processor: body.processor,
        ram: body.ram,
        storageDevices: body.storageDevices || [],
        macAddress: body.macAddress,
        ipAddress: body.ipAddress,
        branchId: body.branchId,
        assignedToId: body.assignedToId,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseOrderNumber: body.purchaseOrderNumber,
        warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
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
        antivirusLicenseExpiry: body.antivirusLicenseExpiry ? new Date(body.antivirusLicenseExpiry) : null,
        notes: body.notes,
        createdById: session.user.id,
        isActive: true
      },
      include: {
        branch: true,
        assignedTo: true,
        createdBy: true
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
  } catch (error) {
    console.error('Error creating PC asset:', error);
    return NextResponse.json(
      { error: 'Failed to create PC asset' },
      { status: 500 }
    );
  }
}