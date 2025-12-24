import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthCookieName, getAuthSecret } from './lib/auth-config';

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: getAuthSecret(),
    cookieName: getAuthCookieName()
  });

  const { pathname } = request.nextUrl;

  // Define route types
  const isAuthPage = pathname.startsWith('/auth/');
  const isChangePasswordPage = pathname === '/auth/change-password';
  const isSignInPage = pathname === '/auth/signin';
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthApi = pathname.startsWith('/api/auth/');
  const isPublicApi = pathname.startsWith('/api/public/');
  const isStaticAsset = pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i);
  const isNextInternal = pathname.startsWith('/_next');
  const isAboutPage = pathname === '/about';

  // Allow static assets and Next.js internals
  if (isStaticAsset || isNextInternal) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/about'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // CRITICAL: Block unauthenticated access to protected routes
  if (!token) {
    // Allow auth pages and public routes
    if (isAuthPage || isPublicRoute) {
      return NextResponse.next();
    }

    // Allow public API endpoints
    if (isPublicApi || isAuthApi) {
      return NextResponse.next();
    }

    // Allow metrics endpoint for Prometheus scraping (public for monitoring)
    if (pathname === '/api/metrics') {
      return NextResponse.next();
    }

    // Allow monitoring API endpoints with API key authentication
    // These endpoints have their own API key authentication
    const monitoringApiRoutes = [
      '/api/monitoring/',
      '/api/omnichannel/'
    ];
    const isMonitoringApi = monitoringApiRoutes.some(route => pathname.startsWith(route));
    if (isMonitoringApi) {
      // Check if request has API key in headers
      const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
      if (apiKey) {
        // Let the route handler validate the API key
        return NextResponse.next();
      }
    }

    // Redirect unauthenticated users to sign in
    if (!isApiRoute) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Return 401 for API routes
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // User is authenticated - handle must change password
  if (token.mustChangePassword && !isChangePasswordPage && !isSignInPage && !isStaticAsset) {
    // Allow auth API routes
    if (isAuthApi) {
      return NextResponse.next();
    }

    // Block other API routes
    if (isApiRoute && !isAuthApi) {
      return NextResponse.json(
        { error: 'You must change your password before accessing this resource' },
        { status: 403 }
      );
    }

    // Redirect to change password page
    if (!isAuthPage) {
      return NextResponse.redirect(new URL('/auth/change-password', request.url));
    }
  }

  // Authenticated user trying to access auth pages - redirect to dashboard
  if (isAuthPage && !token.mustChangePassword) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

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