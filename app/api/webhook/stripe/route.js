import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createOrderFromStripeEvent, findOrCreateCustomer } from '../../../utils/supabase';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '../../../utils/env';

// Initialize Stripe with your secret key
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
}) : null;

// Initialize Supabase client
const supabase = SERVER_SUPABASE_URL && SERVER_SUPABASE_ANON_KEY && SERVER_SUPABASE_URL !== 'build-placeholder'
  ? createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY)
  : null;

export async function POST(request) {
  try {
    // Check if clients aren't initialized
    if (!stripe || !supabase) {
      console.error('Stripe or Supabase client not initialized');
      return NextResponse.json({ error: 'Service unavailable during build or initialization' }, { status: 503 });
    }
    
    // Log headers for debugging
    console.log('App Router Webhook request headers:', Object.fromEntries(request.headers.entries()));
    
    // Get the Stripe signature from headers
    const headersList = headers();
    const sig = headersList.get('stripe-signature');
    
    // Get the raw body
    const body = await request.text();
    
    console.log('Raw body length:', body.length);
    console.log('Stripe signature:', sig);
    
    if (!sig) {
      console.error('No Stripe signature found in request headers');
      return NextResponse.json({ error: 'No Stripe signature found' }, { status: 400 });
    }

    let event;

    try {
      // Verify the event came from Stripe
      console.log('Attempting to verify webhook signature...');
      console.log('Webhook secret length:', STRIPE_WEBHOOK_SECRET ? STRIPE_WEBHOOK_SECRET.length : 0);
      console.log('Webhook secret first 10 chars:', STRIPE_WEBHOOK_SECRET ? STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...' : 'undefined');
      
      event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
      console.log('Webhook signature verification successful!');
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      console.error('Raw body length:', body.length);
      console.error('Signature:', sig);
      
      // Try with a different approach as a fallback
      try {
        console.log('Trying alternative signature verification approach...');
        // Try with a trimmed body
        const trimmedBody = body.trim();
        event = stripe.webhooks.constructEvent(trimmedBody, sig, STRIPE_WEBHOOK_SECRET);
        console.log('Alternative approach succeeded!');
      } catch (secondErr) {
        console.error('Second attempt at signature verification failed:', secondErr.message);
        return NextResponse.json({ 
          error: `Webhook Error: ${err.message}`,
          details: 'Signature verification failed. Make sure the webhook secret is correct.'
        }, { status: 400 });
      }
    }

    // If we get here, we have a valid event
    console.log(`Received event: ${event.type}`);

    // Store the event in Supabase for audit purposes
    try {
      const { error: insertError } = await supabase
        .from('stripe_events')
        .insert({
          event_id: event.id,
          event_type: event.type,
          event_data: event.data.object,
          processed: false,
          created_at: new Date().toISOString()
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
        case 'customer.created':
          console.log('Processing customer.created event');
          result = await handleCustomerCreated(event);
          break;

        case 'invoice.paid':
          console.log('Processing invoice.paid event');
          result = await handleInvoicePaid(event);
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
          processed_at: new Date().toISOString()
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

// Handle customer.created event
async function handleCustomerCreated(event) {
  try {
    const customer = event.data.object;
    
    // First, create the customer in our database
    const customerData = {
      name: customer.name || 'New Customer',
      email: customer.email || '',
      phone: customer.phone || '',
      address_line1: customer.address?.line1 || '',
      address_line2: customer.address?.line2 || '',
      address_city: customer.address?.city || '',
      address_state: customer.address?.state || '',
      address_postal_code: customer.address?.postal_code || '',
      address_country: customer.address?.country || '',
      metadata: customer.metadata || {}
    };
    
    // If shipping address exists, use it instead of billing address
    if (customer.shipping && customer.shipping.address) {
      customerData.address_line1 = customer.shipping.address.line1 || customerData.address_line1;
      customerData.address_line2 = customer.shipping.address.line2 || customerData.address_line2;
      customerData.address_city = customer.shipping.address.city || customerData.address_city;
      customerData.address_state = customer.shipping.address.state || customerData.address_state;
      customerData.address_postal_code = customer.shipping.address.postal_code || customerData.address_postal_code;
      customerData.address_country = customer.shipping.address.country || customerData.address_country;
    }
    
    const customerResult = await findOrCreateCustomer(customer.id, customerData);
    
    if (!customerResult.success) {
      console.error(`Failed to create customer from ${customer.id}:`, customerResult.error);
    } else {
      console.log(`Successfully created/updated customer ${customerResult.customerId} from Stripe customer ${customer.id}`);
    }
    
    // Always create an order for customer.created events
    console.log(`Creating order for customer ${customer.id}`);
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from customer ${customer.id}`);
      return { success: true, orderId, customerId: customerResult.customerId };
    } else {
      console.error(`Failed to create order from customer ${customer.id}:`, error);
      return { success: false, error, customerId: customerResult.customerId };
    }
  } catch (error) {
    console.error('Error handling customer.created event:', error);
    return { success: false, error };
  }
}

// Handle invoice.paid event
async function handleInvoicePaid(event) {
  try {
    const invoice = event.data.object;
    const stripeCustomerId = invoice.customer;
    const stripeInvoiceId = invoice.id;
    
    console.log(`Processing invoice.paid event for invoice ${stripeInvoiceId} and customer ${stripeCustomerId}`);
    
    // First, check if we have any orders with this invoice ID
    const { data: orders, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_invoice_id', stripeInvoiceId);
    
    if (findError) {
      console.error(`Error finding orders for invoice ${stripeInvoiceId}:`, findError);
      return { success: false, error: findError };
    }
    
    // If we already have an order for this invoice, update it
    if (orders && orders.length > 0) {
      console.log(`Found ${orders.length} existing orders for invoice ${stripeInvoiceId}`);
      
      // Update all orders to mark them as paid
      for (const order of orders) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            paid: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
        
        if (updateError) {
          console.error(`Error updating order ${order.id} for invoice ${stripeInvoiceId}:`, updateError);
        } else {
          console.log(`Successfully marked order ${order.id} as paid for invoice ${stripeInvoiceId}`);
        }
      }
      
      return { success: true, orderIds: orders.map(o => o.id) };
    }
    
    // If we don't have an order for this invoice, create one
    console.log(`No existing orders found for invoice ${stripeInvoiceId}, creating new order`);
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from invoice ${stripeInvoiceId}`);
      return { success: true, orderId };
    } else {
      console.error(`Failed to create order from invoice ${stripeInvoiceId}:`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.error('Error handling invoice.paid event:', error);
    return { success: false, error };
  }
} 