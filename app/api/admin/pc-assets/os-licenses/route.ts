import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/os-licenses - List all OS licenses
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
        { osName: { contains: search, mode: 'insensitive' } },
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

    const licenses = await prisma.oSLicense.findMany({
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
    console.error('Error fetching OS licenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OS licenses' },
      { status: 500 }
    );
  }
}

// POST /api/admin/pc-assets/os-licenses - Create new OS license
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check for duplicate license key
    if (data.licenseKey) {
      const existing = await prisma.oSLicense.findUnique({
        where: { licenseKey: data.licenseKey }
      });

      if (existing) {
        return NextResponse.json(
          { error: 'License key already exists' },
          { status: 400 }
        );
      }
    }

    const license = await prisma.oSLicense.create({
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
        maxActivations: data.maxActivations || 1,
        currentActivations: 0,
        isActive: true,
        notes: data.notes,
        assignedToPC: data.assignedToPC,
        assignedToBranch: data.assignedToBranch,
        assignedToUser: data.assignedToUser,
        createdById: session.user.id
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
        action: 'CREATE_OS_LICENSE',
        entity: 'OSLicense',
        entityId: license.id,
        userId: session.user.id,
        newValues: {
          name: license.name,
          osName: license.osName,
          licenseKey: license.licenseKey ? '***' : null
        }
      }
    });

    return NextResponse.json(license);
  } catch (error) {
    console.error('Error creating OS license:', error);
    return NextResponse.json(
      { error: 'Failed to create OS license' },
      { status: 500 }
    );
  }
}