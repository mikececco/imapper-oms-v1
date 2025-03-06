import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_SUPABASE_URL;
const supabaseKey = process.env.NEXT_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// This is your Stripe webhook secret for testing
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    let event;

    try {
      // Verify the event came from Stripe
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Only handle customer.created events
    if (event.type === 'customer.created') {
      console.log('Received customer.created event');
      const customer = event.data.object;
      
      // Log customer data for debugging
      console.log(`Customer ID: ${customer.id}`);
      console.log(`Customer Email: ${customer.email}`);
      console.log(`Customer Name: ${customer.name}`);
      
      // Store the customer in Supabase
      const { error } = await supabase
        .from('stripe_events')
        .insert({
          event_id: event.id,
          event_type: event.type,
          event_data: customer,
          processed: false,
          created_at: new Date()
        });
      
      if (error) {
        console.error('Error storing customer in Supabase:', error);
      } else {
        console.log(`Successfully stored customer ${customer.id} in Supabase`);
      }
    } else {
      console.log(`Ignoring event type: ${event.type} - only processing customer.created events`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 