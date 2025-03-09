import { NextResponse } from 'next/server';
import { STRIPE_WEBHOOK_SECRET } from '../../../../utils/env';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return NextResponse.json({
    message: 'Stripe webhook test endpoint is working',
    webhook_secret_configured: !!STRIPE_WEBHOOK_SECRET,
    webhook_secret_length: STRIPE_WEBHOOK_SECRET ? STRIPE_WEBHOOK_SECRET.length : 0
  });
}

export async function POST(request) {
  try {
    // Log headers for debugging
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Test webhook request headers:', headers);
    
    // Get the raw request body as text
    const rawBody = await request.text();
    console.log('Test webhook raw body length:', rawBody.length);
    
    // Get the signature header
    const sig = request.headers.get('stripe-signature');
    console.log('Test webhook signature:', sig);
    
    return NextResponse.json({
      message: 'Stripe webhook test endpoint received POST request',
      headers_received: headers,
      body_length: rawBody.length,
      signature_received: !!sig
    });
  } catch (error) {
    console.error('Error in test webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 