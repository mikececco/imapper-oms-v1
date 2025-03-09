import { NextResponse } from 'next/server';

export function middleware(request) {
  // Only apply to Stripe webhook requests
  if (request.nextUrl.pathname === '/api/webhook/stripe') {
    // Clone the request headers
    const requestHeaders = new Headers(request.headers);
    
    // Add a custom header to indicate this is a Stripe webhook
    requestHeaders.set('x-stripe-webhook', 'true');
    
    // Return a new response with the modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // For all other requests, continue without modification
  return NextResponse.next();
}

// Configure the middleware to only run on the Stripe webhook path
export const config = {
  matcher: '/api/webhook/stripe',
}; 