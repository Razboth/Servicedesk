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

// DELETE /api/admin/atms/[id] - Soft delete ATM
export async function DELETE(
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

    // Check if ATM has active incidents
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
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    if (atm._count.incidents > 0) {
      return NextResponse.json(
        { error: 'Cannot delete ATM with open incidents' },
        { status: 400 }
      );
    }

    // Soft delete the ATM
      const updatedATM = await prisma.aTM.update({
        where: { id },
        data: { isActive: false }
      });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'ATM',
        entityId: atm.id,
        details: `Deactivated ATM: ${atm.name} (${atm.code})`
      }
    });

    return NextResponse.json({ message: 'ATM deactivated successfully' });
  } catch (error) {
    console.error('Error deleting ATM:', error);
    return NextResponse.json(
      { error: 'Failed to delete ATM' },
      { status: 500 }
    );
  }
}