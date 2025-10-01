import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Use the same cookie name as configured in auth.ts
  const port = process.env.PORT || '3000';
  const instanceId = process.env.INSTANCE_ID || port;
  const cookieName = process.env.NODE_ENV === 'production'
    ? `__Secure-bsg-auth.session-token-${instanceId}`
    : `bsg-auth.session-token-${instanceId}`;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
    cookieName: cookieName
  });
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth/');
  const isChangePasswordPage = request.nextUrl.pathname === '/auth/change-password';
  const isSignInPage = request.nextUrl.pathname === '/auth/signin';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isStaticAsset = request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i);

  // If user must change password, only allow access to change password page, auth routes, and static assets
  if (token && token.mustChangePassword && !isChangePasswordPage && !isSignInPage && !isStaticAsset) {
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