import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { SERVER_SUPABASE_URL } from './env';
import { normalizeCountryToCode } from './country-utils';

// Check if we're in a build context
const isBuildTime = process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.VERCEL_ENV;

// Check if environment variables are set
// Use process.env directly here for server-side
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_URL === 'build-placeholder') {
  console.warn('Missing Supabase environment variables (URL or Service Key). Using fallback values.');
}

// Create Supabase client with error handling
let supabase;
try {
  // Only create the client if we're not in a build context and vars exist
  if (!isBuildTime && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_URL !== 'build-placeholder') {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { // Use SERVICE KEY
      auth: { persistSession: false }
    });
  } else {
    // Create a mock client for build time
    supabase = {
      from: () => ({
        select: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        insert: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        update: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        delete: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        eq: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        order: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        limit: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        single: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        or: () => ({ data: null, error: new Error('Supabase client not available during build') }),
        not: () => ({ data: null, error: new Error('Supabase client not available during build') }),
      }),
      auth: {
        signIn: () => Promise.resolve({ user: null, error: new Error('Supabase client not available during build') }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: null, error: null, unsubscribe: () => {} }),
      },
    };
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  throw new Error('Failed to initialize Supabase client. Check your environment variables.');
}

export { supabase };

// Helper function to fetch orders
export async function fetchOrders() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching orders:', error);
    return [];
  }
}

// Helper function to fetch order statistics
export async function fetchOrderStats() {
  try {
    // First, get the total count of orders
    const { count: total, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error fetching order count:', countError);
      return { total: 0, pending: 0, shipped: 0, delivered: 0 };
    }
    
    // Then get counts for each status
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const stats = { total };
    
    // Get count for each status in parallel
    await Promise.all(statuses.map(async (status) => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      
      if (error) {
        console.error(`Error fetching ${status} order count:`, error);
        stats[status] = 0;
      } else {
        stats[status] = count;
      }
    }));
    
    return stats;
  } catch (error) {
    console.error('Exception fetching order stats:', error);
    return { total: 0, pending: 0, shipped: 0, delivered: 0 };
  }
}

// Helper function to fetch recent activity
export async function fetchRecentActivity() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, name, status, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
  
  return data?.map(order => {
    let description = '';
    let time = new Date(order.updated_at || order.created_at);
    
    if (order.status === 'pending') {
      description = `New order created: ${order.id} for ${order.name || 'Unknown Customer'}`;
    } else if (order.status === 'shipped') {
      description = `Order ${order.id} for ${order.name || 'Unknown Customer'} marked as shipped`;
    } else if (order.status === 'delivered') {
      description = `Order ${order.id} for ${order.name || 'Unknown Customer'} marked as delivered`;
    } else {
      description = `Order ${order.id} for ${order.name || 'Unknown Customer'} updated to ${order.status}`;
    }
    
    return {
      id: order.id,
      description,
      time
    };
  }) || [];
}

// Helper function to update order status
export async function updateOrderStatus(orderId, status) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select();
    
    if (error) {
      console.error('Error updating order status:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (e) {
    console.error('Exception updating order status:', e);
    return { success: false, error: e };
  }
}

