#!/usr/bin/env node

// This script fetches the last N Stripe customer.created events and processes them
// through the same flow as the webhook handler

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.stripe file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.stripe') });

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Find or create a customer in the database
 */
async function findOrCreateCustomer(stripeCustomerId, customerData) {
  try {
    console.log(`Looking for customer with Stripe ID ${stripeCustomerId}`);
    
    // Check if customer already exists
    const { data: existingCustomer, error: findError } = await supabase
      .from('customers')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();
    
    if (findError && findError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      console.error('Error finding customer:', findError);
      return { success: false, error: findError };
    }
    
    if (existingCustomer) {
      console.log(`Found existing customer ${existingCustomer.id}`);
      
      // Update customer data if needed
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: customerData?.name || existingCustomer.name,
          email: customerData?.email || existingCustomer.email,
          phone: customerData?.phone || existingCustomer.phone,
          address_line1: customerData?.address_line1 || existingCustomer.address_line1,
          address_line2: customerData?.address_line2 || existingCustomer.address_line2,
          address_city: customerData?.address_city || existingCustomer.address_city,
          address_postal_code: customerData?.address_postal_code || existingCustomer.address_postal_code,
          address_country: customerData?.address_country || existingCustomer.address_country,
          metadata: customerData?.metadata || existingCustomer.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCustomer.id);
      
      if (updateError) {
        console.error('Error updating customer:', updateError);
        return { success: false, error: updateError, customerId: existingCustomer.id };
      }
      
      console.log(`Updated customer ${existingCustomer.id}`);
      
      return { success: true, customer: existingCustomer, customerId: existingCustomer.id, isNew: false };
    }
    
    // Create new customer
    console.log(`Creating new customer with Stripe ID ${stripeCustomerId}`);
    
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        stripe_customer_id: stripeCustomerId,
        name: customerData?.name || 'Unknown Customer',
        email: customerData?.email || '',
        phone: customerData?.phone || '',
        address_line1: customerData?.address_line1 || '',
        address_line2: customerData?.address_line2 || '',
        address_city: customerData?.address_city || '',
        address_postal_code: customerData?.address_postal_code || '',
        address_country: customerData?.address_country || '',
        metadata: customerData?.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (createError) {
      console.error('Error creating customer:', createError);
      return { success: false, error: createError };
    }
    
    if (!newCustomer || newCustomer.length === 0) {
      console.error('No customer returned after insert');
      return { success: false, error: 'No customer returned after insert' };
    }
    
    console.log(`Created new customer ${newCustomer[0].id}`);
    
    return { success: true, customer: newCustomer[0], customerId: newCustomer[0].id, isNew: true };
  } catch (error) {
    console.error('Error in findOrCreateCustomer:', error);
    return { success: false, error };
  }
}

/**
 * Process a customer.created event the same way the webhook handler would
 */
