import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const MAX_LOGIN_ATTEMPTS = 5

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Get user's current login attempts
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        loginAttempts: true, 
        lockedAt: true,
        lastLoginAttempt: true
      }
    })

    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({
        remainingAttempts: MAX_LOGIN_ATTEMPTS,
        isLocked: false
      })
    }

    const isLocked = user.lockedAt && user.loginAttempts >= MAX_LOGIN_ATTEMPTS
    const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - user.loginAttempts)

    // If locked, check if lockout period has expired (30 minutes)
    let lockoutExpired = false
    if (isLocked && user.lockedAt) {
      const lockoutDuration = 30 * 60 * 1000 // 30 minutes
      lockoutExpired = new Date().getTime() - new Date(user.lockedAt).getTime() > lockoutDuration
    }

    return NextResponse.json({
      remainingAttempts: lockoutExpired ? MAX_LOGIN_ATTEMPTS : remainingAttempts,
      isLocked: isLocked && !lockoutExpired,
      lockoutExpired
    })

  } catch (error) {
    console.error('Login attempts check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}