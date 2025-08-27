import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session || !['MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;
    const { isActive } = await request.json();

    // Get manager's branch
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true, role: true }
    });

    if (!manager?.branchId && manager?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No branch assigned' },
        { status: 400 }
      );
    }

    // Check if user exists and belongs to the same branch (unless admin)
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, branchId: true, name: true, email: true, isActive: true, role: true }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Managers cannot toggle status of high-privilege roles
    const restrictedRoles = ['TECHNICIAN', 'ADMIN', 'SECURITY_ANALYST'];
    if (manager.role === 'MANAGER' && restrictedRoles.includes(existingUser.role)) {
      return NextResponse.json(
        { error: 'This role can only be managed by administrators' },
        { status: 403 }
      );
    }

    // Managers can only toggle users from their own branch
    if (manager.role === 'MANAGER' && existingUser.branchId !== manager.branchId) {
      return NextResponse.json(
        { error: 'Cannot modify users from other branches' },
        { status: 403 }
      );
    }

    // Prevent managers from deactivating themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot modify your own account status' },
        { status: 403 }
      );
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entity: 'User',
        entityId: userId,
        newValues: { 
          isActive,
          description: `${isActive ? 'Activated' : 'Deactivated'} user: ${existingUser.name} (${existingUser.email})`
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Error toggling user status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}