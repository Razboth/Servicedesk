import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const includeStats = searchParams.get('includeStats') === 'true';

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Fetch support groups
    const supportGroups = await prisma.supportGroup.findMany({
      where,
      include: includeStats ? {
        _count: {
          select: {
            users: true,
            services: true,
            tickets: true
          }
        }
      } : undefined,
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(supportGroups);
  } catch (error) {
    console.error('Error fetching support groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code, name, description } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.supportGroup.findUnique({
      where: { code }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Support group with this code already exists' },
        { status: 400 }
      );
    }

    // Create support group
    const supportGroup = await prisma.supportGroup.create({
      data: {
        code: code.toUpperCase().replace(/\s+/g, '_'),
        name,
        description,
        isActive: true
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'SupportGroup',
        entityId: supportGroup.id,
        newValues: supportGroup,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    });

    return NextResponse.json(supportGroup);
  } catch (error) {
    console.error('Error creating support group:', error);
    return NextResponse.json(
      { error: 'Failed to create support group' },
      { status: 500 }
    );
  }
}