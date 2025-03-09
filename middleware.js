import { NextResponse } from 'next/server';

export function middleware(request) {
  // For all requests, continue without modification
  return NextResponse.next();
}

// Configure the middleware to run on all paths except the Stripe webhook
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/webhook/stripe (Stripe webhooks)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/webhook/stripe|_next/static|_next/image|favicon.ico).*)',
  ],
}; 