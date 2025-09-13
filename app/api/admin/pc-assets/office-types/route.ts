import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/office-types - List all Office types
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { version: { contains: search, mode: 'insensitive' } },
        { edition: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== null && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    const officeProducts = await prisma.officeProduct.findMany({
      where,
      include: {
        _count: {
          select: {
            pcAssets: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // Add usage count to each Office product
    const officeWithUsage = officeProducts.map(office => ({
      ...office,
      usageCount: office._count.pcAssets
    }));

    return NextResponse.json(officeWithUsage);
  } catch (error) {
    console.error('Error fetching Office types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Office types' },
      { status: 500 }
    );
  }
}

// POST /api/admin/pc-assets/office-types - Create new Office type
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check for duplicate
    const existing = await prisma.officeProduct.findFirst({
      where: {
        name: data.name,
        version: data.version || null
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Office type with this name and version already exists' },
        { status: 400 }
      );
    }

    const office = await prisma.officeProduct.create({
      data: {
        name: data.name,
        version: data.version || null,
        type: data.type,
        edition: data.edition || null,
        description: data.description || null,
        sortOrder: data.sortOrder || 0,
        isActive: true,
        createdById: session.user.id
      },
      include: {
        _count: {
          select: {
            pcAssets: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_OFFICE_TYPE',
        entity: 'OfficeProduct',
        entityId: office.id,
        userId: session.user.id,
        newValues: {
          name: office.name,
          version: office.version,
          type: office.type
        }
      }
    });

    return NextResponse.json({
      ...office,
      usageCount: office._count.pcAssets
    });
  } catch (error) {
    console.error('Error creating Office type:', error);
    return NextResponse.json(
      { error: 'Failed to create Office type' },
      { status: 500 }
    );
  }
}