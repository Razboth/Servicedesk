import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// DELETE /api/vendors/[id]/hard-delete - Permanently delete vendor (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vendorTickets: true
          }
        }
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Only allow hard delete if vendor is already inactive
    if (vendor.isActive) {
      return NextResponse.json(
        { error: 'Cannot permanently delete active vendor. Please deactivate first.' },
        { status: 400 }
      );
    }

    // Check if vendor has any tickets
    if (vendor._count.vendorTickets > 0) {
      return NextResponse.json(
        { error: `Cannot delete vendor with ${vendor._count.vendorTickets} associated ticket(s). Please remove ticket associations first.` },
        { status: 400 }
      );
    }

    // Hard delete (permanent)
    await prisma.vendor.delete({
      where: { id }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'HARD_DELETE_VENDOR',
        entity: 'Vendor',
        entityId: id,
        userId: session.user.id,
        oldValues: {
          name: vendor.name,
          code: vendor.code,
          isActive: vendor.isActive
        } as any,
        newValues: {
          deleted: true,
          deletedAt: new Date()
        } as any
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Vendor permanently deleted'
    });
  } catch (error) {
    console.error('Error permanently deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to permanently delete vendor' },
      { status: 500 }
    );
  }
}
