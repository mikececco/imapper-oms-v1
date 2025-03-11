const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { findOrCreateCustomer, createOrderFromStripeEvent } = require('./supabase');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // Check if there are any paid invoices for this customer with amount > 300 euros
    console.log(`Checking for paid invoices for customer ${customer.id}`);
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      status: 'paid',
      limit: 10
    });
    
    let eligibleInvoice = null;
    
    // Find an invoice with amount > 300 euros
    for (const invoice of invoices.data) {
      const amountPaid = invoice.amount_paid / 100; // Convert from cents to euros
      console.log(`Found invoice ${invoice.id} with amount paid: ${amountPaid} euros`);
      
      if (amountPaid > 300) {
        eligibleInvoice = invoice;
        break;
      }
    }
    
    if (!eligibleInvoice) {
      console.log(`No eligible invoices found for customer ${customer.id} (amount > 300 euros required)`);
      return { 
        success: false, 
        message: 'No eligible invoices found (amount > 300 euros required)',
        customerId: customerResult.customerId 
      };
    }
    
    // Fetch line items for the eligible invoice
    console.log(`Fetching line items for invoice ${eligibleInvoice.id}`);
    const lineItems = await stripe.invoiceItems.list({
      invoice: eligibleInvoice.id
    });
    
    // Create an order for the eligible invoice
    console.log(`Creating order for customer ${customer.id} with eligible invoice ${eligibleInvoice.id}`);
    
    // Add the invoice ID, line items, and amount checked flag to the event data for reference
    event.data.invoiceId = eligibleInvoice.id;
    event.data.lineItems = lineItems.data;
    event.data.amountChecked = true; // Mark that we've already checked the amount
    
    const { success, data, orderId, error } = await createOrderFromStripeEvent(event);
    
    if (success) {
      console.log(`Successfully created order ${orderId} from customer ${customer.id} with invoice ${eligibleInvoice.id}`);
      
      // Update the order with the invoice ID
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          stripe_invoice_id: eligibleInvoice.id,
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
        message: `Order created from customer ${customer.id} with invoice ${eligibleInvoice.id}`,
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
 * Main function to fetch and process the last 100 customer.created events
 */
async function processLastCustomerEvents(limit = 100) {
  try {
    console.log(`Fetching the last ${limit} customer.created events from Stripe...`);
    
    // Fetch events from Stripe
    const events = await stripe.events.list({
      type: 'customer.created',
      limit: limit
    });
    
    console.log(`Found ${events.data.length} customer.created events`);
    
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
      
      console.log(`Processing event ${event.id} for customer ${event.data.object.id}`);
      
      try {
        const result = await processCustomerEvent(event);
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
    console.error('Error processing customer events:', error);
    return { success: false, error };
  }
}

// Export functions
module.exports = {
  processCustomerEvent,
  processLastCustomerEvents
};

// Run the script if executed directly
if (require.main === module) {
  // Load environment variables if needed
  require('dotenv').config();
  
  // Check if required environment variables are set
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY environment variable is not set');
    process.exit(1);
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase environment variables are not set');
    process.exit(1);
  }
  
  // Get the limit from command line arguments
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 100;
  
  // Process events
  processLastCustomerEvents(limit)
    .then(result => {
      if (result.success) {
        console.log('Script completed successfully');
      } else {
        console.error('Script failed:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
} 