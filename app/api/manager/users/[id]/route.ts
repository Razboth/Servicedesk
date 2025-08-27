import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizePhoneNumber, isValidEmail } from '@/lib/security';

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
      select: { id: true, branchId: true, email: true, role: true }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Managers cannot edit high-privilege roles
    const restrictedRoles = ['TECHNICIAN', 'ADMIN', 'SECURITY_ANALYST'];
    if (manager.role === 'MANAGER' && restrictedRoles.includes(existingUser.role)) {
      return NextResponse.json(
        { error: 'This role can only be managed by administrators' },
        { status: 403 }
      );
    }

    // Managers can only edit users from their own branch
    if (manager.role === 'MANAGER' && existingUser.branchId !== manager.branchId) {
      return NextResponse.json(
        { error: 'Cannot edit users from other branches' },
        { status: 403 }
      );
    }

    const { name, email, phone, role, isActive } = await request.json();

    // Validate inputs
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const sanitizedPhone = phone ? sanitizePhoneNumber(phone) : null;
    if (phone && !sanitizedPhone) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Validate role permissions - managers cannot assign high-privilege roles
    const restrictedRoleAssignments = ['ADMIN', 'TECHNICIAN', 'SECURITY_ANALYST'];
    if (restrictedRoleAssignments.includes(role) && manager.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot assign this role - administrator privileges required' },
        { status: 403 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone: sanitizedPhone,
        role,
        isActive
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: userId,
        newValues: {
          name,
          email,
          phone: sanitizedPhone,
          role,
          isActive
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}