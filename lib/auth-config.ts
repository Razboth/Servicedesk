/**
 * Centralized Authentication Configuration
 *
 * This file contains all authentication-related configuration
 * to ensure consistency across the application.
 */

/**
 * Get the cookie name for NextAuth session tokens
 * Must match configuration in auth.ts and middleware.ts
 */
export function getAuthCookieName(): string {
  const port = process.env.PORT || '3000';
  const instanceId = process.env.INSTANCE_ID || port;

  if (process.env.NODE_ENV === 'production') {
    return `__Secure-bsg-auth.session-token-${instanceId}`;
  }

  return `bsg-auth.session-token-${instanceId}`;
}

/**
 * Get the NextAuth secret
 */
export function getAuthSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || '';
}

/**
 * Authentication configuration constants
 */
export const AUTH_CONFIG = {
  // Session configuration
  SESSION_MAX_AGE: 8 * 60 * 60, // 8 hours
  SESSION_UPDATE_AGE: 60 * 60, // 1 hour

  // Login attempt tracking
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes in milliseconds

  // Password policy
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: false,

  // Session refresh
  REFETCH_INTERVAL: 5 * 60, // 5 minutes
  REFETCH_ON_WINDOW_FOCUS: true,
} as const;

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/about',
  '/auth/signin',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
] as const;

/**
 * API routes that don't require authentication
 */
export const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/public',
  '/api/health',
] as const;
