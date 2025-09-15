import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createPasswordResetToken,
  checkResetRateLimit
} from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/services/email.service';
import { createAuditLog } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils/ip-utils';
import { PrismaClient } from '@prisma/client';

// Create new Prisma instance for this route
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with this email, you will receive password reset instructions.'
        },
        { status: 200 }
      );
    }

    const { email } = validationResult.data;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check rate limiting
    const canProceed = await checkResetRateLimit(email, ipAddress);
    if (!canProceed) {
      // Log rate limit attempt
      await createAuditLog({
        action: 'PASSWORD_RESET_RATE_LIMITED',
        entity: 'USER',
        metadata: {
          email,
          reason: 'Rate limit exceeded'
        },
        request
      });

      // Return generic success to prevent email enumeration
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with this email, you will receive password reset instructions.'
        },
        { status: 200 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
        isActive: true // Only allow reset for active users
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (user) {
      try {
        console.log('User found:', { id: user.id, email: user.email });

        // Create reset token
        const resetToken = await createPasswordResetToken(
          user.id,
          user.email,
          ipAddress,
          userAgent
        );

        // Send reset email
        await sendPasswordResetEmail(
          user.email,
          user.name || user.email,
          resetToken
        );

        // Log successful request
        await createAuditLog({
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          entity: 'USER',
          entityId: user.id,
          metadata: {
            email: user.email
          },
          request
        });

      } catch (error) {
        console.error('Error in password reset process:', error);
        // Still return success to prevent enumeration
      }
    } else {
      // Log failed attempt (user not found)
      await createAuditLog({
        action: 'PASSWORD_RESET_FAILED',
        entity: 'USER',
        metadata: {
          email,
          reason: 'User not found or inactive'
        },
        request
      });
    }

    // Always return success to prevent email enumeration
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);

    // Return generic success even on error to prevent information leakage
    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      },
      { status: 200 }
    );
  }
}