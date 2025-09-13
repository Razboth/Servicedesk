import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST /api/admin/pc-assets/bulk-import - Bulk import PC assets from CSV
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow only super admin and admin for bulk import
    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assets } = body;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { error: 'No assets provided for import' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Process each asset
    for (const asset of assets) {
      try {
        // Validate required fields
        if (!asset.pcName || !asset.brand || !asset.processor || !asset.ram || !asset.branchCode || !asset.osName || !asset.osLicenseType) {
          results.failed++;
          results.errors.push({
            pcName: asset.pcName || 'Unknown',
            error: 'Missing required fields'
          });
          continue;
        }

        // Find branch by code
        const branch = await prisma.branch.findUnique({
          where: { code: asset.branchCode }
        });

        if (!branch) {
          results.failed++;
          results.errors.push({
            pcName: asset.pcName,
            error: `Branch not found: ${asset.branchCode}`
          });
          continue;
        }

        // Find assigned user if email provided
        let assignedToId = null;
        if (asset.assignedToEmail) {
          const user = await prisma.user.findUnique({
            where: { email: asset.assignedToEmail }
          });
          if (user) {
            assignedToId = user.id;
          }
        }

        // Check for duplicate PC name
        const existingPC = await prisma.PCAsset.findUnique({
          where: { pcName: asset.pcName }
        });

        if (existingPC) {
          results.failed++;
          results.errors.push({
            pcName: asset.pcName,
            error: 'PC name already exists'
          });
          continue;
        }

        // Check for duplicate asset tag
        if (asset.assetTag) {
          const existingTag = await prisma.PCAsset.findUnique({
            where: { assetTag: asset.assetTag }
          });

          if (existingTag) {
            results.failed++;
            results.errors.push({
              pcName: asset.pcName,
              error: `Asset tag already exists: ${asset.assetTag}`
            });
            continue;
          }
        }

        // Parse storage devices if provided as string
        let storageDevices = [];
        if (asset.storageDevices) {
          if (typeof asset.storageDevices === 'string') {
            try {
              // Expected format: "SSD:512GB:Samsung,HDD:1TB:WD"
              storageDevices = asset.storageDevices.split(',').map((device: string) => {
                const [type, size, brand] = device.split(':');
                return { type, size, brand };
              });
            } catch (e) {
              storageDevices = [{ type: 'Unknown', size: asset.storageDevices, brand: 'Unknown' }];
            }
          } else {
            storageDevices = asset.storageDevices;
          }
        }

        // Create PC asset
        await prisma.PCAsset.create({
          data: {
            pcName: asset.pcName,
            brand: asset.brand,
            model: asset.model || null,
            serialNumber: asset.serialNumber || null,
            processor: asset.processor,
            ram: asset.ram,
            storageDevices: storageDevices,
            macAddress: asset.macAddress || null,
            ipAddress: asset.ipAddress || null,
            branchId: branch.id,
            assignedToId,
            purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
            purchaseOrderNumber: asset.purchaseOrderNumber || null,
            warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry) : null,
            assetTag: asset.assetTag || null,
            osName: asset.osName,
            osVersion: asset.osVersion || null,
            osLicenseType: asset.osLicenseType,
            osSerialNumber: asset.osSerialNumber || null,
            officeProduct: asset.officeProduct || null,
            officeVersion: asset.officeVersion || null,
            officeProductType: asset.officeProductType || null,
            officeLicenseType: asset.officeLicenseType || null,
            officeSerialNumber: asset.officeSerialNumber || null,
            antivirusName: asset.antivirusName || null,
            antivirusVersion: asset.antivirusVersion || null,
            antivirusLicenseExpiry: asset.antivirusLicenseExpiry ? new Date(asset.antivirusLicenseExpiry) : null,
            notes: asset.notes || null,
            createdById: session.user.id,
            isActive: true
          }
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          pcName: asset.pcName || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Create audit log for bulk import
    await prisma.auditLog.create({
      data: {
        action: 'BULK_IMPORT',
        entityType: 'PC_ASSET',
        entityId: 'BULK',
        details: `Bulk imported PC assets: ${results.success} successful, ${results.failed} failed`,
        userId: session.user.id,
        metadata: {
          success: results.success,
          failed: results.failed,
          errors: results.errors
        }
      }
    });

    return NextResponse.json({
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      results
    });
  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { error: 'Failed to import PC assets' },
      { status: 500 }
    );
  }
}