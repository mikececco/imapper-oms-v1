const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

// This is your Stripe CLI webhook secret for testing
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Use raw body for Stripe webhook signature verification
router.post('/', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      // Invoice events
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object);
        break;
        
      // Payment Intent events
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
        
      // Charge events
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data.object);
        break;
        
      // Subscription events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error) {
    console.error(`Error handling event ${event.type}:`, error);
    // We still return a 200 response to acknowledge receipt of the event
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

// Handle invoice.created event
async function handleInvoiceCreated(invoice) {
  try {
    console.log('Processing invoice.created event:', invoice.id);
    
    // Get customer details from Stripe with expanded shipping information
    const customer = await stripe.customers.retrieve(invoice.customer, {
      expand: ['shipping']
    });
    
    // Extract line items from the invoice
    const lineItems = invoice.lines.data;
    
    // Extract the required data from the webhook
    const stripeCustomerId = invoice.customer;
    
    // Extract shipping address information (if available)
    const shippingAddressCity = customer.shipping?.address?.city || '';
    const shippingAddressCountry = customer.shipping?.address?.country || '';
    const shippingAddressLine1 = customer.shipping?.address?.line1 || '';
    const shippingAddressLine2 = customer.shipping?.address?.line2 || '';
    const shippingAddressPostalCode = customer.shipping?.address?.postal_code || '';
    
    // Extract customer contact information
    const email = customer.email || '';
    const phone = customer.phone || '';
    
    // Get creation timestamp
    const createdTimestamp = new Date(invoice.created * 1000); // Convert from Unix timestamp
    
    // Get customer name
    const customerName = customer.name || customer.email || 'Unknown Customer';
    
    // Generate a HashId combining Name and Create timestamp
    // Using crypto to create a hash of the combined values
    const hashInput = `${customerName}-${createdTimestamp.getTime()}`;
    const hashId = crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 12);
    const orderId = `ord_${hashId}`;
    
    console.log(`Generated HashId: ${hashId} for customer: ${customerName} at time: ${createdTimestamp}`);
    
    // Create a new order in your system
    const { data, error } = await global.supabase
      .from('orders')
      .insert([{
        id: orderId,
        name: customerName,
        email: email,
        phone: phone,
        instruction: `Stripe Invoice: ${invoice.id}`,
        order_pack: lineItems.map(item => item.description).join(', '),
        package_prepared: false,
        serial_number: invoice.number,
        package_weight: 'UNKNOWN',
        ship_by: null,
        paid: invoice.paid,
        ok_to_ship: false,
        status: 'pending',
        stripe_invoice_id: invoice.id,
        stripe_customer_id: stripeCustomerId,
        amount: invoice.total / 100, // Convert from cents to dollars
        shipping_address_city: shippingAddressCity,
        shipping_address_country: shippingAddressCountry,
        shipping_address_line1: shippingAddressLine1,
        shipping_address_line2: shippingAddressLine2,
        shipping_address_postal_code: shippingAddressPostalCode,
        created_at: createdTimestamp,
        updated_at: new Date()
      }]);
    
    if (error) throw error;
    
    console.log(`Created new order ${orderId} for invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.created event:', error);
  }
}

// Handle invoice.paid event
async function handleInvoicePaid(invoice) {
  try {
    console.log('Processing invoice.paid event:', invoice.id);
    
    // Find the order associated with this invoice
    const { data, error } = await global.supabase
      .from('orders')
      .select('*')
      .eq('stripe_invoice_id', invoice.id)
      .single();
    
    if (error) {
      // If no order exists, create one
      console.log(`No order found for invoice ${invoice.id}, creating new order`);
      return await handleInvoiceCreated(invoice);
    }
    
    // Update the order to reflect payment
    const { error: updateError } = await global.supabase
      .from('orders')
      .update({
        paid: true,
        status: 'processing',
        updated_at: new Date()
      })
      .eq('stripe_invoice_id', invoice.id);
    
    if (updateError) throw updateError;
    
    console.log(`Updated order for paid invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.paid event:', error);
  }
}

