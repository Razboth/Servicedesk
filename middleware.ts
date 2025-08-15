import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Just return the response without any complex logic for now
  // This will help identify if middleware was causing the issues
  const response = NextResponse.next();
  
  // Add basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // Changed from DENY to allow dev tools
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Exclude all Next.js internal routes and auth routes
     */
    '/((?!api/auth|_next|favicon.ico|public).*)',
  ],
};