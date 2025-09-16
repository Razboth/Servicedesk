import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.supportGroupCode !== 'TECH_SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const branchId = searchParams.get('branchId');
    const licenseType = searchParams.get('licenseType');
    const isActive = searchParams.get('isActive');

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { osName: { contains: search, mode: 'insensitive' } },
        { licenseKey: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (branchId && branchId !== 'all') {
      whereClause.assignedToBranch = branchId;
    }

    if (licenseType && licenseType !== 'all') {
      whereClause.licenseType = licenseType;
    }

    if (isActive !== null && isActive !== 'all') {
      whereClause.isActive = isActive === 'true';
    }

    const osLicenses = await prisma.oSLicense.findMany({
      where: whereClause,
      include: {
        pcAsset: {
          select: { id: true, pcName: true }
        },
        branch: {
          select: { id: true, name: true, code: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        createdByUser: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(osLicenses);
  } catch (error) {
    console.error('Error fetching OS licenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OS licenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.supportGroupCode !== 'TECH_SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Create new OS license
    const newLicense = await prisma.oSLicense.create({
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
        notes: data.notes,
        assignedToPC: data.assignedToPC,
        assignedToBranch: data.assignedToBranch,
        assignedToUser: data.assignedToUser,
        createdBy: session.user.id
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
        entityType: 'OSLicense',
        entityId: newLicense.id,
        userId: session.user.id,
        details: {
          name: newLicense.name,
          osName: newLicense.osName,
          licenseType: newLicense.licenseType
        }
      }
    });

    return NextResponse.json(newLicense);
  } catch (error) {
    console.error('Error creating OS license:', error);
    return NextResponse.json(
      { error: 'Failed to create OS license' },
      { status: 500 }
    );
  }
}