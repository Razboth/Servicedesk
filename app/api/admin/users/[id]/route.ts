import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        branch: {
          select: { id: true, name: true, code: true }
        },
        supportGroup: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username, email, name, phone, role, branchId, supportGroupId, isActive, password } = await request.json()

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if username is taken by another user
    if (username && username !== existingUser.username) {
      const usernameTaken = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id }
        }
      })

      if (usernameTaken) {
        return NextResponse.json(
          { error: 'Username is already taken by another user' },
          { status: 409 }
        )
      }
    }

    // Check if email is taken by another user
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id }
        }
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email is already taken by another user' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      username: username || existingUser.username,
      email,
      name,
      phone: phone || null,
      role,
      branchId: branchId || null,
      supportGroupId: supportGroupId || null,
      isActive
    }

    // Hash new password if provided and set mustChangePassword flag
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10)
      updateData.mustChangePassword = true  // Force user to change password after admin reset
      updateData.passwordChangedAt = null   // Reset password change timestamp
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        branch: {
          select: { id: true, name: true, code: true }
        },
        supportGroup: {
          select: { id: true, name: true, code: true }
        }
      }
    })

    // Log the update
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_UPDATED',
        entity: 'USER',
        entityId: updatedUser.id,
        oldValues: {
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
          isActive: existingUser.isActive
        },
        newValues: {
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          updatedBy: session.user.email,
          updatedAt: new Date().toISOString()
        }
      }
    })

    // Remove password from response
    const { password: _, ...userResponse } = updatedUser

    return NextResponse.json({
      success: true,
      user: userResponse
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdTickets: true,
            assignedTickets: true
          }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting users with tickets (for data integrity)
    if (existingUser._count.createdTickets > 0 || existingUser._count.assignedTickets > 0) {
      return NextResponse.json(
        { error: 'Cannot delete user with existing tickets. Deactivate instead.' },
        { status: 400 }
      )
    }

    // Prevent self-deletion
    if (existingUser.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    })

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_DELETED',
        entity: 'USER',
        entityId: id,
        oldValues: {
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
          deletedBy: session.user.email,
          deletedAt: new Date().toISOString()
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}