import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/admin/pc-assets/types - Get OS and Office types for dropdowns
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch active OS types
    const operatingSystems = await prisma.operatingSystem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        version: true,
        type: true,
        architecture: true,
        edition: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // Fetch active Office types
    const officeProducts = await prisma.officeProduct.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        version: true,
        type: true,
        edition: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // Format for dropdown display
    const formattedOS = operatingSystems.map(os => ({
      id: os.id,
      label: `${os.name}${os.version ? ` ${os.version}` : ''}${os.edition ? ` ${os.edition}` : ''}`,
      value: os.id,
      type: os.type,
      architecture: os.architecture,
      raw: os
    }));

    const formattedOffice = officeProducts.map(office => ({
      id: office.id,
      label: `${office.name}${office.version ? ` ${office.version}` : ''}${office.edition ? ` ${office.edition}` : ''}`,
      value: office.id,
      type: office.type,
      raw: office
    }));

    return NextResponse.json({
      operatingSystems: formattedOS,
      officeProducts: formattedOffice
    });
  } catch (error) {
    console.error('Error fetching PC asset types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PC asset types' },
      { status: 500 }
    );
  }
}