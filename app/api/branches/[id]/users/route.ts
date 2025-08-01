import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for adding user to branch
const addUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['USER', 'TECHNICIAN', 'MANAGER', 'ADMIN', 'SECURITY_ANALYST']).optional()
});

// GET /api/branches/[id]/users - List users in branch
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has access to this branch
    const hasAccess = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role) || 
                     (session.user.role === 'MANAGER' && session.user.branchId === params.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      branchId: params.id
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            tickets: true,
            assignedTickets: true
          }
        }
      }
    });

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching branch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/branches/[id]/users - Add user to branch
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // If manager, check if they belong to this branch
    if (session.user.role === 'MANAGER' && session.user.branchId !== params.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = addUserSchema.parse(body);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: params.id }
    });

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    // Update user's branch
    const updatedUser = await prisma.user.update({
      where: { id: validatedData.userId },
      data: {
        branchId: params.id,
        ...(validatedData.role && { role: validatedData.role })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'USER',
        entityId: updatedUser.id,
        details: `Assigned user ${updatedUser.name} to branch ${branch.name}`
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error adding user to branch:', error);
    return NextResponse.json(
      { error: 'Failed to add user to branch' },
      { status: 500 }
    );
  }
}

// DELETE /api/branches/[id]/users/[userId] - Remove user from branch
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // If manager, check if they belong to this branch
    if (session.user.role === 'MANAGER' && session.user.branchId !== params.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists and belongs to this branch
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        branchId: params.id
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in this branch' },
        { status: 404 }
      );
    }

    // Remove user from branch (set branchId to null)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { branchId: null }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'USER',
        entityId: updatedUser.id,
        details: `Removed user ${updatedUser.name} from branch`
      }
    });

    return NextResponse.json({ message: 'User removed from branch successfully' });
  } catch (error) {
    console.error('Error removing user from branch:', error);
    return NextResponse.json(
      { error: 'Failed to remove user from branch' },
      { status: 500 }
    );
  }
}