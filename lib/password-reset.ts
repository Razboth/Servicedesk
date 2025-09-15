import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/**
 * Generate a secure password reset token
 */
export function generateResetToken(): string {
  // Generate a 32-byte random token and convert to hex
  return randomBytes(32).toString('hex');
}

/**
 * Hash a reset token for storage
 */
export async function hashResetToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

/**
 * Verify a reset token against its hash
 */
export async function verifyResetToken(token: string, hashedToken: string): Promise<boolean> {
  return bcrypt.compare(token, hashedToken);
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
) {
  // Generate token
  const token = generateResetToken();
  const hashedToken = await hashResetToken(token);

  // Token expires in 1 hour
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  // Delete any existing unused tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
      usedAt: null
    }
  });

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      token: hashedToken,
      userId,
      email,
      expiresAt,
      ipAddress,
      userAgent
    }
  });

  // Return the unhashed token for the email
  return token;
}

/**
 * Validate a password reset token
 */
export async function validateResetToken(token: string) {
  // Find all non-used tokens
  const tokens = await prisma.passwordResetToken.findMany({
    where: {
      usedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  // Check each token
  for (const dbToken of tokens) {
    const isValid = await verifyResetToken(token, dbToken.token);
    if (isValid) {
      return dbToken;
    }
  }

  return null;
}

/**
 * Mark a reset token as used
 */
export async function markTokenAsUsed(tokenId: string) {
  return prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() }
  });
}

/**
 * Check rate limit for password reset requests
 */
export async function checkResetRateLimit(email: string, ipAddress?: string): Promise<boolean> {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  // Check email rate limit (max 3 per hour)
  const emailCount = await prisma.passwordResetToken.count({
    where: {
      email,
      createdAt: {
        gte: oneHourAgo
      }
    }
  });

  if (emailCount >= 3) {
    return false;
  }

  // Check IP rate limit if IP is provided (max 5 per hour)
  if (ipAddress) {
    const ipCount = await prisma.passwordResetToken.count({
      where: {
        ipAddress,
        createdAt: {
          gte: oneHourAgo
        }
      }
    });

    if (ipCount >= 5) {
      return false;
    }
  }

  return true;
}

/**
 * Clean up expired tokens (can be run as a cron job)
 */
export async function cleanupExpiredTokens() {
  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        {
          expiresAt: {
            lt: new Date()
          }
        },
        {
          usedAt: {
            not: null
          },
          createdAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old
          }
        }
      ]
    }
  });

  return result.count;
}