// Helper function to update payment status
export async function updatePaymentStatus(orderId, isPaid = null) {
  try {
    // If isPaid is null, toggle the current value
    if (isPaid === null) {
      // First, get the current status
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('paid')
        .eq('id', orderId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current payment status:', fetchError);
        return { success: false, error: fetchError };
      }
      
      // Toggle the value
      isPaid = !currentOrder.paid;
    }
    
    // Update the payment status
    const { data, error } = await supabase
      .from('orders')
      .update({ paid: isPaid, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select();
    
    if (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error };
    }
    
    return { success: true, data, isPaid };
  } catch (e) {
    console.error('Exception updating payment status:', e);
    return { success: false, error: e };
  }
}

// Helper function to update shipping status
export async function updateShippingStatus(orderId, okToShip = null) {
  try {
    // If okToShip is null, toggle the current value
    if (okToShip === null) {
      // First, get the current status
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('ok_to_ship')
        .eq('id', orderId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current shipping status:', fetchError);
        return { success: false, error: fetchError };
      }
      
      // Toggle the value
      okToShip = !currentOrder.ok_to_ship;
    }
    
    // Update the shipping status
    const { data, error } = await supabase
      .from('orders')
      .update({ ok_to_ship: okToShip, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select();
    
    if (error) {
      console.error('Error updating shipping status:', error);
      return { success: false, error };
    }
    
    return { success: true, data, okToShip };
  } catch (e) {
    console.error('Exception updating shipping status:', e);
    return { success: false, error: e };
  }
}

// Helper function to search orders
export async function searchOrders(query) {
  if (!query || query.trim() === '') {
    return fetchOrders();
  }
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`id.ilike.%${query}%,customer_name.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error searching orders:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('Exception searching orders:', e);
    return [];
  }
}

// Helper function to create an order from a Stripe event
export async function createOrderFromStripeEvent(stripeEvent) {
  let customerName = 'Unknown Customer'; // Initialize customerName to ensure it's always defined
  try {
    // Verify that the event is stored in the database
    await verifyStripeEventStored(stripeEvent);
    
    // Check if this is a customer.created event with an invoice
    if (stripeEvent.type === 'customer.created' && stripeEvent.data.invoiceId) {
      // If we have an invoice ID, check if the amount is greater than 300 euros
      // This should be done in the webhook handler, but we'll double-check here
      try {
        // If the webhook handler has already checked the amount, we can trust it
        // But if we're called directly, we should check the amount
        if (!stripeEvent.data.amountChecked) {
          console.log(`Checking invoice amount for ${stripeEvent.data.invoiceId}`);
          
          // We need to import Stripe here
          const Stripe = require('stripe');
          const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2023-10-16',
          });
          
          // Fetch the invoice from Stripe
          const invoice = await stripe.invoices.retrieve(stripeEvent.data.invoiceId);
          
          // Check if the amount is greater than 300 euros
          const amountPaid = invoice.amount_paid / 100; // Convert from cents to euros
          console.log(`Invoice ${stripeEvent.data.invoiceId} amount paid: ${amountPaid} euros`);
          
          if (amountPaid <= 300) {
            console.log(`Invoice amount (${amountPaid} euros) is not greater than 300 euros, skipping order creation`);
            return { 
              success: false, 
              error: `Invoice amount (${amountPaid} euros) is not greater than 300 euros` 
            };
          }
        }
      } catch (error) {
        console.error(`Error checking invoice amount for ${stripeEvent.data.invoiceId}:`, error);
        // Continue with order creation even if we can't check the amount
        // This is to avoid blocking order creation if the Stripe API is unavailable
      }
    }
    
    // Generate a unique order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Extract data from the event
    const eventData = stripeEvent.data.object;
    
    // Initialize variables for order data
    let customerEmail = '';
    let customerPhone = '';
    let shippingAddressForDisplay = ''; // Initialize this variable
    let shippingAddressLine1 = '';
    let shippingAddressLine2 = '';
    let shippingAddressCity = '';
    let shippingAddressState = '';
    let shippingAddressPostalCode = '';
    let shippingAddressCountry = '';
    // Initialize house number with a default non-null value
    let shippingAddressHouseNumber = 'N/A'; 
    let orderNotes = '';
    let stripeCustomerId = '';
    let stripeInvoiceId = '';
    let stripePaymentIntentId = '';
    let customerId = null;
    // Initialize isPaid as false, we'll set it to true if needed
    let isPaid = false;
    // Initialize line items
    let lineItems = null;
    
    // Handle different event types
    if (stripeEvent.type === 'customer.created') {
      // Extract data from customer object
      const customer = eventData;
      stripeCustomerId = customer.id || '';
      
      // Extract customer details
      customerName = customer.name || 'Stripe Customer';
      customerEmail = customer.email || '';
      customerPhone = customer.phone || '';
      
      // Extract shipping address if available
      if (customer.shipping && customer.shipping.address) {
        const address = customer.shipping.address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        // Assign default placeholder for house number
        // shippingAddressHouseNumber = 'N/A'; // REMOVED - Will be extracted later
        
        // Format shipping address for display purposes
        shippingAddressForDisplay = formatShippingAddress(address);
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
      } else if (stripeEvent.data && stripeEvent.data.invoice) {
        stripeInvoiceId = stripeEvent.data.invoice;
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
          address_state: shippingAddressState,
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
      // Extract data from invoice object
      const invoice = eventData;
      stripeCustomerId = invoice.customer || '';
      stripeInvoiceId = invoice.id || '';
      
      // Since this is an invoice.paid event, the order is paid
      isPaid = true;
      
      // Try to get customer details from the invoice
      if (invoice.customer_name) {
        customerName = invoice.customer_name;
      } else if (invoice.customer_email) {
        customerName = invoice.customer_email.split('@')[0] || 'Invoice Customer';
      } else {
        customerName = 'Invoice Customer';
      }
      
      customerEmail = invoice.customer_email || '';
      
      // Try to get shipping address from invoice
      if (invoice.customer_shipping && invoice.customer_shipping.address) {
        const address = invoice.customer_shipping.address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        // Assign default placeholder for house number
        // shippingAddressHouseNumber = 'N/A'; // REMOVED - Will be extracted later
        
        // Format shipping address for the orders table
        shippingAddressForDisplay = formatShippingAddress(address);
      } else if (invoice.customer_address) {
        // Use customer address if shipping address is not available
        const address = invoice.customer_address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        // Assign default placeholder for house number
        // shippingAddressHouseNumber = 'N/A'; // REMOVED - Will be extracted later
        
        // Format shipping address for the orders table
        shippingAddressForDisplay = formatShippingAddress(address);
      }
      
      // Set order details
      orderNotes = `Invoice: ${stripeInvoiceId}`;
      
      // Find or create customer
      if (stripeCustomerId) {
        const customerResult = await findOrCreateCustomer(stripeCustomerId, {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address_line1: shippingAddressLine1,
          address_line2: shippingAddressLine2,
          address_city: shippingAddressCity,
          address_state: shippingAddressState,
          address_postal_code: shippingAddressPostalCode,
          address_country: shippingAddressCountry,
          metadata: invoice.metadata || {}
        });
        
        if (customerResult.success) {
          customerId = customerResult.customerId;
          console.log(`Associated order with customer ${customerId}`);
        }
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
    
    // If shipping address components are still empty but we have a customer address, use it
    if (!shippingAddressLine1 && !shippingAddressCity && !shippingAddressPostalCode) {
      console.log('Shipping address is empty, checking for customer address in the event');
      
      // For customer.created events, check the customer object directly
      if (stripeEvent.type === 'customer.created') {
        const customer = eventData;
        
        // First check shipping address
        if (customer.shipping && customer.shipping.address) {
          console.log('Using customer shipping address from event');
          const address = customer.shipping.address;
          shippingAddressLine1 = address.line1 || '';
          shippingAddressLine2 = address.line2 || '';
          shippingAddressCity = address.city || '';
          shippingAddressState = address.state || '';
          shippingAddressPostalCode = address.postal_code || '';
          shippingAddressCountry = address.country || '';
          // Assign default placeholder for house number
          // shippingAddressHouseNumber = 'N/A'; // REMOVED - Will be extracted later
        } 
        // Then check billing address if shipping is not available
        else if (customer.address) {
          console.log('Using customer billing address from event');
          const address = customer.address;
          shippingAddressLine1 = address.line1 || '';
          shippingAddressLine2 = address.line2 || '';
          shippingAddressCity = address.city || '';
          shippingAddressState = address.state || '';
          shippingAddressPostalCode = address.postal_code || '';
          shippingAddressCountry = address.country || '';
          // Assign default placeholder for house number
          // shippingAddressHouseNumber = 'N/A'; // REMOVED - Will be extracted later
        }
      }
      
      // For invoice.paid events, check the invoice object
      else if (stripeEvent.type === 'invoice.paid') {
        const invoice = eventData;
        
        // First check shipping address
        if (invoice.customer_shipping && invoice.customer_shipping.address) {
          console.log('Using customer shipping address from invoice');
          const address = invoice.customer_shipping.address;
          shippingAddressLine1 = address.line1 || '';
          shippingAddressLine2 = address.line2 || '';
          shippingAddressCity = address.city || '';
          shippingAddressState = address.state || '';
          shippingAddressPostalCode = address.postal_code || '';
          shippingAddressCountry = address.country || '';
          // Assign default placeholder for house number
          // shippingAddressHouseNumber = 'N/A'; // REMOVED - Will be extracted later
        } 
        // Then check customer address if shipping is not available
        else if (invoice.customer_address) {
          console.log('Using customer address from invoice');
          const address = invoice.customer_address;
          shippingAddressLine1 = address.line1 || '';
          shippingAddressLine2 = address.line2 || '';
          shippingAddressCity = address.city || '';
          shippingAddressState = address.state || '';
          shippingAddressPostalCode = address.postal_code || '';
          shippingAddressCountry = address.country || '';
          // Assign default placeholder for house number
          // shippingAddressHouseNumber = 'N/A'; // REMOVED - Will be extracted later
        }
      }
    }
    
    // If shipping address is still empty but we have a Stripe customer ID,
    // try to fetch the customer's address from Stripe
    if ((!shippingAddressLine1 || !shippingAddressCity || !shippingAddressPostalCode) && stripeCustomerId) {
      try {
        // First check if we already have this customer in our database
        const { data: existingCustomer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('stripe_customer_id', stripeCustomerId)
          .single();
        
        if (!customerError && existingCustomer) {
          // Use the customer's address from our database
          console.log(`Using customer address from database for order`);
          
          // Update the individual address components if they're empty
          if (!shippingAddressLine1) {
            shippingAddressLine1 = existingCustomer.address_line1 || '';
          }
          if (!shippingAddressLine2) {
            shippingAddressLine2 = existingCustomer.address_line2 || '';
          }
          if (!shippingAddressCity) {
            shippingAddressCity = existingCustomer.address_city || '';
          }
          if (!shippingAddressState) {
            shippingAddressState = existingCustomer.address_state || '';
          }
          if (!shippingAddressPostalCode) {
            shippingAddressPostalCode = existingCustomer.address_postal_code || '';
          }
          if (!shippingAddressCountry) {
            shippingAddressCountry = existingCustomer.address_country || '';
          }
          
          // Update the formatted address for display
          shippingAddressForDisplay = [
            shippingAddressLine1,
            shippingAddressCity,
            shippingAddressPostalCode,
            shippingAddressCountry
          ].filter(Boolean).join(', ');
        }
      } catch (addressError) {
        console.error('Error fetching customer address:', addressError);
        // Continue with empty shipping address if there's an error
      }
    }
    
    // Before creating the order, normalize the country code
    if (shippingAddressCountry) {
      shippingAddressCountry = normalizeCountryToCode(shippingAddressCountry);
    }
    
    // If we don't have a formatted address for display yet, create one from the individual components
    if (!shippingAddressForDisplay && (shippingAddressLine1 || shippingAddressCity || shippingAddressPostalCode || shippingAddressCountry)) {
      shippingAddressForDisplay = [
        shippingAddressLine1,
        shippingAddressCity,
        shippingAddressPostalCode,
        shippingAddressCountry
      ].filter(Boolean).join(', ');
    }
    
    // Format line items for storage if available
    let lineItemsJson = null;
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      try {
        // Extract relevant information from line items
        const formattedLineItems = lineItems.map(item => ({
          id: item.id || '',
          description: item.description || '',
          amount: (item.amount || 0) / 100, // Convert from cents to euros
          quantity: item.quantity || 1,
          currency: item.currency || 'eur',
          type: item.type || 'invoiceitem'
        }));
        
        // Convert to JSON string for storage
        lineItemsJson = JSON.stringify(formattedLineItems);
        console.log(`Formatted ${formattedLineItems.length} line items for storage`);
      } catch (error) {
        console.error('Error formatting line items:', error);
        // If there's an error, set lineItemsJson to null
        lineItemsJson = null;
      }
    }
    
    console.log(`Creating order from ${stripeEvent.type} event:`, {
      id: orderId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2,
      shipping_address_city: shippingAddressCity,
      shipping_address_postal_code: shippingAddressPostalCode,
      shipping_address_country: shippingAddressCountry,
      shipping_address_for_display: shippingAddressForDisplay,
      order_notes: orderNotes,
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: stripeInvoiceId,
      customer_id: customerId,
      paid: isPaid,
      line_items: lineItemsJson ? `${lineItemsJson.substring(0, 50)}...` : null
    });
    
    // Extract house number from line1
    const addressParts = extractHouseNumber(shippingAddressLine1);
    const extractedHouseNumber = addressParts.houseNumber;
    const cleanedStreetLine1 = addressParts.streetLine;

    console.log(`Address processing: Original L1: "${shippingAddressLine1}", Extracted HN: "${extractedHouseNumber}", Cleaned L1: "${cleanedStreetLine1}"`);

    // Create the order in Supabase with dynamic fields
    const insertData = {
      id: orderId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      shipping_address_line1: cleanedStreetLine1, // Use the cleaned street line
      shipping_address_line2: shippingAddressLine2,
      shipping_address_city: shippingAddressCity,
      shipping_address_postal_code: shippingAddressPostalCode,
      shipping_address_country: shippingAddressCountry,
      shipping_address_house_number: extractedHouseNumber || '', // Use extracted number, or empty string
      order_notes: orderNotes,
      status: 'pending',
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_payment_intent_id: stripePaymentIntentId,
      customer_id: customerId,
      paid: isPaid,
      ok_to_ship: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_via: 'standard',
      reason_for_shipment: 'new order'
    };

    // Log the prepared order data
    console.log('Prepared order data:', insertData);

    // Create the order in Supabase with dynamic fields
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(insertData)
      .select()
      .single();
    
    if (orderError) {
      console.error('Error creating order from Stripe event:', orderError);
      if (typeof window === 'undefined') { // Check if server-side
        const { sendSlackNotification } = await import('./slack-notifications.server.js');
        await sendSlackNotification(`Error creating order for ${customerName}`, orderError);
      }
      return { success: false, error: orderError };
    }
    
    return { success: true, data: order, orderId };
  } catch (e) {
    console.error('Exception creating order from Stripe event:', e);
    if (typeof window === 'undefined') { // Check if server-side
      const { sendSlackNotification } = await import('./slack-notifications.server.js');
      // Use the customerName variable that should be populated from the try block
      await sendSlackNotification(`Exception creating order for ${customerName}`, e);
    }
    return { success: false, error: e };
  }
}

// Helper function to format shipping address - used for display purposes only, not for database storage
function formatShippingAddress(address) {
  if (!address) return '';
  
  // Normalize the country code
  const countryCode = address.country ? normalizeCountryToCode(address.country) : '';
  
  const parts = [
    address.line1,
    address.city,
    address.postal_code,
    countryCode
  ].filter(Boolean);
  
  return parts.join(', ');
}

// Helper function to extract house number from address line 1
export function extractHouseNumber(line1) {
  if (!line1) return { houseNumber: null, streetLine: '' };

  // Trim whitespace
  const trimmedLine1 = line1.trim();
  let houseNumber = null;
  let streetLine = trimmedLine1;

  // Pattern 1: Number at the beginning (e.g., "123 Main St", "45a High Road")
  // Allows for letters immediately after digits (e.g., 123a)
  // Regex: /^(\d+[a-zA-Z]*)(\s+.*|$)/
  // Group 1: House number, Group 2: Rest of the street (or empty if number is the whole string)
  const matchStart = trimmedLine1.match(/^(\d+[a-zA-Z]*)(\s+.*|$)/);
  if (matchStart && matchStart[1]) {
    houseNumber = matchStart[1];
    // Group 2 contains the leading space and the rest of the street.
    // If group 2 exists and is not just whitespace, use it, otherwise, street is empty.
    streetLine = matchStart[2] ? matchStart[2].trim() : '';
    console.log(`Extracted house number (start): ${houseNumber} from "${trimmedLine1}". Street: "${streetLine}"`);
    return { houseNumber, streetLine };
  }

  // Pattern 2: Number at the end (e.g., "Main St 123", "High Road 45a")
  // Requires a space, comma, or hyphen before the number.
  // Regex: /^(.*?)(\s+|,|\s*-\s*)(\d+[a-zA-Z]*)$/
  // Group 1: Street part, Group 2: Separator, Group 3: House number
  const matchEnd = trimmedLine1.match(/^(.*?)(\s+|,|\s*-\s*)(\d+[a-zA-Z]*)$/);
  if (matchEnd && matchEnd[3]) {
    houseNumber = matchEnd[3];
    streetLine = matchEnd[1] ? matchEnd[1].trim() : ''; // The part before the separator and number
    console.log(`Extracted house number (end): ${houseNumber} from "${trimmedLine1}". Street: "${streetLine}"`);
    return { houseNumber, streetLine };
  }
  
  // Pattern 3: Number after street name, potentially complex (e.g., "Route d'Arlon 1") - Less common.
  // This pattern is tricky to make non-greedy for the street part and robust.
  // Let's simplify it or ensure it correctly splits.
  // Regex: /^(.*?)\s+(\d+[a-zA-Z]*)(?:\s+.*)?$/ - attempts to find a number preceded by a space, not at the very end
  // A simpler approach for "middle" numbers might be to assume they are not common or handled by specific logic if needed.
  // The original regex: /^(?:[a-zA-Z\s\\'-]+)(\d+[a-zA-Z]*)(\s+.*|$)/ was also problematic.

  // If patterns 1 and 2 didn't match, we return the original line as streetLine.
  console.log(`Could not extract house number from "${trimmedLine1}". Returning original line.`);
  return { houseNumber: null, streetLine: trimmedLine1 };
}

// Helper function to verify that a Stripe event is stored in the database
async function verifyStripeEventStored(stripeEvent) {
  try {
    // Check if the event exists in the database
    const { data, error } = await supabase
      .from('stripe_events')
      .select('*')
      .eq('event_id', stripeEvent.id)
      .single();
    
    if (error) {
      console.log(`Stripe event ${stripeEvent.id} not found in database, storing it now...`);
      
      // Store the event in the database
      const { error: insertError } = await supabase
        .from('stripe_events')
        .insert({
          event_id: stripeEvent.id,
          event_type: stripeEvent.type,
          event_data: stripeEvent.data.object,
          processed: false,
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error storing Stripe event:', insertError);
      } else {
        console.log(`Successfully stored Stripe event ${stripeEvent.id} in database`);
      }
    } else {
      console.log(`Stripe event ${stripeEvent.id} already exists in database`);
    }
  } catch (e) {
    console.error('Error verifying Stripe event storage:', e);
    // Continue with order creation even if verification fails
  }
}

// Helper function to find or create a customer from Stripe data
export async function findOrCreateCustomer(stripeCustomerId, customerData) {
  try {
    if (!stripeCustomerId) {
      console.log('No Stripe customer ID provided, skipping customer creation');
      return { success: false, error: 'No Stripe customer ID provided' };
    }

    console.log(`Finding or creating customer with Stripe ID ${stripeCustomerId}`, customerData);

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
      console.log(`Customer with Stripe ID ${stripeCustomerId} already exists (ID: ${existingCustomer.id})`);
      
      // Update customer data if provided
      if (customerData) {
        console.log(`Updating customer ${existingCustomer.id} with new data:`, {
          name: customerData.name || existingCustomer.name,
          email: customerData.email || existingCustomer.email,
          phone: customerData.phone || existingCustomer.phone,
          address_line1: customerData.address_line1 || existingCustomer.address_line1,
          address_line2: customerData.address_line2 || existingCustomer.address_line2,
          address_city: customerData.address_city || existingCustomer.address_city,
          address_postal_code: customerData.address_postal_code || existingCustomer.address_postal_code,
          address_country: customerData.address_country || existingCustomer.address_country,
          address_house_number: customerData.address_house_number || existingCustomer.address_house_number,
          metadata: customerData.metadata || existingCustomer.metadata
        });
        
        const { error: updateError } = await supabase
          .from('customers')
          .update({
            name: customerData.name || existingCustomer.name,
            email: customerData.email || existingCustomer.email,
            phone: customerData.phone || existingCustomer.phone,
            address_line1: customerData.address_line1 || existingCustomer.address_line1,
            address_line2: customerData.address_line2 || existingCustomer.address_line2,
            address_city: customerData.address_city || existingCustomer.address_city,
            address_postal_code: customerData.address_postal_code || existingCustomer.address_postal_code,
            address_country: customerData.address_country || existingCustomer.address_country,
            address_house_number: customerData.address_house_number || existingCustomer.address_house_number,
            metadata: customerData.metadata || existingCustomer.metadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCustomer.id);
        
        if (updateError) {
          console.error('Error updating customer:', updateError);
          return { success: false, error: updateError, customerId: existingCustomer.id };
        }
        
        console.log(`Updated customer ${existingCustomer.id}`);
      }
      
      return { success: true, customer: existingCustomer, customerId: existingCustomer.id, isNew: false };
    }
    
    // Create new customer
    console.log(`Creating new customer with Stripe ID ${stripeCustomerId}`, {
      name: customerData?.name || 'Unknown Customer',
      email: customerData?.email || '',
      phone: customerData?.phone || '',
      address_line1: customerData?.address_line1 || '',
      address_line2: customerData?.address_line2 || '',
      address_city: customerData?.address_city || '',
      address_postal_code: customerData?.address_postal_code || '',
      address_country: customerData?.address_country || '',
      address_house_number: customerData?.address_house_number || '',
      metadata: customerData?.metadata || {}
    });
    
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
        address_house_number: customerData?.address_house_number || '',
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
      console.error('Customer was created but no data was returned');
      
      // Try to fetch the customer we just created
      const { data: fetchedCustomer, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching newly created customer:', fetchError);
        return { success: false, error: 'Customer created but could not be retrieved' };
      }
      
      console.log(`Retrieved newly created customer ${fetchedCustomer.id}`);
      return { success: true, customer: fetchedCustomer, customerId: fetchedCustomer.id, isNew: true };
    }
    
    console.log(`Created new customer ${newCustomer[0].id}`);
    return { success: true, customer: newCustomer[0], customerId: newCustomer[0].id, isNew: true };
  } catch (e) {
    console.error('Exception in findOrCreateCustomer:', e);
    return { success: false, error: e };
  }
}

// Helper function to fetch customers
export async function fetchCustomers(supabase) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error('Exception fetching customers:', e);
    return [];
  }
}

// Helper function to fetch a customer by ID
export async function fetchCustomerById(supabase, customerId) {
  try {
    console.log(`Fetching customer by ID: ${customerId}`);
    if (!customerId) {
      console.warn('fetchCustomerById called with null or undefined customerId.');
      return null;
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
    
    if (error) {
      console.error(`Error fetching customer ${customerId}:`, error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error(`Exception fetching customer ${customerId}:`, e);
    return null;
  }
}

// Helper function to fetch a customer by Stripe ID
export async function fetchCustomerByStripeId(stripeCustomerId) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();
    
    if (error) {
      console.error(`Error fetching customer with Stripe ID ${stripeCustomerId}:`, error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error(`Exception fetching customer with Stripe ID ${stripeCustomerId}:`, e);
    return null;
  }
}

// Helper function to fetch orders for a customer
export async function fetchOrdersByCustomerId(supabase, customerId) {
  try {
    console.log(`Fetching orders for customer ID: ${customerId}`);
    if (!customerId) {
      console.warn('fetchOrdersByCustomerId called with null or undefined customerId.');
      return [];
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching orders for customer ${customerId}:`, error);
      return [];
    }
    console.log(`Orders for customer ${customerId} fetched successfully:`, data);
    return data || [];
  } catch (error) {
    console.error(`Exception fetching orders for customer ${customerId}:`, error);
    return [];
  }
}

