import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generate a secure API key
 * Format: sk_live_[32 random characters]
 */
export function generateApiKey(): string {
  const prefix = 'sk_live_';
  const randomPart = randomBytes(24).toString('base64url'); // 32 chars when base64url encoded
  return `${prefix}${randomPart}`;
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 10);
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(apiKey: string, hashedKey: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hashedKey);
}

/**
 * Extract the key part for display (first 8 and last 4 characters)
 * Example: sk_live_abcd1234...wxyz
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length < 20) return apiKey;
  return `${apiKey.substring(0, 16)}...${apiKey.substring(apiKey.length - 4)}`;
}