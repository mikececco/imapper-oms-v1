import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createOrderFromStripeEvent } from '../../../utils/supabase';

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

    // Log the event type
    console.log(`Received event: ${event.type}`);

    // Store the event in Supabase for audit purposes
    await supabase
      .from('stripe_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        event_data: event.data.object,
        processed: false,
        created_at: new Date()
      });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed event');
        await handleCheckoutSessionCompleted(event);
        break;
        
      case 'payment_intent.succeeded':
        console.log('Processing payment_intent.succeeded event');
        await handlePaymentIntentSucceeded(event);
        break;
        
      case 'customer.created':
        console.log('Processing customer.created event');
        await handleCustomerCreated(event);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark the event as processed
    await supabase
      .from('stripe_events')
      .update({ processed: true })
      .eq('event_id', event.id);

    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Handle checkout.session.completed event
async function handleCheckoutSessionCompleted(event) {
  try {
    const session = event.data.object;
    
    // Create an order from the checkout session
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from checkout session ${session.id}`);
    } else {
      console.error(`Failed to create order from checkout session ${session.id}:`, error);
    }
  } catch (error) {
    console.error('Error handling checkout.session.completed event:', error);
  }
}

// Handle payment_intent.succeeded event
async function handlePaymentIntentSucceeded(event) {
  try {
    const paymentIntent = event.data.object;
    
    // Create an order from the payment intent
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from payment intent ${paymentIntent.id}`);
    } else {
      console.error(`Failed to create order from payment intent ${paymentIntent.id}:`, error);
    }
  } catch (error) {
    console.error('Error handling payment_intent.succeeded event:', error);
  }
}

// Handle customer.created event
async function handleCustomerCreated(event) {
  try {
    const customer = event.data.object;
    
    // Only create an order if the customer has metadata indicating it should be created
    if (customer.metadata && customer.metadata.create_order === 'true') {
      const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
      
      if (success) {
        console.log(`Successfully created order ${orderId} from customer ${customer.id}`);
      } else {
        console.error(`Failed to create order from customer ${customer.id}:`, error);
      }
    } else {
      console.log(`Customer ${customer.id} created, but no order was created (no create_order metadata)`);
    }
  } catch (error) {
    console.error('Error handling customer.created event:', error);
  }
} 