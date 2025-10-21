import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for creating/updating branches
const branchSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  latitude: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  longitude: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  isActive: z.boolean().optional()
});

// GET /api/admin/branches - List all branches
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'active', 'inactive', or null for all
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Get total count
    const total = await prisma.branch.count({ where });

    // Get branches with related data
    const branches = await prisma.branch.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
            atms: true
          }
        }
      }
    });

    return NextResponse.json({
      branches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch branches',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error as any).stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/branches - Create new branch
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
    const validatedData = branchSchema.parse(body);

    // Check if branch code already exists
    const existingBranch = await prisma.branch.findUnique({
      where: { code: validatedData.code }
    });

    if (existingBranch) {
      return NextResponse.json(
        { error: 'Branch code already exists' },
        { status: 400 }
      );
    }

    // Create branch
    const branch = await prisma.branch.create({
      data: {
        ...validatedData,
        isActive: validatedData.isActive !== false
      },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
            atms: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entity: 'BRANCH',
        entityId: branch.id,
        newValues: {
          name: branch.name,
          code: branch.code,
          city: branch.city,
          province: branch.province,
          isActive: branch.isActive
        }
      }
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating branch:', error);
    return NextResponse.json(
      { error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}