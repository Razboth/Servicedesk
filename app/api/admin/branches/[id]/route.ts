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
  latitude: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  longitude: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  isActive: z.boolean().optional(),
  ipAddress: z.string().optional(),
  backupIpAddress: z.string().optional(),
  monitoringEnabled: z.boolean().optional(),
  networkMedia: z.enum(['VSAT', 'M2M', 'FO']).nullable().optional(),
  networkVendor: z.string().optional()
});

// GET /api/admin/branches/[id] - Get single branch details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
          NOT: { id }
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
      where: { id },
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
        entity: 'BRANCH',
        entityId: branch.id,
        newValues: validatedData
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

// DELETE /api/admin/branches/[id] - Hard delete branch (permanent removal)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('DELETE Branch Request - ID:', id);
    
    // Early validation
    if (!id || id === 'undefined' || id === 'null') {
      console.log('Invalid ID provided:', id);
      return NextResponse.json(
        { error: 'Invalid Branch ID provided' },
        { status: 400 }
      );
    }
    
    const session = await auth();
    
    console.log('Session:', session ? { userId: session.user.id, role: session.user.role } : 'No session');
    
    if (!session || session.user.role !== 'ADMIN') {
      console.log('Unauthorized - Role:', session?.user?.role);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Checking Branch with ID:', id);

    // Check if branch exists and has related data
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            tickets: { where: { status: { not: 'CLOSED' } } },
            atms: true
          }
        }
      }
    });

    if (!branch) {
      console.log('Branch not found with ID:', id);
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    console.log('Found Branch:', { 
      id: branch.id, 
      name: branch.name, 
      code: branch.code,
      users: branch._count.users,
      openTickets: branch._count.tickets,
      atms: branch._count.atms
    });

    // Check for related records
    if (branch._count.users > 0) {
      console.log('Branch has users:', branch._count.users);
      return NextResponse.json(
        { error: `Cannot delete branch: It has ${branch._count.users} user(s). Please reassign or delete users first.` },
        { status: 400 }
      );
    }

    if (branch._count.tickets > 0) {
      console.log('Branch has open tickets:', branch._count.tickets);
      return NextResponse.json(
        { error: `Cannot delete branch: It has ${branch._count.tickets} open ticket(s). Please close or reassign tickets first.` },
        { status: 400 }
      );
    }

    if (branch._count.atms > 0) {
      console.log('Branch has ATMs:', branch._count.atms);
      return NextResponse.json(
        { error: `Cannot delete branch: It has ${branch._count.atms} ATM(s). Please reassign or delete ATMs first.` },
        { status: 400 }
      );
    }

    console.log('Proceeding to permanently delete Branch');

    // Store branch details for audit log before deletion
    const branchDetails = `${branch.name} (${branch.code})`;

    // Create audit log BEFORE deletion (since we need the branch details)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entity: 'BRANCH',
        entityId: branch.id,
        oldValues: {
          name: branch.name,
          code: branch.code,
          city: branch.city,
          province: branch.province,
          isActive: branch.isActive
        }
      }
    });

    // Hard delete the branch
    try {
      await prisma.branch.delete({
        where: { id }
      });
      
      console.log('Branch permanently deleted:', id);
    } catch (deleteError: any) {
      console.error('Failed to delete Branch:', deleteError);
      
      // If delete fails, provide more specific error message
      if (deleteError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Cannot delete branch due to foreign key constraints. Please ensure all related records are removed first.' },
          { status: 400 }
        );
      }
      throw deleteError;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Branch permanently deleted from database',
      deletedId: id,
      deletedName: branchDetails
    });
  } catch (error: any) {
    console.error('Error deleting branch:', error);
    
    // Handle Prisma-specific errors
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return NextResponse.json(
        { error: 'Cannot delete branch: It has related records that must be removed first' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') {
      // Record not found
      return NextResponse.json(
        { error: 'Branch not found or already deleted' },
        { status: 404 }
      );
    }
    
    // Return more detailed error for debugging
    return NextResponse.json(
      { 
        error: 'Failed to delete branch',
        details: error.message || 'Unknown error occurred',
        code: error.code
      },
      { status: 500 }
    );
  }
}