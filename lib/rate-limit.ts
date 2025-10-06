import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   * @default 100
   */
  limit?: number;

  /**
   * Time window in milliseconds
   * @default 60000 (1 minute)
   */
  windowMs?: number;

  /**
   * Custom key generator function
   * @default Uses IP address
   */
  keyGenerator?: (request: NextRequest) => string;

  /**
   * Custom error message
   * @default "Too many requests, please try again later"
   */
  message?: string;
}

/**
 * Rate limiting middleware for API routes
 *
 * @example
 * ```ts
 * import { rateLimit } from '@/lib/rate-limit';
 *
 * export async function POST(request: NextRequest) {
 *   // Check rate limit
 *   const rateLimitResult = rateLimit(request, { limit: 10, windowMs: 60000 });
 *   if (rateLimitResult) return rateLimitResult;
 *
 *   // Your handler code...
 * }
 * ```
 */
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): NextResponse | null {
  const {
    limit = 100,
    windowMs = 60000, // 1 minute
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later',
  } = options;

  const key = keyGenerator(request);
  const now = Date.now();

  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return null;
  }

  const store = rateLimitStore[key];

  // Reset if time window has passed
  if (now > store.resetTime) {
    store.count = 1;
    store.resetTime = now + windowMs;
    return null;
  }

  // Increment count
  store.count++;

  // Check if limit exceeded
  if (store.count > limit) {
    const retryAfter = Math.ceil((store.resetTime - now) / 1000);

    return NextResponse.json(
      {
        error: message,
        retryAfter: `${retryAfter} seconds`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': store.resetTime.toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(request: NextRequest): string {
  // Try to get IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  // Fallback to a generic key if IP not available
  return 'unknown-ip';
}

/**
 * Key generator that combines IP and user ID (for authenticated requests)
 */
export function createUserBasedKeyGenerator(userId?: string) {
  return (request: NextRequest): string => {
    const ip = defaultKeyGenerator(request);
    return userId ? `${ip}:${userId}` : ip;
  };
}
