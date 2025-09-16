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
    const productType = searchParams.get('productType');
    const licenseType = searchParams.get('licenseType');
    const isActive = searchParams.get('isActive');

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { licenseKey: { contains: search, mode: 'insensitive' } },
        { subscriptionId: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (branchId && branchId !== 'all') {
      whereClause.assignedToBranch = branchId;
    }

    if (productType && productType !== 'all') {
      whereClause.productType = productType;
    }

    if (licenseType && licenseType !== 'all') {
      whereClause.licenseType = licenseType;
    }

    if (isActive !== null && isActive !== 'all') {
      whereClause.isActive = isActive === 'true';
    }

    const officeLicenses = await prisma.officeLicense.findMany({
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

    return NextResponse.json(officeLicenses);
  } catch (error) {
    console.error('Error fetching Office licenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Office licenses' },
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
    
    // Create new Office license
    const newLicense = await prisma.officeLicense.create({
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
        maxUsers: data.maxUsers || 1,
        currentUsers: 0,
        autoRenew: data.autoRenew || false,
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
        action: 'CREATE_OFFICE_LICENSE',
        entityType: 'OfficeLicense',
        entityId: newLicense.id,
        userId: session.user.id,
        details: {
          name: newLicense.name,
          productName: newLicense.productName,
          productType: newLicense.productType,
          licenseType: newLicense.licenseType
        }
      }
    });

    return NextResponse.json(newLicense);
  } catch (error) {
    console.error('Error creating Office license:', error);
    return NextResponse.json(
      { error: 'Failed to create Office license' },
      { status: 500 }
    );
  }
}