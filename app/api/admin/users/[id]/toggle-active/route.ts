import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(
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
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deactivating own account
    if (existingUser.id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Toggle active status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: !existingUser.isActive
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: updatedUser.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity: 'USER',
        entityId: updatedUser.id,
        newValues: {
          isActive: updatedUser.isActive,
          actionBy: session.user.email,
          actionAt: new Date().toISOString(),
          targetUser: updatedUser.email
        }
      }
    })

    return NextResponse.json({
      success: true,
      isActive: updatedUser.isActive,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`
    })

  } catch (error) {
    console.error('Error toggling user status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}