async function processCustomerEvent(event) {
  try {
    console.log(`Processing customer.created event for ${event.data.object.id}`);
    
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

    // Process the customer.created event
    const customer = event.data.object;
    
    // First, create the customer in our database
    const customerData = {
      name: customer.name || 'New Customer',
      email: customer.email || '',
      phone: customer.phone || '',
      address_line1: customer.address?.line1 || '',
      address_line2: customer.address?.line2 || '',
      address_city: customer.address?.city || '',
      address_postal_code: customer.address?.postal_code || '',
      address_country: customer.address?.country || '',
      metadata: customer.metadata || {}
    };
    
    // If shipping address exists, use it instead of billing address
    if (customer.shipping && customer.shipping.address) {
      customerData.address_line1 = customer.shipping.address.line1 || customerData.address_line1;
      customerData.address_line2 = customer.shipping.address.line2 || customerData.address_line2;
      customerData.address_city = customer.shipping.address.city || customerData.address_city;
      customerData.address_postal_code = customer.shipping.address.postal_code || customerData.address_postal_code;
      customerData.address_country = customer.shipping.address.country || customerData.address_country;
    }
    
    const customerResult = await findOrCreateCustomer(customer.id, customerData);
    
    if (!customerResult.success) {
      console.error(`Failed to create customer from ${customer.id}:`, customerResult.error);
    } else {
      console.log(`Successfully created/updated customer ${customerResult.customerId} from Stripe customer ${customer.id}`);
    }
    
    // Create an order for the customer directly without checking invoice amount
    console.log(`Creating order for customer ${customer.id}`);
    
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from customer ${customer.id}`);
      
      // Mark the event as processed
      try {
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
      
      return { 
        success: true, 
        message: `Order created from customer ${customer.id}`,
        orderId,
        customerId: customerResult.customerId
      };
    } else {
      console.error(`Failed to create order from customer ${customer.id}:`, error);
      return { 
        success: false, 
        error,
        customerId: customerResult.customerId
      };
    }
  } catch (error) {
    console.error(`Error processing customer event ${event.id}:`, error);
    return { success: false, error };
  }
}

/**
 * Process an invoice.paid event
 */
async function processInvoicePaidEvent(event) {
  try {
    console.log(`Processing invoice.paid event for ${event.data.object.id}`);
    
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

    const invoice = event.data.object;
    const customerId = invoice.customer;
    
    // Check if the invoice amount is greater than 300 euros
    const amountPaid = invoice.amount_paid / 100; // Convert from cents to euros
    console.log(`Invoice ${invoice.id} amount paid: ${amountPaid} euros`);
    
    if (amountPaid <= 300) {
      console.log(`Invoice ${invoice.id} amount (${amountPaid} euros) is not greater than 300 euros, skipping order creation`);
      return { 
        success: false, 
        message: 'Invoice amount not greater than 300 euros'
      };
    }
    
    // Fetch line items for the invoice
    console.log(`Fetching line items for invoice ${invoice.id}`);
    const lineItems = await stripe.invoiceItems.list({
      invoice: invoice.id
    });
    
    // Add the invoice ID and line items to the event data for reference
    event.data.invoiceId = invoice.id;
    event.data.lineItems = lineItems.data;
    
    // Create an order for the invoice
    console.log(`Creating order for invoice ${invoice.id} (customer ${customerId})`);
    
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from invoice ${invoice.id}`);
      
      // Update the order with the invoice ID and mark as paid
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          stripe_invoice_id: invoice.id,
          paid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (updateError) {
        console.error(`Error updating order ${orderId} with invoice ID:`, updateError);
      }
      
      // Mark the event as processed
      try {
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
      
      return { 
        success: true, 
        message: `Order created from invoice ${invoice.id}`,
        orderId
      };
    } else {
      console.error(`Failed to create order from invoice ${invoice.id}:`, error);
      return { 
        success: false, 
        error
      };
    }
  } catch (error) {
    console.error(`Error processing invoice.paid event ${event.id}:`, error);
    return { success: false, error };
  }
}

/**
 * Create an order from a Stripe event
 */
