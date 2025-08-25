import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for updating ATMs
const updateATMSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  branchId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional()
});

// GET /api/admin/atms/[id] - Get single ATM details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const atm = await prisma.aTM.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true
          }
        },
        incidents: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            type: true,
            severity: true,
            description: true,
            createdAt: true
          }
        },
        monitoringLogs: {
          orderBy: { checkedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            responseTime: true,
            errorMessage: true,
            checkedAt: true
          }
        }
      }
    });

    if (!atm) {
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    // Check access for non-admin users
    if (session.user.role !== 'ADMIN' && session.user.branchId !== atm.branchId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(atm);
  } catch (error) {
    console.error('Error fetching ATM:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/atms/[id] - Update ATM
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
    const validatedData = updateATMSchema.parse(body);

    // If updating code, check if it already exists
    if (validatedData.code) {
      const existingATM = await prisma.aTM.findFirst({
        where: {
          code: validatedData.code,
          NOT: { id }
        }
      });

      if (existingATM) {
        return NextResponse.json(
          { error: 'ATM code already exists' },
          { status: 400 }
        );
      }
    }

    // If updating branch, verify it exists
    if (validatedData.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: validatedData.branchId }
      });

      if (!branch) {
        return NextResponse.json(
          { error: 'Branch not found' },
          { status: 400 }
        );
      }
    }

    const atm = await prisma.aTM.update({
      where: { id },
      data: validatedData,
      include: {
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
        entityType: 'ATM',
        entityId: atm.id,
        details: `Updated ATM: ${atm.name} (${atm.code})`
      }
    });

    return NextResponse.json(atm);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating ATM:', error);
    return NextResponse.json(
      { error: 'Failed to update ATM' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/atms/[id] - Hard delete ATM (permanent removal)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log('DELETE ATM Request - ID:', id);
  
  try {
    const session = await auth();
    
    console.log('Session:', session ? { userId: session.user.id, role: session.user.role } : 'No session');
    
    if (!session || session.user.role !== 'ADMIN') {
      console.log('Unauthorized - Role:', session?.user?.role);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate that id is provided
    if (!id) {
      console.log('No ID provided');
      return NextResponse.json(
        { error: 'ATM ID is required' },
        { status: 400 }
      );
    }

    console.log('Checking ATM with ID:', id);

    // Check if ATM exists and has active incidents
    const atm = await prisma.aTM.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            incidents: { where: { status: 'OPEN' } }
          }
        }
      }
    });

    if (!atm) {
      console.log('ATM not found with ID:', id);
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    console.log('Found ATM:', { id: atm.id, name: atm.name, code: atm.code });

    if (atm._count.incidents > 0) {
      console.log('ATM has open incidents:', atm._count.incidents);
      return NextResponse.json(
        { error: 'Cannot delete ATM with open incidents' },
        { status: 400 }
      );
    }

    console.log('Proceeding to permanently delete ATM');

    // Store ATM details for audit log before deletion
    const atmDetails = `${atm.name} (${atm.code})`;

    // Create audit log BEFORE deletion (since we need the ATM details)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'ATM',
        entityId: atm.id,
        details: `Permanently deleted ATM: ${atmDetails}`
      }
    });

    // Hard delete the ATM (this will cascade delete related records due to onDelete: Cascade in schema)
    await prisma.aTM.delete({
      where: { id }
    });

    console.log('ATM permanently deleted:', id);

    return NextResponse.json({ 
      success: true,
      message: 'ATM permanently deleted from database',
      deletedId: id,
      deletedName: atmDetails
    });
  } catch (error) {
    console.error('Error deleting ATM:', error);
    return NextResponse.json(
      { error: 'Failed to delete ATM' },
      { status: 500 }
    );
  }
}