/**
 * Fetch delivery status statistics
 * @returns {Promise<Object>} Delivery status statistics
 */
export async function fetchDeliveryStats() {
  try {
    // Get all orders with delivery status
    const { data, error } = await supabase
      .from('orders')
      .select('delivery_status, shipping_instruction')
      .not('delivery_status', 'is', null);
    
    if (error) {
      console.error('Error fetching delivery stats:', error);
      return {
        total_tracked: 0,
        delivered: 0,
        in_transit: 0,
        to_ship: 0,
        do_not_ship: 0,
        unknown: 0,
        by_instruction: {}
      };
    }
    
    // Count orders by delivery status
    const stats = {
      total_tracked: data.length,
      delivered: 0,
      in_transit: 0,
      to_ship: 0,
      do_not_ship: 0,
      unknown: 0,
      by_instruction: {}
    };
    
    // Process each order
    data.forEach(order => {
      // Count by delivery status
      if (order.delivery_status === 'delivered') {
        stats.delivered++;
      } else if (order.delivery_status === 'in_transit' || order.delivery_status === 'out_for_delivery') {
        stats.in_transit++;
      } else {
        stats.unknown++;
      }
      
      // Count by shipping instruction
      if (order.shipping_instruction) {
        if (!stats.by_instruction[order.shipping_instruction]) {
          stats.by_instruction[order.shipping_instruction] = 0;
        }
        stats.by_instruction[order.shipping_instruction]++;
      }
      
      // Count to_ship and do_not_ship
      if (order.shipping_instruction === 'TO SHIP') {
        stats.to_ship++;
      } else if (order.shipping_instruction === 'DO NOT SHIP') {
        stats.do_not_ship++;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Exception fetching delivery stats:', error);
    return {
      total_tracked: 0,
      delivered: 0,
      in_transit: 0,
      to_ship: 0,
      do_not_ship: 0,
      unknown: 0,
      by_instruction: {}
    };
  }
} 