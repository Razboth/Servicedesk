import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || undefined;
    const fieldType = searchParams.get('fieldType') || undefined;
    const serviceId = searchParams.get('serviceId') || undefined;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { helpText: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (fieldType && fieldType !== 'all') {
      where.type = fieldType;
    }

    if (serviceId) {
      where.serviceId = serviceId;
    }

    const customFields = await prisma.serviceField.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { service: { name: 'asc' } },
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json(customFields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom fields' },
      { status: 500 }
    );
  }
}