// Handle invoice.payment_failed event
async function handleInvoicePaymentFailed(invoice) {
  try {
    console.log('Processing invoice.payment_failed event:', invoice.id);
    
    // Find the order associated with this invoice
    const { data, error } = await global.supabase
      .from('orders')
      .select('*')
      .eq('stripe_invoice_id', invoice.id)
      .single();
    
    if (error) {
      console.log(`No order found for invoice ${invoice.id}`);
      return;
    }
    
    // Update the order to reflect payment failure
    const { error: updateError } = await global.supabase
      .from('orders')
      .update({
        paid: false,
        status: 'pending',
        updated_at: new Date()
      })
      .eq('stripe_invoice_id', invoice.id);
    
    if (updateError) throw updateError;
    
    console.log(`Updated order for failed payment invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.payment_failed event:', error);
  }
}

// Handle invoice.finalized event
async function handleInvoiceFinalized(invoice) {
  try {
    console.log('Processing invoice.finalized event:', invoice.id);
    
    // Find the order associated with this invoice
    const { data, error } = await global.supabase
      .from('orders')
      .select('*')
      .eq('stripe_invoice_id', invoice.id)
      .single();
    
    if (error) {
      // If no order exists, create one
      return await handleInvoiceCreated(invoice);
    }
    
    // Update the order with finalized invoice details
    const { error: updateError } = await global.supabase
      .from('orders')
      .update({
        updated_at: new Date()
      })
      .eq('stripe_invoice_id', invoice.id);
    
    if (updateError) throw updateError;
    
    console.log(`Updated order for finalized invoice ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice.finalized event:', error);
  }
}

// Handle payment_intent.succeeded event
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log('Processing payment_intent.succeeded event:', paymentIntent.id);
    
    // Check if this payment intent is associated with an invoice
    if (paymentIntent.invoice) {
      // If it's associated with an invoice, we'll handle it through the invoice events
      console.log(`Payment intent ${paymentIntent.id} is associated with invoice ${paymentIntent.invoice}`);
      return;
    }
    
    // For direct payments not associated with invoices
    // Generate a unique ID for the order
    const orderId = `ord_${crypto.randomBytes(8).toString('hex')}`;
    
    // Get customer details if available
    let customerName = 'Customer';
    let customerEmail = '';
    
    if (paymentIntent.customer) {
      try {
        const customer = await stripe.customers.retrieve(paymentIntent.customer);
        customerName = customer.name || customer.email || 'Customer';
        customerEmail = customer.email || '';
      } catch (err) {
        console.error('Error retrieving customer:', err);
      }
    }
    
    // Create a new order in your system
    const { data, error } = await global.supabase
      .from('orders')
      .insert([{
        id: orderId,
        name: customerName,
        email: customerEmail,
        instruction: `Direct payment: ${paymentIntent.id}`,
        order_pack: paymentIntent.description || 'Direct payment',
        package_prepared: false,
        serial_number: '',
        package_weight: 'UNKNOWN',
        ship_by: null,
        paid: true,
        ok_to_ship: false,
        status: 'processing',
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: paymentIntent.customer || null,
        amount: paymentIntent.amount / 100, // Convert from cents to dollars
        created_at: new Date(),
        updated_at: new Date()
      }]);
    
    if (error) throw error;
    
    console.log(`Created new order ${orderId} for payment intent ${paymentIntent.id}`);
  } catch (error) {
    console.error('Error handling payment_intent.succeeded event:', error);
  }
}

// Handle payment_intent.payment_failed event
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    console.log('Processing payment_intent.payment_failed event:', paymentIntent.id);
    
    // Check if this payment intent is associated with an invoice
    if (paymentIntent.invoice) {
      // If it's associated with an invoice, we'll handle it through the invoice events
      console.log(`Failed payment intent ${paymentIntent.id} is associated with invoice ${paymentIntent.invoice}`);
      return;
    }
    
    // For direct payments not associated with invoices
    // Check if we have an order with this payment intent
    const { data, error } = await global.supabase
      .from('orders')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();
    
    if (error) {
      console.log(`No order found for payment intent ${paymentIntent.id}`);
      return;
    }
    
    // Update the order to reflect payment failure
    const { error: updateError } = await global.supabase
      .from('orders')
      .update({
        paid: false,
        status: 'payment_failed',
        updated_at: new Date()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
    
    if (updateError) throw updateError;
    
    console.log(`Updated order for failed payment intent ${paymentIntent.id}`);
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed event:', error);
  }
}

// Handle charge.succeeded event
async function handleChargeSucceeded(charge) {
  try {
    console.log('Processing charge.succeeded event:', charge.id);
    
    // Charges are usually associated with payment intents or invoices
    // We'll log the event but not take additional action unless needed
    console.log(`Charge succeeded: ${charge.id}, amount: ${charge.amount / 100}, payment_intent: ${charge.payment_intent}`);
  } catch (error) {
    console.error('Error handling charge.succeeded event:', error);
  }
}

// Handle charge.failed event
async function handleChargeFailed(charge) {
  try {
    console.log('Processing charge.failed event:', charge.id);
    
    // Charges are usually associated with payment intents or invoices
    // We'll log the event but not take additional action unless needed
    console.log(`Charge failed: ${charge.id}, amount: ${charge.amount / 100}, payment_intent: ${charge.payment_intent}, reason: ${charge.failure_message}`);
  } catch (error) {
    console.error('Error handling charge.failed event:', error);
  }
}

// Handle customer.subscription.created event
async function handleSubscriptionCreated(subscription) {
  try {
    console.log('Processing customer.subscription.created event:', subscription.id);
    
    // Generate a unique ID for the subscription order
    const orderId = `sub_ord_${crypto.randomBytes(8).toString('hex')}`;
    
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    // Get the subscription items
    const items = subscription.items.data;
    const productDescriptions = [];
    
    // Get product details for each subscription item
    for (const item of items) {
      try {
        const price = await stripe.prices.retrieve(item.price.id, {
          expand: ['product']
        });
        
        if (price.product && typeof price.product !== 'string') {
          productDescriptions.push(price.product.name);
        }
      } catch (err) {
        console.error('Error retrieving price product:', err);
      }
    }
    
    // Create a new subscription order in your system
    const { data, error } = await global.supabase
      .from('subscriptions')
      .insert([{
        id: orderId,
        customer_name: customer.name || customer.email,
        customer_email: customer.email,
        description: productDescriptions.join(', ') || 'Subscription',
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        amount: subscription.items.data.reduce((sum, item) => sum + item.price.unit_amount * item.quantity, 0) / 100,
        created_at: new Date(),
        updated_at: new Date()
      }]);
    
    if (error) throw error;
    
    console.log(`Created new subscription order ${orderId} for subscription ${subscription.id}`);
  } catch (error) {
    console.error('Error handling customer.subscription.created event:', error);
  }
}

// Handle customer.subscription.updated event
async function handleSubscriptionUpdated(subscription) {
  try {
    console.log('Processing customer.subscription.updated event:', subscription.id);
    
    // Find the subscription in our database
    const { data, error } = await global.supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (error) {
      console.log(`No subscription found for ${subscription.id}, creating new record`);
      return await handleSubscriptionCreated(subscription);
    }
    
    // Update the subscription details
    const { error: updateError } = await global.supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        amount: subscription.items.data.reduce((sum, item) => sum + item.price.unit_amount * item.quantity, 0) / 100,
        updated_at: new Date()
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (updateError) throw updateError;
    
    console.log(`Updated subscription for ${subscription.id}`);
  } catch (error) {
    console.error('Error handling customer.subscription.updated event:', error);
  }
}

// Handle customer.subscription.deleted event
async function handleSubscriptionDeleted(subscription) {
  try {
    console.log('Processing customer.subscription.deleted event:', subscription.id);
    
    // Find the subscription in our database
    const { data, error } = await global.supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    if (error) {
      console.log(`No subscription found for ${subscription.id}`);
      return;
    }
    
    // Update the subscription status to canceled
    const { error: updateError } = await global.supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date()
      })
      .eq('stripe_subscription_id', subscription.id);
    
    if (updateError) throw updateError;
    
    console.log(`Marked subscription ${subscription.id} as canceled`);
  } catch (error) {
    console.error('Error handling customer.subscription.deleted event:', error);
  }
}

module.exports = router; 