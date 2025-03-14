import { NextResponse } from 'next/server';

export function middleware(request) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Allow access to the auth page and API routes
  if (path === '/auth' || path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check for authentication cookie
  const isAuthenticated = request.cookies.has('authenticated');

  // If not authenticated and not on the auth page, redirect to auth
  if (!isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 