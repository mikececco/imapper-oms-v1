import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY } from './env';

if (!SERVER_SUPABASE_URL || !SERVER_SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase environment variables. Using fallback values.');
}

// Create Supabase client with error handling
let supabase;
try {
  supabase = createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
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
    const { data, error } = await supabase
      .from('orders')
      .select('status, count(*)')
      .group('status');
    
    if (error) {
      console.error('Error fetching order stats:', error);
      return { total: 0, pending: 0, shipped: 0, delivered: 0 };
    }
    
    // Calculate stats
    const stats = {
      total: 0,
      pending: 0,
      shipped: 0,
      delivered: 0
    };
    
    data.forEach(item => {
      const count = parseInt(item.count, 10);
      stats.total += count;
      
      if (item.status === 'pending') {
        stats.pending += count;
      } else if (item.status === 'shipped') {
        stats.shipped += count;
      } else if (item.status === 'delivered') {
        stats.delivered += count;
      }
    });
    
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
  try {
    // First, verify that the event is stored in the database
    await verifyStripeEventStored(stripeEvent);
    
    // Generate a unique ID for the order
    const orderId = `ord_${crypto.randomBytes(6).toString('hex')}`;
    
    // Extract customer information from the event
    const eventData = stripeEvent.data.object;
    let customerName = 'Unknown Customer';
    let customerEmail = '';
    let customerPhone = '';
    let shippingAddress = '';
    let shippingAddressLine1 = '';
    let shippingAddressLine2 = '';
    let shippingAddressCity = '';
    let shippingAddressState = '';
    let shippingAddressPostalCode = '';
    let shippingAddressCountry = '';
    let orderPack = '';
    let orderNotes = '';
    let stripeCustomerId = '';
    let stripeInvoiceId = '';
    let stripePaymentIntentId = '';
    let customerId = null;
    
    // Handle different event types
    if (stripeEvent.type === 'customer.created') {
      // Extract data from customer object
      const customer = eventData;
      customerName = customer.name || 'New Customer';
      customerEmail = customer.email || '';
      customerPhone = customer.phone || '';
      stripeCustomerId = customer.id || '';
      
      // Check if there's an invoice ID in the customer object or metadata
      if (customer.invoice) {
        stripeInvoiceId = customer.invoice;
      } else if (customer.metadata && customer.metadata.invoice_id) {
        stripeInvoiceId = customer.metadata.invoice_id;
      } else if (stripeEvent.data && stripeEvent.data.invoice) {
        stripeInvoiceId = stripeEvent.data.invoice;
      } else {
        // If no invoice ID is found, use the customer ID as reference
        stripeInvoiceId = `cus_ref_${customer.id}`;
      }
      
      console.log(`Using invoice ID: ${stripeInvoiceId} for customer ${stripeCustomerId}`);
      
      // Extract all possible address information
      let addressFound = false;
      
      // Check if customer has an address
      if (customer.address) {
        addressFound = true;
        const address = customer.address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        
        // Format shipping address for the orders table
        shippingAddress = formatShippingAddress(address);
        console.log('Using customer.address for shipping address:', shippingAddress);
      } 
      
      // If no address yet, check shipping address
      if (!addressFound && customer.shipping && customer.shipping.address) {
        addressFound = true;
        const address = customer.shipping.address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        
        // Format shipping address for the orders table
        shippingAddress = formatShippingAddress(address);
        console.log('Using customer.shipping.address for shipping address:', shippingAddress);
      } 
      
      // If still no address, check metadata
      if (!addressFound && customer.metadata && customer.metadata.address) {
        // Try to parse address from metadata if it exists
        try {
          const address = typeof customer.metadata.address === 'string' 
            ? JSON.parse(customer.metadata.address) 
            : customer.metadata.address;
            
          shippingAddressLine1 = address.line1 || '';
          shippingAddressLine2 = address.line2 || '';
          shippingAddressCity = address.city || '';
          shippingAddressState = address.state || '';
          shippingAddressPostalCode = address.postal_code || '';
          shippingAddressCountry = address.country || '';
          
          // Format shipping address for the orders table
          shippingAddress = formatShippingAddress(address);
          addressFound = true;
          console.log('Using customer.metadata.address for shipping address:', shippingAddress);
        } catch (e) {
          console.error('Error parsing address from metadata:', e);
          // If parsing fails, leave address empty
        }
      }
      
      // If still no address, check for individual address fields in metadata
      if (!addressFound && customer.metadata) {
        const metadata = customer.metadata;
        const addressFields = [
          'address_line1', 'address_line_1', 'line1', 'street',
          'address_city', 'city',
          'address_postal_code', 'postal_code', 'zip',
          'address_country', 'country'
        ];
        
        // Check if any address fields exist in metadata
        const hasAddressFields = addressFields.some(field => metadata[field]);
        
        if (hasAddressFields) {
          shippingAddressLine1 = metadata.address_line1 || metadata.address_line_1 || metadata.line1 || metadata.street || '';
          shippingAddressCity = metadata.address_city || metadata.city || '';
          shippingAddressPostalCode = metadata.address_postal_code || metadata.postal_code || metadata.zip || '';
          shippingAddressCountry = metadata.address_country || metadata.country || '';
          
          // Format shipping address for the orders table
          shippingAddress = [
            shippingAddressLine1,
            shippingAddressCity,
            shippingAddressPostalCode,
            shippingAddressCountry
          ].filter(Boolean).join(', ');
          
          addressFound = true;
          console.log('Using individual address fields from metadata for shipping address:', shippingAddress);
        }
      }
      
      // Get metadata if available
      if (customer.metadata) {
        // Extract order pack from metadata
        orderPack = customer.metadata.package || 
                   customer.metadata.order_pack || 
                   customer.metadata.pack || 
                   'Basic Pack';
        
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
        orderPack = 'Basic Pack';
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
        
        // Format shipping address for the orders table
        shippingAddress = formatShippingAddress(address);
      } else if (invoice.customer_address) {
        // Use customer address if shipping address is not available
        const address = invoice.customer_address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        
        // Format shipping address for the orders table
        shippingAddress = formatShippingAddress(address);
      }
      
      // Set order details
      orderPack = 'Invoice Order';
      orderNotes = `Created from invoice ${stripeInvoiceId}`;
      
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
    
    // If we have individual address components but no formatted shipping address, create it
    if (!shippingAddress && (shippingAddressLine1 || shippingAddressCity || shippingAddressPostalCode)) {
      shippingAddress = [
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
        }
      } catch (addressError) {
        console.error('Error fetching customer address:', addressError);
        // Continue with empty shipping address if there's an error
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
      order_pack: orderPack,
      order_notes: orderNotes,
      instruction: 'TO SHIP', // Default shipping instruction
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_payment_intent_id: stripePaymentIntentId,
      customer_id: customerId
    });
    
    // Create the order in Supabase
    const { data, error } = await supabase.from('orders').insert({
      id: orderId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2,
      shipping_address_city: shippingAddressCity,
      shipping_address_postal_code: shippingAddressPostalCode,
      shipping_address_country: shippingAddressCountry,
      order_pack: orderPack || 'Standard Pack', // Default value
      order_notes: orderNotes,
      instruction: 'TO SHIP', // Default shipping instruction for new orders
      status: 'pending',
      paid: stripeEvent.type === 'invoice.paid', // Mark as paid for invoice.paid
      ok_to_ship: false,
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_payment_intent_id: stripePaymentIntentId,
      customer_id: customerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select();
    
    if (error) {
      console.error('Error creating order from Stripe event:', error);
      return { success: false, error };
    }
    
    return { success: true, data, orderId };
  } catch (e) {
    console.error('Exception creating order from Stripe event:', e);
    return { success: false, error: e };
  }
}

// Helper function to format shipping address
function formatShippingAddress(address) {
  if (!address) return '';
  
  const parts = [
    address.line1,
    address.city,
    address.postal_code,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
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
          address_country: customerData.address_country || existingCustomer.address_country
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
      address_country: customerData?.address_country || ''
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
export async function fetchCustomers() {
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
export async function fetchCustomerById(customerId) {
  try {
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
export async function fetchOrdersByCustomerId(customerId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching orders for customer ${customerId}:`, error);
      return [];
    }
    
    return data || [];
  } catch (e) {
    console.error(`Exception fetching orders for customer ${customerId}:`, e);
    return [];
  }
}

/**
 * Fetch delivery status statistics
 * @returns {Promise<Object>} Delivery status statistics
 */
export async function fetchDeliveryStats() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('delivery_status, shipping_instruction, count(*)')
      .not('delivery_status', 'is', null)
      .group('delivery_status, shipping_instruction');
    
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
      total_tracked: 0,
      delivered: 0,
      in_transit: 0,
      to_ship: 0,
      do_not_ship: 0,
      unknown: 0,
      by_instruction: {}
    };
    
    // Process the data
    data.forEach(item => {
      const count = parseInt(item.count, 10);
      stats.total_tracked += count;
      
      // Count by delivery status
      if (item.delivery_status?.toLowerCase().includes('delivered')) {
        stats.delivered += count;
      } else if (item.delivery_status?.toLowerCase().includes('transit') || 
                item.delivery_status?.toLowerCase().includes('shipped')) {
        stats.in_transit += count;
      }
      
      // Count by shipping instruction
      if (item.shipping_instruction) {
        if (!stats.by_instruction[item.shipping_instruction]) {
          stats.by_instruction[item.shipping_instruction] = 0;
        }
        stats.by_instruction[item.shipping_instruction] += count;
        
        // Also update the summary counts
        if (item.shipping_instruction === 'TO SHIP') {
          stats.to_ship += count;
        } else if (item.shipping_instruction === 'DO NOT SHIP') {
          stats.do_not_ship += count;
        } else if (item.shipping_instruction === 'UNKNOWN') {
          stats.unknown += count;
        }
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