import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/antivirus-licenses - List all Antivirus licenses
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');
    const assignedToPC = searchParams.get('assignedToPC');
    const assignedToBranch = searchParams.get('assignedToBranch');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { licenseKey: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (isActive !== null && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (assignedToPC) {
      where.assignedToPC = assignedToPC;
    }

    if (assignedToBranch) {
      where.assignedToBranch = assignedToBranch;
    }

    const licenses = await prisma.antivirusLicense.findMany({
      where,
      include: {
        pcAsset: {
          select: {
            id: true,
            pcName: true,
            brand: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(licenses);
  } catch (error) {
    console.error('Error fetching Antivirus licenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Antivirus licenses' },
      { status: 500 }
    );
  }
}

// POST /api/admin/pc-assets/antivirus-licenses - Create new Antivirus license
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check for duplicate license key
    if (data.licenseKey) {
      const existing = await prisma.antivirusLicense.findUnique({
        where: { licenseKey: data.licenseKey }
      });

      if (existing) {
        return NextResponse.json(
          { error: 'License key already exists' },
          { status: 400 }
        );
      }
    }

    const license = await prisma.antivirusLicense.create({
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
        maxDevices: data.maxDevices || 1,
        currentDevices: 0,
        isActive: true,
        autoRenew: data.autoRenew || false,
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
        action: 'CREATE_ANTIVIRUS_LICENSE',
        entity: 'AntivirusLicense',
        entityId: license.id,
        userId: session.user.id,
        newValues: {
          name: license.name,
          productName: license.productName,
          licenseKey: license.licenseKey ? '***' : null
        }
      }
    });

    return NextResponse.json(license);
  } catch (error) {
    console.error('Error creating Antivirus license:', error);
    return NextResponse.json(
      { error: 'Failed to create Antivirus license' },
      { status: 500 }
    );
  }
}