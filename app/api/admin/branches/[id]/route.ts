import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for updating branches
const updateBranchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  isActive: z.boolean().optional()
});

// GET /api/admin/branches/[id] - Get single branch details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: true,
            tickets: true,
            atms: true
          }
        },
        users: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          },
          take: 10
        },
        atms: {
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            name: true,
            location: true
          },
          take: 10
        }
      }
    });

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    // If user is a manager, check if they belong to this branch
    if (session.user.role === 'MANAGER' && session.user.branchId !== branch.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Error fetching branch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branch' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/branches/[id] - Update branch
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateBranchSchema.parse(body);

    // If updating code, check if it already exists
    if (validatedData.code) {
      const existingBranch = await prisma.branch.findFirst({
        where: {
          code: validatedData.code,
          NOT: { id: params.id }
        }
      });

      if (existingBranch) {
        return NextResponse.json(
          { error: 'Branch code already exists' },
          { status: 400 }
        );
      }
    }

    const branch = await prisma.branch.update({
      where: { id: params.id },
      data: validatedData,
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
        action: 'UPDATE',
        entityType: 'BRANCH',
        entityId: branch.id,
        details: `Updated branch: ${branch.name} (${branch.code})`
      }
    });

    return NextResponse.json(branch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { error: 'Failed to update branch' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/branches/[id] - Soft delete branch
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if branch has active users or tickets
    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            users: { where: { isActive: true } },
            tickets: { where: { status: { not: 'CLOSED' } } }
          }
        }
      }
    });

    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    if (branch._count.users > 0) {
      return NextResponse.json(
        { error: 'Cannot delete branch with active users' },
        { status: 400 }
      );
    }

    if (branch._count.tickets > 0) {
      return NextResponse.json(
        { error: 'Cannot delete branch with open tickets' },
        { status: 400 }
      );
    }

    // Soft delete the branch
    const updatedBranch = await prisma.branch.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'BRANCH',
        entityId: branch.id,
        details: `Deactivated branch: ${branch.name} (${branch.code})`
      }
    });

    return NextResponse.json({ message: 'Branch deactivated successfully' });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { error: 'Failed to delete branch' },
      { status: 500 }
    );
  }
}