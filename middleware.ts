import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth/');
  const isChangePasswordPage = request.nextUrl.pathname === '/auth/change-password';
  const isSignInPage = request.nextUrl.pathname === '/auth/signin';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  // If user must change password, only allow access to change password page and auth API routes
  if (token && token.mustChangePassword && !isChangePasswordPage && !isSignInPage) {
    // Allow API routes for change password and auth
    if (isApiRoute) {
      const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth/');
      if (!isAuthApi) {
        return NextResponse.json(
          { error: 'You must change your password before accessing this resource' },
          { status: 403 }
        );
      }
    } else if (!isAuthPage) {
      // Redirect to change password page for non-API routes
      return NextResponse.redirect(new URL('/auth/change-password', request.url));
    }
  }
  
  const response = NextResponse.next();
  
  // Add basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except static files and Next.js internals
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};