async function createOrderFromStripeEvent(stripeEvent) {
  try {
    console.log(`Creating order from Stripe event ${stripeEvent.id} (${stripeEvent.type})`);
    
    // Generate a unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Extract customer data from the event
    let customer = null;
    let customerId = null;
    let stripeCustomerId = null;
    let customerName = 'Unknown Customer';
    let customerEmail = '';
    let customerPhone = '';
    let shippingAddressLine1 = '';
    let shippingAddressLine2 = '';
    let shippingAddressCity = '';
    let shippingAddressPostalCode = '';
    let shippingAddressCountry = '';
    let shippingAddressForDisplay = '';
    let orderNotes = '';
    let stripeInvoiceId = '';
    let isPaid = false;
    let lineItems = [];
    
    // Extract data based on event type
    if (stripeEvent.type === 'customer.created') {
      customer = stripeEvent.data.object;
      stripeCustomerId = customer.id;
      customerName = customer.name || 'New Customer';
      customerEmail = customer.email || '';
      customerPhone = customer.phone || '';
      
      // Extract shipping address if available
      if (customer.shipping && customer.shipping.address) {
        shippingAddressLine1 = customer.shipping.address.line1 || '';
        shippingAddressLine2 = customer.shipping.address.line2 || '';
        shippingAddressCity = customer.shipping.address.city || '';
        shippingAddressPostalCode = customer.shipping.address.postal_code || '';
        shippingAddressCountry = customer.shipping.address.country || '';
        
        // Create formatted address for display
        shippingAddressForDisplay = [
          shippingAddressLine1,
          shippingAddressLine2,
          shippingAddressCity,
          shippingAddressPostalCode,
          shippingAddressCountry
        ].filter(Boolean).join(', ');
      } else if (customer.address) {
        // Fall back to billing address if no shipping address
        shippingAddressLine1 = customer.address.line1 || '';
        shippingAddressLine2 = customer.address.line2 || '';
        shippingAddressCity = customer.address.city || '';
        shippingAddressPostalCode = customer.address.postal_code || '';
        shippingAddressCountry = customer.address.country || '';
        
        // Create formatted address for display
        shippingAddressForDisplay = [
          shippingAddressLine1,
          shippingAddressLine2,
          shippingAddressCity,
          shippingAddressPostalCode,
          shippingAddressCountry
        ].filter(Boolean).join(', ');
      }
      
      // Check if there's an invoice ID in the event data (added by our webhook handler)
      if (stripeEvent.data.invoiceId) {
        stripeInvoiceId = stripeEvent.data.invoiceId;
        console.log(`Using invoice ID from event data: ${stripeInvoiceId}`);
        // Since we have an invoice ID, this order is paid
        isPaid = true;
        
        // Check if there are line items in the event data
        if (stripeEvent.data.lineItems) {
          lineItems = stripeEvent.data.lineItems;
          console.log(`Found ${lineItems.length} line items for invoice ${stripeInvoiceId}`);
        }
      }
      // Check if there's an invoice ID in the customer object or metadata
      else if (customer.invoice) {
        stripeInvoiceId = customer.invoice;
      } else if (customer.metadata && customer.metadata.invoice_id) {
        stripeInvoiceId = customer.metadata.invoice_id;
      } else {
        // If no invoice ID is found, use the customer ID as reference
        stripeInvoiceId = `cus_ref_${customer.id}`;
      }
      
      console.log(`Using invoice ID: ${stripeInvoiceId}`);
      
      // Get metadata if available
      if (customer.metadata) {
        // Extract order notes from metadata
        orderNotes = customer.metadata.notes || 
                    customer.metadata.order_notes || 
                    customer.metadata.comments || 
                    `Customer created via Stripe: ${customer.id}`;
                    
        // Extract any other useful information from metadata
        if (customer.metadata.phone && !customerPhone) {
          customerPhone = customer.metadata.phone;
        }
      } else {
        orderNotes = `Stripe Customer: ${customer.id}`;
      }
      
      // Find or create customer
      if (stripeCustomerId) {
        const customerResult = await findOrCreateCustomer(stripeCustomerId, {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address_line1: shippingAddressLine1,
          address_line2: shippingAddressLine2,
          address_city: shippingAddressCity,
          address_postal_code: shippingAddressPostalCode,
          address_country: shippingAddressCountry,
          metadata: customer.metadata || {}
        });
        
        if (customerResult.success) {
          customerId = customerResult.customerId;
          console.log(`Associated order with customer ${customerId}`);
        }
      }
    } else if (stripeEvent.type === 'invoice.paid') {
      const invoice = stripeEvent.data.object;
      stripeInvoiceId = invoice.id;
      stripeCustomerId = invoice.customer;
      isPaid = true; // Invoice paid events always create paid orders
      
      // Fetch customer details from Stripe
      try {
        customer = await stripe.customers.retrieve(stripeCustomerId);
        
        customerName = customer.name || 'Invoice Customer';
        customerEmail = customer.email || '';
        customerPhone = customer.phone || '';
        
        // Extract shipping address if available
        if (customer.shipping && customer.shipping.address) {
          shippingAddressLine1 = customer.shipping.address.line1 || '';
          shippingAddressLine2 = customer.shipping.address.line2 || '';
          shippingAddressCity = customer.shipping.address.city || '';
          shippingAddressPostalCode = customer.shipping.address.postal_code || '';
          shippingAddressCountry = customer.shipping.address.country || '';
          
          // Create formatted address for display
          shippingAddressForDisplay = [
            shippingAddressLine1,
            shippingAddressLine2,
            shippingAddressCity,
            shippingAddressPostalCode,
            shippingAddressCountry
          ].filter(Boolean).join(', ');
        } else if (customer.address) {
          // Fall back to billing address if no shipping address
          shippingAddressLine1 = customer.address.line1 || '';
          shippingAddressLine2 = customer.address.line2 || '';
          shippingAddressCity = customer.address.city || '';
          shippingAddressPostalCode = customer.address.postal_code || '';
          shippingAddressCountry = customer.address.country || '';
          
          // Create formatted address for display
          shippingAddressForDisplay = [
            shippingAddressLine1,
            shippingAddressLine2,
            shippingAddressCity,
            shippingAddressPostalCode,
            shippingAddressCountry
          ].filter(Boolean).join(', ');
        }
        
        // Get metadata if available
        if (customer.metadata) {
          // Extract order notes from metadata
          orderNotes = customer.metadata.notes || 
                      customer.metadata.order_notes || 
                      customer.metadata.comments || 
                      `Invoice paid via Stripe: ${invoice.id}`;
                      
          // Extract any other useful information from metadata
          if (customer.metadata.phone && !customerPhone) {
            customerPhone = customer.metadata.phone;
          }
        } else {
          orderNotes = `Stripe Invoice: ${invoice.id}`;
        }
        
        // Check if there are line items in the event data
        if (stripeEvent.data.lineItems) {
          lineItems = stripeEvent.data.lineItems;
          console.log(`Found ${lineItems.length} line items for invoice ${stripeInvoiceId}`);
        }
        
        // Find or create customer
        if (stripeCustomerId) {
          const customerResult = await findOrCreateCustomer(stripeCustomerId, {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address_line1: shippingAddressLine1,
            address_line2: shippingAddressLine2,
            address_city: shippingAddressCity,
            address_postal_code: shippingAddressPostalCode,
            address_country: shippingAddressCountry,
            metadata: customer.metadata || {}
          });
          
          if (customerResult.success) {
            customerId = customerResult.customerId;
            console.log(`Associated order with customer ${customerId}`);
          }
        }
      } catch (error) {
        console.error(`Error fetching customer ${stripeCustomerId} from Stripe:`, error);
        // Continue with limited information
        orderNotes = `Stripe Invoice: ${invoice.id} (Customer fetch failed)`;
      }
    } else {
      // Unsupported event type
      console.log(`Event type ${stripeEvent.type} not supported for order creation`);
      return { success: false, error: `Event type ${stripeEvent.type} not supported for order creation` };
    }
    
    // If we have individual address components but no formatted shipping address, create it for display
    if (!shippingAddressForDisplay && (shippingAddressLine1 || shippingAddressCity || shippingAddressPostalCode)) {
      shippingAddressForDisplay = [
        shippingAddressLine1,
        shippingAddressCity,
        shippingAddressPostalCode,
        shippingAddressCountry
      ].filter(Boolean).join(', ');
    }
    
    // Create the order
    console.log('Creating order with data:', {
      id: orderId,
      customer_id: customerId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2,
      shipping_address_city: shippingAddressCity,
      shipping_address_postal_code: shippingAddressPostalCode,
      shipping_address_country: shippingAddressCountry,
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: stripeInvoiceId,
      order_notes: orderNotes,
      paid: isPaid
    });
    
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        id: orderId,
        customer_id: customerId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        shipping_address_line1: shippingAddressLine1,
        shipping_address_line2: shippingAddressLine2,
        shipping_address_city: shippingAddressCity,
        shipping_address_postal_code: shippingAddressPostalCode,
        shipping_address_country: shippingAddressCountry,
        stripe_customer_id: stripeCustomerId,
        stripe_invoice_id: stripeInvoiceId,
        order_notes: orderNotes,
        status: 'pending',
        paid: isPaid,
        ok_to_ship: false,
        order_pack: 'standard',
        weight: '1.000',
        line_items: lineItems.length > 0 ? lineItems : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Error creating order:', error);
      return { success: false, error };
    }
    
    if (!order || order.length === 0) {
      console.error('No order returned after insert');
      return { success: false, error: 'No order returned after insert' };
    }
    
    console.log(`Created order ${order[0].id}`);
    
    return { success: true, data: order[0], orderId: order[0].id };
  } catch (error) {
    console.error('Error in createOrderFromStripeEvent:', error);
    return { success: false, error };
  }
}

