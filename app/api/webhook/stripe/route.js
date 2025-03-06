import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createOrderFromStripeEvent } from '../../../utils/supabase';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '../../../utils/env';

// Initialize Stripe with your secret key
const stripe = new Stripe(STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabase = createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY);

// This is your Stripe webhook secret for testing
const endpointSecret = STRIPE_WEBHOOK_SECRET;

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

    try {
      // Store the event in Supabase for audit purposes
      const { error: insertError } = await supabase
        .from('stripe_events')
        .insert({
          event_id: event.id,
          event_type: event.type,
          event_data: event.data.object,
          processed: false,
          created_at: new Date()
        });
        
      if (insertError) {
        console.error('Error storing Stripe event:', insertError);
      } else {
        console.log(`Stored event ${event.id} in stripe_events table`);
      }
    } catch (storeError) {
      console.error('Exception storing Stripe event:', storeError);
    }

    let result = { success: false };
    
    // Handle different event types
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('Processing checkout.session.completed event');
          result = await handleCheckoutSessionCompleted(event);
          break;
          
        case 'payment_intent.succeeded':
          console.log('Processing payment_intent.succeeded event');
          result = await handlePaymentIntentSucceeded(event);
          break;
          
        case 'customer.created':
          console.log('Processing customer.created event');
          result = await handleCustomerCreated(event);
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
          // For unhandled events, still create an order if possible
          result = await createOrderFromAnyEvent(event);
      }
    } catch (handlerError) {
      console.error(`Error in event handler for ${event.type}:`, handlerError);
    }

    try {
      // Mark the event as processed
      const { error: updateError } = await supabase
        .from('stripe_events')
        .update({ 
          processed: true,
          processed_at: new Date()
        })
        .eq('event_id', event.id);
        
      if (updateError) {
        console.error('Error marking Stripe event as processed:', updateError);
      }
    } catch (updateError) {
      console.error('Exception marking Stripe event as processed:', updateError);
    }

    // Return a 200 response to acknowledge receipt of the event
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Create an order from any event type
async function createOrderFromAnyEvent(event) {
  try {
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from ${event.type} event`);
      return { success: true, orderId };
    } else {
      console.error(`Failed to create order from ${event.type} event:`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error(`Error creating order from ${event.type} event:`, error);
    return { success: false, error };
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
      return { success: true, orderId };
    } else {
      console.error(`Failed to create order from checkout session ${session.id}:`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('Error handling checkout.session.completed event:', error);
    return { success: false, error };
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
      return { success: true, orderId };
    } else {
      console.error(`Failed to create order from payment intent ${paymentIntent.id}:`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('Error handling payment_intent.succeeded event:', error);
    return { success: false, error };
  }
}

// Handle customer.created event
async function handleCustomerCreated(event) {
  try {
    const customer = event.data.object;
    
    // Always create an order for any customer.created event
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from customer ${customer.id}`);
      return { success: true, orderId };
    } else {
      console.error(`Failed to create order from customer ${customer.id}:`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('Error handling customer.created event:', error);
    return { success: false, error };
  }
} 