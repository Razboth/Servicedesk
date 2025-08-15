import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated and has ADMIN role
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN role can access account management
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const lockedOnly = searchParams.get('locked') === 'true'
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (lockedOnly) {
      where.AND = [
        { loginAttempts: { gte: 5 } },
        { lockedAt: { not: null } }
      ]
    }

    // Get users with account status
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          loginAttempts: true,
          lockedAt: true,
          lastLoginAttempt: true,
          lastActivity: true,
          createdAt: true,
          branch: {
            select: { name: true, code: true }
          }
        },
        orderBy: [
          { lockedAt: { sort: 'desc', nulls: 'last' } },
          { lastLoginAttempt: { sort: 'desc', nulls: 'last' } },
          { email: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    // Get recent login attempts for context
    const recentAttempts = await prisma.loginAttempt.findMany({
      where: {
        attemptedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      },
      select: {
        email: true,
        success: true,
        attemptedAt: true,
        ipAddress: true,
        lockTriggered: true
      },
      orderBy: { attemptedAt: 'desc' },
      take: 100
    })

    // Calculate statistics
    const stats = {
      totalUsers: await prisma.user.count(),
      lockedAccounts: await prisma.user.count({
        where: {
          AND: [
            { loginAttempts: { gte: 5 } },
            { lockedAt: { not: null } }
          ]
        }
      }),
      recentFailures: await prisma.loginAttempt.count({
        where: {
          success: false,
          attemptedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        }
      }),
      activeUsers: await prisma.user.count({
        where: {
          lastActivity: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Active in last 24h
        }
      })
    }

    return NextResponse.json({
      users,
      recentAttempts,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Account management error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and has ADMIN role
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { action, userId, email } = await request.json()

    let user
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } })
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let result
    switch (action) {
      case 'unlock':
        result = await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lockedAt: null,
            lastLoginAttempt: null
          }
        })

        // Log the unlock action
        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'ACCOUNT_UNLOCKED',
            entity: 'USER',
            entityId: user.id,
            newValues: {
              unlockedBy: session.user.email,
              unlockedAt: new Date().toISOString(),
              targetUser: user.email
            }
          }
        })
        break

      case 'reset_attempts':
        result = await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lastLoginAttempt: null
          }
        })

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'LOGIN_ATTEMPTS_RESET',
            entity: 'USER',
            entityId: user.id,
            newValues: {
              resetBy: session.user.email,
              resetAt: new Date().toISOString(),
              targetUser: user.email
            }
          }
        })
        break

      case 'disable':
        result = await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false }
        })

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'ACCOUNT_DISABLED',
            entity: 'USER',
            entityId: user.id,
            newValues: {
              disabledBy: session.user.email,
              disabledAt: new Date().toISOString(),
              targetUser: user.email
            }
          }
        })
        break

      case 'enable':
        result = await prisma.user.update({
          where: { id: user.id },
          data: { isActive: true }
        })

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'ACCOUNT_ENABLED',
            entity: 'USER',
            entityId: user.id,
            newValues: {
              enabledBy: session.user.email,
              enabledAt: new Date().toISOString(),
              targetUser: user.email
            }
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      user: result
    })

  } catch (error) {
    console.error('Account action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}