/**
 * Main function to fetch and process Stripe events
 */
async function processStripeEvents(eventType = 'customer.created', limit = 100) {
  try {
    console.log(`Fetching the last ${limit} ${eventType} events from Stripe...`);
    
    // Fetch events from Stripe
    const events = await stripe.events.list({
      type: eventType,
      limit: limit
    });
    
    console.log(`Found ${events.data.length} ${eventType} events`);
    
    // Check if we already processed these events
    const eventIds = events.data.map(event => event.id);
    
    const { data: existingEvents, error } = await supabase
      .from('stripe_events')
      .select('event_id, processed')
      .in('event_id', eventIds);
    
    if (error) {
      console.error('Error checking existing events:', error);
      return { success: false, error };
    }
    
    // Create a map of processed events
    const processedEvents = new Map();
    existingEvents.forEach(event => {
      processedEvents.set(event.event_id, event.processed);
    });
    
    // Process events that haven't been processed yet
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let successCount = 0;
    
    for (const event of events.data) {
      // Skip if already processed
      if (processedEvents.has(event.id) && processedEvents.get(event.id)) {
        console.log(`Skipping already processed event ${event.id}`);
        skippedCount++;
        continue;
      }
      
      console.log(`Processing event ${event.id}`);
      
      try {
        let result;
        
        if (event.type === 'customer.created') {
          result = await processCustomerEvent(event);
        } else if (event.type === 'invoice.paid') {
          result = await processInvoicePaidEvent(event);
        } else {
          console.log(`Unsupported event type: ${event.type}`);
          continue;
        }
        
        processedCount++;
        
        if (result.success) {
          successCount++;
        } else {
          console.log(`Event processed but no order created: ${result.message || 'Unknown reason'}`);
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        errorCount++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n--- Processing Summary ---');
    console.log(`Total events found: ${events.data.length}`);
    console.log(`Events processed: ${processedCount}`);
    console.log(`Events skipped (already processed): ${skippedCount}`);
    console.log(`Successful order creations: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    return {
      success: true,
      totalEvents: events.data.length,
      processed: processedCount,
      skipped: skippedCount,
      successful: successCount,
      errors: errorCount
    };
  } catch (error) {
    console.error(`Error processing ${eventType} events:`, error);
    return { success: false, error };
  }
}

// Check if required environment variables are set
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY environment variable is not set');
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase environment variables are not set');
  process.exit(1);
}

// Get the event type and limit from command line arguments
const eventType = process.argv[2] || 'customer.created';
const limit = process.argv[3] ? parseInt(process.argv[3]) : 100;

console.log(`Starting to process the last ${limit} ${eventType} events...`);

// Process events
processStripeEvents(eventType, limit)
  .then(result => {
    if (result.success) {
      console.log('Script completed successfully');
      console.log(`Processed ${result.processed} events, created ${result.successful} orders`);
    } else {
      console.error('Script failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });