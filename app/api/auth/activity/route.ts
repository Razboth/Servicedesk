import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { email, timestamp, action } = await request.json()

    // Verify the email matches the session
    if (email !== session.user.email) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Update user's last activity
    await prisma.user.update({
      where: { email },
      data: {
        lastActivity: new Date(timestamp)
      }
    })

    // Log specific actions if provided
    if (action) {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: action,
          entity: 'USER_SESSION',
          entityId: session.user.id,
          newValues: {
            timestamp,
            action,
            userAgent: request.headers.get('user-agent'),
            ipAddress: request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') ||
                      request.ip
          }
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      timestamp: new Date(timestamp).toISOString()
    })

  } catch (error) {
    console.error('Activity update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}