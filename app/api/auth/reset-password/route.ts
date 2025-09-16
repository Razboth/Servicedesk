import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  validateResetToken,
  markTokenAsUsed
} from '@/lib/password-reset';
import { sendPasswordResetSuccessEmail } from '@/lib/services/email.service';
import { createAuditLog } from '@/lib/audit-logger';
import { getClientIp } from '@/lib/utils/ip-utils';

// Validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const { token, newPassword } = validationResult.data;
    const ipAddress = getClientIp(request);

    // Validate token
    const tokenData = await validateResetToken(token);
    if (!tokenData) {
      await createAuditLog({
        action: 'PASSWORD_RESET_FAILED',
        entity: 'USER',
        metadata: {
          reason: 'Invalid or expired token',
          ipAddress
        },
        request
      });

      return NextResponse.json(
        {
          error: 'Invalid or expired reset token',
          code: 'TOKEN_INVALID'
        },
        { status: 400 }
      );
    }

    // Check password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      return NextResponse.json(
        {
          error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        },
        { status: 400 }
      );
    }

    // Check if new password is same as current password
    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
      select: {
        id: true,
        email: true,
        name: true,
        password: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if new password is same as old password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return NextResponse.json(
          { error: 'New password must be different from your current password' },
          { status: 400 }
        );
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password in a transaction
    await prisma.$transaction(async (tx) => {
      // Update password
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          loginAttempts: 0, // Reset login attempts
          lockedAt: null // Clear any lockout
        }
      });

      // Mark token as used
      await markTokenAsUsed(tokenData.id);

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
          entity: 'USER',
          entityId: user.id,
          newValues: {
            passwordChangedAt: new Date().toISOString(),
            resetTokenId: tokenData.id,
            ipAddress
          }
        }
      });
    });

    // Send success email
    await sendPasswordResetSuccessEmail(
      user.email,
      user.name || user.email,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);

    return NextResponse.json(
      { error: 'An error occurred while resetting your password' },
      { status: 500 }
    );
  }
}