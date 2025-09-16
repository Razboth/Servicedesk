import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/os-types - List all OS types
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

    const operatingSystems = await prisma.operatingSystem.findMany({
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

    // Add usage count to each OS
    const osWithUsage = operatingSystems.map(os => ({
      ...os,
      usageCount: os._count.pcAssets
    }));

    return NextResponse.json(osWithUsage);
  } catch (error) {
    console.error('Error fetching OS types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OS types' },
      { status: 500 }
    );
  }
}

// POST /api/admin/pc-assets/os-types - Create new OS type
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Check for duplicate
    const existing = await prisma.operatingSystem.findFirst({
      where: {
        name: data.name,
        version: data.version || null
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'OS type with this name and version already exists' },
        { status: 400 }
      );
    }

    const os = await prisma.operatingSystem.create({
      data: {
        name: data.name,
        version: data.version || null,
        type: data.type,
        architecture: data.architecture || null,
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
        action: 'CREATE_OS_TYPE',
        entity: 'OperatingSystem',
        entityId: os.id,
        userId: session.user.id,
        newValues: {
          name: os.name,
          version: os.version,
          type: os.type
        }
      }
    });

    return NextResponse.json({
      ...os,
      usageCount: os._count.pcAssets
    });
  } catch (error) {
    console.error('Error creating OS type:', error);
    return NextResponse.json(
      { error: 'Failed to create OS type' },
      { status: 500 }
    );
  }
}