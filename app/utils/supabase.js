import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// These environment variables are set in next.config.js
const supabaseUrl = process.env.NEXT_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your configuration.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  } catch (e) {
    console.error('Exception fetching orders:', e);
    return [];
  }
}

// Helper function to fetch order statistics
export async function fetchOrderStats() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status');
  
  if (error) {
    console.error('Error fetching order statistics:', error);
    return {
      total: 0,
      pending: 0,
      shipped: 0,
      delivered: 0
    };
  }
  
  const total = orders?.length || 0;
  const pending = orders?.filter(order => order.status === 'pending').length || 0;
  const shipped = orders?.filter(order => order.status === 'shipped').length || 0;
  const delivered = orders?.filter(order => order.status === 'delivered').length || 0;
  
  return {
    total,
    pending,
    shipped,
    delivered
  };
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
    
    // Handle different event types
    if (stripeEvent.type === 'checkout.session.completed') {
      // Extract data from checkout session
      const session = eventData;
      customerName = session.customer_details?.name || 'Unknown Customer';
      customerEmail = session.customer_details?.email || '';
      stripeCustomerId = session.customer || '';
      
      // Get shipping details if available
      if (session.shipping) {
        customerPhone = session.shipping.phone || '';
        const shipping = session.shipping.address;
        shippingAddressLine1 = shipping.line1 || '';
        shippingAddressLine2 = shipping.line2 || '';
        shippingAddressCity = shipping.city || '';
        shippingAddressState = shipping.state || '';
        shippingAddressPostalCode = shipping.postal_code || '';
        shippingAddressCountry = shipping.country || '';
        
        shippingAddress = [
          shippingAddressLine1,
          shippingAddressLine2,
          shippingAddressCity,
          shippingAddressState,
          shippingAddressPostalCode,
          shippingAddressCountry
        ].filter(Boolean).join(', ');
      } else if (session.customer_details && session.customer_details.address) {
        // Use customer address if shipping address is not available
        const address = session.customer_details.address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        
        shippingAddress = [
          shippingAddressLine1,
          shippingAddressLine2,
          shippingAddressCity,
          shippingAddressState,
          shippingAddressPostalCode,
          shippingAddressCountry
        ].filter(Boolean).join(', ');
      }
      
      // Get metadata if available
      if (session.metadata) {
        orderPack = session.metadata.package || 'Standard Pack';
        orderNotes = session.metadata.notes || '';
      }
    } else if (stripeEvent.type === 'payment_intent.succeeded') {
      // Extract data from payment intent
      const paymentIntent = eventData;
      stripePaymentIntentId = paymentIntent.id || '';
      stripeCustomerId = paymentIntent.customer || '';
      
      // Get customer details from payment intent
      if (paymentIntent.customer) {
        // We would need to fetch customer details from Stripe API
        // For now, use available data
        customerEmail = paymentIntent.receipt_email || '';
      }
      
      // Get shipping details if available
      if (paymentIntent.shipping) {
        customerName = paymentIntent.shipping.name || 'Unknown Customer';
        customerPhone = paymentIntent.shipping.phone || '';
        const shipping = paymentIntent.shipping.address;
        shippingAddressLine1 = shipping.line1 || '';
        shippingAddressLine2 = shipping.line2 || '';
        shippingAddressCity = shipping.city || '';
        shippingAddressState = shipping.state || '';
        shippingAddressPostalCode = shipping.postal_code || '';
        shippingAddressCountry = shipping.country || '';
        
        shippingAddress = [
          shippingAddressLine1,
          shippingAddressLine2,
          shippingAddressCity,
          shippingAddressState,
          shippingAddressPostalCode,
          shippingAddressCountry
        ].filter(Boolean).join(', ');
      } else if (paymentIntent.billing_details && paymentIntent.billing_details.address) {
        // Use billing address if shipping address is not available
        const address = paymentIntent.billing_details.address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        
        shippingAddress = [
          shippingAddressLine1,
          shippingAddressLine2,
          shippingAddressCity,
          shippingAddressState,
          shippingAddressPostalCode,
          shippingAddressCountry
        ].filter(Boolean).join(', ');
      }
      
      // Get metadata if available
      if (paymentIntent.metadata) {
        orderPack = paymentIntent.metadata.package || 'Standard Pack';
        orderNotes = paymentIntent.metadata.notes || '';
      }
    } else if (stripeEvent.type === 'customer.created') {
      // Extract data from customer object
      const customer = eventData;
      customerName = customer.name || 'New Customer';
      customerEmail = customer.email || '';
      customerPhone = customer.phone || '';
      stripeCustomerId = customer.id || '';
      
      // Generate a fake invoice ID for reference
      stripeInvoiceId = `in_${Date.now()}${Math.floor(Math.random() * 10000)}`;
      
      // Check if customer has an address
      if (customer.address) {
        const address = customer.address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        
        shippingAddress = [
          shippingAddressLine1,
          shippingAddressLine2,
          shippingAddressCity,
          shippingAddressState,
          shippingAddressPostalCode,
          shippingAddressCountry
        ].filter(Boolean).join(', ');
      } else if (customer.shipping && customer.shipping.address) {
        // Use shipping address if available
        const address = customer.shipping.address;
        shippingAddressLine1 = address.line1 || '';
        shippingAddressLine2 = address.line2 || '';
        shippingAddressCity = address.city || '';
        shippingAddressState = address.state || '';
        shippingAddressPostalCode = address.postal_code || '';
        shippingAddressCountry = address.country || '';
        
        shippingAddress = [
          shippingAddressLine1,
          shippingAddressLine2,
          shippingAddressCity,
          shippingAddressState,
          shippingAddressPostalCode,
          shippingAddressCountry
        ].filter(Boolean).join(', ');
      } else if (customer.metadata && customer.metadata.address) {
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
          
          shippingAddress = [
            shippingAddressLine1,
            shippingAddressLine2,
            shippingAddressCity,
            shippingAddressState,
            shippingAddressPostalCode,
            shippingAddressCountry
          ].filter(Boolean).join(', ');
        } catch (e) {
          console.error('Error parsing address from metadata:', e);
          // If parsing fails, leave address empty
        }
      }
      
      // Get metadata if available
      if (customer.metadata) {
        orderPack = customer.metadata.package || 'Basic Pack';
        orderNotes = customer.metadata.notes || `Customer created via Stripe: ${customer.id}`;
      } else {
        orderPack = '(created by Stripe CLI)';
        orderNotes = `Stripe Customer: ${customer.id}`;
      }
    }
    
    console.log(`Creating order from ${stripeEvent.type} event:`, {
      id: orderId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      shipping_address_city: shippingAddressCity,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2,
      shipping_address_postal_code: shippingAddressPostalCode,
      shipping_address_country: shippingAddressCountry,
      order_pack: orderPack,
      instruction: orderNotes,
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_payment_intent_id: stripePaymentIntentId
    });
    
    // Create the order in Supabase
    const { data, error } = await supabase.from('orders').insert({
      id: orderId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      shipping_address_city: shippingAddressCity,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2,
      shipping_address_postal_code: shippingAddressPostalCode,
      shipping_address_country: shippingAddressCountry,
      order_pack: orderPack || 'Standard Pack', // Default value
      instruction: orderNotes,
      status: 'pending',
      paid: stripeEvent.type === 'payment_intent.succeeded', // Only mark as paid for payment_intent.succeeded
      ok_to_ship: false,
      stripe_customer_id: stripeCustomerId,
      stripe_invoice_id: stripeInvoiceId,
      stripe_payment_intent_id: stripePaymentIntentId
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
          created_at: new Date()
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